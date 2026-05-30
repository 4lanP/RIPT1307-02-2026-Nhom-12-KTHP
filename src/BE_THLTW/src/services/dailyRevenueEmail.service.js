const cron = require('node-cron');
const logger = require('../utils/logger');
const reportService = require('./report.service');
const emailService = require('./email.service');

const DEFAULT_CRON = '5 0 * * *';
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;

let scheduler = null;
let currentConfig = buildConfig(process.env);
let attempts = [];
let sentScheduledKeys = new Set();

function parseBoolean(value) {
  if (value === undefined || value === null || value === '') {
    return false;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function parseInteger(value, fallback, name) {
  if (value === undefined || value === null || value === '') {
    return { value: fallback };
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return { value: fallback, error: `${name} must be an integer` };
  }

  return { value: parsed };
}

function buildConfig(env = process.env) {
  const smtpConfig = emailService.buildSmtpConfig(env);
  const enabled = parseBoolean(env.REPORT_EMAIL_ENABLED);
  const errors = [];
  const historyLimit = parseInteger(env.REPORT_EMAIL_HISTORY_LIMIT, DEFAULT_HISTORY_LIMIT, 'REPORT_EMAIL_HISTORY_LIMIT');

  if (historyLimit.error) errors.push(historyLimit.error);
  if (historyLimit.value <= 0 || historyLimit.value > MAX_HISTORY_LIMIT) {
    errors.push(`REPORT_EMAIL_HISTORY_LIMIT must be between 1 and ${MAX_HISTORY_LIMIT}`);
  }
  if (enabled && smtpConfig.startupError) {
    errors.push(smtpConfig.startupError);
  }

  return {
    enabled: enabled && errors.length === 0,
    requestedEnabled: enabled,
    status: enabled ? (errors.length > 0 ? 'configuration-error' : 'scheduled') : 'disabled',
    schedule: env.REPORT_EMAIL_CRON || DEFAULT_CRON,
    timezone: env.REPORT_EMAIL_TIMEZONE || DEFAULT_TIMEZONE,
    historyLimit: historyLimit.value,
    startupError: errors.length > 0 ? errors.join('; ') : null,
    recipients: smtpConfig.recipients,
    smtpConfig,
  };
}

function configure(env = process.env) {
  currentConfig = buildConfig(env);
  attempts = [];
  sentScheduledKeys = new Set();
  return currentConfig;
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateOnly, days) {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

function getLocalDate(now = new Date(), timezone = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getPreviousReportDate(now = new Date(), timezone = DEFAULT_TIMEZONE) {
  return addDays(getLocalDate(now, timezone), -1);
}

function getReportPeriod(reportDate, timezone = DEFAULT_TIMEZONE) {
  if (timezone !== DEFAULT_TIMEZONE) {
    return {
      periodStart: `${reportDate}T00:00:00`,
      periodEnd: `${addDays(reportDate, 1)}T00:00:00`,
    };
  }

  return {
    periodStart: `${reportDate}T00:00:00+07:00`,
    periodEnd: `${addDays(reportDate, 1)}T00:00:00+07:00`,
  };
}

function makeAttemptId(reportDate) {
  return `revmail-${reportDate.replace(/-/g, '')}-${String(attempts.length + 1).padStart(3, '0')}`;
}

function pushAttempt(attempt) {
  attempts.unshift(attempt);
  attempts = attempts.slice(0, currentConfig.historyLimit);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function normalizeSummary(reportDate, period, summary = {}) {
  const paymentMethods = (summary.payment_methods || []).map((row) => ({
    method: row.method,
    total_revenue: Number(row.total_revenue) || 0,
    transaction_count: Number(row.transaction_count) || 0,
  }));

  return {
    report_date: reportDate,
    period_start: period.periodStart,
    period_end: period.periodEnd,
    total_revenue: Number(summary.total_revenue) || paymentMethods.reduce((sum, row) => sum + row.total_revenue, 0),
    transaction_count: Number(summary.transaction_count) || paymentMethods.reduce((sum, row) => sum + row.transaction_count, 0),
    payment_methods: paymentMethods,
    generated_at: new Date().toISOString(),
  };
}

function renderEmail(summary) {
  const lines = [
    `Bao cao doanh thu ngay ${summary.report_date}`,
    '',
    `Tong doanh thu: ${formatCurrency(summary.total_revenue)}`,
    `So giao dich thanh cong: ${summary.transaction_count}`,
    '',
    'Doanh thu theo phuong thuc thanh toan:',
  ];

  if (summary.payment_methods.length === 0) {
    lines.push('- Khong co giao dich thanh cong trong ngay bao cao.');
  } else {
    summary.payment_methods.forEach((method) => {
      lines.push(`- ${method.method}: ${formatCurrency(method.total_revenue)} (${method.transaction_count} giao dich)`);
    });
  }

  lines.push('', 'Email nay chi gom tong hop van hanh, khong bao gom thong tin ca nhan khach hang hoac bi mat thanh toan.');

  const rows = summary.payment_methods.length === 0
    ? '<tr><td colspan="3">Khong co giao dich thanh cong trong ngay bao cao.</td></tr>'
    : summary.payment_methods.map((method) => (
      `<tr><td>${method.method}</td><td>${formatCurrency(method.total_revenue)}</td><td>${method.transaction_count}</td></tr>`
    )).join('');

  return {
    subject: `Bao cao doanh thu ngay ${summary.report_date}`,
    text: lines.join('\n'),
    html: `
      <h2>Bao cao doanh thu ngay ${summary.report_date}</h2>
      <p><strong>Tong doanh thu:</strong> ${formatCurrency(summary.total_revenue)}</p>
      <p><strong>So giao dich thanh cong:</strong> ${summary.transaction_count}</p>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead><tr><th>Phuong thuc</th><th>Doanh thu</th><th>Giao dich</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Email nay chi gom tong hop van hanh, khong bao gom thong tin ca nhan khach hang hoac bi mat thanh toan.</p>
    `,
  };
}

async function buildReport(reportDate, options = {}) {
  const report = options.reportService || reportService;
  const period = getReportPeriod(reportDate, currentConfig.timezone);
  const summary = await report.getDailyRevenueSummary(period.periodStart, period.periodEnd);
  return normalizeSummary(reportDate, period, summary);
}

function publicAttempt(attempt) {
  if (!attempt) return null;
  return {
    attempt_id: attempt.attemptId,
    report_date: attempt.reportDate,
    trigger_type: attempt.triggerType,
    status: attempt.status,
    failure_category: attempt.failureCategory,
    recipient_count: attempt.recipientCount,
    started_at: attempt.startedAt,
    finished_at: attempt.finishedAt,
  };
}

function getStatus() {
  const lastAttempt = attempts[0] || null;
  return {
    enabled: currentConfig.enabled,
    status: lastAttempt?.status || currentConfig.status,
    schedule: currentConfig.schedule,
    timezone: currentConfig.timezone,
    recipient_count: currentConfig.recipients.length,
    startup_error: currentConfig.startupError,
    last_attempt: publicAttempt(lastAttempt),
    recent_attempts: attempts.map(publicAttempt),
  };
}

async function sendReport(reportDate, triggerType, options = {}) {
  if (!currentConfig.enabled) {
    const attempt = {
      attemptId: makeAttemptId(reportDate),
      reportDate,
      triggerType,
      requestedByUserId: options.requestedByUserId || null,
      recipientCount: currentConfig.recipients.length,
      status: currentConfig.status === 'configuration-error' ? 'configuration-error' : 'skipped',
      failureCategory: currentConfig.startupError ? 'configuration' : null,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      messageId: null,
    };
    pushAttempt(attempt);
    return { ...publicAttempt(attempt), startup_error: currentConfig.startupError };
  }

  const scheduledKey = `${reportDate}:${currentConfig.recipients.join(',')}`;
  if (triggerType === 'scheduled' && sentScheduledKeys.has(scheduledKey)) {
    const attempt = {
      attemptId: makeAttemptId(reportDate),
      reportDate,
      triggerType,
      requestedByUserId: null,
      recipientCount: currentConfig.recipients.length,
      status: 'skipped',
      failureCategory: null,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      messageId: null,
    };
    pushAttempt(attempt);
    return publicAttempt(attempt);
  }

  const attempt = {
    attemptId: makeAttemptId(reportDate),
    reportDate,
    triggerType,
    requestedByUserId: options.requestedByUserId || null,
    recipientCount: currentConfig.recipients.length,
    status: 'failed',
    failureCategory: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    messageId: null,
  };

  try {
    const summary = await buildReport(reportDate, options);
    const message = renderEmail(summary);
    const mailer = options.emailService || emailService;
    const delivery = await mailer.sendMail(message, {
      config: currentConfig.smtpConfig,
      transporter: options.transporter,
    });

    attempt.status = 'sent';
    attempt.finishedAt = new Date().toISOString();
    attempt.messageId = delivery?.messageId || null;
    pushAttempt(attempt);
    if (triggerType === 'scheduled') {
      sentScheduledKeys.add(scheduledKey);
    }

    return {
      ...publicAttempt(attempt),
      total_revenue: summary.total_revenue,
      transaction_count: summary.transaction_count,
      payment_methods: summary.payment_methods,
      started_at: attempt.startedAt,
      finished_at: attempt.finishedAt,
    };
  } catch (error) {
    attempt.status = error.category === 'configuration' ? 'configuration-error' : 'failed';
    attempt.failureCategory = error.category || 'unknown';
    attempt.finishedAt = new Date().toISOString();
    pushAttempt(attempt);
    throw Object.assign(new Error(attempt.failureCategory), {
      status: attempt.status,
      failureCategory: attempt.failureCategory,
      attempt: publicAttempt(attempt),
    });
  }
}

async function sendScheduledReport(options = {}) {
  const reportDate = options.reportDate || getPreviousReportDate(options.now || new Date(), currentConfig.timezone);
  return sendReport(reportDate, 'scheduled', options);
}

async function sendManualReport(reportDate, options = {}) {
  return sendReport(reportDate, 'manual', options);
}

function start(options = {}) {
  const log = options.logger || logger;
  if (scheduler) {
    return false;
  }

  configure(options.env || process.env);

  if (!currentConfig.enabled) {
    log.info('Daily revenue email scheduler not started', {
      status: currentConfig.status,
      reason: currentConfig.startupError || 'disabled',
    });
    return false;
  }

  scheduler = cron.schedule(currentConfig.schedule, () => {
    sendScheduledReport(options).catch((error) => {
      log.error('Daily revenue email scheduled send failed', {
        failureCategory: error.failureCategory || error.message,
      });
    });
  }, {
    timezone: currentConfig.timezone,
  });

  log.info('Daily revenue email scheduler started', {
    schedule: currentConfig.schedule,
    timezone: currentConfig.timezone,
    recipientCount: currentConfig.recipients.length,
  });

  return true;
}

function stop() {
  if (scheduler) {
    scheduler.stop();
    scheduler = null;
  }
}

function resetForTests() {
  stop();
  currentConfig = buildConfig({});
  attempts = [];
  sentScheduledKeys = new Set();
}

module.exports = {
  DEFAULT_CRON,
  DEFAULT_TIMEZONE,
  buildConfig,
  configure,
  getPreviousReportDate,
  getReportPeriod,
  renderEmail,
  buildReport,
  sendScheduledReport,
  sendManualReport,
  getStatus,
  start,
  stop,
  resetForTests,
};

require('./helpers/mockDb');
const fs = require('fs');
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const { mockPool } = require('./helpers/mockDb');
const jwtUtil = require('../src/utils/jwt.util');
const errorHandler = require('../src/middlewares/error.middleware');
const dailyRevenueEmailService = require('../src/services/dailyRevenueEmail.service');
const emailService = require('../src/services/email.service');
const adminRoutes = require('../src/routes/admin.routes');

jest.mock('nodemailer');
jest.mock('../src/utils/jwt.util');

jest.setTimeout(30000);

const silentLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const validEnv = {
  REPORT_EMAIL_ENABLED: 'true',
  REPORT_EMAIL_RECIPIENTS: 'Admin@Example.com,admin@example.com,manager@example.com',
  REPORT_EMAIL_CRON: '5 0 * * *',
  REPORT_EMAIL_TIMEZONE: 'Asia/Ho_Chi_Minh',
  REPORT_EMAIL_HISTORY_LIMIT: '3',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'smtp-user',
  SMTP_PASS: 'smtp-pass',
  SMTP_FROM: 'QR Restaurant <no-reply@example.com>',
};

function createAdminApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);
  app.use(errorHandler);
  return app;
}

function makeAdminRequest(app, method, requestPath, role, body, extraMockRows = []) {
  jwtUtil.verifyAccessToken.mockReturnValue({ id: 1 });
  mockPool.query.mockResolvedValueOnce({
    rows: [{ id: 1, role, is_active: true }],
  });
  extraMockRows.forEach((rows) => mockPool.query.mockResolvedValueOnce({ rows }));

  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}${requestPath}`, {
          method,
          headers: {
            authorization: `Bearer ${role.toLowerCase()}-token`,
            'content-type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        const responseBody = await response.json();
        resolve({ status: response.status, body: responseBody });
      } catch (error) {
        reject(error);
      } finally {
        server.close();
      }
    });
  });
}

describe('daily revenue email service', () => {
  beforeEach(() => {
    dailyRevenueEmailService.resetForTests();
    jest.clearAllMocks();
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'smtp-message-1' }),
    });
  });

  afterEach(() => {
    dailyRevenueEmailService.resetForTests();
  });

  it('builds disabled status by default and de-duplicates configured recipients', () => {
    expect(dailyRevenueEmailService.configure({}).status).toBe('disabled');
    const config = dailyRevenueEmailService.configure(validEnv);

    expect(config.enabled).toBe(true);
    expect(config.recipients).toEqual(['admin@example.com', 'manager@example.com']);
    expect(dailyRevenueEmailService.getStatus()).toEqual(expect.objectContaining({
      enabled: true,
      status: 'scheduled',
      recipient_count: 2,
      startup_error: null,
    }));
  });

  it('calculates the previous local report date and renders zero-revenue content', async () => {
    dailyRevenueEmailService.configure(validEnv);
    const previous = dailyRevenueEmailService.getPreviousReportDate(new Date('2026-05-30T01:00:00.000Z'));
    const rendered = dailyRevenueEmailService.renderEmail({
      report_date: previous,
      total_revenue: 0,
      transaction_count: 0,
      payment_methods: [],
    });

    expect(previous).toBe('2026-05-29');
    expect(rendered.subject).toContain('2026-05-29');
    expect(rendered.text).toContain('Khong co giao dich thanh cong');
  });

  it('sends scheduled revenue summaries with payment-method totals', async () => {
    dailyRevenueEmailService.configure(validEnv);
    const fakeEmail = { sendMail: jest.fn().mockResolvedValue({ messageId: 'mail-1' }) };
    const fakeReport = {
      getDailyRevenueSummary: jest.fn().mockResolvedValue({
        total_revenue: 2500000,
        transaction_count: 18,
        payment_methods: [
          { method: 'CASH', total_revenue: 900000, transaction_count: 7 },
          { method: 'VNPAY', total_revenue: 1600000, transaction_count: 11 },
        ],
      }),
    };

    const result = await dailyRevenueEmailService.sendScheduledReport({
      reportDate: '2026-05-29',
      reportService: fakeReport,
      emailService: fakeEmail,
    });

    expect(result).toEqual(expect.objectContaining({
      report_date: '2026-05-29',
      trigger_type: 'scheduled',
      status: 'sent',
      recipient_count: 2,
      total_revenue: 2500000,
      transaction_count: 18,
    }));
    expect(result.payment_methods).toHaveLength(2);
    expect(fakeReport.getDailyRevenueSummary).toHaveBeenCalledWith('2026-05-29T00:00:00+07:00', '2026-05-30T00:00:00+07:00');
    expect(fakeEmail.sendMail.mock.calls[0][0].text).not.toContain('smtp-pass');
  });

  it('skips duplicate scheduled sends for the same report date and recipient set', async () => {
    dailyRevenueEmailService.configure(validEnv);
    const fakeEmail = { sendMail: jest.fn().mockResolvedValue({ messageId: 'mail-1' }) };
    const fakeReport = {
      getDailyRevenueSummary: jest.fn().mockResolvedValue({
        total_revenue: 0,
        transaction_count: 0,
        payment_methods: [],
      }),
    };

    await dailyRevenueEmailService.sendScheduledReport({
      reportDate: '2026-05-29',
      reportService: fakeReport,
      emailService: fakeEmail,
    });
    const duplicate = await dailyRevenueEmailService.sendScheduledReport({
      reportDate: '2026-05-29',
      reportService: fakeReport,
      emailService: fakeEmail,
    });

    expect(duplicate.status).toBe('skipped');
    expect(fakeEmail.sendMail).toHaveBeenCalledTimes(1);
  });

  it('reports invalid enabled config, bounded history, and sanitized status', async () => {
    const config = dailyRevenueEmailService.configure({
      REPORT_EMAIL_ENABLED: 'true',
      REPORT_EMAIL_RECIPIENTS: 'bad-address',
      SMTP_PASS: 'secret-password',
    });

    expect(config.status).toBe('configuration-error');
    const result = await dailyRevenueEmailService.sendScheduledReport({ reportDate: '2026-05-29' });
    expect(result.status).toBe('configuration-error');
    const status = dailyRevenueEmailService.getStatus();
    expect(status.startup_error).toContain('Invalid report email recipient');
    expect(JSON.stringify(status)).not.toContain('secret-password');
    expect(status.recent_attempts).toHaveLength(1);
  });

  it('categorizes provider failures and records failed attempts', async () => {
    dailyRevenueEmailService.configure(validEnv);
    const error = Object.assign(new Error('Timeout'), { category: 'provider-timeout' });
    await expect(dailyRevenueEmailService.sendManualReport('2026-05-29', {
      reportService: {
        getDailyRevenueSummary: jest.fn().mockResolvedValue({
          total_revenue: 0,
          transaction_count: 0,
          payment_methods: [],
        }),
      },
      emailService: { sendMail: jest.fn().mockRejectedValue(error) },
      requestedByUserId: 1,
    })).rejects.toMatchObject({ failureCategory: 'provider-timeout' });

    expect(dailyRevenueEmailService.getStatus().last_attempt).toEqual(expect.objectContaining({
      status: 'failed',
      failure_category: 'provider-timeout',
      trigger_type: 'manual',
    }));
  });

  it('prevents duplicate scheduler starts', () => {
    expect(dailyRevenueEmailService.start({ env: validEnv, logger: silentLogger })).toBe(true);
    expect(dailyRevenueEmailService.start({ env: validEnv, logger: silentLogger })).toBe(false);
  });
});

describe('daily revenue email admin endpoints', () => {
  beforeEach(() => {
    dailyRevenueEmailService.resetForTests();
    jwtUtil.verifyAccessToken.mockReset();
    nodemailer.createTransport.mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'smtp-message-1' }),
    });
  });

  afterEach(() => {
    dailyRevenueEmailService.resetForTests();
  });

  it('allows ADMIN to manually send a daily revenue email', async () => {
    dailyRevenueEmailService.configure(validEnv);
    const response = await makeAdminRequest(createAdminApp(), 'POST', '/admin/reports/daily-email/send', 'ADMIN', {
      report_date: '2026-05-29',
    }, [[
      { method: 'CASH', total_revenue: '900000', transaction_count: 7 },
      { method: 'VNPAY', total_revenue: '1600000', transaction_count: 11 },
    ]]);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      message: 'Daily revenue email sent',
    }));
    expect(response.body.data).toEqual(expect.objectContaining({
      report_date: '2026-05-29',
      trigger_type: 'manual',
      status: 'sent',
      total_revenue: 2500000,
      transaction_count: 18,
    }));
  });

  it('denies MANAGER manual sends and rejects future dates before delivery', async () => {
    dailyRevenueEmailService.configure(validEnv);
    const manager = await makeAdminRequest(createAdminApp(), 'POST', '/admin/reports/daily-email/send', 'MANAGER', {
      report_date: '2026-05-29',
    });
    expect(manager.status).toBe(403);

    const future = '2999-01-01';
    const invalidDate = await makeAdminRequest(createAdminApp(), 'POST', '/admin/reports/daily-email/send', 'ADMIN', {
      report_date: future,
    });
    expect(invalidDate.status).toBe(400);
    expect(dailyRevenueEmailService.getStatus().recent_attempts).toEqual([]);
  });

  it('returns provider failure through the unified error response', async () => {
    dailyRevenueEmailService.configure(validEnv);
    nodemailer.createTransport.mockReturnValueOnce({
      sendMail: jest.fn().mockRejectedValue(Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' })),
    });

    const response = await makeAdminRequest(createAdminApp(), 'POST', '/admin/reports/daily-email/send', 'ADMIN', {
      report_date: '2026-05-29',
    }, [[]]);

    expect(response.status).toBe(502);
    expect(response.body).toEqual(expect.objectContaining({
      success: false,
      message: 'Daily revenue email: provider-timeout',
    }));
  });

  it('allows ADMIN to review sanitized daily revenue email status', async () => {
    dailyRevenueEmailService.configure(validEnv);
    await dailyRevenueEmailService.sendScheduledReport({
      reportDate: '2026-05-29',
      reportService: {
        getDailyRevenueSummary: jest.fn().mockResolvedValue({
          total_revenue: 0,
          transaction_count: 0,
          payment_methods: [],
        }),
      },
      emailService: { sendMail: jest.fn().mockResolvedValue({ messageId: 'mail-1' }) },
    });

    const response = await makeAdminRequest(createAdminApp(), 'GET', '/admin/reports/daily-email/status', 'ADMIN');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({
      enabled: true,
      status: 'sent',
      recipient_count: 2,
    }));
    expect(JSON.stringify(response.body.data)).not.toContain('admin@example.com');
    expect(JSON.stringify(response.body.data)).not.toContain('smtp-pass');
  });

  it('denies MANAGER access to daily revenue email status', async () => {
    dailyRevenueEmailService.configure(validEnv);
    const response = await makeAdminRequest(createAdminApp(), 'GET', '/admin/reports/daily-email/status', 'MANAGER');

    expect(response.status).toBe(403);
    expect(response.body).toEqual(expect.objectContaining({ success: false }));
  });
});

describe('daily revenue email integration and documentation', () => {
  it('starts the scheduler after server startup validation', () => {
    const serverSource = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf8');

    expect(serverSource).toContain("const dailyRevenueEmailService = require('./services/dailyRevenueEmail.service');");
    expect(serverSource).toContain('dailyRevenueEmailService.start();');
    expect(serverSource.indexOf('keepaliveService.start({ runImmediately: true });')).toBeLessThan(
      serverSource.indexOf('dailyRevenueEmailService.start();')
    );
  });

  it('documents report email environment variables and rollback guidance', () => {
    const setupDoc = fs.readFileSync(path.join(__dirname, '../../../docs/setup.md'), 'utf8');
    const deploymentDoc = fs.readFileSync(path.join(__dirname, '../../../docs/05-deployment.md'), 'utf8');
    const envExample = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');

    [
      'REPORT_EMAIL_ENABLED',
      'REPORT_EMAIL_RECIPIENTS',
      'REPORT_EMAIL_CRON',
      'REPORT_EMAIL_TIMEZONE',
      'SMTP_HOST',
      'SMTP_FROM',
    ].forEach((name) => {
      expect(setupDoc).toContain(name);
      expect(deploymentDoc).toContain(name);
      expect(envExample).toContain(name);
    });

    expect(deploymentDoc).toContain('REPORT_EMAIL_ENABLED=false');
  });
});

describe('email service helpers', () => {
  it('normalizes recipients and maps delivery errors', () => {
    expect(emailService.normalizeRecipients('A@Example.com,a@example.com,b@example.com')).toEqual({
      recipients: ['a@example.com', 'b@example.com'],
      errors: [],
    });
    expect(emailService.categorizeDeliveryError({ code: 'ETIMEDOUT' })).toBe('provider-timeout');
  });

  it('builds bounded SMTP timeout configuration', () => {
    const config = emailService.buildSmtpConfig({
      ...validEnv,
      SMTP_TIMEOUT_MS: '12000',
    });

    expect(config.timeoutMs).toBe(12000);

    const invalid = emailService.buildSmtpConfig({
      ...validEnv,
      SMTP_TIMEOUT_MS: '120000',
    });
    expect(invalid.startupError).toContain('SMTP_TIMEOUT_MS');
  });

  it('uses Mailtrap API config when MAILTRAP_API_TOKEN is provided', () => {
    const config = emailService.buildSmtpConfig({
      ...validEnv,
      MAILTRAP_API_TOKEN: 'mailtrap-token',
      MAILTRAP_FROM_EMAIL: 'no-reply@example.com',
      MAILTRAP_FROM_NAME: 'QR Restaurant',
      SMTP_HOST: '',
      SMTP_FROM: '',
    });

    expect(config.deliveryProvider).toBe('mailtrap-api');
    expect(config.mailtrapApiUrl).toBe(emailService.DEFAULT_MAILTRAP_API_URL);
    expect(config.from).toBe('no-reply@example.com');
    expect(config.fromName).toBe('QR Restaurant');
    expect(config.startupError).toBeNull();
  });

  it('allows request-scoped recipients with Mailtrap API and no SMTP host', () => {
    const config = emailService.buildSmtpConfig({
      ...validEnv,
      MAILTRAP_API_TOKEN: 'mailtrap-token',
      MAILTRAP_FROM_EMAIL: 'no-reply@example.com',
      SMTP_HOST: '',
      SMTP_FROM: '',
    });

    const deliveryConfig = emailService.buildDeliveryConfig(config, ['owner@example.com']);

    expect(deliveryConfig.deliveryProvider).toBe('mailtrap-api');
    expect(deliveryConfig.recipients).toEqual(['owner@example.com']);
    expect(deliveryConfig.startupError).toBeNull();
  });

  it('parses display-name sender values', () => {
    expect(emailService.parseSender('"QR Restaurant" <no-reply@example.com>')).toEqual({
      name: 'QR Restaurant',
      email: 'no-reply@example.com',
    });
  });
});

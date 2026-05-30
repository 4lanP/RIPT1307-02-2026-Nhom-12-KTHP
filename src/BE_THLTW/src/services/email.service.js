const nodemailer = require('nodemailer');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function normalizeRecipients(value) {
  const rawRecipients = String(value || '')
    .split(',')
    .map((recipient) => recipient.trim().toLowerCase())
    .filter(Boolean);

  const recipients = [];
  const seen = new Set();
  const errors = [];

  rawRecipients.forEach((email) => {
    if (!EMAIL_PATTERN.test(email)) {
      errors.push(`Invalid report email recipient: ${email}`);
      return;
    }
    if (!seen.has(email)) {
      seen.add(email);
      recipients.push(email);
    }
  });

  return { recipients, errors };
}

function buildSmtpConfig(env = process.env) {
  const enabled = parseBoolean(env.REPORT_EMAIL_ENABLED);
  const errors = [];
  const port = parseInteger(env.SMTP_PORT, 587, 'SMTP_PORT');

  if (port.error) errors.push(port.error);
  if (port.value <= 0) errors.push('SMTP_PORT must be a positive integer');

  const { recipients, errors: recipientErrors } = normalizeRecipients(env.REPORT_EMAIL_RECIPIENTS);
  errors.push(...recipientErrors);

  const requiredWhenEnabled = [
    ['REPORT_EMAIL_RECIPIENTS', recipients.length > 0],
    ['SMTP_HOST', !!env.SMTP_HOST],
    ['SMTP_FROM', !!env.SMTP_FROM],
  ];

  requiredWhenEnabled.forEach(([name, present]) => {
    if (enabled && !present) {
      errors.push(`${name} is required when REPORT_EMAIL_ENABLED=true`);
    }
  });

  return {
    enabled,
    recipients,
    host: env.SMTP_HOST || '',
    port: port.value,
    secure: parseBoolean(env.SMTP_SECURE),
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.SMTP_FROM || '',
    startupError: errors.length > 0 ? errors.join('; ') : null,
  };
}

function createTransport(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user || config.pass ? {
      user: config.user,
      pass: config.pass,
    } : undefined,
  });
}

function categorizeDeliveryError(error) {
  const code = String(error?.code || error?.responseCode || '').toUpperCase();
  const message = String(error?.message || '').toLowerCase();

  if (code.includes('AUTH') || message.includes('auth') || message.includes('credential')) {
    return 'provider-auth';
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || message.includes('timeout')) {
    return 'provider-timeout';
  }
  if (code === 'EMESSAGE' || message.includes('rejected')) {
    return 'provider-rejected';
  }
  if (message.includes('rate') || message.includes('quota')) {
    return 'provider-rate-limit';
  }
  return 'unknown';
}

async function sendMail(message, options = {}) {
  const config = options.config || buildSmtpConfig(options.env || process.env);
  if (config.startupError) {
    const error = new Error(config.startupError);
    error.category = 'configuration';
    throw error;
  }

  const transporter = options.transporter || createTransport(config);
  try {
    return await transporter.sendMail({
      from: config.from,
      to: config.recipients,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (error) {
    error.category = categorizeDeliveryError(error);
    throw error;
  }
}

module.exports = {
  buildSmtpConfig,
  normalizeRecipients,
  sendMail,
  categorizeDeliveryError,
};

const nodemailer = require('nodemailer');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_SMTP_TIMEOUT_MS = 15000;
const MAX_SMTP_TIMEOUT_MS = 60000;
const DEFAULT_MAILTRAP_API_URL = 'https://send.api.mailtrap.io/api/send';

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

function parseSender(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(.*)<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim().replace(/^"|"$/g, '').trim() || undefined,
      email: match[2].trim(),
    };
  }
  return { email: raw };
}

function buildSmtpConfig(env = process.env) {
  const enabled = parseBoolean(env.REPORT_EMAIL_ENABLED);
  const errors = [];
  const port = parseInteger(env.SMTP_PORT, 587, 'SMTP_PORT');
  const timeout = parseInteger(env.SMTP_TIMEOUT_MS, DEFAULT_SMTP_TIMEOUT_MS, 'SMTP_TIMEOUT_MS');
  const mailtrapApiToken = env.MAILTRAP_API_TOKEN || '';
  const mailtrapApiUrl = env.MAILTRAP_API_URL || DEFAULT_MAILTRAP_API_URL;
  const from = env.MAILTRAP_FROM_EMAIL || env.SMTP_FROM || '';
  const fromName = env.MAILTRAP_FROM_NAME || '';
  const useMailtrapApi = !!mailtrapApiToken;

  if (port.error) errors.push(port.error);
  if (timeout.error) errors.push(timeout.error);
  if (port.value <= 0) errors.push('SMTP_PORT must be a positive integer');
  if (timeout.value <= 0 || timeout.value > MAX_SMTP_TIMEOUT_MS) {
    errors.push(`SMTP_TIMEOUT_MS must be between 1 and ${MAX_SMTP_TIMEOUT_MS}`);
  }

  const { recipients, errors: recipientErrors } = normalizeRecipients(env.REPORT_EMAIL_RECIPIENTS);
  errors.push(...recipientErrors);

  const requiredWhenEnabled = [
    ['REPORT_EMAIL_RECIPIENTS', recipients.length > 0],
    [useMailtrapApi ? 'MAILTRAP_API_TOKEN' : 'SMTP_HOST', useMailtrapApi ? !!mailtrapApiToken : !!env.SMTP_HOST],
    [useMailtrapApi ? 'MAILTRAP_FROM_EMAIL or SMTP_FROM' : 'SMTP_FROM', !!from],
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
    from,
    fromName,
    timeoutMs: timeout.value,
    mailtrapApiToken,
    mailtrapApiUrl,
    deliveryProvider: useMailtrapApi ? 'mailtrap-api' : 'smtp',
    startupError: errors.length > 0 ? errors.join('; ') : null,
  };
}

function buildDeliveryConfig(config, recipientOverride) {
  const errors = [];
  const useMailtrapApi = !!config.mailtrapApiToken;
  const { recipients, errors: recipientErrors } = normalizeRecipients(
    Array.isArray(recipientOverride) ? recipientOverride.join(',') : recipientOverride
  );

  if (!useMailtrapApi && !config.host) errors.push('SMTP_HOST is required when REPORT_EMAIL_ENABLED=true');
  if (!config.from) errors.push('SMTP_FROM is required when REPORT_EMAIL_ENABLED=true');
  if (!Number.isFinite(config.port) || config.port <= 0) errors.push('SMTP_PORT must be a positive integer');
  if (recipients.length === 0) errors.push('recipient_email is required');
  errors.push(...recipientErrors);

  return {
    ...config,
    recipients,
    startupError: errors.length > 0 ? errors.join('; ') : null,
  };
}

function createTransport(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    connectionTimeout: config.timeoutMs || DEFAULT_SMTP_TIMEOUT_MS,
    greetingTimeout: config.timeoutMs || DEFAULT_SMTP_TIMEOUT_MS,
    socketTimeout: config.timeoutMs || DEFAULT_SMTP_TIMEOUT_MS,
    auth: config.user || config.pass ? {
      user: config.user,
      pass: config.pass,
    } : undefined,
  });
}

async function sendMailtrapApi(message, config) {
  const sender = parseSender(config.from);
  if (config.fromName) {
    sender.name = config.fromName;
  }

  const response = await fetch(config.mailtrapApiUrl || DEFAULT_MAILTRAP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Token': config.mailtrapApiToken,
    },
    body: JSON.stringify({
      from: {
        email: sender.email,
        ...(sender.name ? { name: sender.name } : {}),
      },
      to: config.recipients.map((email) => ({ email })),
      subject: message.subject,
      text: message.text,
      html: message.html,
      category: 'Daily Revenue Report',
    }),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = new Error(`Mailtrap API failed with HTTP ${response.status}`);
    error.responseCode = response.status;
    error.category = response.status === 401 || response.status === 403
      ? 'provider-auth'
      : response.status === 429
        ? 'provider-rate-limit'
        : 'provider-rejected';
    throw error;
  }

  return {
    messageId: body?.message_ids?.[0] || body?.message_id || null,
    response: body,
  };
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
  const baseConfig = options.config || buildSmtpConfig(options.env || process.env);
  const config = options.recipients ? buildDeliveryConfig(baseConfig, options.recipients) : baseConfig;
  if (config.startupError) {
    const error = new Error(config.startupError);
    error.category = 'configuration';
    throw error;
  }

  if (config.mailtrapApiToken) {
    try {
      return await sendMailtrapApi(message, config);
    } catch (error) {
      error.category = error.category || categorizeDeliveryError(error);
      throw error;
    }
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
  DEFAULT_SMTP_TIMEOUT_MS,
  DEFAULT_MAILTRAP_API_URL,
  buildSmtpConfig,
  buildDeliveryConfig,
  parseSender,
  sendMailtrapApi,
  normalizeRecipients,
  sendMail,
  categorizeDeliveryError,
};

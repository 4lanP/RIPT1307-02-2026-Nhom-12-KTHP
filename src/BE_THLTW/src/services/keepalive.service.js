const logger = require('../utils/logger');

const DEFAULT_INTERVAL_SECONDS = 600;
const MIN_INTERVAL_SECONDS = 300;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_RETRY_LIMIT = 1;
const MAX_RETRY_LIMIT = 3;
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;
const USER_AGENT = 'KTHP-LTW-Keepalive/1.0';

const SAFE_HEALTH_PATHS = new Set(['/health', '/api/health', '/healthz', '/ready', '/readyz']);
const UNSAFE_PATH_SEGMENTS = [
  '/admin',
  '/auth',
  '/customer',
  '/staff',
  '/kds',
  '/webhooks',
  '/payment',
  '/payments',
  '/order',
  '/orders',
  '/session',
  '/sessions',
];

let scheduler = null;
let currentConfig = buildConfig(process.env);
let history = [];
let targets = currentConfig.targets;

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

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.local')
  ) {
    return true;
  }

  const octets = host.split('.').map((part) => Number.parseInt(part, 10));
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function normalizeTarget(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) {
    throw new Error('KEEPALIVE_TARGETS contains an empty URL');
  }

  let url;
  try {
    url = new URL(trimmed);
  } catch (_error) {
    throw new Error('KEEPALIVE_TARGETS must contain absolute HTTP(S) URLs');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('KEEPALIVE_TARGETS supports only HTTP(S) URLs');
  }

  if (url.username || url.password) {
    throw new Error('KEEPALIVE_TARGETS must not contain URL credentials');
  }

  if (url.search || url.hash) {
    throw new Error('KEEPALIVE_TARGETS must not contain query strings or fragments');
  }

  if (isPrivateHost(url.hostname)) {
    throw new Error('KEEPALIVE_TARGETS must not contain localhost, private, or metadata hosts');
  }

  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const lowerPath = pathname.toLowerCase();
  if (!SAFE_HEALTH_PATHS.has(lowerPath)) {
    if (UNSAFE_PATH_SEGMENTS.some((segment) => lowerPath.includes(segment))) {
      throw new Error('KEEPALIVE_TARGETS must not point to admin, auth, payment, order, session, or mutation paths');
    }
    throw new Error('KEEPALIVE_TARGETS must point to a public health endpoint');
  }

  url.pathname = pathname;
  url.search = '';
  url.hash = '';

  return {
    label: url.hostname,
    url: url.toString(),
    urlHost: url.hostname,
    urlPath: pathname,
    enabled: true,
    lastResult: null,
    consecutiveFailures: 0,
  };
}

function buildConfig(env = process.env) {
  const enabled = parseBoolean(env.KEEPALIVE_ENABLED);
  const errors = [];

  const interval = parseInteger(env.KEEPALIVE_INTERVAL_SECONDS, DEFAULT_INTERVAL_SECONDS, 'KEEPALIVE_INTERVAL_SECONDS');
  const timeout = parseInteger(env.KEEPALIVE_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 'KEEPALIVE_TIMEOUT_MS');
  const retry = parseInteger(env.KEEPALIVE_RETRY_LIMIT, DEFAULT_RETRY_LIMIT, 'KEEPALIVE_RETRY_LIMIT');
  const historyLimitValue = parseInteger(env.KEEPALIVE_HISTORY_LIMIT, DEFAULT_HISTORY_LIMIT, 'KEEPALIVE_HISTORY_LIMIT');

  [interval, timeout, retry, historyLimitValue].forEach((result) => {
    if (result.error) errors.push(result.error);
  });

  if (interval.value < MIN_INTERVAL_SECONDS) {
    errors.push(`KEEPALIVE_INTERVAL_SECONDS must be at least ${MIN_INTERVAL_SECONDS}`);
  }
  if (timeout.value <= 0) {
    errors.push('KEEPALIVE_TIMEOUT_MS must be a positive integer');
  }
  if (timeout.value >= interval.value * 1000) {
    errors.push('KEEPALIVE_TIMEOUT_MS must be shorter than KEEPALIVE_INTERVAL_SECONDS');
  }
  if (retry.value < 0 || retry.value > MAX_RETRY_LIMIT) {
    errors.push(`KEEPALIVE_RETRY_LIMIT must be between 0 and ${MAX_RETRY_LIMIT}`);
  }
  if (historyLimitValue.value <= 0 || historyLimitValue.value > MAX_HISTORY_LIMIT) {
    errors.push(`KEEPALIVE_HISTORY_LIMIT must be between 1 and ${MAX_HISTORY_LIMIT}`);
  }

  const rawTargets = String(env.KEEPALIVE_TARGETS || '')
    .split(',')
    .map((target) => target.trim())
    .filter(Boolean);
  const normalizedTargets = [];
  const seen = new Set();

  if (enabled && rawTargets.length === 0) {
    errors.push('KEEPALIVE_TARGETS is required when KEEPALIVE_ENABLED=true');
  }

  for (const rawTarget of rawTargets) {
    try {
      const target = normalizeTarget(rawTarget);
      if (seen.has(target.url)) {
        errors.push('KEEPALIVE_TARGETS must not contain duplicate URLs');
      } else {
        seen.add(target.url);
        normalizedTargets.push({
          ...target,
          intervalSeconds: interval.value,
          timeoutMs: timeout.value,
        });
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  return {
    enabled: enabled && errors.length === 0,
    requestedEnabled: enabled,
    status: enabled ? (errors.length > 0 ? 'configuration-error' : 'enabled') : 'disabled',
    intervalSeconds: interval.value,
    minimumIntervalSeconds: MIN_INTERVAL_SECONDS,
    timeoutMs: timeout.value,
    retryLimit: retry.value,
    historyLimit: historyLimitValue.value,
    startupError: errors.length > 0 ? errors.join('; ') : null,
    targets: errors.length > 0 ? [] : normalizedTargets,
  };
}

function configure(env = process.env) {
  currentConfig = buildConfig(env);
  targets = currentConfig.targets.map((target) => ({ ...target }));
  history = [];
  return currentConfig;
}

function pushResult(result) {
  history.unshift(result);
  history = history.slice(0, currentConfig.historyLimit);
}

function categorizeError(error) {
  if (error?.name === 'AbortError') {
    return 'timeout';
  }
  if (error?.code === 'ENOTFOUND' || error?.cause?.code === 'ENOTFOUND') {
    return 'dns';
  }
  if (error instanceof TypeError) {
    return 'network';
  }
  return 'unknown';
}

function makeResult(target, values) {
  return {
    checkedAt: new Date().toISOString(),
    targetLabel: target.label,
    status: values.status,
    httpStatus: values.httpStatus ?? null,
    responseMs: values.responseMs ?? null,
    errorCategory: values.errorCategory ?? null,
    attempt: values.attempt,
    retryScheduled: values.retryScheduled,
  };
}

async function fetchWithTimeout(fetchImpl, target, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(target.url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function performTargetCheck(target, options = {}) {
  const fetchImpl = options.fetchImpl || global.fetch;
  const log = options.logger || logger;

  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required for keepalive checks');
  }

  let latestResult = null;

  for (let attempt = 1; attempt <= currentConfig.retryLimit + 1; attempt += 1) {
    const startedAt = Date.now();
    const retryScheduled = attempt <= currentConfig.retryLimit;

    try {
      const response = await fetchWithTimeout(fetchImpl, target, currentConfig.timeoutMs);
      const responseMs = Date.now() - startedAt;

      if (response.status >= 200 && response.status < 300) {
        latestResult = makeResult(target, {
          status: 'healthy',
          httpStatus: response.status,
          responseMs,
          attempt,
          retryScheduled: false,
        });
        target.consecutiveFailures = 0;
        target.lastResult = latestResult;
        pushResult(latestResult);
        log.info('Keepalive check succeeded', {
          targetLabel: target.label,
          status: latestResult.status,
          httpStatus: response.status,
          responseMs,
          attempt,
        });
        return latestResult;
      }

      latestResult = makeResult(target, {
        status: retryScheduled ? 'retrying' : 'failed',
        httpStatus: response.status,
        responseMs,
        errorCategory: 'invalid-response',
        attempt,
        retryScheduled,
      });
    } catch (error) {
      latestResult = makeResult(target, {
        status: retryScheduled ? 'retrying' : 'failed',
        responseMs: Date.now() - startedAt,
        errorCategory: categorizeError(error),
        attempt,
        retryScheduled,
      });
    }

    target.consecutiveFailures += 1;
    target.lastResult = latestResult;
    pushResult(latestResult);
    log.warn('Keepalive check failed', {
      targetLabel: target.label,
      status: latestResult.status,
      httpStatus: latestResult.httpStatus,
      errorCategory: latestResult.errorCategory,
      responseMs: latestResult.responseMs,
      attempt,
      retryScheduled,
    });
  }

  return latestResult;
}

async function runChecks(options = {}) {
  if (!currentConfig.enabled) {
    return [];
  }

  const results = [];
  for (const target of targets) {
    results.push(await performTargetCheck(target, options));
  }
  return results;
}

function aggregateStatus() {
  if (currentConfig.status === 'disabled') {
    return 'disabled';
  }
  if (currentConfig.status === 'configuration-error') {
    return 'configuration-error';
  }
  if (targets.some((target) => target.lastResult?.status === 'retrying')) {
    return 'retrying';
  }
  if (targets.some((target) => target.lastResult?.status === 'failed')) {
    return 'failed';
  }
  if (targets.some((target) => target.lastResult?.status === 'healthy')) {
    return 'healthy';
  }
  return 'enabled';
}

function toStatusResponse() {
  return {
    enabled: currentConfig.enabled,
    status: aggregateStatus(),
    interval_seconds: currentConfig.intervalSeconds,
    timeout_ms: currentConfig.timeoutMs,
    retry_limit: currentConfig.retryLimit,
    history_limit: currentConfig.historyLimit,
    startup_error: currentConfig.startupError,
    targets: targets.map((target) => ({
      label: target.label,
      url_host: target.urlHost,
      url_path: target.urlPath,
      enabled: target.enabled,
      last_checked_at: target.lastResult?.checkedAt || null,
      latest_status: target.lastResult?.status || null,
      latest_http_status: target.lastResult?.httpStatus || null,
      latest_response_ms: target.lastResult?.responseMs || null,
      consecutive_failures: target.consecutiveFailures,
    })),
    recent_results: history.map((result) => ({
      checked_at: result.checkedAt,
      target_label: result.targetLabel,
      status: result.status,
      http_status: result.httpStatus,
      response_ms: result.responseMs,
      error_category: result.errorCategory,
      attempt: result.attempt,
      retry_scheduled: result.retryScheduled,
    })),
  };
}

function start(options = {}) {
  const log = options.logger || logger;

  if (scheduler) {
    return false;
  }

  configure(options.env || process.env);

  if (!currentConfig.enabled) {
    log.info('Keepalive scheduler not started', {
      status: currentConfig.status,
      reason: currentConfig.startupError || 'disabled',
    });
    return false;
  }

  const intervalMs = currentConfig.intervalSeconds * 1000;
  scheduler = setInterval(() => {
    runChecks(options).catch((error) => {
      log.error('Keepalive scheduled run failed', { error: error.message });
    });
  }, intervalMs);

  if (typeof scheduler.unref === 'function') {
    scheduler.unref();
  }

  log.info('Keepalive scheduler started', {
    intervalSeconds: currentConfig.intervalSeconds,
    targetCount: targets.length,
  });

  if (options.runImmediately) {
    runChecks(options).catch((error) => {
      log.error('Keepalive immediate run failed', { error: error.message });
    });
  }

  return true;
}

function stop() {
  if (scheduler) {
    clearInterval(scheduler);
    scheduler = null;
  }
}

function resetForTests() {
  stop();
  currentConfig = buildConfig({});
  targets = [];
  history = [];
}

module.exports = {
  DEFAULT_INTERVAL_SECONDS,
  MIN_INTERVAL_SECONDS,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_RETRY_LIMIT,
  DEFAULT_HISTORY_LIMIT,
  buildConfig,
  configure,
  runChecks,
  start,
  stop,
  resetForTests,
  getStatus: toStatusResponse,
  _private: {
    normalizeTarget,
    isPrivateHost,
    performTargetCheck,
  },
};

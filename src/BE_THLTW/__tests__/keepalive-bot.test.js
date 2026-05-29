require('./helpers/mockDb');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { mockPool } = require('./helpers/mockDb');
const jwtUtil = require('../src/utils/jwt.util');
const errorHandler = require('../src/middlewares/error.middleware');
const keepaliveService = require('../src/services/keepalive.service');
const adminRoutes = require('../src/routes/admin.routes');

jest.mock('../src/utils/jwt.util');
jest.setTimeout(30000);

const silentLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

function createAdminApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminRoutes);
  app.use(errorHandler);
  return app;
}

function makeAdminRequest(app, role) {
  jwtUtil.verifyAccessToken.mockReturnValue({ id: 1 });
  mockPool.query.mockResolvedValueOnce({
    rows: [{ id: 1, role, is_active: true }],
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(0, async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/admin/keepalive/status`, {
          headers: {
            authorization: `Bearer ${role.toLowerCase()}-token`,
          },
        });
        const body = await response.json();
        resolve({ status: response.status, body });
      } catch (error) {
        reject(error);
      } finally {
        server.close();
      }
    });
  });
}

describe('keepalive bot service', () => {
  beforeEach(() => {
    jest.useRealTimers();
    keepaliveService.resetForTests();
    jest.clearAllMocks();
  });

  afterEach(() => {
    keepaliveService.resetForTests();
  });

  it('keeps the bot disabled by default without requiring targets', () => {
    const config = keepaliveService.configure({});
    const status = keepaliveService.getStatus();

    expect(config.status).toBe('disabled');
    expect(status).toEqual(expect.objectContaining({
      enabled: false,
      status: 'disabled',
      interval_seconds: 600,
      timeout_ms: 5000,
      retry_limit: 1,
      history_limit: 20,
      startup_error: null,
    }));
    expect(status.targets).toEqual([]);
    expect(status.recent_results).toEqual([]);
  });

  it('normalizes public health targets and records successful checks', async () => {
    keepaliveService.configure({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.onrender.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
      KEEPALIVE_TIMEOUT_MS: '5000',
      KEEPALIVE_RETRY_LIMIT: '1',
      KEEPALIVE_HISTORY_LIMIT: '20',
    });
    const fetchImpl = jest.fn().mockResolvedValue({ status: 200 });

    await keepaliveService.runChecks({ fetchImpl, logger: silentLogger });
    const status = keepaliveService.getStatus();

    expect(fetchImpl).toHaveBeenCalledWith('https://example.onrender.com/api/health', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        accept: 'application/json',
        'user-agent': 'KTHP-LTW-Keepalive/1.0',
      }),
    }));
    expect(status.status).toBe('healthy');
    expect(status.targets[0]).toEqual(expect.objectContaining({
      label: 'example.onrender.com',
      url_host: 'example.onrender.com',
      url_path: '/api/health',
      latest_status: 'healthy',
      latest_http_status: 200,
      consecutive_failures: 0,
    }));
    expect(status.recent_results[0]).toEqual(expect.objectContaining({
      target_label: 'example.onrender.com',
      status: 'healthy',
      http_status: 200,
      error_category: null,
      retry_scheduled: false,
    }));
  });

  it('prevents duplicate scheduler starts', () => {
    jest.useFakeTimers();

    const env = {
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.onrender.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
    };

    expect(keepaliveService.start({ env, fetchImpl: jest.fn(), logger: silentLogger })).toBe(true);
    expect(keepaliveService.start({ env, fetchImpl: jest.fn(), logger: silentLogger })).toBe(false);
  });

  it('records non-2xx failures and bounded retries', async () => {
    keepaliveService.configure({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.onrender.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
      KEEPALIVE_RETRY_LIMIT: '1',
    });
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce({ status: 503 })
      .mockResolvedValueOnce({ status: 503 });

    await keepaliveService.runChecks({ fetchImpl, logger: silentLogger });
    const status = keepaliveService.getStatus();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(status.status).toBe('failed');
    expect(status.targets[0]).toEqual(expect.objectContaining({
      latest_status: 'failed',
      latest_http_status: 503,
      consecutive_failures: 2,
    }));
    expect(status.recent_results).toHaveLength(2);
    expect(status.recent_results[1]).toEqual(expect.objectContaining({
      status: 'retrying',
      error_category: 'invalid-response',
      retry_scheduled: true,
    }));
    expect(status.recent_results[0]).toEqual(expect.objectContaining({
      status: 'failed',
      retry_scheduled: false,
    }));
  });

  it('categorizes timeout, dns, and network failures without leaking full URLs', async () => {
    keepaliveService.configure({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.onrender.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
      KEEPALIVE_RETRY_LIMIT: '0',
    });
    const timeoutError = new Error('The operation was aborted');
    timeoutError.name = 'AbortError';
    const fetchImpl = jest.fn().mockRejectedValue(timeoutError);

    await keepaliveService.runChecks({ fetchImpl, logger: silentLogger });
    const status = keepaliveService.getStatus();

    expect(status.status).toBe('failed');
    expect(status.targets[0]).not.toHaveProperty('url');
    expect(status.recent_results[0]).toEqual(expect.objectContaining({
      error_category: 'timeout',
      target_label: 'example.onrender.com',
    }));

    keepaliveService.configure({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.onrender.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
      KEEPALIVE_RETRY_LIMIT: '0',
    });
    await keepaliveService.runChecks({
      fetchImpl: jest.fn().mockRejectedValue(Object.assign(new Error('getaddrinfo'), { code: 'ENOTFOUND' })),
      logger: silentLogger,
    });
    expect(keepaliveService.getStatus().recent_results[0].error_category).toBe('dns');

    keepaliveService.configure({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.onrender.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
      KEEPALIVE_RETRY_LIMIT: '0',
    });
    await keepaliveService.runChecks({
      fetchImpl: jest.fn().mockRejectedValue(new TypeError('fetch failed')),
      logger: silentLogger,
    });
    expect(keepaliveService.getStatus().recent_results[0].error_category).toBe('network');
  });

  it.each([
    ['60', 'https://example.onrender.com/api/health', 'KEEPALIVE_INTERVAL_SECONDS must be at least 300'],
    ['600', 'not-a-url', 'absolute HTTP(S) URLs'],
    ['600', 'ftp://example.com/api/health', 'only HTTP(S) URLs'],
    ['600', 'https://user:pass@example.com/api/health', 'must not contain URL credentials'],
    ['600', 'http://localhost:5000/api/health', 'private'],
    ['600', 'http://127.0.0.1:5000/api/health', 'private'],
    ['600', 'http://10.0.0.5/api/health', 'private'],
    ['600', 'http://172.16.0.5/api/health', 'private'],
    ['600', 'http://192.168.1.5/api/health', 'private'],
    ['600', 'https://example.com/api/admin/users', 'must not point to admin'],
    ['600', 'https://example.com/api/health?token=secret', 'query strings'],
  ])('rejects unsafe keepalive config: %s %s', (interval, target, expectedMessage) => {
    const config = keepaliveService.configure({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_INTERVAL_SECONDS: interval,
      KEEPALIVE_TARGETS: target,
    });

    expect(config.status).toBe('configuration-error');
    expect(config.enabled).toBe(false);
    expect(config.startupError).toContain(expectedMessage);
    expect(keepaliveService.getStatus()).toEqual(expect.objectContaining({
      enabled: false,
      status: 'configuration-error',
    }));
  });

  it('rejects missing enabled targets, duplicate URLs, timeout bounds, retry bounds, and history bounds', () => {
    expect(keepaliveService.buildConfig({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_INTERVAL_SECONDS: '600',
    }).startupError).toContain('KEEPALIVE_TARGETS is required');

    expect(keepaliveService.buildConfig({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.com/api/health,https://example.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
    }).startupError).toContain('duplicate URLs');

    expect(keepaliveService.buildConfig({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
      KEEPALIVE_TIMEOUT_MS: '600000',
    }).startupError).toContain('must be shorter');

    expect(keepaliveService.buildConfig({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
      KEEPALIVE_RETRY_LIMIT: '5',
    }).startupError).toContain('KEEPALIVE_RETRY_LIMIT');

    expect(keepaliveService.buildConfig({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
      KEEPALIVE_HISTORY_LIMIT: '0',
    }).startupError).toContain('KEEPALIVE_HISTORY_LIMIT');
  });
});

describe('keepalive admin status endpoint', () => {
  beforeEach(() => {
    keepaliveService.resetForTests();
    jwtUtil.verifyAccessToken.mockReset();
  });

  afterEach(() => {
    keepaliveService.resetForTests();
  });

  it('allows ADMIN to review keepalive status', async () => {
    keepaliveService.configure({
      KEEPALIVE_ENABLED: 'true',
      KEEPALIVE_TARGETS: 'https://example.onrender.com/api/health',
      KEEPALIVE_INTERVAL_SECONDS: '600',
    });
    await keepaliveService.runChecks({
      fetchImpl: jest.fn().mockResolvedValue({ status: 200 }),
      logger: silentLogger,
    });

    const response = await makeAdminRequest(createAdminApp(), 'ADMIN');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      message: 'Keepalive status loaded',
    }));
    expect(response.body.data).toEqual(expect.objectContaining({
      enabled: true,
      status: 'healthy',
    }));
    expect(response.body.data.targets[0]).not.toHaveProperty('url');
  });

  it('denies MANAGER access to keepalive status', async () => {
    const response = await makeAdminRequest(createAdminApp(), 'MANAGER');

    expect(response.status).toBe(403);
    expect(response.body).toEqual(expect.objectContaining({ success: false }));
  });
});

describe('keepalive integration and documentation', () => {
  it('starts the scheduler after server startup validation', () => {
    const serverSource = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf8');

    expect(serverSource).toContain("const keepaliveService = require('./services/keepalive.service');");
    expect(serverSource).toContain('keepaliveService.start({ runImmediately: true });');
    expect(serverSource.indexOf('await ensureMenuImageColumnSupportsBase64')).toBeLessThan(
      serverSource.indexOf('keepaliveService.start({ runImmediately: true });')
    );
  });

  it('documents keepalive environment variables and Render rollback guidance', () => {
    const setupDoc = fs.readFileSync(path.join(__dirname, '../../../docs/setup.md'), 'utf8');
    const deploymentDoc = fs.readFileSync(path.join(__dirname, '../../../docs/05-deployment.md'), 'utf8');
    const envExample = fs.readFileSync(path.join(__dirname, '../.env.example'), 'utf8');

    [
      'KEEPALIVE_ENABLED',
      'KEEPALIVE_TARGETS',
      'KEEPALIVE_INTERVAL_SECONDS',
      'KEEPALIVE_TIMEOUT_MS',
      'KEEPALIVE_RETRY_LIMIT',
      'KEEPALIVE_HISTORY_LIMIT',
    ].forEach((name) => {
      expect(setupDoc).toContain(name);
      expect(deploymentDoc).toContain(name);
      expect(envExample).toContain(name);
    });

    expect(deploymentDoc).toContain('Render Free');
    expect(deploymentDoc).toContain('KEEPALIVE_ENABLED=false');
  });
});

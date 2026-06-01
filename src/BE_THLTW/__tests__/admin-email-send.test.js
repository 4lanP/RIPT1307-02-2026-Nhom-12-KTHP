require('./helpers/mockDb');
const express = require('express');
const nodemailer = require('nodemailer');
const { mockPool } = require('./helpers/mockDb');
const jwtUtil = require('../src/utils/jwt.util');
const errorHandler = require('../src/middlewares/error.middleware');
const dailyRevenueEmailService = require('../src/services/dailyRevenueEmail.service');
const adminRoutes = require('../src/routes/admin.routes');

jest.mock('nodemailer');
jest.mock('../src/utils/jwt.util');

const validEnv = {
  REPORT_EMAIL_ENABLED: 'true',
  REPORT_EMAIL_RECIPIENTS: 'scheduled@example.com,manager@example.com',
  REPORT_EMAIL_TIMEZONE: 'Asia/Ho_Chi_Minh',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
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
  jwtUtil.verifyAccessToken.mockReturnValue({ id: 7 });
  mockPool.query.mockResolvedValueOnce({
    rows: [{ id: 7, role, is_active: true }],
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

describe('admin immediate daily revenue email send', () => {
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

  it('allows ADMIN to send to one entered recipient without mutating scheduled recipients', async () => {
    dailyRevenueEmailService.configure(validEnv);
    const response = await makeAdminRequest(createAdminApp(), 'POST', '/admin/reports/daily-email/send-now', 'ADMIN', {
      recipient_email: ' Owner@Example.com ',
      report_date: '2026-05-29',
    }, [[
      { method: 'BANK_TRANSFER', total_revenue: '1250000', transaction_count: 14 },
    ]]);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(expect.objectContaining({
      report_date: '2026-05-29',
      trigger_type: 'immediate-recipient',
      status: 'sent',
      recipient_email: 'owner@example.com',
      recipient_count: 1,
      total_revenue: 1250000,
      transaction_count: 14,
    }));

    const sendMail = nodemailer.createTransport.mock.results[0].value.sendMail;
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: ['owner@example.com'],
    }));
    expect(dailyRevenueEmailService.getStatus().recipient_count).toBe(2);
  });

  it('uses the previous completed business day when report_date is omitted', async () => {
    dailyRevenueEmailService.configure(validEnv);
    const fakeEmail = { sendMail: jest.fn().mockResolvedValue({ messageId: 'mail-1' }) };
    const fakeReport = {
      getDailyRevenueSummary: jest.fn().mockResolvedValue({
        total_revenue: 0,
        transaction_count: 0,
        payment_methods: [],
      }),
    };

    const result = await dailyRevenueEmailService.sendImmediateRecipientReport(null, 'owner@example.com', {
      now: new Date('2026-05-30T01:00:00.000Z'),
      reportService: fakeReport,
      emailService: fakeEmail,
    });

    expect(result).toEqual(expect.objectContaining({
      report_date: '2026-05-29',
      recipient_email: 'owner@example.com',
      total_revenue: 0,
      transaction_count: 0,
    }));
  });

  it('rejects invalid emails, future dates, and non-admin users before delivery', async () => {
    dailyRevenueEmailService.configure(validEnv);
    const invalidEmail = await makeAdminRequest(createAdminApp(), 'POST', '/admin/reports/daily-email/send-now', 'ADMIN', {
      recipient_email: 'not-an-email',
      report_date: '2026-05-29',
    });
    expect(invalidEmail.status).toBe(400);

    const futureDate = await makeAdminRequest(createAdminApp(), 'POST', '/admin/reports/daily-email/send-now', 'ADMIN', {
      recipient_email: 'owner@example.com',
      report_date: '2999-01-01',
    });
    expect(futureDate.status).toBe(400);

    const manager = await makeAdminRequest(createAdminApp(), 'POST', '/admin/reports/daily-email/send-now', 'MANAGER', {
      recipient_email: 'owner@example.com',
      report_date: '2026-05-29',
    });
    expect(manager.status).toBe(403);
    expect(nodemailer.createTransport().sendMail).not.toHaveBeenCalled();
  });

  it('returns safe unavailable and provider failure states', async () => {
    dailyRevenueEmailService.configure({ ...validEnv, REPORT_EMAIL_ENABLED: 'false' });
    const disabled = await makeAdminRequest(createAdminApp(), 'POST', '/admin/reports/daily-email/send-now', 'ADMIN', {
      recipient_email: 'owner@example.com',
      report_date: '2026-05-29',
    });
    expect(disabled.status).toBe(400);
    expect(JSON.stringify(disabled.body)).not.toContain('smtp.example.com');

    dailyRevenueEmailService.configure(validEnv);
    nodemailer.createTransport.mockReturnValueOnce({
      sendMail: jest.fn().mockRejectedValue(Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT' })),
    });
    const providerFailure = await makeAdminRequest(createAdminApp(), 'POST', '/admin/reports/daily-email/send-now', 'ADMIN', {
      recipient_email: 'owner@example.com',
      report_date: '2026-05-29',
    }, [[]]);

    expect(providerFailure.status).toBe(502);
    expect(providerFailure.body.message).toBe('Daily revenue email: provider-timeout');
  });

  it('includes safe immediate-recipient attempts in status responses', async () => {
    dailyRevenueEmailService.configure(validEnv);
    await dailyRevenueEmailService.sendImmediateRecipientReport('2026-05-29', 'owner@example.com', {
      reportService: {
        getDailyRevenueSummary: jest.fn().mockResolvedValue({
          total_revenue: 0,
          transaction_count: 0,
          payment_methods: [],
        }),
      },
      emailService: { sendMail: jest.fn().mockResolvedValue({ messageId: 'mail-1' }) },
      requestedByUserId: 7,
    });

    const response = await makeAdminRequest(createAdminApp(), 'GET', '/admin/reports/daily-email/status', 'ADMIN');

    expect(response.status).toBe(200);
    expect(response.body.data.last_attempt).toEqual(expect.objectContaining({
      trigger_type: 'immediate-recipient',
      recipient_email: 'owner@example.com',
      recipient_count: 1,
      status: 'sent',
    }));
    expect(JSON.stringify(response.body.data)).not.toContain('SMTP');
  });
});

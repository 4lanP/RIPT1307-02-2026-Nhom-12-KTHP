const { createPaymentUrl, verifyIPN } = require('../src/utils/vnpay.util');
const querystring = require('qs');
const crypto = require('crypto');
const { mockClient } = require('./helpers/mockDb');

jest.mock('../src/config/vnpay', () => ({
  vnp_TmnCode: 'TESTCODE',
  vnp_HashSecret: 'SECRETKEY123',
  vnp_Url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_ReturnUrl: 'http://localhost/return',
}));

jest.mock('../src/config/redis', () => ({
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
}));

const { acquireLock, releaseLock } = require('../src/config/redis');

describe('VNPay Utils', () => {
  it('createPaymentUrl() trả về URL hợp lệ chứa đúng param', () => {
    const url = createPaymentUrl('127.0.0.1', 100000, 'Test Order', 'REF123');
    expect(url).toContain('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    expect(url).toContain('vnp_Amount=10000000'); // Amount x 100
    expect(url).toContain('vnp_TmnCode=TESTCODE');
    expect(url).toContain('vnp_TxnRef=REF123');
    expect(url).toContain('vnp_SecureHash=');
  });

  it('verifyIPN() với chữ ký đúng trả về true', () => {
    const params = {
      vnp_Amount: '10000000',
      vnp_TxnRef: 'REF123',
    };
    
    // Sort keys and sign
    const sortedKeys = Object.keys(params).sort();
    let sortedParams = {};
    for (let key of sortedKeys) {
      sortedParams[key] = params[key];
    }
    
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', 'SECRETKEY123');
    const signed = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');
    
    params['vnp_SecureHash'] = signed;
    
    expect(verifyIPN(params)).toBe(true);
  });

  it('verifyIPN() với chữ ký sai trả về false', () => {
    const params = {
      vnp_Amount: '10000000',
      vnp_TxnRef: 'REF123',
      vnp_SecureHash: 'wronghash123',
    };
    expect(verifyIPN(params)).toBe(false);
  });
});

describe('VNPay payment service hardening', () => {
  beforeEach(() => {
    acquireLock.mockReset();
    releaseLock.mockReset();
    acquireLock.mockResolvedValue(true);
    releaseLock.mockResolvedValue(true);
  });

  function signPayload(payload) {
    const sortedParams = {};
    Object.keys(payload).sort().forEach((key) => {
      sortedParams[key] = payload[key];
    });
    const signData = querystring.stringify(sortedParams, { encode: false });
    return crypto.createHmac('sha512', 'SECRETKEY123').update(Buffer.from(signData, 'utf-8')).digest('hex');
  }

  it('generates opaque unique transaction references', () => {
    const { generateTransactionRef } = require('../src/services/payment.service');
    const refs = new Set(Array.from({ length: 20 }, () => generateTransactionRef()));

    expect(refs.size).toBe(20);
    refs.forEach((ref) => {
      expect(ref).toMatch(/^RES-[0-9a-f-]{36}$/);
    });
  });

  it('returns idempotent duplicate status without mutating completed payments again', async () => {
    const { processVNPayWebhook } = require('../src/services/payment.service');
    const payload = {
      vnp_Amount: '10000000',
      vnp_TxnRef: 'RES-existing',
      vnp_ResponseCode: '00',
    };
    payload.vnp_SecureHash = signPayload(payload);
    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [{ session_id: 10, amount: '100000', status: 'COMPLETED' }],
      })
      .mockResolvedValueOnce({});

    const result = await processVNPayWebhook(payload);

    expect(result).toEqual({ RspCode: '02', Message: 'Order already confirmed' });
    expect(mockClient.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE SESSIONS'),
      expect.any(Array)
    );
    expect(releaseLock).toHaveBeenCalledWith('webhook:vnpay:RES-existing');
  });
});

const { createPaymentUrl, verifyIPN } = require('../src/utils/vnpay.util');
const querystring = require('qs');
const crypto = require('crypto');

jest.mock('../src/config/vnpay', () => ({
  vnp_TmnCode: 'TESTCODE',
  vnp_HashSecret: 'SECRETKEY123',
  vnp_Url: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_ReturnUrl: 'http://localhost/return',
}));

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

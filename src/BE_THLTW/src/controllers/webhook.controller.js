const paymentService = require('../services/payment.service');

async function vnpayWebhook(req, res, next) {
  try {
    const ipnData = req.method === 'GET' ? req.query : { ...req.body, ...req.query };
    // VNPay IPN thường gửi qua GET (query params)
    const result = await paymentService.processVNPayWebhook(ipnData);
    
    // VNPay yêu cầu trả về theo cấu trúc của họ
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  vnpayWebhook,
};

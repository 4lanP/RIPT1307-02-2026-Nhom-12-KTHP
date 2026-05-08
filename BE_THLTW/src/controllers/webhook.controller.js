const paymentService = require('../services/payment.service');

async function vnpayWebhook(req, res, next) {
  try {
    const queryData = req.query;
    // VNPay IPN thường gửi qua GET (query params)
    const result = await paymentService.processVNPayWebhook(queryData);
    
    // VNPay yêu cầu trả về theo cấu trúc của họ
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  vnpayWebhook,
};

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const qs = require('qs');
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

// Chuẩn hóa sắp xếp và encode theo đúng tài liệu VNPay SDK
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}

// Lấy ngày giờ theo định dạng yyyyMMddHHmmss chuẩn múi giờ Việt Nam (GMT+7)
function getVNPayCreateDate(date = new Date()) {
  const vnFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = vnFormatter.formatToParts(date);
  const p = {};
  parts.forEach(part => { p[part.type] = part.value; });
  return `${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second}`;
}

// POST /api/payment/create - Tạo URL thanh toán VNPay
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 10000) {
      return res.status(400).json({ error: 'Số tiền nạp tối thiểu là 10,000đ!' });
    }

    const userSuffix = (req.userId || '0000').slice(-4);
    const txnRef = `GD${Date.now()}${userSuffix}`;
    const createDate = getVNPayCreateDate();

    // Lấy IP chuẩn IPv4
    let ipAddr = req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip || '127.0.0.1';
    if (ipAddr === '::1' || ipAddr === '::ffff:127.0.0.1') {
      ipAddr = '127.0.0.1';
    }

    // Tự động điều chỉnh returnUrl phù hợp cho cả local và cloud
    const returnUrl = process.env.VNP_RETURN_URL && !process.env.VNP_RETURN_URL.includes('your-railway-app')
      ? process.env.VNP_RETURN_URL
      : `${req.protocol}://${req.get('host')}/api/payment/vnpay-return`;

    // Lưu giao dịch chờ duyệt vào Firebase
    await db.collection('transactions').doc(txnRef).set({
      userId: req.userId,
      type: 'deposit',
      amount: parseInt(amount),
      txnRef,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    const vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: process.env.VNP_TMN_CODE,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Nap tien game ${txnRef}`,
      vnp_OrderType: 'other',
      vnp_Amount: parseInt(amount) * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    const sortedParams = sortObject(vnpParams);
    const signData = qs.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    sortedParams['vnp_SecureHash'] = signed;

    const paymentUrl = `${process.env.VNP_URL}?${qs.stringify(sortedParams, { encode: false })}`;
    res.json({ paymentUrl, txnRef });
  } catch (err) {
    console.error('Payment create error:', err);
    res.status(500).json({ error: 'Lỗi tạo thanh toán!' });
  }
});

// GET /api/payment/vnpay-return - Callback từ VNPay
router.get('/vnpay-return', async (req, res) => {
  try {
    let vnpParams = { ...req.query };
    const secureHash = vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    vnpParams = sortObject(vnpParams);
    const signData = qs.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET);
    const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (checkHash !== secureHash) {
      console.warn('VNPay hash mismatch!', { checkHash, secureHash });
      return res.redirect(`/?payment=invalid`);
    }

    const txnRef = vnpParams['vnp_TxnRef'];
    const responseCode = vnpParams['vnp_ResponseCode'];

    if (responseCode === '00') {
      // Thanh toán thành công - cộng tiền vào ví game người chơi
      const txnDoc = await db.collection('transactions').doc(txnRef).get();
      if (txnDoc.exists && txnDoc.data().status === 'pending') {
        const txnData = txnDoc.data();
        const batch = db.batch();
        batch.update(db.collection('transactions').doc(txnRef), { status: 'success' });
        const userRef = db.collection('users').doc(txnData.userId);
        const userDoc = await userRef.get();
        batch.update(userRef, { balance: (userDoc.data().balance || 0) + txnData.amount });
        await batch.commit();
      }
      return res.redirect(`/?payment=success&amount=${vnpParams['vnp_Amount'] / 100}`);
    } else {
      await db.collection('transactions').doc(txnRef).update({ status: 'failed' });
      return res.redirect(`/?payment=failed`);
    }
  } catch (err) {
    console.error('VNPay return error:', err);
    res.redirect(`/?payment=error`);
  }
});

module.exports = router;

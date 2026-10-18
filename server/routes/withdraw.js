const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

// POST /api/withdraw/request - Gửi yêu cầu rút tiền
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { amount, password } = req.body;
    const withdrawAmount = parseInt(amount);

    if (!withdrawAmount || withdrawAmount < 10000) {
      return res.status(400).json({ error: 'Số tiền rút tối thiểu là 10,000đ!' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu xác nhận!' });
    }

    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Không tìm thấy tài khoản!' });
    const user = userDoc.data();

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Mật khẩu không đúng!' });
    }

    if (user.balance < withdrawAmount) {
      return res.status(400).json({ error: 'Số dư không đủ để rút!' });
    }

    // Deduct balance and create withdrawal request
    const batch = db.batch();
    batch.update(db.collection('users').doc(req.userId), {
      balance: user.balance - withdrawAmount
    });

    const withdrawRef = db.collection('withdrawals').doc();
    batch.set(withdrawRef, {
      userId: req.userId,
      amount: withdrawAmount,
      bankAccount: user.bankAccount,
      userEmail: user.email,
      userPhone: user.phone,
      status: 'pending',
      rejectReason: '',
      reviewedAt: null,
      createdAt: new Date().toISOString()
    });

    await batch.commit();
    res.json({ success: true, withdrawId: withdrawRef.id, message: 'Yêu cầu rút tiền đã được gửi!' });
  } catch (err) {
    console.error('Withdraw request error:', err);
    res.status(500).json({ error: 'Lỗi server!' });
  }
});

// GET /api/withdraw/history - Lịch sử rút tiền của user
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('withdrawals')
      .where('userId', '==', req.userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const history = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(history);
  } catch (err) {
    console.error('Withdraw history error:', err);
    res.status(500).json({ error: 'Lỗi server!' });
  }
});

module.exports = router;

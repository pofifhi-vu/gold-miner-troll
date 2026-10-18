const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const adminAuth = require('../middleware/adminAuth');

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ isAdmin: true }, process.env.ADMIN_JWT_SECRET, { expiresIn: '8h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu admin không đúng!' });
});

// GET /api/admin/withdrawals - Danh sách tất cả yêu cầu rút tiền
router.get('/withdrawals', adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.collection('withdrawals').orderBy('createdAt', 'desc').limit(100);
    if (status && status !== 'all') {
      query = db.collection('withdrawals').where('status', '==', status).orderBy('createdAt', 'desc').limit(100);
    }
    const snapshot = await query.get();
    const withdrawals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(withdrawals);
  } catch (err) {
    console.error('Admin withdrawals error:', err);
    res.status(500).json({ error: 'Lỗi server!' });
  }
});

// POST /api/admin/withdrawals/:id/approve - Phê duyệt
router.post('/withdrawals/:id/approve', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const withdrawDoc = await db.collection('withdrawals').doc(id).get();
    if (!withdrawDoc.exists) return res.status(404).json({ error: 'Không tìm thấy yêu cầu!' });
    if (withdrawDoc.data().status !== 'pending') {
      return res.status(400).json({ error: 'Yêu cầu này đã được xử lý rồi!' });
    }
    await db.collection('withdrawals').doc(id).update({
      status: 'approved',
      reviewedAt: new Date().toISOString()
    });
    res.json({ success: true, message: 'Đã phê duyệt yêu cầu rút tiền!' });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Lỗi server!' });
  }
});

// POST /api/admin/withdrawals/:id/reject - Từ chối
router.post('/withdrawals/:id/reject', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason } = req.body;
    if (!rejectReason || !rejectReason.trim()) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do từ chối!' });
    }
    const withdrawDoc = await db.collection('withdrawals').doc(id).get();
    if (!withdrawDoc.exists) return res.status(404).json({ error: 'Không tìm thấy yêu cầu!' });
    if (withdrawDoc.data().status !== 'pending') {
      return res.status(400).json({ error: 'Yêu cầu này đã được xử lý rồi!' });
    }

    // Refund balance to user
    const withdrawData = withdrawDoc.data();
    const userDoc = await db.collection('users').doc(withdrawData.userId).get();
    if (userDoc.exists) {
      await db.collection('users').doc(withdrawData.userId).update({
        balance: userDoc.data().balance + withdrawData.amount
      });
    }

    await db.collection('withdrawals').doc(id).update({
      status: 'rejected',
      rejectReason: rejectReason.trim(),
      reviewedAt: new Date().toISOString()
    });
    res.json({ success: true, message: 'Đã từ chối và hoàn tiền cho người dùng!' });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Lỗi server!' });
  }
});

// GET /api/admin/stats - Thống kê tổng quan
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [pendingSnap, approvedSnap, rejectedSnap, usersSnap] = await Promise.all([
      db.collection('withdrawals').where('status', '==', 'pending').get(),
      db.collection('withdrawals').where('status', '==', 'approved').get(),
      db.collection('withdrawals').where('status', '==', 'rejected').get(),
      db.collection('users').get()
    ]);

    const approvedTotal = approvedSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

    res.json({
      pending: pendingSnap.size,
      approved: approvedSnap.size,
      rejected: rejectedSnap.size,
      totalUsers: usersSnap.size,
      approvedTotal
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server!' });
  }
});

module.exports = router;

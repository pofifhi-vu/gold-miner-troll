const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, bankAccount } = req.body;
    if (!email || !phone || !password || !bankAccount) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin!' });
    }

    // Check email exists
    const existing = await db.collection('users').where('email', '==', email.toLowerCase()).get();
    if (!existing.empty) {
      return res.status(400).json({ error: 'Email này đã được đăng ký!' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRef = db.collection('users').doc();
    await userRef.set({
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      bankAccount,
      balance: 0,
      createdAt: new Date().toISOString()
    });

    const token = jwt.sign({ userId: userRef.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: {
        id: userRef.id,
        email: email.toLowerCase(),
        phone,
        bankAccount,
        balance: 0
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi server, thử lại sau!' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu!' });
    }

    const snapshot = await db.collection('users').where('email', '==', email.toLowerCase()).get();
    if (snapshot.empty) {
      return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng!' });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng!' });
    }

    const token = jwt.sign({ userId: userDoc.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: {
        id: userDoc.id,
        email: user.email,
        phone: user.phone,
        bankAccount: user.bankAccount,
        balance: user.balance
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi server, thử lại sau!' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Không tìm thấy tài khoản!' });
    const user = userDoc.data();
    res.json({
      id: userDoc.id,
      email: user.email,
      phone: user.phone,
      bankAccount: user.bankAccount,
      balance: user.balance
    });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server!' });
  }
});

module.exports = router;

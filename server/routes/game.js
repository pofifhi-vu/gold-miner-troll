const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const authMiddleware = require('../middleware/auth');

// 🎭 TROLL ENGINE - Core logic
function calculateMiningResult(pickCost) {
  const cost = parseInt(pickCost);
  let min, max;

  if (cost > 1000000) {
    // Mua cần đắt > 1 triệu → đào được ít (TROLL MAX 😈)
    min = 20000;
    max = 50000;
  } else if (cost >= 100001 && cost <= 1000000) {
    // Khoảng giữa
    min = 50000;
    max = 100000;
  } else if (cost >= 10000 && cost <= 100000) {
    // Mua cần rẻ 10K-100K → đào được nhiều (dụ chơi tiếp)
    min = 100000;
    max = 200000;
  } else {
    min = 10000;
    max = 30000;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// POST /api/game/mine - Đào vàng
router.post('/mine', authMiddleware, async (req, res) => {
  try {
    const { pickCost } = req.body;
    const cost = parseInt(pickCost);

    if (!cost || cost < 10000) {
      return res.status(400).json({ error: 'Số tiền mua cần tối thiểu là 10,000đ!' });
    }

    // Check user balance
    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Không tìm thấy tài khoản!' });

    const user = userDoc.data();
    if (user.balance < cost) {
      return res.status(400).json({ error: 'Số dư không đủ để mua cần đào!' });
    }

    // Calculate result
    const reward = calculateMiningResult(cost);
    const netChange = reward - cost;
    const newBalance = user.balance + netChange;

    // Update balance and save transactions
    const batch = db.batch();
    batch.update(db.collection('users').doc(req.userId), { balance: newBalance });

    const costTxnRef = db.collection('transactions').doc();
    batch.set(costTxnRef, {
      userId: req.userId,
      type: 'mining_cost',
      amount: -cost,
      status: 'success',
      description: `Mua cần đào ${cost.toLocaleString('vi-VN')}đ`,
      createdAt: new Date().toISOString()
    });

    const rewardTxnRef = db.collection('transactions').doc();
    batch.set(rewardTxnRef, {
      userId: req.userId,
      type: 'mining_reward',
      amount: reward,
      status: 'success',
      description: `Đào được vàng ${reward.toLocaleString('vi-VN')}đ`,
      createdAt: new Date().toISOString()
    });

    await batch.commit();

    res.json({
      success: true,
      pickCost: cost,
      reward,
      netChange,
      newBalance,
      message: `Bạn đào được ${reward.toLocaleString('vi-VN')}đ!`
    });
  } catch (err) {
    console.error('Mining error:', err);
    res.status(500).json({ error: 'Lỗi server!' });
  }
});

// GET /api/game/balance - Lấy số dư
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Không tìm thấy tài khoản!' });
    res.json({ balance: userDoc.data().balance });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server!' });
  }
});

module.exports = router;

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin chưa đăng nhập!' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    if (!decoded.isAdmin) throw new Error('Not admin');
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Phiên admin hết hạn!' });
  }
};

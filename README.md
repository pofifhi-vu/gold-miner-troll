# ⛏️ Game Đào Vàng Troll (Gold Miner Troll) 😈

Trò chơi đào vàng vui nhộn chạy trên nền tảng web (tối ưu xoay ngang cho mobile/desktop).

## ✨ Tính Năng Nổi Bật
- 🎮 **Game Đào Vàng**: Cơ chế gắp vàng, kim cương, đá với tỉ lệ trúng hấp dẫn.
- 💰 **Nạp Tiền VNPay**: Tích hợp cổng thanh toán Sandbox VNPay an toàn, nhanh chóng.
- 🛡️ **Admin Panel**: Quản lý người chơi, duyệt hoặc từ chối yêu cầu rút tiền với lý do troll.
- 🔥 **Firebase Firestore Database**: Đồng bộ dữ liệu người dùng, số dư, lịch sử giao dịch.
- 🚀 **Railway Deployment Ready**: Sẵn sàng deploy production với Procfile và cấu hình Express tối ưu.

## 🚀 Chạy Cục Bộ (Local)
1. Cài đặt thư viện:
   ```bash
   npm install
   ```
2. Khởi chạy server:
   ```bash
   node server/server.js
   ```
3. Truy cập:
   - **Game**: `http://localhost:3000/client/`
   - **Admin**: `http://localhost:3000/admin/`

## 📦 Công Nghệ Sử Dụng
- **Backend**: Node.js, Express, Firebase Admin SDK, JWT, VNPay SDK (HMAC-SHA512)
- **Frontend**: HTML5 Canvas, Vanilla JS, CSS3 Modern Glassmorphism & Animations
- **Hosting**: Railway / Heroku

# 🎮 Game Đào Vàng Troll - Hướng Dẫn Setup

## Cấu Trúc Dự Án
```
gold-miner-troll/
├── client/           ← App game (HTML/CSS/JS)
│   ├── index.html
│   ├── css/main.css
│   └── js/ (api.js, game.js, app.js)
├── admin/            ← Trang web admin
│   └── index.html
├── server/           ← Backend Node.js
│   ├── server.js
│   ├── config/firebase.js
│   ├── middleware/ (auth.js, adminAuth.js)
│   └── routes/ (auth.js, payment.js, game.js, withdraw.js, admin.js)
├── .env              ← Cấu hình (KHÔNG commit lên git)
├── package.json
└── Procfile          ← Railway deployment
```

---

## BƯỚC 1: Cài Node.js

Tải và cài tại: https://nodejs.org (chọn LTS)

Sau khi cài xong, mở Terminal/PowerShell kiểm tra:
```bash
node --version   # v18+
npm --version    # 9+
```

---

## BƯỚC 2: Cài Firebase

### 2.1 Tạo Firebase Project
1. Vào https://console.firebase.google.com
2. Click **"Add project"** → Đặt tên (VD: `gold-miner-troll`)
3. Tắt Google Analytics → **Create project**

### 2.2 Bật Firestore Database
1. Trong Firebase Console → **Firestore Database**
2. Click **"Create database"**
3. Chọn **"Start in test mode"** → Next → **Enable**

### 2.3 Tạo Firestore Indexes (BẮT BUỘC)
Vào Firestore → **Indexes** → **Composite** → Add index:
- Collection: `withdrawals`, Field: `userId ASC, createdAt DESC`
- Collection: `withdrawals`, Field: `status ASC, createdAt DESC`

### 2.4 Lấy Service Account Key
1. **Project Settings** (bánh răng) → **Service accounts**
2. Click **"Generate new private key"** → **Generate key**
3. File JSON sẽ được tải về, mở ra và copy từng giá trị vào `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id          # "project_id" trong JSON
FIREBASE_PRIVATE_KEY_ID=xxx                   # "private_key_id" trong JSON
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."  # "private_key"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...  # "client_email"
FIREBASE_CLIENT_ID=xxx                        # "client_id"
```

> ⚠️ QUAN TRỌNG: `FIREBASE_PRIVATE_KEY` phải để trong ngoặc kép `"..."` và giữ nguyên format `\n`

---

## BƯỚC 3: Cập nhật .env

Mở file `.env` và điền đầy đủ:

```env
PORT=3000

# Firebase (từ service account JSON)
FIREBASE_PROJECT_ID=gold-miner-troll
FIREBASE_PRIVATE_KEY_ID=abc123...
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@gold-miner-troll.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=1234567890

# JWT
JWT_SECRET=gold_miner_troll_super_secret_key_2026_xXx

# VNPay Sandbox (đã có sẵn từ email)
VNP_TMN_CODE=HOFCG51P
VNP_HASH_SECRET=CAJNLMADSNCVWFCRVAPCMWQFMUAHZKDL
VNP_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:3000/api/payment/vnpay-return  # đổi khi deploy

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123456
ADMIN_JWT_SECRET=admin_super_secret_2026
```

---

## BƯỚC 4: Chạy Local

```bash
# Trong thư mục dự án
cd "c:\Users\giahu\Downloads\New folder (3)"

# Cài dependencies
npm install

# Chạy server
npm run dev
```

Mở trình duyệt:
- 🎮 Game: http://localhost:3000
- 🛡️ Admin: http://localhost:3000/admin

---

## BƯỚC 5: Deploy lên Railway

### 5.1 Push lên GitHub
```bash
git init
git add .
git commit -m "Initial commit"
# Tạo repo trên GitHub rồi push lên
git remote add origin https://github.com/yourusername/gold-miner-troll.git
git push -u origin main
```

### 5.2 Deploy Railway
1. Vào https://railway.app → Login bằng GitHub
2. **"New Project"** → **"Deploy from GitHub repo"**
3. Chọn repo vừa push
4. Railway tự detect Node.js và deploy

### 5.3 Thêm Environment Variables
Trong Railway → Project → **Variables** → Add từng biến trong `.env`:
- Thêm tất cả các biến từ file `.env`
- **QUAN TRỌNG**: Đổi `VNP_RETURN_URL` thành URL Railway của bạn:
  ```
  VNP_RETURN_URL=https://your-app.up.railway.app/api/payment/vnpay-return
  ```

### 5.4 Cập nhật VNPay Return URL
Vào https://sandbox.vnpayment.vn/merchantv2/ → Cấu hình → Cập nhật Return URL thành URL Railway

---

## BƯỚC 6: Đóng Gói Android (Tùy Chọn)

### Cách 1: PWA (Đơn giản nhất - Không cần APK)
Sau khi có URL Railway, bạn bè truy cập bằng Chrome → Menu → "Thêm vào màn hình chính"
→ Chạy như app bình thường!

### Cách 2: APK bằng Capacitor
```bash
# Cài Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Đào Vàng" "com.daovang.troll"

# Copy client vào www
mkdir www && cp -r client/* www/

# Thêm Android
npx cap add android
npx cap sync

# Mở Android Studio để build APK
npx cap open android
```

---

## Cơ Chế Troll (Nhắc lại)

| Giá cần mua | Kết quả đào được | Hiệu quả |
|-------------|-----------------|----------|
| > 1,000,000đ | 🤣 20K - 50K | LỖ SẤP MẶT |
| 100K - 1M | 50K - 100K | Lỗ vừa |
| 10K - 100K | 💰 100K - 200K | Có lời (dụ chơi tiếp) |

---

## Admin Panel
- URL: `https://your-app.up.railway.app/admin`
- Username: `admin` (hoặc thay trong .env)
- Password: `admin123456` (hoặc thay trong .env)

Khi bạn bè gửi yêu cầu rút tiền → Vào admin → Duyệt hoặc từ chối kèm lý do!

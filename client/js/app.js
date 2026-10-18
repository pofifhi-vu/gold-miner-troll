// =============================================
// App Logic - Gold Miner Troll Game
// =============================================

let currentUser = null;
let historyData = [];
let historyFilter = 'all';

// =====================
// INIT
// =====================
window.addEventListener('DOMContentLoaded', async () => {
  // Check payment return
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');
  const paymentAmount = urlParams.get('amount');

  // Clean URL
  if (paymentStatus) {
    window.history.replaceState({}, '', '/');
  }

  const token = localStorage.getItem('gm_token');
  if (token) {
    try {
      const data = await AuthAPI.me();
      currentUser = data;
      showGame();

      if (paymentStatus === 'success') {
        await refreshBalance();
        showToast(`✅ Nạp tiền thành công ${formatMoney(parseInt(paymentAmount))}!`, 'success');
      } else if (paymentStatus === 'failed') {
        showToast('❌ Thanh toán không thành công!', 'error');
      }
    } catch {
      localStorage.removeItem('gm_token');
      showAuth();
    }
  } else {
    showAuth();
  }
});

// =====================
// SCREEN MANAGEMENT
// =====================
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) {
    screen.classList.remove('hidden');
    screen.classList.add('active');
  }
}

function showAuth() {
  stopGameLoop();
  showScreen('screen-auth');
  showLogin();
}

function showGame() {
  showScreen('screen-game');
  updateBalanceDisplay();
  startGameLoop();
}

function showWithdraw() {
  stopGameLoop();
  showScreen('screen-withdraw');
  if (currentUser) {
    document.getElementById('withdraw-balance').textContent = formatMoney(currentUser.balance);
    document.getElementById('withdraw-bank').value = maskBankAccount(currentUser.bankAccount);
  }
}

function showHistory() {
  stopGameLoop();
  showScreen('screen-history');
  loadHistory();
}

// =====================
// AUTH FORMS
// =====================
function showLogin() {
  document.getElementById('form-login').classList.remove('hidden');
  document.getElementById('form-register').classList.add('hidden');
  document.getElementById('login-error').classList.add('hidden');
}

function showRegister() {
  document.getElementById('form-register').classList.remove('hidden');
  document.getElementById('form-login').classList.add('hidden');
  document.getElementById('register-error').classList.add('hidden');
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');

  errEl.classList.add('hidden');
  if (!email || !password) {
    errEl.textContent = 'Vui lòng điền đầy đủ thông tin!';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>Đang đăng nhập...</span>';
  try {
    const data = await AuthAPI.login({ email, password });
    localStorage.setItem('gm_token', data.token);
    currentUser = data.user;
    showGame();
    showToast('👋 Chào mừng trở lại!', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Đăng Nhập</span><span class="btn-arrow">→</span>';
  }
}

async function handleRegister() {
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  const bankAccount = document.getElementById('reg-bank').value.trim();
  const errEl = document.getElementById('register-error');
  const btn = document.getElementById('btn-register');

  errEl.classList.add('hidden');
  if (!email || !phone || !password || !bankAccount) {
    errEl.textContent = 'Vui lòng điền đầy đủ thông tin!';
    errEl.classList.remove('hidden');
    return;
  }
  if (password !== confirm) {
    errEl.textContent = 'Mật khẩu nhập lại không khớp!';
    errEl.classList.remove('hidden');
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Mật khẩu phải có ít nhất 6 ký tự!';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span>Đang tạo tài khoản...</span>';
  try {
    const data = await AuthAPI.register({ email, phone, password, bankAccount });
    localStorage.setItem('gm_token', data.token);
    currentUser = data.user;
    showGame();
    showToast('🎉 Tạo tài khoản thành công! Chúc bạn may mắn!', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Tạo Tài Khoản</span><span class="btn-arrow">→</span>';
  }
}

function handleLogout() {
  if (!confirm('Bạn có muốn đăng xuất không?')) return;
  localStorage.removeItem('gm_token');
  currentUser = null;
  stopGameLoop();
  showAuth();
  showToast('👋 Đã đăng xuất!');
}

// =====================
// BALANCE
// =====================
function formatMoney(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

function maskBankAccount(account) {
  if (!account || account.length < 6) return account;
  return account.slice(0, 3) + '***' + account.slice(-3);
}

function updateBalanceDisplay() {
  if (currentUser) {
    document.getElementById('balance-amount').textContent = formatMoney(currentUser.balance);
  }
}

async function refreshBalance() {
  try {
    const data = await GameAPI.getBalance();
    if (currentUser) {
      currentUser.balance = data.balance;
      updateBalanceDisplay();
    }
  } catch (e) {}
}

// =====================
// TOP-UP (NAP TIEN)
// =====================
function showTopup() {
  document.getElementById('topup-amount').value = '';
  document.getElementById('topup-error').classList.add('hidden');
  document.getElementById('modal-topup').classList.remove('hidden');
}

function setTopupAmount(amount) {
  document.getElementById('topup-amount').value = amount;
}

async function handleTopup() {
  const amount = parseInt(document.getElementById('topup-amount').value);
  const errEl = document.getElementById('topup-error');
  errEl.classList.add('hidden');

  if (!amount || amount < 10000) {
    errEl.textContent = 'Số tiền nạp tối thiểu là 10,000đ!';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    const data = await PaymentAPI.createPayment(amount);
    // Redirect to VNPay
    window.location.href = data.paymentUrl;
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

// =====================
// MINING (ĐÀO VÀNG)
// =====================
function showMineModal() {
  document.getElementById('mine-cost').value = '';
  document.getElementById('mine-error').classList.add('hidden');
  document.getElementById('mine-balance-display').textContent = formatMoney(currentUser ? currentUser.balance : 0);
  document.getElementById('modal-mine').classList.remove('hidden');
}

function setMineCost(amount) {
  document.getElementById('mine-cost').value = amount;
  updateMinePreview();
}

function updateMinePreview() {
  // Optional: show if they have enough
}

async function handleMine() {
  const pickCost = parseInt(document.getElementById('mine-cost').value);
  const errEl = document.getElementById('mine-error');
  errEl.classList.add('hidden');

  if (!pickCost || pickCost < 10000) {
    errEl.textContent = 'Số tiền mua cần tối thiểu là 10,000đ!';
    errEl.classList.remove('hidden');
    return;
  }

  if (currentUser && currentUser.balance < pickCost) {
    errEl.textContent = '❌ Số dư không đủ để mua cần đào!';
    errEl.classList.remove('hidden');
    return;
  }

  closeModal('modal-mine');
  showLoading('⛏️ Đang đào vàng...');

  // Play mining animation
  playMiningAnimation(async () => {
    try {
      const result = await GameAPI.mine(pickCost);
      hideLoading();

      // Update balance
      if (currentUser) {
        currentUser.balance = result.newBalance;
        updateBalanceDisplay();
      }

      // Show result
      showMiningResult(result);
    } catch (err) {
      hideLoading();
      showToast('❌ ' + err.message, 'error');
    }
  });
}

function showMiningResult(result) {
  const net = result.netChange;
  const won = net > 0;

  document.getElementById('result-icon').textContent = result.reward > 100000 ? '💎' : result.reward > 50000 ? '🪙' : '🪨';
  document.getElementById('result-title').textContent = won ? '💰 Chúc Mừng!' : '😅 Ôi không!';
  document.getElementById('result-message').textContent = result.message;
  document.getElementById('result-cost').textContent = '-' + formatMoney(result.pickCost);
  document.getElementById('result-reward').textContent = '+' + formatMoney(result.reward);
  document.getElementById('result-balance').textContent = formatMoney(result.newBalance);

  document.getElementById('modal-result').classList.remove('hidden');
}

// =====================
// WITHDRAW (RUT TIEN)
// =====================
async function handleWithdraw() {
  const amount = parseInt(document.getElementById('withdraw-amount').value);
  const password = document.getElementById('withdraw-password').value;
  const errEl = document.getElementById('withdraw-error');
  errEl.classList.add('hidden');

  if (!amount || amount < 10000) {
    errEl.textContent = 'Số tiền rút tối thiểu là 10,000đ!';
    errEl.classList.remove('hidden');
    return;
  }
  if (!password) {
    errEl.textContent = 'Vui lòng nhập mật khẩu xác nhận!';
    errEl.classList.remove('hidden');
    return;
  }
  if (currentUser && amount > currentUser.balance) {
    errEl.textContent = '❌ Số dư không đủ!';
    errEl.classList.remove('hidden');
    return;
  }

  try {
    await WithdrawAPI.request({ amount, password });
    if (currentUser) {
      currentUser.balance -= amount;
      updateBalanceDisplay();
    }

    document.getElementById('withdraw-amount').value = '';
    document.getElementById('withdraw-password').value = '';
    document.getElementById('withdraw-balance').textContent = formatMoney(currentUser ? currentUser.balance : 0);

    showToast('✅ Yêu cầu rút tiền đã được gửi! Vui lòng chờ phê duyệt.', 'success');
    showHistory();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

// =====================
// HISTORY (LICH SU)
// =====================
async function loadHistory() {
  const listEl = document.getElementById('history-list');
  listEl.innerHTML = '<div class="history-loading">⏳ Đang tải...</div>';

  try {
    historyData = await WithdrawAPI.history();
    renderHistory();
  } catch (err) {
    listEl.innerHTML = '<div class="history-empty">❌ Không thể tải lịch sử!</div>';
  }
}

function switchHistoryTab(tab, el) {
  historyFilter = tab;
  document.querySelectorAll('.history-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderHistory();
}

function filterHistory() {
  renderHistory();
}

function renderHistory() {
  const listEl = document.getElementById('history-list');
  const searchVal = (document.getElementById('history-search').value || '').toLowerCase();

  let items = historyData;
  if (historyFilter !== 'all') {
    items = items.filter(i => i.status === historyFilter);
  }
  if (searchVal) {
    items = items.filter(i =>
      i.bankAccount.includes(searchVal) ||
      formatMoney(i.amount).toLowerCase().includes(searchVal)
    );
  }

  if (items.length === 0) {
    listEl.innerHTML = '<div class="history-empty">📭 Chưa có giao dịch nào</div>';
    return;
  }

  // Group by month
  const grouped = {};
  items.forEach(item => {
    const date = new Date(item.createdAt);
    const key = `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  let html = '';
  for (const [month, monthItems] of Object.entries(grouped)) {
    const totalWithdraw = monthItems.reduce((sum, i) => sum + i.amount, 0);
    html += `
      <div class="history-month-header">
        <span class="history-month-title">${month}</span>
        <span class="history-month-total">Tổng rút: ${formatMoney(totalWithdraw)}</span>
      </div>
    `;
    monthItems.forEach(item => {
      const date = new Date(item.createdAt);
      const timeStr = `${pad(date.getHours())}:${pad(date.getMinutes())} - ${pad(date.getDate())}/${pad(date.getMonth()+1)}/${date.getFullYear()}`;

      let statusClass = 'status-pending';
      let statusText = '⏳ Đang chờ';
      if (item.status === 'approved') { statusClass = 'status-approved'; statusText = '✅ Thành công'; }
      if (item.status === 'rejected') { statusClass = 'status-rejected'; statusText = '❌ Thất bại'; }

      const rejectHtml = item.status === 'rejected' && item.rejectReason
        ? `<div class="history-reject-reason">Lý do: ${item.rejectReason}</div>`
        : '';

      html += `
        <div class="history-item">
          <div class="history-icon">💸</div>
          <div class="history-info">
            <div class="history-desc">Rút tiền về tài khoản</div>
            <div class="history-time">${timeStr}</div>
            <div class="history-bank">STK: ${maskBankAccount(item.bankAccount)}</div>
            ${rejectHtml}
          </div>
          <div class="history-right">
            <div class="history-amount negative">-${formatMoney(item.amount)}</div>
            <div class="history-status ${statusClass}">${statusText}</div>
          </div>
        </div>
      `;
    });
  }

  listEl.innerHTML = html;
}

function pad(n) { return String(n).padStart(2, '0'); }

// =====================
// MODAL HELPERS
// =====================
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden');
  }
});

// =====================
// LOADING
// =====================
function showLoading(text = '⛏️ Đang đào vàng...') {
  document.getElementById('loading').querySelector('.loading-text').textContent = text;
  document.getElementById('loading').classList.remove('hidden');
}
function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

// =====================
// TOAST
// =====================
let toastTimer = null;
function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// Enter key support for forms
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const activeForm = document.getElementById('form-login').classList.contains('hidden') ? 'register' : 'login';
    if (document.getElementById('screen-auth').classList.contains('active')) {
      if (activeForm === 'login') handleLogin();
      else handleRegister();
    }
  }
});

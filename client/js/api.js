// =============================================
// API Helper - Gold Miner Troll Game
// =============================================

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('gm_token');
}

async function apiRequest(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra!');
  return data;
}

// Auth API
const AuthAPI = {
  register: (d) => apiRequest('POST', '/auth/register', d),
  login: (d) => apiRequest('POST', '/auth/login', d),
  me: () => apiRequest('GET', '/auth/me'),
};

// Payment API
const PaymentAPI = {
  createPayment: (amount) => apiRequest('POST', '/payment/create', { amount }),
};

// Game API
const GameAPI = {
  mine: (pickCost) => apiRequest('POST', '/game/mine', { pickCost }),
  getBalance: () => apiRequest('GET', '/game/balance'),
};

// Withdraw API
const WithdrawAPI = {
  request: (d) => apiRequest('POST', '/withdraw/request', d),
  history: () => apiRequest('GET', '/withdraw/history'),
};

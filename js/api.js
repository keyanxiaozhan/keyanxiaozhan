// js/api.js
// 后端 API 封装 (fetch 版)
// 后端地址写死 (跟小程序一致, 不允许运行时切换)
const API_BASE = 'https://wechat.keyanxiaozhan.top';

// 从 localStorage 读 token (跟小程序 getApp().globalData.authToken 对应)
// 故意用最简单方式,避免 import auth.js 形成循环依赖
function getToken() {
  try { return localStorage.getItem('authToken') || ''; }
  catch (_) { return ''; }
}

async function request(path, options = {}) {
  const url = API_BASE + path;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // 自动带 token (如果有, 跟小程序一致)
  const token = getToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };
  if (options.data !== undefined) {
    fetchOptions.body = JSON.stringify(options.data);
  }

  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch (e) {
    throw new Error('网络请求失败: ' + (e.message || ''));
  }

  if (!res.ok) {
    // 尝试解析后端 detail 字段
    let detail = '';
    try {
      const body = await res.json();
      detail = body && (body.detail || body.message);
    } catch (_) { /* 忽略, 用状态码兜底 */ }
    throw new Error(detail || `HTTP ${res.status}`);
  }

  // 204 / 空响应
  if (res.status === 204) return null;

  // 后端 PHP 偶发会把 Warning 当 HTML 输出, 混在 JSON 前面
  // 兜底: 找到第一个 { 或 [ 开始 parse
  const text = await res.text();
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  let start = -1;
  if (firstBrace === -1) start = firstBracket;
  else if (firstBracket === -1) start = firstBrace;
  else start = Math.min(firstBrace, firstBracket);
  if (start <= 0) return JSON.parse(trimmed);
  // 前面有 warning / echo, 截掉
  // console.warn('[api] stripped prefix from response:', trimmed.slice(0, start));
  return JSON.parse(trimmed.slice(start));
}

export const api = {
  // 公司信息
  getCompany: () => request('/api/company'),

  // 材料列表 / 详情
  listMaterials: () => request('/api/materials'),
  getMaterial: (slug) => request('/api/materials/' + encodeURIComponent(slug)),

  // 问卷 (从材料详情拿, 不再走全局问卷接口)
  getQuestionnaire: async (materialSlug) => {
    if (!materialSlug) return { title: '', start_question_id: 'q1', questions: [] };
    const m = await request('/api/materials/' + encodeURIComponent(materialSlug));
    return m.questionnaire || { title: '', start_question_id: 'q1', questions: [] };
  },

  // 预约
  submitBooking: (data) => request('/api/bookings', { method: 'POST', data }),
  // 8/10 加: getBooking 必须带 view_token (后端严格校验)
  getBooking: (id, viewToken) => {
    const params = viewToken ? '?token=' + encodeURIComponent(viewToken) : '';
    return request('/api/bookings/' + parseInt(id, 10) + params);
  },

  // 返现 (公开)
  checkReferral: (phone) => request('/api/referrals/check?phone=' + encodeURIComponent(phone)),
  // ===== 会员 Auth (8/10 补: auth.js 调 api.register/login/getMe/logout, 之前漏了) =====
  // 后端: POST /api/auth/register   body: {phone, password, referral_code}
  //       POST /api/auth/login      body: {phone, password}
  //       GET  /api/auth/me         header: Authorization: Bearer <token>
  //       POST /api/auth/logout     header: Authorization: Bearer <token>
  // 返回: register/login => {token, user:{id,phone,referral_code}}
  //       me               => {user, stats:{invite_count,total_spent,...}}
  register: (phone, password, referralCode = '') =>
    request('/api/auth/register', {
      method: 'POST',
      data: { phone, password, referral_code: referralCode || '' },
    }),
  login: (phone, password) =>
    request('/api/auth/login', { method: 'POST', data: { phone, password } }),
  getMe: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
 };
export { API_BASE };

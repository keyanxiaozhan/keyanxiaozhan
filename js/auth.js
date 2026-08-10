// js/auth.js
// 用户认证工具 (登录/注册/登出/token 存储)
// 跟原小程序 app.js 的 setAuth/getApp().globalData.authToken 一一对应

import { api } from './api.js';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'user';

// ===== Token 存储 =====
export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ''; }
  catch (_) { return ''; }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (_) { /* 忽略 */ }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

export function setStoredUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch (_) { /* 忽略 */ }
}

export function isLoggedIn() {
  return !!getToken();
}

export function clearAuth() {
  setToken('');
  setStoredUser(null);
}

// ===== 业务方法 =====
/**
 * 登录
 * @param {string} phone
 * @param {string} password
 * @returns {Promise<{token: string, user: object}>}
 */
export async function login(phone, password) {
  const res = await api.login(phone, password);
  // 后端返回结构: { token, user } 或 { token, user: {...} }
  if (!res || !res.token) throw new Error('登录响应异常');
  setToken(res.token);
  setStoredUser(res.user || null);
  return res;
}

/**
 * 注册
 * @param {string} phone
 * @param {string} password
 * @param {string} [referralCode]
 */
export async function register(phone, password, referralCode) {
  const res = await api.register(phone, password, referralCode || '');
  if (!res || !res.token) throw new Error('注册响应异常');
  setToken(res.token);
  setStoredUser(res.user || null);
  return res;
}

/**
 * 拉取当前用户 + 统计 (token 失效会清空 auth)
 * @returns {Promise<{user, stats}|null>}
 */
export async function fetchMe() {
  if (!isLoggedIn()) return null;
  try {
    const res = await api.getMe();
    // res: { user, stats }
    if (res && res.user) setStoredUser(res.user);
    return res || null;
  } catch (e) {
    // 401 / token 失效, 清空
    if (/401|登录|token|unauth/i.test(e.message || '')) {
      clearAuth();
    }
    throw e;
  }
}

/**
 * 登出 (尽量调后端,失败也清本地)
 */
export async function logout() {
  try {
    if (isLoggedIn()) await api.logout();
  } catch (_) { /* 静默 */ }
  clearAuth();
}

// ===== 校验 =====
export function validatePhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone || '');
}

export function validatePassword(pwd) {
  return (pwd || '').length >= 6;
}

// js/common.js
// 共享工具: 暗色模式 / toast / modal / 导航

const THEME_KEY = 'darkMode';

// ===== 暗色模式 =====
export function isDark() {
  return document.body.classList.contains('dark');
}

export function loadTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === '1') document.body.classList.add('dark');
  } catch (_) { /* 忽略 */ }
}

export function toggleTheme() {
  document.body.classList.toggle('dark');
  try {
    localStorage.setItem(THEME_KEY, isDark() ? '1' : '0');
  } catch (_) { /* 忽略 */ }
  return isDark();
}

// 暴露一个全局函数, 让 inline onclick 调用
window.__toggleTheme = () => {
  toggleTheme();
  // 同步所有 .fab / .theme-fab 的图标
  document.querySelectorAll('[data-theme-fab]').forEach(el => {
    el.textContent = isDark() ? '☀' : '☾';
  });
};

// ===== Toast =====
let toastTimer = null;
export function toast(msg, type = '') {
  // 移除旧的
  document.querySelectorAll('.toast').forEach(n => n.remove());
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }

  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' toast-' + type : '');
  el.textContent = msg;
  document.body.appendChild(el);
  toastTimer = setTimeout(() => { el.remove(); toastTimer = null; }, 2500);
}

// ===== Modal (替代 wx.showModal) =====
export function modal({ title, content, confirmText = '确定', cancelText = '取消', showCancel = true } = {}) {
  return new Promise((resolve) => {
    const mask = document.createElement('div');
    mask.className = 'modal-mask';

    const box = document.createElement('div');
    box.className = 'modal-box';

    const titleEl = document.createElement('div');
    titleEl.className = 'modal-title';
    titleEl.textContent = title || '';
    if (title) box.appendChild(titleEl);

    const contentEl = document.createElement('div');
    contentEl.className = 'modal-content';
    contentEl.textContent = content || '';
    if (content) box.appendChild(contentEl);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    const close = (result) => {
      mask.remove();
      resolve(result);
    };

    if (showCancel) {
      const cancel = document.createElement('button');
      cancel.className = 'btn btn-secondary';
      cancel.textContent = cancelText;
      cancel.onclick = () => close({ confirm: false, cancel: true });
      actions.appendChild(cancel);
    }

    const ok = document.createElement('button');
    ok.className = 'btn';
    ok.textContent = confirmText;
    ok.onclick = () => close({ confirm: true, cancel: false });
    actions.appendChild(ok);

    box.appendChild(actions);
    mask.appendChild(box);
    document.body.appendChild(mask);
  });
}

// ===== 复制文本 =====
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('已复制', 'success');
    return true;
  } catch (_) {
    // 兜底: 走 textarea
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      toast(ok ? '已复制' : '复制失败', ok ? 'success' : 'error');
      return ok;
    } catch (e) {
      document.body.removeChild(ta);
      toast('复制失败', 'error');
      return false;
    }
  }
}

// ===== 通知弹窗 (8/10 加: 管理后台 company.notice_* 控制) =====
const NOTICE_SEEN_KEY = 'noticeSeen_v1';

// 每个通知内容只弹一次 (localStorage 记录), 后台改内容后会自动再弹
export function showNotice(company) {
  if (!company || !company.notice_enabled || !company.notice_text) return;
  const key = (company.notice_title || '') + '\n' + company.notice_text;
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(NOTICE_SEEN_KEY) || '{}') || {}; } catch (_) { seen = {}; }
  if (seen[key]) return;
  try { seen[key] = 1; localStorage.setItem(NOTICE_SEEN_KEY, JSON.stringify(seen)); } catch (_) { /* 忽略 */ }
  modal({
    title: company.notice_title || '通知',
    content: company.notice_text,
    confirmText: '知道了',
    showCancel: false,
  });
}

// ===== URL 参数 =====
export function getQuery(name) {
  const u = new URLSearchParams(location.search);
  return u.get(name) || '';
}

// ===== 渲染顶部 nav (统一) =====
export function renderNav({ title, back = true } = {}) {
  return `
    <header class="nav-bar">
      ${back ? '<a class="nav-back" href="javascript:history.back()" aria-label="返回"></a>' : '<span class="nav-spacer"></span>'}
      <div class="nav-title">${title || ''}</div>
      <span class="nav-spacer"></span>
    </header>
  `;
}

// ===== 渲染底部 tab =====
export function renderTabBar(active = 'home') {
  return `
    <nav class="tab-bar">
      <a href="./index.html" data-tab="home" class="${active === 'home' ? 'active' : ''}">
        <span>首页</span>
      </a>
      <a href="./about.html" data-tab="about" class="${active === 'about' ? 'active' : ''}">
        <span>关于</span>
      </a>
    </nav>
  `;
}

// ===== 注册 Service Worker =====
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol === 'file:') return; // 直接打开 file:// 不注册

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        // console.log('[SW] registered', reg.scope);
      })
      .catch(err => {
        // console.warn('[SW] register failed', err);
      });
  });
}

// ===== 初始化 (每个页面都会调) =====
export function boot() {
  loadTheme();

  // 全局点击带 data-theme-fab 的按钮
  document.addEventListener('click', (e) => {
    const fab = e.target.closest('[data-theme-fab]');
    if (fab) {
      e.preventDefault();
      window.__toggleTheme();
    }
  });

  // 把所有 .theme-fab 的图标初始化
  document.querySelectorAll('[data-theme-fab]').forEach(el => {
    el.textContent = isDark() ? '☀' : '☾';
  });

  // 注册 Service Worker (PWA 离线 + 装机)
  registerSW();
}

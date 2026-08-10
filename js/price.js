// js/price.js
// 价格计算工具 (从小程序版本原样移植, 适配 ES Modules)
//
// 数据模型:
//   每个 option 可选地有 price_modifier (数字) + price_modifier_type ('absolute' | 'percent')
//     - absolute: 直接加这个数 (元)
//     - percent:  按 base_price 百分比加 (base_price * price_modifier / 100)
//
// 题目类型:
//   - single: 选中那个 option 计入
//   - multi:  每个选中的 option 都计入 (累加)
//   - text/textarea: 不参与价格计算
//
// 计算规则:
//   1. 初始 base = materials.base_price
//   2. 遍历每个已答 single/multi 题:
//      - 取每个选中 option 的 price_modifier
//      - percent: amount = base * price_modifier / 100
//      - absolute: amount = price_modifier
//   3. 最终 total = base + Σ(amount)
//   4. breakdown: [基础价 (若有)] + 每个 modifier 的明细

/**
 * 计算总价和明细
 * @param {number} basePrice
 * @param {Object} config - { questions: [...] }
 * @param {Object} answers - { questionId: value | [values] }
 * @returns {{ total: number, breakdown: Array<{label, amount, type}> }}
 */
export function calculatePrice(basePrice, config, answers) {
  const base = Number(basePrice) || 0;
  const breakdown = [];
  if (base > 0) breakdown.push({ label: '基础价', amount: base, type: 'base' });

  const questions = (config && config.questions) || [];
  const byId = {};
  questions.forEach(q => { byId[q.id] = q; });

  const addItems = [];

  Object.keys(answers || {}).forEach(qid => {
    const q = byId[qid];
    if (!q) return;
    const val = answers[qid];
    if (val == null || val === '' || (Array.isArray(val) && val.length === 0)) return;

    let selected = [];
    if (q.type === 'single') {
      selected = [val];
    } else if (q.type === 'multi') {
      selected = Array.isArray(val) ? val : [val];
    } else {
      return; // text/textarea
    }

    selected.forEach(v => {
      const opt = (q.options || []).find(o => o.value === v);
      if (!opt) return;
      // 兼容两套字段: 新版用 price / price_mode, 老版用 price_modifier / price_modifier_type
      const modifierRaw = (opt.price != null) ? opt.price : opt.price_modifier;
      if (modifierRaw == null) return;
      const modifier = Number(modifierRaw);
      if (isNaN(modifier)) return;
      const modType = (opt.price_mode || opt.price_modifier_type || 'absolute');
      const amount = modType === 'percent'
        ? Math.round(base * modifier / 100 * 100) / 100
        : modifier;
      addItems.push({
        label: (q.title || '') + ' · ' + (opt.label || ''),
        amount: amount,
        type: modType === 'replace' ? 'replace' : 'add',
      });
    });
  });

  const totalAdd = addItems.reduce((s, a) => s + a.amount, 0);
  const total = Math.round((base + totalAdd) * 100) / 100;

  addItems.forEach(a => breakdown.push(a));
  return { total, breakdown };
}

/**
 * 格式化单个 option 的价格影响 (用于 UI 显示)
 * @param {Object} option
 * @param {number} [basePrice=0]  - 算 percent 模式时需要
 * @returns {string|null}
 */
export function formatPriceImpact(option, basePrice) {
  if (!option) return null;
  // 兼容两套字段
  const modifierRaw = (option.price != null) ? option.price : option.price_modifier;
  if (modifierRaw == null) return null;
  const modifier = Number(modifierRaw);
  if (isNaN(modifier)) return null;
  const modType = (option.price_mode || option.price_modifier_type || 'absolute');
  const amount = modType === 'percent'
    ? Math.round((Number(basePrice) || 0) * modifier / 100 * 100) / 100
    : modifier;
  if (modType === 'percent') {
    return modifier > 0 ? ('+' + modifier + '%') : '免费';
  }
  if (modType === 'replace') {
    return amount > 0 ? ('=¥' + amount) : '免费';
  }
  return amount > 0 ? ('+¥' + amount) : '免费';
}

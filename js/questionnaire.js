// js/questionnaire.js
// 分支问卷状态机 (从小程序版本原样移植, 适配 ES Modules)
//
// 题目结构:
//   { id, type: 'single' | 'multi' | 'text' | 'textarea', title, options?, next, required, placeholder }
// option 结构:
//   { label, value, next?, price?, price_mode? }

export class QuestionnaireEngine {
  constructor(config) {
    this.config = config;
    this.questionsById = {};
    (config.questions || []).forEach(q => { this.questionsById[q.id] = q; });
  }

  getStartId() { return this.config.start_question_id; }

  // 根据当前 question id 和已选答案,算出下一个 question id
  getNextId(currentId, answers) {
    const q = this.questionsById[currentId];
    if (!q) return null;
    const ans = answers[currentId];

    if (q.type === 'single') {
      if (ans != null) {
        const opt = (q.options || []).find(o => o.value === ans);
        if (opt && opt.next) return opt.next;
      }
    }
    return q.next || null;
  }

  // 当前要展示的问题
  getCurrentQuestion(id) { return this.questionsById[id] || null; }

  // 校验 (required + text 非空)
  validate(question, value) {
    if (!question.required) return true;
    if (value == null || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }

  // 把答案拍平, 用于详情展示
  flattenAnswers(answers) {
    const out = [];
    Object.keys(answers).forEach(qid => {
      const q = this.questionsById[qid];
      if (!q) return;
      const v = answers[qid];
      if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return;

      if (q.type === 'single') {
        const opt = (q.options || []).find(o => o.value === v);
        out.push({
          id: qid,
          title: q.title,
          type: q.type,
          value: v,
          label: opt ? opt.label : v,
        });
      } else if (q.type === 'multi') {
        const picked = Array.isArray(v) ? v : [v];
        const labels = picked.map(val => {
          const opt = (q.options || []).find(o => o.value === val);
          return opt ? opt.label : val;
        });
        out.push({
          id: qid,
          title: q.title,
          type: q.type,
          value: v,
          label: labels.join('、'),
        });
      } else {
        out.push({ id: qid, title: q.title, type: q.type, value: v, label: v });
      }
    });
    return out;
  }
}

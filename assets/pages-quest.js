/* pages-quest.js – JD Quest: one question at a time, AI chips, live 19-section preview, autosave, generate.
   The Quest can be answered in Thai or English (answer language), and the JD can be written in Thai or English (JD language). */
(function () {
  var h = ui.h;
  window.pages = window.pages || {};

  /** How each backend question (JD_QUESTIONS id) is asked on screen, per answer language. */
  var QUI = {
    th: {
      title: { ask: 'ตำแหน่งนี้ชื่ออะไร', kind: 'text', field: 'position_title', placeholder: 'เช่น Store Supervisor' },
      department: { ask: 'อยู่หน่วยงานไหน รายงานตรงต่อใคร', kind: 'pair', fields: [['department', 'หน่วยงาน', 'เช่น ปฏิบัติการสาขา'], ['reports_to', 'รายงานตรงต่อตำแหน่ง (ไม่บังคับ)', 'เช่น Area Manager']] },
      people: { ask: 'ตำแหน่งนี้ดูแลคนแบบไหน', kind: 'people' },
      purpose: { ask: 'ถ้าพรุ่งนี้ตำแหน่งนี้ว่าง อะไรจะสะดุดก่อน', kind: 'chips', field: 'role_purpose_input' },
      responsibilities: { ask: 'งานหลักมีอะไรบ้าง', kind: 'chips', field: 'key_responsibilities_input' },
      outputs: { ask: 'ผลลัพธ์ที่ต้องส่งมอบคืออะไร', kind: 'chips', field: 'expected_outputs_input' },
      kpi: { ask: 'จะรู้ได้อย่างไรว่าทำงานได้ดี', kind: 'chips', field: 'success_indicators_input' },
      qualifications: { ask: 'คุณสมบัติที่ขาดไม่ได้', kind: 'chips', field: 'qualification_input' },
      scope: { ask: 'ตำแหน่งนี้รับผิดชอบอะไรบ้าง', kind: 'chips', field: 'scope_of_responsibility_input' },
      decision: { ask: 'เรื่องไหนตัดสินใจเองได้ เรื่องไหนต้องขออนุมัติ', kind: 'decision' },
      relationships: { ask: 'ทำงานกับใครบ้าง', kind: 'chips', field: 'internal_working_relationship', extra: ['external_working_relationship', 'ติดต่อคนนอกบริษัทไหม (ไม่บังคับ)', 'เช่น ลูกค้า ซัพพลายเออร์'] },
      complexity: { ask: 'เรื่องที่ยากหรือเจอบ่อยที่สุดในงานนี้', kind: 'chips', field: 'problem_complexity_input' },
      conditions: { ask: 'สภาพการทำงานเป็นอย่างไร', kind: 'chips', field: 'working_conditions_input' },
      risk: { ask: 'ถ้าตำแหน่งนี้พลาด จะกระทบอะไร', kind: 'chips', field: 'risk_compliance_consequence_input' }
    },
    en: {
      title: { ask: 'What is this position called?', kind: 'text', field: 'position_title', placeholder: 'e.g. Store Supervisor' },
      department: { ask: 'Which department is it in, and who does it report to?', kind: 'pair', fields: [['department', 'Department', 'e.g. Branch Operations'], ['reports_to', 'Reports to (optional)', 'e.g. Area Manager']] },
      people: { ask: 'Does this position manage people?', kind: 'people' },
      purpose: { ask: 'If this position were empty tomorrow, what would stop or slow down first?', kind: 'chips', field: 'role_purpose_input' },
      responsibilities: { ask: 'What are the main responsibilities?', kind: 'chips', field: 'key_responsibilities_input' },
      outputs: { ask: 'What results must this position deliver?', kind: 'chips', field: 'expected_outputs_input' },
      kpi: { ask: 'How do you know the job is done well?', kind: 'chips', field: 'success_indicators_input' },
      qualifications: { ask: 'Which qualifications are a must?', kind: 'chips', field: 'qualification_input' },
      scope: { ask: 'What is this position responsible for?', kind: 'chips', field: 'scope_of_responsibility_input' },
      decision: { ask: 'What can it decide alone, and what needs approval?', kind: 'decision' },
      relationships: { ask: 'Who does it work with?', kind: 'chips', field: 'internal_working_relationship', extra: ['external_working_relationship', 'Contacts outside the company (optional)', 'e.g. customers, suppliers'] },
      complexity: { ask: 'What are the hardest or most frequent problems in this job?', kind: 'chips', field: 'problem_complexity_input' },
      conditions: { ask: 'What are the working conditions like?', kind: 'chips', field: 'working_conditions_input' },
      risk: { ask: 'If this position makes a mistake, what is affected?', kind: 'chips', field: 'risk_compliance_consequence_input' }
    }
  };
  var APPROVAL = { th: 'ขออนุมัติ: ', en: 'Approval: ' };
  var APPROVAL_RE = /^(ขออนุมัติ|approval)\s*:\s*/i;

  /** Screen text of the Quest in both answer languages. Functions take the values they show. */
  var T = {
    th: {
      autosave: 'บันทึกอัตโนมัติ', newAutosave: 'ตำแหน่งใหม่ · บันทึกอัตโนมัติ', createJd: 'สร้าง JD', loading: 'กำลังโหลด…',
      saving: 'กำลังบันทึก…', saved: 'บันทึกแล้ว', saveFailed: 'บันทึกไม่สำเร็จ: ', previewLabel: 'ตัวอย่าง JD ที่กำลังสร้าง',
      meter: function (a, b) { return 'JD ' + a + ' / ' + b + ' หมวด'; },
      livePreview: 'JOB DESCRIPTION · ตัวอย่างสด', titlePh: 'ชื่อตำแหน่ง', deptPh: 'หน่วยงาน', reportsTo: 'รายงานตรงต่อ ',
      ready: 'พร้อมเขียน', skipped: 'ข้ามไว้ หมวดนี้จะไม่อยู่ในเอกสาร', company: 'เพิ่มข้อมูลบริษัทเพื่อปลดล็อก', needGold: 'ตอบคำถามระดับ Blueprint อย่างน้อย 4 ข้อ',
      unlockBy: function (l) { return 'ตอบ "' + l + '" เพื่อปลดล็อก'; }, needRequired: 'ตอบคำถามที่จำเป็นให้ครบก่อน',
      sketch: 'เส้นประ = หมวดที่ยังรอข้อมูล · ตัวหมึก = หมวดที่เขียนได้แล้ว',
      stop: 'ถึงจุดพักแล้ว', readyToCreate: function (t) { return t + ' พร้อมสร้างแล้ว'; },
      enough: function (n, name, left, next, nextName) { return 'ข้อมูลตอนนี้พอสำหรับ ' + n + ' หมวด (' + name + ') สร้างตอนนี้ได้เลย หรือตอบต่ออีก ' + left + ' ข้อเพื่อปลดล็อก ' + next + ' (' + nextName + ')'; },
      create: 'สร้าง ', credits: ' เครดิต', free: 'ฟรี', answerMore: function (n, next) { return 'ตอบต่ออีก ' + n + ' ข้อ → ' + next; },
      allAnswered: 'ตอบครบทุกข้อแล้ว', fullReady: 'ข้อมูลครบสำหรับ JD ฉบับเต็ม หรือเลือกระดับอื่นด้านล่างก็ได้', goBack: 'ย้อนกลับไปแก้คำตอบ',
      qOf: function (a, b) { return 'ข้อ ' + a + ' จาก ' + b; }, required: 'จำเป็น', back: 'ย้อนกลับ', skip: 'ไม่แน่ใจ ข้ามไปก่อน', next: 'ถัดไป', done: 'เสร็จ',
      requiredToast: 'ข้อนี้จำเป็น ตอบก่อนไปต่อ', basic: 'ข้อมูลพื้นฐานที่ทุกระดับต้องใช้', unlocks: function (s) { return 'ตอบข้อนี้ ปลดล็อกหมวด ' + s; },
      people: [['NONE', 'ไม่มีหน้าที่ดูแลคน', 'รับผิดชอบผลงานของตัวเอง'], ['PROJECT_OR_FUNCTIONAL_LEAD', 'นำทีมงานหรือโครงการ', 'ไม่มีลูกน้องโดยตรง'], ['DIRECT_REPORTS', 'มีลูกน้องโดยตรง', 'มอบหมาย ติดตาม และพัฒนาทีม']],
      peopleAria: 'รูปแบบการดูแลคน', reportCount: 'จำนวนลูกน้องโดยตรง', reportCountPh: 'เช่น 5 หรือ 6-10 คน', howTeam: 'ดูแลทีมอย่างไร', howLead: 'นำทีมหรือโครงการอย่างไร',
      teamPh: 'เช่น จัดตารางกะ มอบหมายงาน สอนงานพนักงานใหม่',
      typeBelow: 'พิมพ์คำตอบของคุณด้านล่าง', titleFirst: 'ใส่ชื่อตำแหน่งก่อน ระบบจะเสนอตัวเลือกให้',
      aiThinking: 'AI กำลังคิดตัวเลือกให้ ราว 5–15 วินาที', noWait: 'ไม่ต้องรอก็ได้ พิมพ์คำตอบเองในช่องด้านล่างได้เลย ตัวเลือกจาก AI จะขึ้นมาให้เลือกเพิ่มเมื่อพร้อม',
      typeNow: 'พิมพ์เองเลย', ownDecision: 'พิมพ์เอง (ขึ้นต้นด้วย "ขออนุมัติ:" ถ้าต้องขออนุมัติ)', ownPh: 'พิมพ์เพิ่มเอง แล้วกด Enter', ownLabel: 'เพิ่มคำตอบเอง', add: 'เพิ่ม',
      fromTitle: 'AI เสนอจากชื่อตำแหน่ง', fromAnswers: 'AI เสนอต่อยอดจากคำตอบก่อนหน้าของคุณ', pickReal: ' · เลือกเฉพาะที่ตรงกับงานจริง',
      preparingTitle: 'AI กำลังเตรียมตัวเลือกสำหรับตำแหน่งนี้…', preparingAnswers: 'AI กำลังเตรียมตัวเลือกจากคำตอบของคุณ…',
      genHead: 'สร้าง JD', genAny: 'สร้างได้ทุกเมื่อ ไม่ต้องตอบครบ หมวดที่ข้อมูลไม่พอจะไม่อยู่ในเอกสาร', genNeed: 'ตอบคำถามที่จำเป็น 5 ข้อแรกให้ครบก่อน',
      sample: 'ดูตัวอย่าง JD ที่ระบบสร้าง', regenerate: 'สร้างใหม่', savingWait: 'กำลังบันทึก ลองอีกครั้งใน 1 วินาที',
      upgradeNote: function (had, t) { return 'อัปเกรดจาก ' + had + ': หมวดเดิมทุกหมวดคงไว้ตามเดิม รวมส่วนที่คุณแก้ไว้ AI เขียนเฉพาะหมวดใหม่ของ ' + t; },
      rewriteNote: 'สร้างใหม่ทั้งฉบับ: AI จะเขียนทุกหมวดใหม่ รวมหมวดที่คุณแก้ไว้ ฉบับเดิมยังเปิดดูและกลับไปใช้ได้ในประวัติเวอร์ชัน',
      use: 'ใช้ ', noCredit: 'ไม่เสียเครดิต', left: function (n) { return ' · เหลือ ' + n + ' เครดิต'; }, about1min: 'ใช้เวลาราว 1 นาที ถ้าระบบขัดข้องจะคืนเครดิตอัตโนมัติ',
      upgradeTo: function (t) { return 'อัปเกรดเป็น ' + t; }, rewriteTitle: function (t) { return 'สร้าง ' + t + ' ใหม่ทั้งฉบับ'; },
      upgradeNow: 'อัปเกรดเลย', rewriteNow: 'เขียนใหม่ทั้งฉบับ', createNow: 'สร้างเลย', cancel: 'ยกเลิก',
      created: function (n) { return 'สร้าง JD แล้ว' + (n ? ' ใช้ ' + n + ' เครดิต' : ''); },
      noCredits: 'เครดิตไม่พอ', toCredits: 'ไปหน้าเครดิต',
      steps: function (n) { return ['อ่านคำตอบของคุณ', 'วางโครง ' + n + ' หมวด', 'AI กำลังเขียน', 'ตรวจความครบถ้วน', 'จัดหน้าเอกสาร']; },
      creating: function (t) { return 'กำลังสร้าง ' + t; }, dontClose: 'ใช้เวลาราว 1 นาที อย่าเพิ่งปิดหน้านี้',
      tierName: { bronze: 'ร่างดูบนจอ', silver: 'พร้อมสรรหา', gold: 'ฉบับเต็ม' },
      answerIn: 'ภาษาที่ใช้ตอบ', jdIn: 'ภาษาของ JD', th: 'ไทย', en: 'English',
      jdLocked: function (l) { return 'JD นี้เป็นภาษา' + l + ' เปลี่ยนภาษาได้ที่หน้า JD (1 เครดิต)'; },
      langHint: 'ตอบภาษาไหนก็ได้ AI เขียน JD เป็นภาษาที่เลือกให้'
    },
    en: {
      autosave: 'Saved automatically', newAutosave: 'New position · saved automatically', createJd: 'Create JD', loading: 'Loading…',
      saving: 'Saving…', saved: 'Saved', saveFailed: 'Could not save: ', previewLabel: 'Preview of the JD being written',
      meter: function (a, b) { return 'JD ' + a + ' / ' + b + ' sections'; },
      livePreview: 'JOB DESCRIPTION · LIVE PREVIEW', titlePh: 'Job title', deptPh: 'Department', reportsTo: 'Reports to ',
      ready: 'Ready to write', skipped: 'Skipped: this section will not be in the document', company: 'Add company information to unlock', needGold: 'Answer at least 4 Blueprint questions',
      unlockBy: function (l) { return 'Answer "' + l + '" to unlock'; }, needRequired: 'Answer the required questions first',
      sketch: 'Dashed = waiting for information · Solid = ready to write',
      stop: 'Checkpoint', readyToCreate: function (t) { return t + ' is ready'; },
      enough: function (n, name, left, next, nextName) { return 'You have enough for ' + n + ' sections (' + name + '). Create it now, or answer ' + left + ' more questions to unlock ' + next + ' (' + nextName + ').'; },
      create: 'Create ', credits: ' credits', free: 'free', answerMore: function (n, next) { return 'Answer ' + n + ' more → ' + next; },
      allAnswered: 'All questions answered', fullReady: 'You have everything for the full JD, or choose another level below.', goBack: 'Go back and edit answers',
      qOf: function (a, b) { return 'Question ' + a + ' of ' + b; }, required: 'Required', back: 'Back', skip: 'Not sure, skip for now', next: 'Next', done: 'Done',
      requiredToast: 'This question is required', basic: 'Basic information every level needs', unlocks: function (s) { return 'Unlocks section ' + s; },
      people: [['NONE', 'No people management', 'Responsible for own work'], ['PROJECT_OR_FUNCTIONAL_LEAD', 'Leads a team or project', 'No direct reports'], ['DIRECT_REPORTS', 'Has direct reports', 'Assigns, follows up and develops the team']],
      peopleAria: 'People management', reportCount: 'Number of direct reports', reportCountPh: 'e.g. 5 or 6-10 people', howTeam: 'How does it manage the team?', howLead: 'How does it lead the team or project?',
      teamPh: 'e.g. plans shifts, assigns work, trains new staff',
      typeBelow: 'Type your answer below', titleFirst: 'Enter the job title first and AI will suggest options',
      aiThinking: 'AI is preparing options, about 5–15 seconds', noWait: 'No need to wait: type your own answer below. AI options will appear when ready.',
      typeNow: 'Type my own', ownDecision: 'Type your own (start with "Approval:" if it needs approval)', ownPh: 'Type your own, then press Enter', ownLabel: 'Add your own answer', add: 'Add',
      fromTitle: 'AI suggestions from the job title', fromAnswers: 'AI suggestions based on your earlier answers', pickReal: ' · pick only what fits the real job',
      preparingTitle: 'AI is preparing options for this position…', preparingAnswers: 'AI is preparing options from your answers…',
      genHead: 'Create JD', genAny: 'You can create it any time; sections without enough information are left out.', genNeed: 'Answer the first 5 required questions first',
      sample: 'See a sample JD', regenerate: 'Rewrite', savingWait: 'Saving, try again in a second',
      upgradeNote: function (had, t) { return 'Upgrade from ' + had + ': every existing section stays as it is, including your edits. AI writes only the new sections of ' + t + '.'; },
      rewriteNote: 'Rewrite: AI writes every section again, including the ones you edited. The old version stays in the version history.',
      use: 'Uses ', noCredit: 'no credits', left: function (n) { return ' · ' + n + ' credits left'; }, about1min: 'Takes about 1 minute. Credits are returned automatically if something fails.',
      upgradeTo: function (t) { return 'Upgrade to ' + t; }, rewriteTitle: function (t) { return 'Rewrite ' + t; },
      upgradeNow: 'Upgrade', rewriteNow: 'Rewrite', createNow: 'Create', cancel: 'Cancel',
      created: function (n) { return 'JD created' + (n ? ', ' + n + ' credits used' : ''); },
      noCredits: 'Not enough credits', toCredits: 'Go to credits',
      steps: function (n) { return ['Reading your answers', 'Planning ' + n + ' sections', 'AI is writing', 'Checking completeness', 'Laying out the document']; },
      creating: function (t) { return 'Creating ' + t; }, dontClose: 'Takes about 1 minute. Please keep this page open.',
      tierName: { bronze: 'On-screen draft', silver: 'Ready for recruiting', gold: 'Full version' },
      answerIn: 'Answer in', jdIn: 'JD language', th: 'ไทย', en: 'English',
      jdLocked: function (l) { return 'This JD is in ' + l + '. Change its language on the JD page (1 credit).'; },
      langHint: 'Answer in either language; AI writes the JD in the language you choose.'
    }
  };

  function filled(v) {
    if (Array.isArray(v)) return v.some(function (x) { return String(x || '').trim(); });
    return v !== undefined && v !== null && String(v).trim() !== '';
  }

  window.pages.quest = function (view, positionId) {
    var meta, qs, st = { pos: null, idx: 0, chips: {}, loadingChips: false, saving: '', dirty: false };
    ui.mount(view, [ui.pageHead(positionId ? T.th.autosave : T.th.newAutosave, positionId ? ' ' : T.th.createJd), h('p.muted', { text: T.th.loading })]);

    app.loadQuestions().then(function (m) {
      meta = m;
      qs = m.questions;
      if (positionId) return api.call('positions.get', { id: positionId }).then(function (p) { st.pos = p; });
      st.pos = { id: '', answers: {}, skipped: [], paidTier: '', jdLang: (app.me.org && app.me.org.jd_lang) || 'th', answerLang: 'th' };
    }).then(function () {
      st.pos.jdLang = st.pos.jdLang || 'th';
      st.pos.answerLang = st.pos.answerLang || 'th';
      st.idx = firstOpen();
      render();
    }, function (e) { ui.mount(view, ui.note('err', ui.errorText(e))); });

    var A = function () { return st.pos.answers; };
    var L = function () { return st.pos.answerLang === 'en' ? 'en' : 'th'; };
    var t = function () { return T[L()]; };
    var en = function () { return L() === 'en'; };
    var secTitle = function (s) { return en() ? (s.title_en || s.title) : s.title; };
    var qLabel = function (q) { return en() ? (q.label_en || q.label) : q.label; };
    var tierName = function (tier) { return t().tierName[tier]; };

    function answered(q) {
      if (q.id === 'people') {
        var ty = A().people_management_type;
        if (!ty) return false;
        if (ty === 'NONE') return true;
        if (ty === 'DIRECT_REPORTS' && !filled(A().direct_report_count)) return false;
        return filled(A().people_management_input);
      }
      return filled(A()[q.fields[0]]) || (q.id === 'decision' && filled(A().decision_making_requires_approval)) ||
        (q.id === 'relationships' && filled(A().external_working_relationship));
    }
    function skipped(q) { return st.pos.skipped.indexOf(q.id) >= 0; }
    function firstOpen() {
      for (var i = 0; i < qs.length; i++) if (!answered(qs[i]) && !skipped(qs[i])) return i;
      return qs.length;
    }
    function requiredDone() { return qs.every(function (q) { return !q.required || answered(q); }); }
    function goldAnswered() { return qs.filter(function (q) { return q.tier === 'gold' && answered(q); }).length; }
    function tierRank(x) { return ui.TIERS.indexOf(x); }

    /** Mirrors the backend unlock rules for the preview. */
    function sectionState(s) {
      if (!s.question && !requiredDone()) return 'locked';
      if (s.key === 'business_context_fit') {
        var o = app.me.org;
        return (o.business_type || o.main_goal) ? 'ready' : 'company';
      }
      if (s.key === 'job_evaluation_information_summary') return goldAnswered() >= 4 ? 'ready' : 'need-gold';
      if (s.question) {
        var q = qs.filter(function (x) { return x.id === s.question; })[0];
        return answered(q) ? 'ready' : skipped(q) ? 'skipped' : 'locked';
      }
      return requiredDone() ? 'ready' : 'locked';
    }

    // One save at a time: a save requested while another is running waits for it, so the first save's
    // new position id is reused (otherwise a slow first save made a second, duplicate position).
    var saving = false, saveAgain = false;
    function saveNow() {
      if (saving) { saveAgain = true; return; }
      saving = true;
      st.saving = t().saving; renderStatus();
      api.call('positions.save', { id: st.pos.id || undefined, answers: st.pos.answers, skipped: st.pos.skipped,
        jdLang: st.pos.jdLang, answerLang: st.pos.answerLang }).then(function (p) {
        var isNew = !st.pos.id;
        st.pos.id = p.id;
        st.pos.code = p.code;
        st.pos.paidTier = p.paidTier;
        st.saving = t().saved;
        if (isNew) history.replaceState(null, '', '#quest/' + p.id);
        renderStatus();
      }, function (e) { st.saving = t().saveFailed + ui.errorText(e); renderStatus(); }).then(function () {
        saving = false;
        if (saveAgain) { saveAgain = false; saveNow(); }
      });
    }
    var save = ui.debounce(saveNow, 700);

    function change() { save(); renderPreview(); renderMeter(); }

    // ---------- layout ----------
    var els = {};
    function render() {
      els.meter = h('div.meter-wrap');
      els.status = h('span.muted.small', { 'aria-live': 'polite' });
      els.langs = h('section.card.lang-bar');
      els.card = h('section.card.quest-card', { 'aria-live': 'polite' });
      els.preview = h('article.card.preview', { 'aria-label': t().previewLabel });
      els.generate = h('section.card');
      ui.mount(view, [
        ui.pageHead(st.pos.id ? t().autosave : t().newAutosave, A().position_title || t().createJd, els.status),
        els.meter,
        en() ? null : (onboard.checklist() || competencyNudge()),
        h('div.quest-grid', {}, h('div.stack', {}, els.langs, els.card, els.generate), els.preview)
      ]);
      renderLangs(); renderMeter(); renderCard(); renderPreview(); renderGenerate(); renderStatus();
    }

    /** Answer language (this screen) and JD language (the document), chosen separately. */
    function renderLangs() {
      var locked = !!st.pos.latestVersion;
      var seg = function (label, value, onPick, disabled) {
        return h('div.lang-seg', { role: 'radiogroup', 'aria-label': label },
          h('span.lang-label', { text: label }),
          ['th', 'en'].map(function (l) {
            var on = value === l;
            return h('button.lang-opt' + (on ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(on), disabled: disabled && !on,
              text: T.th[l], onclick: function () { if (!on && !disabled) onPick(l); } });
          }));
      };
      ui.mount(els.langs, [
        h('div.lang-row', {},
          seg(t().answerIn, L(), function (l) {
            st.pos.answerLang = l;
            st.chips = {}; st.stageSig = {}; st.stageLoading = {};
            save(); render();
          }),
          seg(t().jdIn, st.pos.jdLang, function (l) { st.pos.jdLang = l; save(); renderLangs(); }, locked)),
        h('p.muted.small', { text: locked ? t().jdLocked(st.pos.jdLang === 'en' ? (en() ? 'English' : 'อังกฤษ') : (en() ? 'Thai' : 'ไทย')) : t().langHint })
      ]);
    }

    function competencyNudge() {
      var o = app.me.org;
      var missing = [];
      if (!(o.core || []).length) missing.push('Core');
      if (!(o.leadership || []).length) missing.push('Leadership');
      if (!missing.length) return null;
      return h('div.note.info.core-nudge', { role: 'status' },
        h('span', { text: 'บริษัทยังไม่ได้กำหนด ' + missing.join(' และ ') + ' Competency · JD จะใช้ชุดที่ระบบคิดให้ไปก่อน' }),
        ui.button('small-btn', (app.me.org.bonus || {}).duplicate ? 'กำหนดตอนนี้' : 'กำหนดตอนนี้ · +1 เครดิตต่อชุด', function () { app.go('#company/' + (missing[0] === 'Core' ? 'core' : 'leadership')); }));
    }

    function renderStatus() { if (els.status) els.status.textContent = st.saving; }

    function renderMeter() {
      var ready = meta.sections.filter(function (s) { return sectionState(s) === 'ready'; }).length;
      ui.mount(els.meter, [
        h('div.row-between', {}, h('span.meter-label', { text: t().meter(ready, meta.sections.length) }),
          h('div.steps', { 'aria-hidden': 'true' }, qs.map(function (q, i) {
            return h('i.' + (i === st.idx ? 'now' : answered(q) ? 'done' : skipped(q) ? 'skip' : 'todo'));
          }))),
        h('div.meter', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(meta.sections.length), 'aria-valuenow': String(ready) },
          h('span', { style: 'width:' + Math.round(ready / meta.sections.length * 100) + '%' }))
      ]);
    }

    function renderPreview() {
      ui.mount(els.preview, [
        en() ? null : onboard.tip('quest-preview', 'นี่คือ JD ที่กำลังเขียน: หมวดเส้นประคือหมวดที่ยังรอข้อมูล พอตอบครบจะกลายเป็นตัวหมึก ป้ายขวามือบอกว่าหมวดนั้นอยู่ในระดับไหน'),
        h('div.preview-head', {}, h('span.eyebrow', { text: t().livePreview }),
          h('strong.preview-title', { text: A().position_title || t().titlePh }),
          h('span.muted.small', { text: [A().department, A().reports_to ? t().reportsTo + A().reports_to : ''].filter(Boolean).join(' · ') || t().deptPh })),
        meta.sections.map(function (s) {
          var state = sectionState(s);
          var q = s.question ? qs.filter(function (x) { return x.id === s.question; })[0] : null;
          var why = state === 'ready' ? t().ready : state === 'skipped' ? t().skipped
            : state === 'company' ? t().company : state === 'need-gold' ? t().needGold
            : q ? t().unlockBy(qLabel(q)) : t().needRequired;
          return h('div.sec.' + state, {},
            h('span.sec-no', { text: '§' + ('0' + s.no).slice(-2) }),
            h('div', {}, h('div.sec-title', { text: secTitle(s) }), h('div.sec-why', { text: why })),
            ui.tierPill(s.tier, true));
        }),
        h('p.sketch-note', { text: t().sketch })
      ]);
    }

    // ---------- staged AI chips: each stage builds on what the user already chose ----------
    var STAGE_OF = { purpose: 1, responsibilities: 1, outputs: 2, kpi: 2, qualifications: 2,
      scope: 3, decision: 3, relationships: 3, complexity: 3, conditions: 3, risk: 3 };
    var STAGE_FIELDS = {
      1: ['position_title', 'department', 'people_management_type', 'direct_report_count'],
      2: ['role_purpose_input', 'key_responsibilities_input'],
      3: ['expected_outputs_input', 'success_indicators_input', 'qualification_input']
    };
    st.stageSig = {};
    st.stageLoading = {};
    function stageOf(q) { return STAGE_OF[q.id] || 0; }
    function stageFields(stage) {
      var f = [];
      for (var s = 1; s <= stage; s++) f = f.concat(STAGE_FIELDS[s]);
      return f;
    }
    function stageSig(stage) {
      return L() + JSON.stringify(stageFields(stage).map(function (k) { return A()[k] || ''; }));
    }
    /** Loads chips for a stage once per distinct set of earlier answers (and answer language). Never rejects. */
    function ensureChips(stage) {
      var sig = stageSig(stage);
      if (st.stageSig[stage] === sig) return Promise.resolve();
      if (st.stageLoading[stage] && st.stageLoading[stage].sig === sig) return st.stageLoading[stage].p;
      var answers = {};
      stageFields(stage).forEach(function (k) { if (A()[k] !== undefined) answers[k] = A()[k]; });
      var p = api.call('quest.suggestStage', { stage: stage, answers: answers, lang: L() }).then(function (r) {
        if (stageSig(stage) !== sig) return;   // the answer language changed meanwhile
        Object.keys(r.chips || {}).forEach(function (k) { st.chips[k] = r.chips[k]; });
        st.stageSig[stage] = sig;
      }, function () { /* chips are optional; the user can still type */ }).then(function () { delete st.stageLoading[stage]; });
      st.stageLoading[stage] = { sig: sig, p: p };
      return p;
    }

    /** Moves on; when the user finishes the last question of a level, stop and offer to create that level. */
    function advance(from) {
      var next = from + 1;
      var finishedTier = qs[from].tier;
      var crossing = next >= qs.length || qs[next].tier !== finishedTier;
      st.idx = next;
      st.milestone = crossing && requiredDone() && next < qs.length ? finishedTier : '';
      // Prepare the next stage's chips while the user reads the level stop.
      if (next < qs.length && stageOf(qs[next]) && A().position_title) ensureChips(stageOf(qs[next]));
      change(); renderCard(); renderGenerate();
    }

    function milestoneCard(tier) {
      var nextTier = ui.TIERS[ui.TIERS.indexOf(tier) + 1];
      var left = qs.filter(function (q) { return q.tier === nextTier; }).length;
      var ready = meta.sections.filter(function (s) { return sectionState(s) === 'ready' && ui.TIERS.indexOf(s.tier) <= ui.TIERS.indexOf(tier); }).length;
      var credits = meta.tierCredits[tier];
      ui.mount(els.card, [
        h('div.stamp-row', {}, h('span.stamp', {}, h('span.stamp-top', { text: 'READY' }), h('span.stamp-main', { text: ui.TIER[tier].label })),
          h('span.muted', { text: t().stop })),
        h('h2.ask', { text: t().readyToCreate(ui.TIER[tier].label) }),
        en() ? null : onboard.tip('quest-milestone', 'สร้างตอนนี้เลยก็ได้ หรือตอบต่อก็ได้ ถ้าสร้างแล้วอยากได้ระดับสูงขึ้น อัปเกรดทีหลังได้ จ่ายเฉพาะส่วนต่าง และหมวดที่สร้างแล้วไม่เปลี่ยน'),
        h('p', { text: t().enough(ready, tierName(tier), left, ui.TIER[nextTier].label, tierName(nextTier)) }),
        h('div.milestone-actions', {},
          ui.button('primary', t().create + ui.TIER[tier].label + (credits ? ' · ' + credits + t().credits : ' · ' + t().free), function (e) { generate(tier, e.currentTarget); }),
          ui.button('', t().answerMore(left, ui.TIER[nextTier].label), function () { st.milestone = ''; renderCard(); renderMeter(); }))
      ]);
    }

    function renderCard() {
      if (st.milestone) { milestoneCard(st.milestone); return; }
      if (st.idx >= qs.length) {
        ui.mount(els.card, [
          h('div.stamp-row', {}, h('span.stamp', {}, h('span.stamp-top', { text: 'READY' }), h('span.stamp-main', { text: 'Role Blueprint' })),
            h('span.muted', { text: t().allAnswered })),
          h('h2.ask', { text: t().readyToCreate('Role Blueprint') }),
          h('p', { text: t().fullReady }),
          h('div.milestone-actions', {},
            ui.button('primary', t().create + 'Role Blueprint · ' + meta.tierCredits.gold + t().credits, function (e) { generate('gold', e.currentTarget); }),
            ui.button('ghost', t().goBack, function () { st.idx = qs.length - 1; renderCard(); renderMeter(); }))
        ]);
        return;
      }
      var q = qs[st.idx];
      var ux = QUI[L()][q.id];
      var body;
      if (ux.kind === 'text') body = textField(ux.field, ux.placeholder, 'q-' + q.id);
      else if (ux.kind === 'pair') body = h('div.stack', {}, ux.fields.map(function (f) { return h('label.field', { for: 'q-' + f[0] }, f[1], textField(f[0], f[2], 'q-' + f[0])); }));
      else if (ux.kind === 'people') body = peopleField();
      else if (ux.kind === 'decision') body = chipsField(q, 'decision_making_own_authority', true);
      else body = chipsField(q, ux.field, false, ux.extra);

      var isLast = st.idx === qs.length - 1;
      ui.mount(els.card, [
        h('div.qmeta', {},
          ui.tierPill(q.tier),
          h('span', { text: t().qOf(st.idx + 1, qs.length) }),
          q.required ? h('span.req', { text: t().required }) : null),
        en() ? null : onboard.tip('quest-how', 'ตอบทีละข้อ: กดเลือกตัวเลือกได้หลายข้อ หรือพิมพ์เองก็ได้ ข้อไหนไม่แน่ใจกด "ข้ามไปก่อน" ระบบบันทึกให้อัตโนมัติ กลับมาแก้ทีหลังได้'),
        h('h2.ask', { text: ux.ask }),
        body,
        unlockHint(q),
        h('div.row', {},
          st.idx > 0 ? ui.button('ghost', t().back, function () { st.idx--; st.milestone = ''; renderCard(); renderMeter(); }) : null,
          q.required ? null : ui.button('', t().skip, function () {
            if (st.pos.skipped.indexOf(q.id) < 0) st.pos.skipped.push(q.id);
            advance(st.idx);
          }),
          h('span.spacer'),
          ui.button('primary', isLast ? t().done : t().next, function () {
            if (q.required && !answered(q)) { ui.toast(t().requiredToast, 'err'); return; }
            st.pos.skipped = st.pos.skipped.filter(function (id) { return !(id === q.id && answered(q)); });
            advance(st.idx);
          }))
      ]);
      var first = els.card.querySelector('input, textarea');
      if (first && ux.kind !== 'chips' && ux.kind !== 'decision') first.focus({ preventScroll: true });
    }

    function unlockHint(q) {
      var secs = meta.sections.filter(function (s) { return s.question === q.id; }).map(function (s) { return s.no + ' ' + secTitle(s); });
      if (!secs.length) return q.required ? h('div.hint', { text: t().basic }) : null;
      return h('div.hint', { text: t().unlocks(secs.join(', ')) });
    }

    function textField(field, placeholder, id) {
      return h('input', { type: 'text', id: id, value: A()[field] || '', placeholder: placeholder,
        oninput: function (e) { A()[field] = e.target.value; change(); if (field === 'position_title') document.querySelector('.page-head h1').textContent = e.target.value || t().createJd; } });
    }

    function peopleField() {
      var opts = t().people;
      var ty = A().people_management_type;
      return h('div.stack', {},
        h('div.options', { role: 'radiogroup', 'aria-label': t().peopleAria }, opts.map(function (o) {
          return h('button.option' + (ty === o[0] ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(ty === o[0]),
            onclick: function () { A().people_management_type = o[0]; change(); renderCard(); } },
            h('strong', { text: o[1] }), h('small', { text: o[2] }));
        })),
        ty === 'DIRECT_REPORTS' ? h('label.field', { for: 'q-count' }, t().reportCount, textField('direct_report_count', t().reportCountPh, 'q-count')) : null,
        ty && ty !== 'NONE' ? h('label.field', { for: 'q-pm' }, ty === 'DIRECT_REPORTS' ? t().howTeam : t().howLead,
          h('textarea', { id: 'q-pm', rows: '3', placeholder: t().teamPh,
            oninput: function (e) { A().people_management_input = e.target.value; change(); } }, A().people_management_input || '')) : null);
    }

    /** Multi-select chips from AI suggestions + own entries. decision=true routes "approval" items to the approval field. */
    function chipsField(q, field, decision, extra) {
      var PREFIX = APPROVAL[L()];
      var selected = function () {
        var own = [].concat(A()[field] || []);
        if (decision) own = own.concat([].concat(A().decision_making_requires_approval || []).map(function (x) { return PREFIX + x; }));
        return own;
      };
      var setSelected = function (list) {
        if (!decision) { A()[field] = list; return; }
        A().decision_making_own_authority = list.filter(function (x) { return !APPROVAL_RE.test(x); });
        A().decision_making_requires_approval = list.filter(function (x) { return APPROVAL_RE.test(x); }).map(function (x) { return x.replace(APPROVAL_RE, ''); });
      };
      var wrap = h('div.chips');
      var status = h('span.ai-tag');
      function drawChips() {
        var sel = selected();
        // AI chips may use either prefix; show them with this screen's prefix so they match the selected ones.
        var ai = (st.chips[q.id] || []).map(function (x) { return decision && APPROVAL_RE.test(x) ? PREFIX + x.replace(APPROVAL_RE, '') : x; });
        var all = ai.concat(sel).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
        ui.mount(wrap, all.map(function (x) {
          var on = sel.indexOf(x) >= 0;
          return h('button.chip' + (on ? '.on' : ''), { type: 'button', 'aria-pressed': String(on), text: x, onclick: function () {
            var cur = selected();
            setSelected(on ? cur.filter(function (y) { return y !== x; }) : cur.concat([x]));
            change(); drawChips();
          } });
        }));
        if (!all.length && !st.loadingChips) wrap.appendChild(h('span.muted.small', { text: A().position_title ? t().typeBelow : t().titleFirst }));
        if (!all.length && st.loadingChips) {
          wrap.appendChild(h('div.chip-wait', { role: 'status' },
            h('div.chip-ghosts', { 'aria-hidden': 'true' }, [70, 110, 90, 130, 80].map(function (w) { return h('span', { style: 'width:' + w + 'px' }); })),
            h('p', {}, h('strong', { text: t().aiThinking })),
            h('p.small', { text: t().noWait }),
            h('div', {}, ui.button('ghost.small-btn', t().typeNow, function () { own.focus(); }, { icon: 'edit' }))));
        }
      }
      var own = h('input', { type: 'text', id: 'q-own', placeholder: decision ? t().ownDecision : t().ownPh,
        onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); addOwn(); } } });
      function addOwn() {
        var v = own.value.trim();
        if (!v) return;
        if (decision && APPROVAL_RE.test(v)) v = PREFIX + v.replace(APPROVAL_RE, '');
        setSelected(selected().concat([v]).filter(function (x, i, a) { return a.indexOf(x) === i; }));
        own.value = '';
        change(); drawChips();
      }
      drawChips();
      var stage = stageOf(q);
      var label = stage === 1 ? t().fromTitle : t().fromAnswers;
      if (stage && A().position_title) {
        if (!(st.chips[q.id] || []).length || st.stageSig[stage] !== stageSig(stage)) {
          st.loadingChips = true;
          status.textContent = stage === 1 ? t().preparingTitle : t().preparingAnswers;
          drawChips();
        }
        ensureChips(stage).then(function () {
          st.loadingChips = false;
          status.textContent = (st.chips[q.id] || []).length ? label + t().pickReal : '';
          if (qs[st.idx] === q && !st.milestone) drawChips();
        });
      }
      return h('div.stack', {}, status, wrap,
        h('div.row', {}, h('label.sr-only', { for: 'q-own', text: t().ownLabel }), own, ui.button('', t().add, addOwn)),
        extra ? h('label.field', { for: 'q-extra' }, extra[1], h('input', { type: 'text', id: 'q-extra', placeholder: extra[2], value: [].concat(A()[extra[0]] || []).join(', '),
          oninput: function (e) { A()[extra[0]] = e.target.value; change(); } })) : null);
    }

    // ---------- generate ----------
    function renderGenerate() {
      var can = requiredDone();
      var paid = st.pos.paidTier;
      ui.mount(els.generate, [
        h('h2', { text: t().genHead }),
        h('p.muted', { text: can ? t().genAny : t().genNeed }),
        app.me.hasSample ? h('div', {}, ui.button('ghost.small-btn', t().sample, function () { window.open('#sample', '_blank'); }, { icon: 'jds' })) : null,
        h('div.gen-buttons', {}, ui.TIERS.map(function (tier) {
          var credits = meta.tierCredits[tier];
          var paidCredits = paid ? meta.tierCredits[paid] : 0;
          var label = tier === 'bronze' ? t().free : (paid && tierRank(paid) >= tierRank(tier) ? t().regenerate : (paid ? '+' + (credits - paidCredits) : credits) + t().credits);
          return h('button.gen.' + ui.TIER[tier].cls, { type: 'button', disabled: !can, onclick: function (e) { generate(tier, e.currentTarget); } },
            h('strong', { text: ui.TIER[tier].label }),
            h('small', { text: tierName(tier) }),
            h('span', { text: label }));
        }))
      ]);
    }

    function generate(tier, btn) {
      if (!st.pos.id) { ui.toast(t().savingWait, 'err'); save(); return; }
      api.call('jd.quote', { positionId: st.pos.id, tier: tier }).then(function (qt) {
        var R = { bronze: 0, silver: 1, gold: 2 };
        var had = st.pos.latestVersion ? st.pos.latestTier : '';
        var upgrade = had && R[tier] > R[had];
        var rewrite = had && !upgrade;
        var body = h('div.stack', {},
          en() ? null : h('p', { text: qt.reason }),
          upgrade ? ui.note('ok', t().upgradeNote(ui.TIER[had].label, ui.TIER[tier].label)) : null,
          rewrite ? ui.note('err', t().rewriteNote) : null,
          h('p', {}, t().use, h('strong', { text: qt.credits ? qt.credits + t().credits : t().noCredit }), t().left(ui.fmtCredits(app.me.credits.balance))),
          h('p.muted.small', { text: t().about1min }));
        if (qt.blocked) { ui.toast(qt.reason, 'err'); return null; }
        return ui.confirmBox(upgrade ? t().upgradeTo(ui.TIER[tier].label) : rewrite ? t().rewriteTitle(ui.TIER[tier].label) : t().create + ui.TIER[tier].label, body,
          upgrade ? t().upgradeNow : rewrite ? t().rewriteNow : t().createNow, t().cancel);
      }).then(function (yes) {
        if (!yes) return;
        var wait = waiting(tier);
        return api.call('jd.generate', { positionId: st.pos.id, tier: tier }).then(function (r) {
          wait.done();
          app.refreshMe();
          ui.toast(t().created(r.charged));
          app.go('#jd/' + st.pos.id);
        }, function (e) { wait.done(); throw e; });
      }).catch(function (e) {
        if (e.code === 'NOT_ENOUGH_CREDITS') {
          ui.confirmBox(t().noCredits, ui.errorText(e), t().toCredits, t().cancel).then(function (y) { if (y) app.go('#credits'); });
        } else ui.toast(ui.errorText(e), 'err');
      });
    }

    /** Full-screen progress while the AI writes (~1 minute). */
    function waiting(tier) {
      var steps = t().steps(tier === 'gold' ? 19 : tier === 'silver' ? 13 : 9);
      var i = 0;
      var line = h('p.wait-step', { text: steps[0] });
      var back = h('div.modal-back', { role: 'alertdialog', 'aria-label': t().creating('JD') },
        h('div.modal.center', {}, h('div.spinner', { 'aria-hidden': 'true' }), h('h2', { text: t().creating(ui.TIER[tier].label) }), line,
          h('p.muted.small', { text: t().dontClose })));
      document.body.appendChild(back);
      var timer = setInterval(function () { if (i < steps.length - 1) line.textContent = steps[++i]; }, 12000);
      return { done: function () { clearInterval(timer); back.remove(); } };
    }
  };
})();

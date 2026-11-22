/* pages-quest.js – JD Quest: one question at a time, AI chips, live 19-section preview, autosave, generate. */
(function () {
  var h = ui.h;
  window.pages = window.pages || {};

  /** How each backend question (JD_QUESTIONS id) is asked on screen. */
  var QUI = {
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
  };
  var APPROVAL_PREFIX = 'ขออนุมัติ: ';

  function filled(v) {
    if (Array.isArray(v)) return v.some(function (x) { return String(x || '').trim(); });
    return v !== undefined && v !== null && String(v).trim() !== '';
  }

  window.pages.quest = function (view, positionId) {
    var meta, qs, st = { pos: null, idx: 0, chips: {}, loadingChips: false, saving: '', dirty: false };
    ui.mount(view, [ui.pageHead(positionId ? 'บันทึกอัตโนมัติ' : 'ตำแหน่งใหม่ · บันทึกอัตโนมัติ', positionId ? '\u00a0' : 'สร้าง JD'), h('p.muted', { text: 'กำลังโหลด…' })]);

    app.loadQuestions().then(function (m) {
      meta = m;
      qs = m.questions;
      if (positionId) return api.call('positions.get', { id: positionId }).then(function (p) { st.pos = p; });
      st.pos = { id: '', answers: {}, skipped: [], paidTier: '' };
    }).then(function () {
      st.idx = firstOpen();
      render();
    }, function (e) { ui.mount(view, ui.note('err', ui.errorText(e))); });

    var A = function () { return st.pos.answers; };

    function answered(q) {
      if (q.id === 'people') {
        var t = A().people_management_type;
        if (!t) return false;
        if (t === 'NONE') return true;
        if (t === 'DIRECT_REPORTS' && !filled(A().direct_report_count)) return false;
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
    function tierRank(t) { return ui.TIERS.indexOf(t); }

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
      st.saving = 'กำลังบันทึก…'; renderStatus();
      api.call('positions.save', { id: st.pos.id || undefined, answers: st.pos.answers, skipped: st.pos.skipped }).then(function (p) {
        var isNew = !st.pos.id;
        st.pos.id = p.id;
        st.pos.code = p.code;
        st.pos.paidTier = p.paidTier;
        st.saving = 'บันทึกแล้ว';
        if (isNew) history.replaceState(null, '', '#quest/' + p.id);
        renderStatus();
      }, function (e) { st.saving = 'บันทึกไม่สำเร็จ: ' + ui.errorText(e); renderStatus(); }).then(function () {
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
      els.card = h('section.card.quest-card', { 'aria-live': 'polite' });
      els.preview = h('article.card.preview', { 'aria-label': 'ตัวอย่าง JD ที่กำลังสร้าง' });
      els.generate = h('section.card');
      ui.mount(view, [
        ui.pageHead(st.pos.id ? 'บันทึกอัตโนมัติ' : 'ตำแหน่งใหม่ · บันทึกอัตโนมัติ', A().position_title || 'สร้าง JD', els.status),
        els.meter,
        onboard.checklist() || competencyNudge(),
        h('div.quest-grid', {}, h('div.stack', {}, els.card, els.generate), els.preview)
      ]);
      renderMeter(); renderCard(); renderPreview(); renderGenerate(); renderStatus();
    }

    function competencyNudge() {
      var o = app.me.org;
      var missing = [];
      if (!(o.core || []).length) missing.push('Core');
      if (!(o.leadership || []).length) missing.push('Leadership');
      if (!missing.length) return null;
      return h('div.note.info.core-nudge', { role: 'status' },
        h('span', { text: 'บริษัทยังไม่ได้กำหนด ' + missing.join(' และ ') + ' Competency · JD จะใช้ชุดที่ระบบคิดให้ไปก่อน' }),
        ui.button('small-btn', 'กำหนดตอนนี้ · +1 เครดิตต่อชุด', function () { app.go('#company/' + (missing[0] === 'Core' ? 'core' : 'leadership')); }));
    }

    function renderStatus() { if (els.status) els.status.textContent = st.saving; }

    function renderMeter() {
      var ready = meta.sections.filter(function (s) { return sectionState(s) === 'ready'; }).length;
      ui.mount(els.meter, [
        h('div.row-between', {}, h('span.meter-label', { text: 'JD ' + ready + ' / ' + meta.sections.length + ' หมวด' }),
          h('div.steps', { 'aria-hidden': 'true' }, qs.map(function (q, i) {
            return h('i.' + (i === st.idx ? 'now' : answered(q) ? 'done' : skipped(q) ? 'skip' : 'todo'));
          }))),
        h('div.meter', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(meta.sections.length), 'aria-valuenow': String(ready) },
          h('span', { style: 'width:' + Math.round(ready / meta.sections.length * 100) + '%' }))
      ]);
    }

    function renderPreview() {
      ui.mount(els.preview, [
        onboard.tip('quest-preview', 'นี่คือ JD ที่กำลังเขียน: หมวดเส้นประคือหมวดที่ยังรอข้อมูล พอตอบครบจะกลายเป็นตัวหมึก ป้ายขวามือบอกว่าหมวดนั้นอยู่ในระดับไหน'),
        h('div.preview-head', {}, h('span.eyebrow', { text: 'JOB DESCRIPTION · ตัวอย่างสด' }),
          h('strong.preview-title', { text: A().position_title || 'ชื่อตำแหน่ง' }),
          h('span.muted.small', { text: [A().department, A().reports_to ? 'รายงานตรงต่อ ' + A().reports_to : ''].filter(Boolean).join(' · ') || 'หน่วยงาน' })),
        meta.sections.map(function (s) {
          var state = sectionState(s);
          var q = s.question ? qs.filter(function (x) { return x.id === s.question; })[0] : null;
          var why = state === 'ready' ? 'พร้อมเขียน' : state === 'skipped' ? 'ข้ามไว้ หมวดนี้จะไม่อยู่ในเอกสาร'
            : state === 'company' ? 'เพิ่มข้อมูลบริษัทเพื่อปลดล็อก' : state === 'need-gold' ? 'ตอบคำถามระดับ Blueprint อย่างน้อย 4 ข้อ'
            : q ? 'ตอบ "' + q.label + '" เพื่อปลดล็อก' : 'ตอบคำถามที่จำเป็นให้ครบก่อน';
          return h('div.sec.' + state, {},
            h('span.sec-no', { text: '§' + ('0' + s.no).slice(-2) }),
            h('div', {}, h('div.sec-title', { text: s.title }), h('div.sec-why', { text: why })),
            ui.tierPill(s.tier, true));
        }),
        h('p.sketch-note', { text: 'เส้นประ = หมวดที่ยังรอข้อมูล · ตัวหมึก = หมวดที่เขียนได้แล้ว' })
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
      return JSON.stringify(stageFields(stage).map(function (k) { return A()[k] || ''; }));
    }
    /** Loads chips for a stage once per distinct set of earlier answers. Never rejects. */
    function ensureChips(stage) {
      var sig = stageSig(stage);
      if (st.stageSig[stage] === sig) return Promise.resolve();
      if (st.stageLoading[stage] && st.stageLoading[stage].sig === sig) return st.stageLoading[stage].p;
      var answers = {};
      stageFields(stage).forEach(function (k) { if (A()[k] !== undefined) answers[k] = A()[k]; });
      var p = api.call('quest.suggestStage', { stage: stage, answers: answers }).then(function (r) {
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
          h('span.muted', { text: 'ถึงจุดพักแล้ว' })),
        h('h2.ask', { text: ui.TIER[tier].label + ' พร้อมสร้างแล้ว' }),
        onboard.tip('quest-milestone', 'สร้างตอนนี้เลยก็ได้ หรือตอบต่อก็ได้ ถ้าสร้างแล้วอยากได้ระดับสูงขึ้น อัปเกรดทีหลังได้ จ่ายเฉพาะส่วนต่าง และหมวดที่สร้างแล้วไม่เปลี่ยน'),
        h('p', { text: 'ข้อมูลตอนนี้พอสำหรับ ' + ready + ' หมวด (' + ui.TIER[tier].name + ') สร้างตอนนี้ได้เลย หรือตอบต่ออีก ' + left + ' ข้อเพื่อปลดล็อก ' + ui.TIER[nextTier].label + ' (' + ui.TIER[nextTier].name + ')' }),
        h('div.milestone-actions', {},
          ui.button('primary', 'สร้าง ' + ui.TIER[tier].label + (credits ? ' · ' + credits + ' เครดิต' : ' · ฟรี'), function (e) { generate(tier, e.currentTarget); }),
          ui.button('', 'ตอบต่ออีก ' + left + ' ข้อ → ' + ui.TIER[nextTier].label, function () { st.milestone = ''; renderCard(); renderMeter(); }))
      ]);
    }

    function renderCard() {
      if (st.milestone) { milestoneCard(st.milestone); return; }
      if (st.idx >= qs.length) {
        ui.mount(els.card, [
          h('div.stamp-row', {}, h('span.stamp', {}, h('span.stamp-top', { text: 'READY' }), h('span.stamp-main', { text: 'Role Blueprint' })),
            h('span.muted', { text: 'ตอบครบทุกข้อแล้ว' })),
          h('h2.ask', { text: 'Role Blueprint พร้อมสร้างแล้ว' }),
          h('p', { text: 'ข้อมูลครบสำหรับ JD ฉบับเต็ม หรือเลือกระดับอื่นด้านล่างก็ได้' }),
          h('div.milestone-actions', {},
            ui.button('primary', 'สร้าง Role Blueprint · ' + meta.tierCredits.gold + ' เครดิต', function (e) { generate('gold', e.currentTarget); }),
            ui.button('ghost', 'ย้อนกลับไปแก้คำตอบ', function () { st.idx = qs.length - 1; renderCard(); renderMeter(); }))
        ]);
        return;
      }
      var q = qs[st.idx];
      var ux = QUI[q.id];
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
          h('span', { text: 'ข้อ ' + (st.idx + 1) + ' จาก ' + qs.length }),
          q.required ? h('span.req', { text: 'จำเป็น' }) : null),
        onboard.tip('quest-how', 'ตอบทีละข้อ: กดเลือกตัวเลือกได้หลายข้อ หรือพิมพ์เองก็ได้ ข้อไหนไม่แน่ใจกด "ข้ามไปก่อน" ระบบบันทึกให้อัตโนมัติ กลับมาแก้ทีหลังได้'),
        h('h2.ask', { text: ux.ask }),
        body,
        unlockHint(q),
        h('div.row', {},
          st.idx > 0 ? ui.button('ghost', 'ย้อนกลับ', function () { st.idx--; st.milestone = ''; renderCard(); renderMeter(); }) : null,
          q.required ? null : ui.button('', 'ไม่แน่ใจ ข้ามไปก่อน', function () {
            if (st.pos.skipped.indexOf(q.id) < 0) st.pos.skipped.push(q.id);
            advance(st.idx);
          }),
          h('span.spacer'),
          ui.button('primary', isLast ? 'เสร็จ' : 'ถัดไป', function () {
            if (q.required && !answered(q)) { ui.toast('ข้อนี้จำเป็น ตอบก่อนไปต่อ', 'err'); return; }
            st.pos.skipped = st.pos.skipped.filter(function (id) { return !(id === q.id && answered(q)); });
            advance(st.idx);
          }))
      ]);
      var first = els.card.querySelector('input, textarea');
      if (first && ux.kind !== 'chips' && ux.kind !== 'decision') first.focus();
    }

    function unlockHint(q) {
      var secs = meta.sections.filter(function (s) { return s.question === q.id; }).map(function (s) { return s.no + ' ' + s.title; });
      if (!secs.length) return q.required ? h('div.hint', { text: 'ข้อมูลพื้นฐานที่ทุกระดับต้องใช้' }) : null;
      return h('div.hint', { text: 'ตอบข้อนี้ ปลดล็อกหมวด ' + secs.join(', ') });
    }

    function textField(field, placeholder, id) {
      return h('input', { type: 'text', id: id, value: A()[field] || '', placeholder: placeholder,
        oninput: function (e) { A()[field] = e.target.value; change(); if (field === 'position_title') document.querySelector('.page-head h1').textContent = e.target.value || 'สร้าง JD'; } });
    }

    function peopleField() {
      var opts = [
        ['NONE', 'ไม่มีหน้าที่ดูแลคน', 'รับผิดชอบผลงานของตัวเอง'],
        ['PROJECT_OR_FUNCTIONAL_LEAD', 'นำทีมงานหรือโครงการ', 'ไม่มีลูกน้องโดยตรง'],
        ['DIRECT_REPORTS', 'มีลูกน้องโดยตรง', 'มอบหมาย ติดตาม และพัฒนาทีม']
      ];
      var t = A().people_management_type;
      return h('div.stack', {},
        h('div.options', { role: 'radiogroup', 'aria-label': 'รูปแบบการดูแลคน' }, opts.map(function (o) {
          return h('button.option' + (t === o[0] ? '.on' : ''), { type: 'button', role: 'radio', 'aria-checked': String(t === o[0]),
            onclick: function () { A().people_management_type = o[0]; change(); renderCard(); } },
            h('strong', { text: o[1] }), h('small', { text: o[2] }));
        })),
        t === 'DIRECT_REPORTS' ? h('label.field', { for: 'q-count' }, 'จำนวนลูกน้องโดยตรง', textField('direct_report_count', 'เช่น 5 หรือ 6-10 คน', 'q-count')) : null,
        t && t !== 'NONE' ? h('label.field', { for: 'q-pm' }, t === 'DIRECT_REPORTS' ? 'ดูแลทีมอย่างไร' : 'นำทีมหรือโครงการอย่างไร',
          h('textarea', { id: 'q-pm', rows: '3', placeholder: 'เช่น จัดตารางกะ มอบหมายงาน สอนงานพนักงานใหม่',
            oninput: function (e) { A().people_management_input = e.target.value; change(); } }, A().people_management_input || '')) : null);
    }

    /** Multi-select chips from AI suggestions + own entries. decision=true routes "ขออนุมัติ:" items to the approval field. */
    function chipsField(q, field, decision, extra) {
      var selected = function () {
        var own = [].concat(A()[field] || []);
        if (decision) own = own.concat([].concat(A().decision_making_requires_approval || []).map(function (x) { return APPROVAL_PREFIX + x; }));
        return own;
      };
      var setSelected = function (list) {
        if (!decision) { A()[field] = list; return; }
        A().decision_making_own_authority = list.filter(function (x) { return x.indexOf(APPROVAL_PREFIX) !== 0; });
        A().decision_making_requires_approval = list.filter(function (x) { return x.indexOf(APPROVAL_PREFIX) === 0; }).map(function (x) { return x.slice(APPROVAL_PREFIX.length); });
      };
      var wrap = h('div.chips');
      var status = h('span.ai-tag');
      function drawChips() {
        var sel = selected();
        var all = (st.chips[q.id] || []).concat(sel).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
        ui.mount(wrap, all.map(function (x) {
          var on = sel.indexOf(x) >= 0;
          return h('button.chip' + (on ? '.on' : ''), { type: 'button', 'aria-pressed': String(on), text: x, onclick: function () {
            var cur = selected();
            setSelected(on ? cur.filter(function (y) { return y !== x; }) : cur.concat([x]));
            change(); drawChips();
          } });
        }));
        if (!all.length && !st.loadingChips) wrap.appendChild(h('span.muted.small', { text: A().position_title ? 'พิมพ์คำตอบของคุณด้านล่าง' : 'ใส่ชื่อตำแหน่งก่อน ระบบจะเสนอตัวเลือกให้' }));
        if (!all.length && st.loadingChips) {
          wrap.appendChild(h('div.chip-wait', { role: 'status' },
            h('div.chip-ghosts', { 'aria-hidden': 'true' }, [70, 110, 90, 130, 80].map(function (w) { return h('span', { style: 'width:' + w + 'px' }); })),
            h('p', {}, h('strong', { text: 'AI กำลังคิดตัวเลือกให้ ราว 5–15 วินาที' })),
            h('p.small', { text: 'ไม่ต้องรอก็ได้ พิมพ์คำตอบเองในช่องด้านล่างได้เลย ตัวเลือกจาก AI จะขึ้นมาให้เลือกเพิ่มเมื่อพร้อม' }),
            h('div', {}, ui.button('ghost.small-btn', 'พิมพ์เองเลย', function () { own.focus(); }, { icon: 'edit' }))));
        }
      }
      var own = h('input', { type: 'text', id: 'q-own', placeholder: decision ? 'พิมพ์เอง (ขึ้นต้นด้วย "ขออนุมัติ:" ถ้าต้องขออนุมัติ)' : 'พิมพ์เพิ่มเอง แล้วกด Enter',
        onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); addOwn(); } } });
      function addOwn() {
        var v = own.value.trim();
        if (!v) return;
        if (decision && /^ขออนุมัติ\s*:/.test(v)) v = APPROVAL_PREFIX + v.replace(/^ขออนุมัติ\s*:\s*/, '');
        setSelected(selected().concat([v]).filter(function (x, i, a) { return a.indexOf(x) === i; }));
        own.value = '';
        change(); drawChips();
      }
      drawChips();
      var stage = stageOf(q);
      var label = stage === 1 ? 'AI เสนอจากชื่อตำแหน่ง' : 'AI เสนอต่อยอดจากคำตอบก่อนหน้าของคุณ';
      if (stage && A().position_title) {
        if (!(st.chips[q.id] || []).length || st.stageSig[stage] !== stageSig(stage)) {
          st.loadingChips = true;
          status.textContent = stage === 1 ? 'AI กำลังเตรียมตัวเลือกสำหรับตำแหน่งนี้…' : 'AI กำลังเตรียมตัวเลือกจากคำตอบของคุณ…';
          drawChips();
        }
        ensureChips(stage).then(function () {
          st.loadingChips = false;
          status.textContent = (st.chips[q.id] || []).length ? label + ' · เลือกเฉพาะที่ตรงกับงานจริง' : '';
          if (qs[st.idx] === q && !st.milestone) drawChips();
        });
      }
      return h('div.stack', {}, status, wrap,
        h('div.row', {}, h('label.sr-only', { for: 'q-own', text: 'เพิ่มคำตอบเอง' }), own, ui.button('', 'เพิ่ม', addOwn)),
        extra ? h('label.field', { for: 'q-extra' }, extra[1], h('input', { type: 'text', id: 'q-extra', placeholder: extra[2], value: [].concat(A()[extra[0]] || []).join(', '),
          oninput: function (e) { A()[extra[0]] = e.target.value; change(); } })) : null);
    }

    // ---------- generate ----------
    function renderGenerate() {
      var can = requiredDone();
      var paid = st.pos.paidTier;
      ui.mount(els.generate, [
        h('h2', { text: 'สร้าง JD' }),
        h('p.muted', { text: can ? 'สร้างได้ทุกเมื่อ ไม่ต้องตอบครบ หมวดที่ข้อมูลไม่พอจะไม่อยู่ในเอกสาร' : 'ตอบคำถามที่จำเป็น 5 ข้อแรกให้ครบก่อน' }),
        app.me.hasSample ? h('div', {}, ui.button('ghost.small-btn', 'ดูตัวอย่าง JD ที่ระบบสร้าง', function () { window.open('#sample', '_blank'); }, { icon: 'jds' })) : null,
        h('div.gen-buttons', {}, ui.TIERS.map(function (t) {
          var credits = meta.tierCredits[t];
          var paidCredits = paid ? meta.tierCredits[paid] : 0;
          var label = t === 'bronze' ? 'ฟรี' : (paid && tierRank(paid) >= tierRank(t) ? 'สร้างใหม่' : (paid ? '+' + (credits - paidCredits) : credits) + ' เครดิต');
          return h('button.gen.' + ui.TIER[t].cls, { type: 'button', disabled: !can, onclick: function (e) { generate(t, e.currentTarget); } },
            h('strong', { text: ui.TIER[t].label }),
            h('small', { text: ui.TIER[t].name }),
            h('span', { text: label }));
        }))
      ]);
    }

    function generate(tier, btn) {
      if (!st.pos.id) { ui.toast('กำลังบันทึก ลองอีกครั้งใน 1 วินาที', 'err'); save(); return; }
      api.call('jd.quote', { positionId: st.pos.id, tier: tier }).then(function (qt) {
        var R = { bronze: 0, silver: 1, gold: 2 };
        var had = st.pos.latestVersion ? st.pos.latestTier : '';
        var upgrade = had && R[tier] > R[had];
        var rewrite = had && !upgrade;
        var body = h('div.stack', {},
          h('p', { text: qt.reason }),
          upgrade ? ui.note('ok', 'อัปเกรดจาก ' + ui.TIER[had].label + ': หมวดเดิมทุกหมวดคงไว้ตามเดิม รวมส่วนที่คุณแก้ไว้ AI เขียนเฉพาะหมวดใหม่ของ ' + ui.TIER[tier].label) : null,
          rewrite ? ui.note('err', 'สร้างใหม่ทั้งฉบับ: AI จะเขียนทุกหมวดใหม่ รวมหมวดที่คุณแก้ไว้ ฉบับเดิมยังเปิดดูและกลับไปใช้ได้ในประวัติเวอร์ชัน') : null,
          h('p', {}, 'ใช้ ', h('strong', { text: qt.credits ? qt.credits + ' เครดิต' : 'ไม่เสียเครดิต' }), ' · เหลือ ' + ui.fmtCredits(app.me.credits.balance) + ' เครดิต'),
          h('p.muted.small', { text: 'ใช้เวลาราว 1 นาที ถ้าระบบขัดข้องจะคืนเครดิตอัตโนมัติ' }));
        if (qt.blocked) { ui.toast(qt.reason, 'err'); return null; }
        return ui.confirmBox(upgrade ? 'อัปเกรดเป็น ' + ui.TIER[tier].label : rewrite ? 'สร้าง ' + ui.TIER[tier].label + ' ใหม่ทั้งฉบับ' : 'สร้าง ' + ui.TIER[tier].label, body,
          upgrade ? 'อัปเกรดเลย' : rewrite ? 'เขียนใหม่ทั้งฉบับ' : 'สร้างเลย');
      }).then(function (yes) {
        if (!yes) return;
        var wait = waiting(tier);
        return api.call('jd.generate', { positionId: st.pos.id, tier: tier }).then(function (r) {
          wait.done();
          app.refreshMe();
          ui.toast('สร้าง JD แล้ว' + (r.charged ? ' ใช้ ' + r.charged + ' เครดิต' : ''));
          app.go('#jd/' + st.pos.id);
        }, function (e) { wait.done(); throw e; });
      }).catch(function (e) {
        if (e.code === 'NOT_ENOUGH_CREDITS') {
          ui.confirmBox('เครดิตไม่พอ', ui.errorText(e), 'ไปหน้าเครดิต').then(function (y) { if (y) app.go('#credits'); });
        } else ui.toast(ui.errorText(e), 'err');
      });
    }

    /** Full-screen progress while the AI writes (~1 minute). */
    function waiting(tier) {
      var steps = ['อ่านคำตอบของคุณ', 'วางโครง ' + (tier === 'gold' ? 19 : tier === 'silver' ? 13 : 9) + ' หมวด', 'AI กำลังเขียน', 'ตรวจความครบถ้วน', 'จัดหน้าเอกสาร'];
      var i = 0;
      var line = h('p.wait-step', { text: steps[0] });
      var back = h('div.modal-back', { role: 'alertdialog', 'aria-label': 'กำลังสร้าง JD' },
        h('div.modal.center', {}, h('div.spinner', { 'aria-hidden': 'true' }), h('h2', { text: 'กำลังสร้าง ' + ui.TIER[tier].label }), line,
          h('p.muted.small', { text: 'ใช้เวลาราว 1 นาที อย่าเพิ่งปิดหน้านี้' })));
      document.body.appendChild(back);
      var t = setInterval(function () { if (i < steps.length - 1) line.textContent = steps[++i]; }, 12000);
      return { done: function () { clearInterval(t); back.remove(); } };
    }
  };
})();

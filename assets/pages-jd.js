/* pages-jd.js – My JDs list and one JD on screen with upgrade + Word download. */
(function () {
  var h = ui.h;
  window.pages = window.pages || {};

  var DIM = [
    ['knowledge_expertise', 'Knowledge & Expertise'], ['problem_solving_complexity', 'Problem Solving & Complexity'],
    ['accountability_business_impact', 'Accountability & Business Impact'], ['decision_authority', 'Decision Authority'],
    ['people_leadership_influence', 'People Leadership / Influence'], ['communication_stakeholder_complexity', 'Communication & Stakeholder Complexity'],
    ['risk_compliance_consequence_of_error', 'Risk, Compliance & Consequence of Error']
  ];

  function table(head, rows) {
    return h('div.table-wrap', {}, h('table', {},
      h('thead', {}, h('tr', {}, head.map(function (x) { return h('th', { text: x }); }))),
      h('tbody', {}, rows.map(function (r) { return h('tr', {}, r.map(function (x) { return h('td', {}, cell(x)); })); }))));
  }
  /** A cell with several lines is a list: show it with bullets, whatever marker the text used. */
  function cell(x) {
    var s = x === undefined || x === null || x === '' ? '-' : String(x);
    var lines = s.split('\n').map(function (l) { return l.replace(/^\s*(?:[•·\-*–]|\d+[.)])\s*/, '').trim(); }).filter(Boolean);
    if (lines.length < 2) return s.replace(/^\s*[•·]\s*/, '');
    return h('ul.cell-list', {}, lines.map(function (l) { return h('li', { text: l }); }));
  }
  // Labels inside the JD follow the JD's language (set by render for the JD on screen); the app's own buttons stay Thai.
  var DOC = {
    th: { topic: 'หัวข้อ', detail: 'รายละเอียด', own: 'ตัดสินใจได้เอง', approval: 'ต้องได้รับอนุมัติ', internal: 'ภายใน', external: 'ภายนอก',
      education: 'การศึกษา', experience: 'ประสบการณ์', technical: 'ทักษะเฉพาะทาง', digital: 'ทักษะระบบ/ดิจิทัล', language: 'ภาษา', cert: 'ใบอนุญาต/ประกาศนียบัตร', personal: 'คุณลักษณะส่วนบุคคล',
      behaviours: 'ตัวอย่างพฤติกรรม', env: 'สภาพแวดล้อมการทำงาน', tools: 'เครื่องมือและระบบ', collab: 'รูปแบบการทำงานร่วมกัน', constraints: 'ข้อจำกัดหรือเงื่อนไข',
      factor: 'ปัจจัยประเมินงาน', hrArea: 'งาน HR', howTo: 'วิธีนำไปใช้', verify: 'จุดที่ต้องตรวจสอบ', reportsTo: 'รายงานตรงต่อ ', omitted: 'หมวดที่ยังไม่ได้สร้างเพราะข้อมูลยังไม่พอ: ' },
    en: { topic: 'Item', detail: 'Details', own: 'Decides independently', approval: 'Requires approval', internal: 'Internal', external: 'External',
      education: 'Education', experience: 'Experience', technical: 'Technical Skills', digital: 'Digital / System Skills', language: 'Languages', cert: 'Licences / Certificates', personal: 'Personal Attributes',
      behaviours: 'Behavioural Indicators', env: 'Work Environment', tools: 'Tools and Systems', collab: 'Collaboration Pattern', constraints: 'Constraints or Conditions',
      factor: 'Evaluation Factor', hrArea: 'HR Area', howTo: 'How to Use', verify: 'What to Verify', reportsTo: 'Reports to ', omitted: 'Sections not written yet because information is missing: ' }
  };
  var D = DOC.th;
  /** hr_area comes from the AI as a code (job_posting…): Thai label, or the code in words for English JDs. */
  var HR_AREA = { job_posting: 'ประกาศรับสมัคร', recruitment: 'สรรหาคัดเลือก', screening: 'คัดกรองผู้สมัคร', interview: 'สัมภาษณ์', onboarding: 'ปฐมนิเทศ',
    probation_goals: 'เป้าหมายช่วงทดลองงาน', probation: 'ช่วงทดลองงาน', performance: 'ประเมินผลงาน', performance_management: 'ประเมินผลงาน',
    kpi: 'ตัวชี้วัด (KPI)', kpi_competency: 'KPI และ Competency', competency: 'Competency', training: 'ฝึกอบรม', development: 'พัฒนาบุคลากร',
    training_development: 'ฝึกอบรมและพัฒนา', job_evaluation: 'ประเมินค่างาน', job_evaluation_preparation: 'เตรียมข้อมูลประเมินค่างาน',
    compensation: 'ค่าตอบแทน', career_path: 'เส้นทางอาชีพ', succession: 'วางแผนสืบทอดตำแหน่ง', succession_planning: 'วางแผนสืบทอดตำแหน่ง' };
  function hrArea_(c) { var k = String(c || '').trim(); return (D === DOC.th && HR_AREA[k.toLowerCase()]) || (/^[a-z_]+$/.test(k) ? (k.charAt(0).toUpperCase() + k.slice(1)).replace(/_/g, ' ') : k); }
  function kv(pairs) { return table([D.topic, D.detail], pairs); }
  function list(items) { return h('ol.jd-list', {}, (items || []).map(function (x) { return h('li', { text: x }); })); }

  /** Renders one section value the same way the Word document lays it out. */
  var RENDER = {
    key_accountabilities: function (v) { return table(['Key Accountability', 'Description', 'Expected Output'], v.map(function (x) { return [x.accountability, x.description, x.expected_output]; })); },
    key_responsibilities: function (v) { return table(['Responsibility', 'Frequency', 'Stakeholder', 'Expected Standard'], v.map(function (x) { return [x.responsibility, x.frequency, x.stakeholder, x.expected_standard]; })); },
    expected_outputs_summary: list,
    key_indicators: function (v) { return table(['Indicator', 'Measurement', 'Target', 'Review'], v.map(function (x) { return [x.indicator, x.measurement_logic, x.suggested_target, x.review_frequency]; })); },
    decision_making_authority: function (v) { return kv([[D.own, v.own_authority], [D.approval, v.requires_approval]]); },
    working_relationship: function (v) { return kv([[D.internal, v.internal], [D.external, v.external]]); },
    qualifications: function (v) {
      return kv([[D.education, v.education], [D.experience, v.experience], [D.technical, v.technical_skills], [D.digital, v.digital_system_skills],
        [D.language, v.language_skills], [D.cert, v.certification], [D.personal, v.personal_attributes]]);
    },
    required_competencies: function (v) { return table(['Competency', 'Type', 'Definition', D.behaviours, 'Why It Matters'], v.map(function (x) { return [x.competency, x.type, x.definition, x.behavioral_indicators, x.why_it_matters]; })); },
    work_context_conditions: function (v) {
      return kv([[D.env, v.work_environment], [D.tools, v.tools_systems], [D.collab, v.collaboration_pattern], [D.constraints, v.constraints_conditions]]);
    },
    job_evaluation_information_summary: function (v) { return table([D.factor, D.detail], DIM.map(function (d) { return [d[1], v[d[0]]]; })); },
    review_checklist: list,
    hr_usage_guidance: function (v) { return table([D.hrArea, D.howTo, D.verify], v.map(function (x) { return [hrArea_(x.hr_area), x.application_guidance, x.validation_point]; })); },
    human_validation_points: list
  };

  function view_(key, val) {
    return RENDER[key] ? RENDER[key](val || []) : h('p', { text: val || '-' });
  }

  /** Thai labels for object fields in the editor and in before/after views. */
  var FIELD = {
    accountability: 'ความรับผิดชอบ', description: 'รายละเอียด', expected_output: 'ผลลัพธ์ที่คาดหวัง',
    responsibility: 'หน้าที่', frequency: 'ความถี่', stakeholder: 'ผู้เกี่ยวข้อง', expected_standard: 'มาตรฐานงาน',
    indicator: 'ตัวชี้วัด', measurement_logic: 'วิธีวัด', suggested_target: 'เป้าหมาย', data_source: 'แหล่งข้อมูล', review_frequency: 'ความถี่ทบทวน', validation_point: 'จุดที่ต้องยืนยัน',
    own_authority: 'ตัดสินใจได้เอง', requires_approval: 'ต้องได้รับอนุมัติ', internal: 'ภายใน', external: 'ภายนอก',
    education: 'การศึกษา', experience: 'ประสบการณ์', technical_skills: 'ทักษะเฉพาะทาง', digital_system_skills: 'ทักษะระบบ/ดิจิทัล',
    language_skills: 'ภาษา', certification: 'ใบอนุญาต/ประกาศนียบัตร', personal_attributes: 'คุณลักษณะส่วนบุคคล',
    competency: 'สมรรถนะ', type: 'ประเภท', definition: 'นิยาม', behavioral_indicators: 'ตัวอย่างพฤติกรรม (บรรทัดละ 1 ข้อ)', why_it_matters: 'ทำไมสำคัญ',
    work_environment: 'สภาพแวดล้อมการทำงาน', tools_systems: 'เครื่องมือและระบบ', collaboration_pattern: 'รูปแบบการทำงานร่วมกัน', constraints_conditions: 'ข้อจำกัดหรือเงื่อนไข',
    hr_area: 'งาน HR', application_guidance: 'วิธีนำไปใช้'
  };
  DIM.forEach(function (d) { FIELD[d[0]] = d[1]; });

  function short_(x) {
    var s = typeof x === 'string' ? x : x[Object.keys(x)[0]];
    s = String(s || '');
    return s.length > 40 ? s.slice(0, 40) + '…' : s;
  }

  function toText_(v) {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(function (x, i) { return (i + 1) + '. ' + toText_(x).replace(/\n/g, '\n   '); }).join('\n');
    return Object.keys(v || {}).map(function (k) { return (FIELD[k] || k) + ': ' + v[k]; }).join('\n');
  }

  // ---------------- editing in place: the section keeps its layout and every cell becomes editable ----------------
  var COLS = {
    key_accountabilities: [['accountability', 'Key Accountability'], ['description', 'Description'], ['expected_output', 'Expected Output']],
    key_responsibilities: [['responsibility', 'Responsibility'], ['frequency', 'Frequency'], ['stakeholder', 'Stakeholder'], ['expected_standard', 'Expected Standard']],
    key_indicators: [['indicator', 'Indicator'], ['measurement_logic', 'Measurement'], ['suggested_target', 'Target'], ['review_frequency', 'Review']],
    required_competencies: [['competency', 'Competency'], ['type', 'Type'], ['definition', 'Definition'], ['behavioral_indicators', 'ตัวอย่างพฤติกรรม'], ['why_it_matters', 'Why It Matters']],
    hr_usage_guidance: [['hr_area', 'งาน HR'], ['application_guidance', 'วิธีนำไปใช้'], ['validation_point', 'จุดที่ต้องตรวจสอบ']]
  };
  var KV = {
    decision_making_authority: [['own_authority', 'ตัดสินใจได้เอง'], ['requires_approval', 'ต้องได้รับอนุมัติ']],
    working_relationship: [['internal', 'ภายใน'], ['external', 'ภายนอก']],
    qualifications: [['education', 'การศึกษา'], ['experience', 'ประสบการณ์'], ['technical_skills', 'ทักษะเฉพาะทาง'], ['digital_system_skills', 'ทักษะระบบ/ดิจิทัล'],
      ['language_skills', 'ภาษา'], ['certification', 'ใบอนุญาต/ประกาศนียบัตร'], ['personal_attributes', 'คุณลักษณะส่วนบุคคล']],
    work_context_conditions: [['work_environment', 'สภาพแวดล้อมการทำงาน'], ['tools_systems', 'เครื่องมือและระบบ'], ['collaboration_pattern', 'รูปแบบการทำงานร่วมกัน'], ['constraints_conditions', 'ข้อจำกัดหรือเงื่อนไข']],
    job_evaluation_information_summary: DIM
  };
  var BULLET_FIELDS = ['behavioral_indicators'];

  // Re-fit growing text boxes when the screen width changes.
  window.addEventListener('resize', function () {
    document.querySelectorAll('textarea.grow').forEach(function (t) { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; });
  });

  /** Textarea that grows with its text (no inner scrollbar). */
  function growArea(value, label, onInput) {
    var t = h('textarea.grow', { rows: '1', 'aria-label': label, oninput: function () { fit(); onInput(t.value); } }, value || '');
    function fit() { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; }
    setTimeout(fit, 0);
    return t;
  }

  function splitBullets(s) { return String(s || '').split('\n').map(function (l) { return l.replace(/^\s*(?:[•·\-*–]|\d+[.)])\s*/, '').trim(); }).filter(Boolean); }

  /** One bullet per input: Enter adds the next bullet, Backspace on an empty bullet removes it. */
  function bulletEditor(value, label, onChange) {
    var items = splitBullets(value);
    if (!items.length) items = [''];
    var root = h('ul.bullet-edit', { 'aria-label': label });
    function emit() { onChange(items.filter(function (x) { return x.trim(); }).map(function (x) { return '• ' + x.trim(); }).join('\n')); }
    function draw(focusAt) {
      ui.mount(root, items.map(function (txt, i) {
        var inp = growArea(txt, label + ' ข้อ ' + (i + 1), function (x) { items[i] = x.replace(/\n/g, ' '); emit(); });
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); items.splice(i + 1, 0, ''); emit(); draw(i + 1); }
          else if (e.key === 'Backspace' && !items[i] && items.length > 1) { e.preventDefault(); items.splice(i, 1); emit(); draw(Math.max(0, i - 1)); }
        });
        return h('li', {}, inp);
      }));
      if (focusAt !== undefined) { var f = root.querySelectorAll('textarea')[focusAt]; if (f) f.focus(); }
    }
    draw();
    return root;
  }

  /**
   * In-place editor for one section. opts.onChange() runs after every change; opts.onRowAi(index) asks AI about one row.
   * → {el, value(), changes()} where changes() counts cells that differ from the original.
   */
  function inlineEditor(key, original, opts) {
    var orig = JSON.parse(JSON.stringify(original === undefined ? '' : original));
    var data = JSON.parse(JSON.stringify(orig));
    var root = h('div.inline-edit');
    function changed() { opts.onChange(); }
    function sameCell(a, b) { return String(a === undefined ? '' : a).trim() === String(b === undefined ? '' : b).trim(); }
    function changes() {
      if (typeof data === 'string') return sameCell(data, orig) ? 0 : 1;
      if (!Array.isArray(data)) return Object.keys(data).filter(function (k) { return !sameCell(data[k], orig[k]); }).length;
      var n = Math.abs(data.length - orig.length);
      data.forEach(function (row, i) {
        var o = orig[i];
        if (o === undefined) return;
        if (typeof row === 'string') { if (!sameCell(row, o)) n++; }
        else Object.keys(row).forEach(function (k) { if (!sameCell(row[k], o[k])) n++; });
      });
      return n;
    }
    function mark(el, a, b) { el.classList.toggle('dirty', !sameCell(a, b)); }

    function rowTools(i) {
      return h('div.row-tools', {},
        ui.button('ghost.icon-btn', '', function () { if (i > 0) { var t = data[i - 1]; data[i - 1] = data[i]; data[i] = t; draw(); changed(); } }, { icon: 'up', 'aria-label': 'ย้ายขึ้น', title: 'ย้ายขึ้น', disabled: i === 0 }),
        ui.button('ghost.icon-btn', '', function () { if (i < data.length - 1) { var t = data[i + 1]; data[i + 1] = data[i]; data[i] = t; draw(); changed(); } }, { icon: 'down', 'aria-label': 'ย้ายลง', title: 'ย้ายลง', disabled: i === data.length - 1 }),
        opts.onRowAi && !(key === 'required_competencies' && data[i].type === 'Core')
          ? ui.button('ghost.icon-btn.ai-btn', '', function () { opts.onRowAi(i); }, { icon: 'ai', 'aria-label': 'AI แก้แถวนี้', title: 'AI แก้แถวนี้' }) : null,
        ui.button('ghost.icon-btn.danger', '', function () { data.splice(i, 1); draw(); changed(); }, { icon: 'trash', 'aria-label': 'ลบแถวนี้', title: 'ลบแถวนี้' }));
    }

    function draw() {
      if (typeof data === 'string') {
        var box = h('div.cell-wrap');
        box.appendChild(growArea(data, 'ข้อความหมวดนี้', function (x) { data = x; mark(box, data, orig); changed(); }));
        mark(box, data, orig);
        ui.mount(root, box);
        return;
      }
      if (KV[key]) {
        ui.mount(root, h('div.table-wrap', {}, h('table.edit-table', {}, h('tbody', {}, KV[key].map(function (f) {
          var td = h('td', { 'data-label': f[1] });
          td.appendChild(growArea(data[f[0]], f[1], function (x) { data[f[0]] = x; mark(td, data[f[0]], orig[f[0]]); changed(); }));
          mark(td, data[f[0]], orig[f[0]]);
          return h('tr', {}, h('th', { scope: 'row', text: f[1] }), td);
        })))));
        return;
      }
      if (Array.isArray(data) && COLS[key]) {
        var cols = COLS[key];
        var body = h('tbody', {}, data.map(function (row, i) {
          var o = orig[i] || {};
          return h('tr', {}, cols.map(function (c) {
            var td = h('td', { 'data-label': c[1] });
            if (key === 'required_competencies' && c[0] === 'type') {
              td.appendChild(h('select', { 'aria-label': c[1], onchange: function (e) { row.type = e.target.value; mark(td, row.type, o.type); draw(); changed(); } },
                ['Core', 'Leadership', 'Functional'].map(function (t) { return h('option', { value: t, text: t, selected: row.type === t }); })));
            } else if (BULLET_FIELDS.indexOf(c[0]) >= 0) {
              td.appendChild(bulletEditor(row[c[0]], c[1], function (x) { row[c[0]] = x; mark(td, x, o[c[0]]); changed(); }));
            } else {
              td.appendChild(growArea(row[c[0]], c[1], function (x) { row[c[0]] = x; mark(td, x, o[c[0]]); changed(); }));
            }
            mark(td, row[c[0]], o[c[0]]);
            return td;
          }).concat([h('td.tools-cell', { 'data-label': '' }, rowTools(i))]));
        }));
        ui.mount(root, [
          h('div.table-wrap', {}, h('table.edit-table', {}, h('thead', {}, h('tr', {}, cols.map(function (c) { return h('th', { text: c[1] }); }).concat([h('th', { 'aria-label': 'จัดการแถว' })]))), body)),
          ui.button('small-btn', 'เพิ่มแถว', function () {
            var blank = {};
            cols.forEach(function (c) { blank[c[0]] = c[0] === 'type' ? 'Functional' : ''; });
            data.push(blank); draw(); changed();
            var last = root.querySelector('tbody tr:last-child textarea'); if (last) last.focus();
          }, { icon: 'plus' })
        ]);
        return;
      }
      if (Array.isArray(data)) {
        ui.mount(root, [
          h('ol.list-edit', {}, data.map(function (item, i) {
            var li = h('li', {});
            li.appendChild(h('div.list-row', {}, growArea(item, 'ข้อ ' + (i + 1), function (x) { data[i] = x; mark(li, x, orig[i]); changed(); }), rowTools(i)));
            mark(li, item, orig[i]);
            return li;
          })),
          ui.button('small-btn', 'เพิ่มข้อ', function () { data.push(''); draw(); changed(); var all = root.querySelectorAll('textarea'); if (all.length) all[all.length - 1].focus(); }, { icon: 'plus' })
        ]);
        return;
      }
      // Any other object: label + text per field.
      ui.mount(root, h('div.table-wrap', {}, h('table.edit-table', {}, h('tbody', {}, Object.keys(data).map(function (k) {
        var td = h('td', { 'data-label': FIELD[k] || k });
        td.appendChild(growArea(data[k], FIELD[k] || k, function (x) { data[k] = x; mark(td, x, orig[k]); changed(); }));
        return h('tr', {}, h('th', { scope: 'row', text: FIELD[k] || k }), td);
      })))));
    }
    draw();
    return {
      el: root, changes: changes,
      value: function () {
        if (Array.isArray(data)) return data.filter(function (r) { return typeof r === 'string' ? r.trim() : Object.keys(r).some(function (k) { return k !== 'type' && String(r[k] || '').trim(); }); });
        return data;
      }
    };
  }

  // ---------------- shared: dialogs used by the JD list and the JD page ----------------
  function modal(title, body, foot) {
    var back = h('div.modal-back', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onclick: function (e) { if (e.target === back) back.remove(); } });
    var close = function () { back.remove(); };
    back.appendChild(h('div.modal.wide-modal', {}, h('div.row-between', {}, h('h2', { text: title }), ui.button('ghost.small-btn', 'ปิด', close)), body, foot ? foot(close) : null));
    document.body.appendChild(back);
    return close;
  }

  /** p: {id, code, title, latestVersion} */
  function openDuplicate(p) {
    var cost = (app.me.credits.costs || {}).duplicateJd || 1;
    var hasJd = !!p.latestVersion;
    var name = h('input', { type: 'text', id: 'dup-title', value: (p.title || '') + ' (สำเนา)' });
    var mode = 'answers';
    var opts;
    var opt = function (val, title, desc, price, disabled) {
      return h('label.option' + (val === mode ? '.on' : '') + (disabled ? '.disabled' : ''), { 'data-mode': val },
        h('input.sr-only', { type: 'radio', name: 'dup-mode', value: val, checked: val === mode, disabled: disabled, onchange: function () {
          mode = val; opts.querySelectorAll('.option').forEach(function (o) { o.classList.toggle('on', o.getAttribute('data-mode') === val); });
        } }),
        h('strong', { text: title }), h('small', { text: desc }), h('span.price-tag', { text: price }));
    };
    opts = h('div.options', { role: 'radiogroup', 'aria-label': 'แบบที่จะทำซ้ำ' },
      opt('answers', 'คัดลอกคำตอบ', 'ได้ตำแหน่งใหม่ที่มีคำตอบครบทุกข้อ ปรับคำตอบแล้วกดสร้าง JD ตามปกติ', 'ฟรี · สร้าง JD คิดเครดิตตามระดับ'),
      opt('full', 'คัดลอกทั้งฉบับ', hasJd ? 'ได้ตำแหน่งใหม่พร้อม JD ฉบับล่าสุด (Rev. ' + p.latestVersion + ') รวมส่วนที่แก้ไว้ แก้ต่อได้ทันที' : 'ตำแหน่งนี้ยังไม่มี JD ให้คัดลอก',
        cost + ' เครดิต', !hasJd));
    var msg = h('div');
    modal('ทำซ้ำเป็นตำแหน่งใหม่', h('div.stack', {},
      h('p.small', { text: 'ตำแหน่งเดิม (' + (p.code || p.title || '') + ') ไม่เปลี่ยน ตำแหน่งใหม่ได้รหัสใหม่' }),
      h('label.field', { for: 'dup-title' }, 'ชื่อตำแหน่งใหม่', name), opts, msg), function (close) {
      var go = ui.button('primary', 'ทำซ้ำ', function () {
        ui.busy(go, 'กำลังทำซ้ำ…', function () {
          return api.call('positions.duplicate', { id: p.id, mode: mode, title: name.value }).then(function (r) {
            close();
            app.refreshMe();
            ui.toast('สร้าง ' + r.position.code + ' แล้ว' + (r.charged ? ' · ใช้ ' + r.charged + ' เครดิต' : ''));
            app.go(mode === 'full' ? '#jd/' + r.position.id : '#quest/' + r.position.id);
          });
        }).catch(function (e) {
          ui.mount(msg, ui.note('err', ui.errorText(e) + (e.code === 'NOT_ENOUGH_CREDITS' ? ' · เติมเครดิตได้ที่หน้าเครดิต' : '')));
        });
      });
      return h('div.row.end', {}, ui.button('ghost', 'ยกเลิก', close), go);
    });
    name.select();
  }

  /** p: {id, code, title, latestVersion}; onDone after the position is removed. */
  function confirmDelete(p, onDone) {
    var label = [p.code, p.title || 'ตำแหน่งที่ยังไม่ตั้งชื่อ'].filter(Boolean).join(' ');
    var body = h('div.stack', {},
      h('p', {}, 'ลบ ', h('strong', { text: label }), ' ออกจากรายการ?'),
      ui.note('err', p.latestVersion
        ? 'JD ทุกเวอร์ชันของตำแหน่งนี้จะหายจากหน้าเว็บ และไม่คืนเครดิตที่ใช้สร้างไปแล้ว ถ้าลบผิด แจ้งผู้ดูแลระบบให้กู้คืนได้'
        : 'คำตอบที่กรอกไว้จะหายจากหน้าเว็บ ถ้าลบผิด แจ้งผู้ดูแลระบบให้กู้คืนได้'));
    ui.confirmBox('ลบตำแหน่ง', body, 'ลบ').then(function (yes) {
      if (!yes) return;
      api.call('positions.delete', { id: p.id }).then(function () {
        ui.toast('ลบ ' + label + ' แล้ว');
        if (onDone) onDone();
      }, function (e) { ui.toast(ui.errorText(e), 'err'); });
    });
  }

  window.jdView = { render: view_ };

  window.pages.jds = function (view) {
    var box = h('div.stack', {}, h('p.muted', { text: 'กำลังโหลด…' }));
    ui.mount(view, [ui.pageHead('ตำแหน่งทั้งหมดของบริษัท', 'JD ของฉัน', ui.button('primary', 'สร้าง JD ใหม่', function () { app.go('#quest'); }, { icon: 'plus' })), onboard.checklist(), box]);
    api.call('positions.list').then(function (rows) {
      if (!rows.length) {
        ui.mount(box, h('section.card.empty', {}, h('h2', { text: 'ยังไม่มี JD' }),
          h('p.muted', { text: 'เริ่มจากชื่อตำแหน่ง ตอบ 5 ข้อ ก็ได้ JD ร่างฟรี' }),
          h('div.row', {}, ui.button('primary', 'สร้าง JD แรก', function () { app.go('#quest'); }),
            app.me.hasSample ? ui.button('ghost', 'ดูตัวอย่าง JD ก่อน', function () { app.go('#sample'); }, { icon: 'jds' }) : null)));
        return;
      }
      ui.mount(box, rows.map(function (p) {
        var href = p.latestVersion ? '#jd/' + p.id : '#quest/' + p.id;
        return h('div.card.pos-row', {},
          h('a.pos-main', { href: href },
            h('div.row-tight', {}, p.code ? h('span.code-tag', { text: p.code }) : null, h('strong', { text: p.title || 'ยังไม่ตั้งชื่อตำแหน่ง' })),
            h('div.muted.small', { text: (p.department || '-') + (p.latestVersion ? ' · Rev. ' + p.latestVersion : '') + ' · แก้ล่าสุด ' + new Date(p.updated_at).toLocaleString('th-TH') })),
          h('div.pos-side', {},
            p.latestVersion ? ui.tierPill(p.latestTier) : h('span.pill.gray', { text: 'กำลังตอบคำถาม' }),
            h('div.row.pos-actions', {},
              ui.button('small-btn', 'ทำซ้ำ', function () { openDuplicate(p); }, { icon: 'copy', 'aria-label': 'ทำซ้ำ ' + (p.code || p.title || '') }),
              ui.button('small-btn.danger', 'ลบ', function () { confirmDelete(p, function () { window.pages.jds(view); }); },
                { icon: 'trash', 'aria-label': 'ลบ ' + (p.code || p.title || '') }))));
      }));
    }, function (e) { ui.mount(box, ui.note('err', ui.errorText(e))); });
  };

  window.pages.jd = function (view, arg) {
    if (!arg) { app.go('#jds'); return; }
    // #jd/<position id> = latest; #jd/<position id>/<n> = Rev. n (read only)
    var positionId = String(arg).split('/')[0];
    var viewRev = Number(String(arg).split('/')[1]) || 0;
    var pos = null;
    ui.mount(view, h('p.muted', { text: 'กำลังโหลด…' }));
    Promise.all([api.call('jd.get', viewRev ? { positionId: positionId, version: viewRev } : { positionId: positionId }), app.loadQuestions(), api.call('positions.get', { id: positionId })]).then(function (r) {
      pos = r[2];
      render(r[0], r[1], r[2]);
    }, function (e) {
      if (e.code === 'NOT_FOUND') { app.go('#quest/' + positionId); return; }
      ui.mount(view, ui.note('err', ui.errorText(e)));
    });

    function reload() {
      return api.call('jd.get', { positionId: positionId }).then(function (v) { return app.loadQuestions().then(function (m) { render(v, m); }); });
    }

    function render(v, meta) {
      var jd = v.jd;
      var isEn = jd.lang === 'en';
      D = DOC[isEn ? 'en' : 'th'];
      var titleOf = {};
      meta.sections.forEach(function (s) { titleOf[s.key] = isEn ? (s.title_en || s.title) : s.title; });
      var actions = h('div.row', {},
        v.latest ? ui.button('', 'แก้คำตอบ', function () { app.go('#quest/' + positionId); }, { icon: 'quest' }) : null,
        v.latest && v.tier !== 'gold' ? ui.button('gold-btn', v.tier === 'bronze' ? 'อัปเกรดเป็น Role Profile / Blueprint' : 'อัปเกรดเป็น Role Blueprint (+2)', function () { app.go('#quest/' + positionId); }) : null,
        v.tier === 'bronze' ? null : downloadBtn(),
        ui.button('', 'ประวัติ · ' + v.versions + ' Rev.', function () { history(); }, { icon: 'history' }),
        v.latest ? ui.button('', isEn ? 'เปลี่ยนเป็นภาษาไทย' : 'เปลี่ยนเป็นภาษาอังกฤษ', function () { changeLang(); }, { icon: 'globe' }) : null,
        v.latest ? ui.button('', 'ทำซ้ำ', function () { openDuplicate({ id: positionId, code: v.code, title: jd.title, latestVersion: v.version }); }, { icon: 'copy' }) : null,
        v.latest ? ui.button('ghost', 'แก้รหัส', function () { editCode(); }, { icon: 'edit' }) : null,
        v.latest ? ui.button('ghost.danger', 'ลบ', function () { confirmDelete({ id: positionId, code: v.code, title: jd.title, latestVersion: v.versions }, function () { app.go('#jds'); }); }, { icon: 'trash' }) : null);
      var changed = (v.changedSections || []).filter(function (k) { return jd.order.indexOf(k) >= 0; });

      // Sections being edited on the page; all of them are saved together as one new Rev.
      var edits = {};
      var bar = h('div.save-bar', { hidden: true, role: 'region', 'aria-label': 'บันทึกการแก้' });
      function dirtyCount() { return Object.keys(edits).reduce(function (n, k) { return n + edits[k].changes(); }, 0); }
      function updateBar() {
        var open = Object.keys(edits).length;
        var n = dirtyCount();
        bar.hidden = !open;
        app.leaveGuard = n ? function () { return dirtyCount() > 0; } : null;
        if (!open) return;
        var saveBtn = ui.button('primary', 'บันทึกเป็น Rev. ' + (v.versions + 1), function () { saveAll(saveBtn); }, n ? null : { disabled: true });
        ui.mount(bar, h('div.save-bar-in', {},
          h('span', {}, n ? h('strong', { text: 'แก้ไป ' + n + ' ช่อง' }) : 'ยังไม่ได้แก้อะไร', h('span.muted.small', { text: ' · ' + open + ' หมวดกำลังแก้' })),
          h('div.row', {}, ui.button('ghost', 'ยกเลิกทั้งหมด', function () {
            var drop = function () { edits = {}; app.leaveGuard = null; reload(); };
            if (!n) { drop(); return; }
            ui.confirmBox('ยกเลิกการแก้ทั้งหมด', 'ที่แก้ไว้ ' + n + ' ช่องจะหายไป', 'ยกเลิกทั้งหมด').then(function (y) { if (y) drop(); });
          }), saveBtn)));
      }
      function saveAll(btn) {
        var changes = {};
        Object.keys(edits).forEach(function (k) { if (edits[k].changes()) changes[k] = edits[k].value(); });
        ui.busy(btn, 'กำลังบันทึก…', function () {
          return api.call('jd.edit.saveMany', { positionId: positionId, version: v.version, changes: changes }).then(function (r) {
            edits = {}; app.leaveGuard = null;
            ui.toast('บันทึกแล้ว เป็น Rev. ' + r.version);
            return reload();
          });
        }).catch(function (e) { ui.toast(ui.errorText(e), 'err'); });
      }
      app.leaveGuard = null;

      // Consistency check (AI reads the whole JD next to the answers; it never changes the JD).
      var qualityBox = v.latest ? h('div.quality', { role: 'status', 'aria-live': 'polite' }) : null;
      function sectionLabel(k) { var i = jd.order.indexOf(k); return '§' + ('0' + (i + 1)).slice(-2) + ' ' + (titleOf[k] || k); }
      function goSection(k) { var el = document.getElementById('sec-' + k); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      function drawQuality(q) {
        if (!qualityBox) return;
        var runBtn = function (label) {
          var b = ui.button('small-btn', label, function () {
            ui.busy(b, 'กำลังตรวจ… (ราว 20 วินาที)', function () { return api.call('jd.quality', { positionId: positionId, version: v.version, run: true }).then(drawQuality); })
              .catch(function (e) { ui.toast(ui.errorText(e), 'err'); });
          });
          return b;
        };
        if (q.status === 'running') {
          ui.mount(qualityBox, h('div.note.info.quality-wait', {}, h('span', { text: 'AI กำลังตรวจความสอดคล้องของ JD ฉบับนี้…' })));
          setTimeout(loadQuality, 8000);
        } else if (q.status === 'not_checked') {
          ui.mount(qualityBox, h('div.note.info.core-nudge', {}, h('span', { text: 'แก้ JD แล้ว · ให้ AI ตรวจว่าหมวดต่าง ๆ ยังสอดคล้องกันไหม (ฟรี)' }), runBtn('ตรวจความสอดคล้อง')));
        } else if (q.status === 'failed') {
          ui.mount(qualityBox, h('div.note.info.core-nudge', {}, h('span', { text: 'ตรวจความสอดคล้องไม่สำเร็จ' }), runBtn('ลองอีกครั้ง')));
        } else if (q.status === 'done' && !q.issues.length) {
          ui.mount(qualityBox, h('div.note.ok.quality-ok', {}, h('span', { text: 'AI ตรวจความสอดคล้องแล้ว ไม่พบหมวดที่ขัดกัน · ยังควรอ่านทวนก่อนใช้' })));
        } else if (q.status === 'done') {
          ui.mount(qualityBox, h('div.note.warn.quality-list', {},
            h('strong', { text: 'AI พบ ' + q.issues.length + ' จุดที่ควรตรวจ' }),
            h('ol', {}, q.issues.map(function (x) {
              return h('li', {},
                h('span', { text: x.problem }),
                x.suggestion ? h('span.quality-fix', { text: 'ควรทำ: ' + x.suggestion }) : null,
                x.sections.length ? h('span.quality-secs', {}, x.sections.map(function (k) {
                  return h('button.chip.quality-sec', { type: 'button', onclick: function () { goSection(k); } }, sectionLabel(k));
                })) : null);
            })),
            h('span.small', { text: 'AI แค่ชี้จุด ไม่ได้แก้ JD ให้ · ถ้าเห็นว่าถูกต้องอยู่แล้วก็ไม่ต้องทำอะไร · แก้แล้วกดตรวจใหม่ได้' })));
        }
      }
      function loadQuality() {
        if (!qualityBox || !document.body.contains(qualityBox)) return;
        api.call('jd.quality', { positionId: positionId, version: v.version }).then(drawQuality, function () { ui.mount(qualityBox, null); });
      }
      if (qualityBox) {
        ui.mount(qualityBox, h('div.note.info.quality-wait', {}, h('span', { text: 'AI กำลังตรวจความสอดคล้องของ JD ฉบับนี้…' })));
        setTimeout(loadQuality, 50);
      }

      ui.mount(view, [
        ui.pageHead([v.code, 'Rev. ' + v.version, new Date(v.created_at).toLocaleString('th-TH'), isEn ? 'JD ภาษาอังกฤษ' : ''].filter(Boolean).join(' · '), jd.title || 'JD', ui.tierPill(v.tier)),
        actions,
        v.latest ? null : h('div.note.info.core-nudge', { role: 'status' },
          h('span', { text: 'กำลังดู Rev. ' + v.version + ' ซึ่งเป็นฉบับเก่า (ดูอย่างเดียว) · ฉบับล่าสุดคือ Rev. ' + v.versions }),
          h('div.row', {}, ui.button('small-btn', 'ไปฉบับล่าสุด', function () { app.go('#jd/' + positionId); }), restoreBtn(v.version))),
        v.latest && changed.length ? h('div.note.info', { role: 'status' },
          'คำตอบที่ใช้เขียนหมวด ' + changed.map(function (k) { return '"' + (titleOf[k] || k) + '"'; }).join(', ') +
          ' เปลี่ยนไปหลังจากเขียนหมวดแล้ว หมวดเดิมยังไม่เปลี่ยน ถ้าอยากให้ตรงกับคำตอบใหม่ กด "เขียนใหม่จากคำตอบล่าสุด" ที่หมวดนั้น') : null,
        v.latest ? nextPanel() : null,
        v.tier === 'bronze' ? ui.note('info', 'นี่คือ Role Brief สำหรับดูบนจอ ดาวน์โหลดไฟล์ Word ได้ตั้งแต่ Role Profile') : null,
        coreNudge(),
        qualityBox,
        !onboard.seen('jd-next') ? null : h('div.edit-help', {},
          h('strong', { text: 'แก้ JD ได้ทุกหมวด' }),
          h('span', { text: 'กด "แก้" แล้วพิมพ์ในตารางได้เลย (ฟรี) แก้หลายหมวดแล้วบันทึกครั้งเดียวได้ · หรือกด "AI ช่วยแก้" แล้วบอกว่าอยากให้แก้อย่างไร · AI แก้ฟรี เหลือ ' + v.freeAiEdits +
            ' ครั้งใน JD นี้ จากนั้นทีละข้อ ' + v.editCosts.item + ' / ทั้งหมวด ' + v.editCosts.section + ' เครดิต · ทุกการบันทึกเป็น Rev. ใหม่' })),
        h('article.card.jd-doc', {},
          h('div.preview-head', {}, h('span.eyebrow', { text: 'JOB DESCRIPTION · ' + ui.TIER[v.tier].label.toUpperCase() }), h('strong.preview-title', { text: jd.title }),
            h('span.muted.small', { text: [app.me.org.name, jd.department, jd.reports_to ? D.reportsTo + jd.reports_to : ''].filter(Boolean).join(' · ') })),
          jd.order.map(function (key, i) { return sectionBlock(key, i); }),
          jd.omitted && jd.omitted.length ? h('p.muted.small', { text: D.omitted + jd.omitted.map(function (o) { return o.title; }).join(', ') }) : null),
        bar
      ]);

      function coreNudge() {
        var st = v.competencyStatus;
        if (!st || !jd.sections.required_competencies || !v.latest) return null;
        var outdated = [], missing = [];
        if (st.core === 'outdated') outdated.push('Core'); else if (st.core === 'none') missing.push('Core');
        if (st.leadership === 'outdated') outdated.push('Leadership'); else if (st.leadership === 'none') missing.push('Leadership');
        if (outdated.length) {
          var btn = ui.button('small-btn', 'อัปเดตใน JD นี้ (ฟรี)', function () {
            ui.busy(btn, 'กำลังอัปเดต…', function () {
              return api.call('jd.competency.apply', { positionId: positionId, version: v.version }).then(function () {
                ui.toast('อัปเดต Competency แล้ว (เวอร์ชันใหม่)');
                return reload();
              });
            }).catch(function (e) { ui.toast(ui.errorText(e)); });
          });
          return h('div.note.info.core-nudge', { role: 'status' },
            h('span', { text: outdated.join(' และ ') + ' Competency ของบริษัทเปลี่ยนแล้ว แต่ JD นี้ยังใช้ชุดเดิม' }), btn);
        }
        if (!missing.length) return null;
        return h('div.note.info.core-nudge', { role: 'status' },
          h('span', { text: 'บริษัทยังไม่ได้กำหนด ' + missing.join(' และ ') + ' Competency · JD นี้ใช้ชุดที่ระบบคิดให้ กำหนดเองแล้วอัปเดตเข้า JD นี้ได้ฟรี' }),
          ui.button('small-btn', (app.me.org.bonus || {}).duplicate ? 'กำหนดตอนนี้' : 'กำหนดตอนนี้ · +1 เครดิตต่อชุด', function () { app.go('#company/' + (missing[0] === 'Core' ? 'core' : 'leadership')); }));
      }

      // ---------------- editing ----------------
      function sectionBlock(key, i) {
        var box = h('section.jd-sec', { id: 'sec-' + key });
        var title = (i + 1) + '. ' + (titleOf[key] || key);
        var editable = v.latest !== false && key !== 'disclaimer_text';
        function show() {
          box.classList.remove('editing');
          ui.mount(box, [
            h('div.sec-head', {}, h('h3', {}, h('span.sec-mark', { text: '§' + ('0' + (i + 1)).slice(-2) }), titleOf[key] || key,
                changed.indexOf(key) >= 0 ? h('span.changed-tag', { text: 'คำตอบเปลี่ยนแล้ว' }) : null),
              editable ? h('div.row.sec-actions', {},
                changed.indexOf(key) >= 0 && key !== 'required_competencies' ? ui.button('small-btn.ai-btn', 'เขียนใหม่จากคำตอบล่าสุด', function () {
                  ai('เขียนหมวดนี้ใหม่ให้ตรงกับคำตอบล่าสุดใน POSITION FACTS คงรูปแบบและความยาวใกล้เคียงเดิม');
                }) : null,
                ui.button('small-btn', 'แก้', function () { manual(); }, { icon: 'edit' }),
                ui.button('small-btn.ai-btn', 'AI ช่วยแก้', function () { ai(); })) : null),
            view_(key, jd.sections[key])
          ]);
        }
        function manual() {
          var ed = inlineEditor(key, jd.sections[key], {
            onChange: updateBar,
            onRowAi: Array.isArray(jd.sections[key]) && key !== 'human_validation_points' ? function (idx) {
              if (ed.changes()) { ui.toast('บันทึกหรือเลิกแก้หมวดนี้ก่อน แล้วค่อยให้ AI แก้แถว', 'err'); return; }
              delete edits[key]; updateBar(); ai('', idx);
            } : null
          });
          edits[key] = ed;
          ui.mount(box, [
            h('div.sec-head', {}, h('h3', {}, h('span.sec-mark', { text: '§' + ('0' + (i + 1)).slice(-2) }), titleOf[key] || key, h('span.editing-tag', { text: 'กำลังแก้' })),
              h('div.row.sec-actions', {}, ui.button('ghost.small-btn', 'เลิกแก้หมวดนี้', function () {
                var drop = function () { delete edits[key]; updateBar(); show(); };
                if (!ed.changes()) { drop(); return; }
                ui.confirmBox('เลิกแก้หมวดนี้', 'ที่แก้ไว้ในหมวดนี้ยังไม่ได้บันทึก จะหายไป', 'เลิกแก้').then(function (y) { if (y) drop(); });
              }))),
            ed.el
          ]);
          box.classList.add('editing');
          updateBar();
          var firstInput = box.querySelector('textarea, input'); if (firstInput) firstInput.focus();
        }
        function ai(preset, presetIdx) {
          box.classList.remove('editing');
          var val = jd.sections[key];
          var isArr = Array.isArray(val);
          var compOnlyItems = key === 'required_competencies';
          var scope = h('select', { id: 'ai-scope-' + key, 'aria-label': 'ส่วนที่ให้ AI แก้' },
            (compOnlyItems ? [] : [h('option', { value: '', text: 'ทั้งหมวด' })]).concat(isArr ? val.map(function (x, n) {
              if (compOnlyItems && x.type === 'Core') return null;
              return h('option', { value: String(n), text: 'ข้อ ' + (n + 1) + ': ' + short_(x) });
            }).filter(Boolean) : []));
          var instr = h('textarea', { id: 'ai-instr-' + key, rows: '2', placeholder: 'เช่น เพิ่มเรื่องการตรวจนับสต็อก / เขียนให้กระชับขึ้น / ใส่ตัวเลขเป้าหมายเป็นข้อเสนอ' });
          var out = h('div.stack');
          var go = ui.button('ai-go', 'ขอข้อเสนอจาก AI', function () {
            ui.busy(go, 'AI กำลังแก้…', function () {
              return api.call('jd.edit.ai', { positionId: positionId, version: v.version, sectionKey: key, itemIndex: scope.value === '' ? undefined : Number(scope.value), instruction: instr.value }).then(function (r) {
                app.refreshMe();
                v.freeAiEdits = r.freeLeft;
                var before = r.scope === 'item' ? val[r.itemIndex] : val;
                ui.mount(out, [
                  r.charged ? h('span.muted.small', { text: 'ใช้ ' + r.charged + ' เครดิต' }) : h('span.muted.small', { text: 'ใช้สิทธิ์ฟรี · เหลือ ' + r.freeLeft + ' ครั้ง' }),
                  h('div.compare', {},
                    h('div.was', {}, h('span.eyebrow', { text: 'เดิม' }), h('pre.textv', { text: toText_(before) })),
                    h('div.now', {}, h('span.eyebrow', { text: 'ข้อเสนอจาก AI' }), h('pre.textv', { text: toText_(r.proposal) }))),
                  h('div.row.end', {},
                    ui.button('ghost', 'ไม่ใช้', function () { ui.clear(out); if (r.editId) api.call('jd.edit.reject', { positionId: positionId, editId: r.editId }).catch(function () {}); }),
                    ui.button('primary', 'ใช้ข้อความนี้', function (e) {
                      var next = r.scope === 'item' ? val.map(function (x, n) { return n === r.itemIndex ? r.proposal : x; }) : r.proposal;
                      ui.busy(e.currentTarget, 'กำลังบันทึก…', function () {
                        return api.call('jd.edit.save', { positionId: positionId, version: v.version, sectionKey: key, value: next, note: 'AI: ' + instr.value, aiEditId: r.editId }).then(function () {
                          ui.toast('ใช้ข้อเสนอของ AI แล้ว เป็นเวอร์ชันใหม่'); return reload();
                        });
                      }).catch(function (er) { ui.toast(ui.errorText(er), 'err'); });
                    }))
                ]);
              });
            }).catch(function (e) {
              if (e.code === 'NOT_ENOUGH_CREDITS') ui.confirmBox('เครดิตไม่พอ', ui.errorText(e), 'ไปหน้าเครดิต').then(function (y) { if (y) app.go('#credits'); });
              else ui.mount(out, ui.note('err', ui.errorText(e)));
            });
          });
          var costLine = h('span.muted.small');
          function updateCost() {
            costLine.textContent = v.freeAiEdits ? 'ฟรี (เหลือ ' + v.freeAiEdits + ' ครั้ง)' : (scope.value === '' ? v.editCosts.section : v.editCosts.item) + ' เครดิต';
          }
          scope.addEventListener('change', updateCost); updateCost();
          ui.mount(box, [h('h3', { text: title + ' · AI ช่วยแก้' }), view_(key, val),
            h('div.ai-panel', {},
              h('label.field', { for: 'ai-scope-' + key }, 'ให้ AI แก้ส่วนไหน', scope),
              h('label.field', { for: 'ai-instr-' + key }, 'อยากให้แก้อย่างไร', instr),
              h('div.row', {}, go, costLine, h('span.spacer'), ui.button('ghost', 'ปิด', show)),
              out)]);
          if (preset) instr.value = preset;
          if (presetIdx !== undefined && presetIdx !== null) { scope.value = String(presetIdx); updateCost(); }
          instr.focus();
        }
        show();
        return box;
      }

      /** Shown until dismissed: the four things to do with a finished JD. */
      function nextPanel() {
        if (onboard.seen('jd-next')) return null;
        var firstSec = function () { return document.querySelector('.jd-sec'); };
        function tile(iconName, title, desc, act) {
          return h('button.next-tile', { type: 'button', onclick: act }, h('span.next-icon', { 'aria-hidden': 'true' }, ui.icon(iconName)),
            h('strong', { text: title }), h('span.small', { text: desc }));
        }
        var panel = h('section.card.next-panel', { 'aria-label': 'ทำอะไรต่อได้' },
          h('div.row-between', {}, h('div', {}, h('span.eyebrow', { text: 'JD พร้อมแล้ว' }), h('h2', { text: 'ทำอะไรต่อได้' })),
            ui.button('ghost.small-btn', 'เข้าใจแล้ว', function () { onboard.dismiss('jd-next'); panel.remove(); })),
          h('div.next-tiles', {},
            tile('edit', 'แก้เอง', 'กด "แก้" ที่หมวดไหนก็ได้ แล้วพิมพ์ในตารางได้เลย ฟรี', function () {
              var s = firstSec(); if (!s) return; s.scrollIntoView({ behavior: 'smooth', block: 'start' });
              var b = Array.from(s.querySelectorAll('button')).filter(function (x) { return x.textContent.trim() === 'แก้'; })[0]; if (b) b.click();
            }),
            tile('ai', 'ให้ AI ช่วยแก้', 'บอกว่าอยากให้แก้อย่างไร AI เสนอให้เทียบก่อนใช้ ฟรี ' + v.freeAiEdits + ' ครั้งแรก', function () {
              var s = firstSec(); if (!s) return; s.scrollIntoView({ behavior: 'smooth', block: 'start' });
              var b = Array.from(s.querySelectorAll('button')).filter(function (x) { return x.textContent.trim() === 'AI ช่วยแก้'; })[0]; if (b) b.click();
            }),
            v.tier === 'bronze'
              ? tile('download', 'ดาวน์โหลด Word', 'ได้ตั้งแต่ Role Profile อัปเกรดก่อน จ่ายเฉพาะส่วนต่าง', function () { app.go('#quest/' + positionId); })
              : tile('download', 'ดาวน์โหลด Word', 'ไฟล์พร้อมรหัส ' + (v.code || 'JD') + ' และ Rev. ใช้ส่งต่อหรือพิมพ์ได้', function () {
                var b = Array.from(document.querySelectorAll('.main button')).filter(function (x) { return x.textContent.trim() === 'ดาวน์โหลด Word'; })[0]; if (b) b.click();
              }),
            v.tier !== 'gold'
              ? tile('up', 'อัปเกรด', 'ตอบคำถามเพิ่ม ได้หมวดเพิ่ม หมวดเดิมไม่เปลี่ยน', function () { app.go('#quest/' + positionId); })
              : tile('copy', 'ทำซ้ำ', 'ใช้ JD นี้เป็นต้นแบบของตำแหน่งที่คล้ายกัน', function () {
                openDuplicate({ id: positionId, code: v.code, title: jd.title, latestVersion: v.version });
              })));
        return panel;
      }

      function restoreBtn(rev) {
        var b = ui.button('small-btn', 'กลับไปใช้ฉบับนี้', function () {
          ui.confirmBox('กลับไปใช้ Rev. ' + rev, 'ระบบจะสร้างฉบับใหม่ (Rev. ' + (v.versions + 1) + ') ที่เนื้อหาเหมือน Rev. ' + rev + ' ฉบับอื่นยังอยู่ในประวัติครบ', 'กลับไปใช้ฉบับนี้').then(function (yes) {
            if (!yes) return;
            ui.busy(b, 'กำลังสร้าง…', function () {
              return api.call('jd.restore', { positionId: positionId, version: rev }).then(function (r) {
                ui.toast('กลับไปใช้ Rev. ' + rev + ' แล้ว (เป็น Rev. ' + r.version + ')'); app.go('#jd/' + positionId);
              });
            }).catch(function (e) { ui.toast(ui.errorText(e), 'err'); });
          });
        }, { icon: 'history' });
        return b;
      }

      function history() {
        var list = h('div.rev-list', {}, h('p.muted', { text: 'กำลังโหลด…' }));
        var close = modal('ประวัติเวอร์ชัน · ' + (v.code || jd.title), list);
        api.call('jd.versions', { positionId: positionId }).then(function (rows) {
          ui.mount(list, rows.map(function (r, i) {
            return h('div.rev-row' + (r.version === v.version ? '.on' : ''), {},
              h('div', {}, h('div.row-tight', {}, h('strong.mono', { text: 'Rev. ' + r.version }), ui.tierPill(r.tier, true), i === 0 ? h('span.pill', { text: 'ล่าสุด' }) : null),
                h('div.small', { text: r.note }),
                h('div.muted.small', { text: new Date(r.created_at).toLocaleString('th-TH') + (r.by ? ' · ' + r.by : '') })),
              ui.button('small-btn', r.version === v.version ? 'กำลังดู' : 'ดู', function () { close(); app.go('#jd/' + positionId + (i === 0 ? '' : '/' + r.version)); },
                r.version === v.version ? { disabled: true } : null));
          }));
        }, function (e) { ui.mount(list, ui.note('err', ui.errorText(e))); });
      }

      function editCode() {
        var input = h('input', { type: 'text', id: 'code-input', value: v.code || '', maxlength: '30' });
        var msg = h('div');
        modal('รหัส JD', h('div.stack', {},
          h('p.small', { text: 'ใช้รหัสของบริษัทเองได้ ต้องไม่ซ้ำกับตำแหน่งอื่น รหัสไม่เปลี่ยนเมื่อแก้หรืออัปเกรด JD' }),
          h('label.field', { for: 'code-input' }, 'รหัส', input), msg), function (close) {
          var save = ui.button('primary', 'บันทึก', function () {
            ui.busy(save, 'กำลังบันทึก…', function () {
              return api.call('positions.setCode', { id: positionId, code: input.value }).then(function () { close(); ui.toast('เปลี่ยนรหัสแล้ว'); return reload(); });
            }).catch(function (e) { ui.mount(msg, ui.note('err', ui.errorText(e))); });
          });
          return h('div.row.end', {}, ui.button('ghost', 'ยกเลิก', close), save);
        });
        input.select();
      }

      /** Rewrites this JD in the other language as a new Rev. (1 credit). The answers stay as they are. */
      function changeLang() {
        var to = isEn ? 'th' : 'en';
        var toName = to === 'en' ? 'ภาษาอังกฤษ' : 'ภาษาไทย';
        var cost = (app.me.credits.costs || {}).translateJd || 1;
        var body = h('div.stack', {},
          h('p', { text: 'AI เขียน JD ฉบับนี้ใหม่เป็น' + toName + ' ทุกหมวด รวมส่วนที่คุณแก้ไว้ โครงเดิมไม่เปลี่ยน: หมวด จำนวนข้อ และประเภท Competency เท่าเดิม' }),
          h('p', { text: 'ได้เป็น Rev. ' + (v.versions + 1) + ' ฉบับ' + (isEn ? 'ภาษาอังกฤษ' : 'ภาษาไทย') + 'เดิมยังอยู่ในประวัติเวอร์ชัน คำตอบที่ใช้สร้าง JD ไม่เปลี่ยน' }),
          h('p', {}, 'ใช้ ', h('strong', { text: cost + ' เครดิต' }), ' · เหลือ ' + ui.fmtCredits(app.me.credits.balance) + ' เครดิต'),
          h('p.muted.small', { text: 'ใช้เวลาราว 1 นาที ถ้าระบบขัดข้องจะคืนเครดิตอัตโนมัติ' }));
        ui.confirmBox('เปลี่ยน JD เป็น' + toName, body, 'เปลี่ยนภาษา · ' + cost + ' เครดิต').then(function (yes) {
          if (!yes) return;
          var back = h('div.modal-back', { role: 'alertdialog', 'aria-label': 'กำลังเปลี่ยนภาษา' },
            h('div.modal.center', {}, h('div.spinner', { 'aria-hidden': 'true' }), h('h2', { text: 'กำลังเขียนเป็น' + toName }),
              h('p.muted.small', { text: 'ใช้เวลาราว 1 นาที อย่าเพิ่งปิดหน้านี้' })));
          document.body.appendChild(back);
          return api.call('jd.translate', { positionId: positionId, version: v.version, lang: to }).then(function (r) {
            back.remove();
            app.refreshMe();
            ui.toast('เปลี่ยนเป็น' + toName + 'แล้ว เป็น Rev. ' + r.version + ' ใช้ ' + r.charged + ' เครดิต');
            return reload();
          }, function (e) { back.remove(); throw e; });
        }).catch(function (e) {
          if (e.code === 'NOT_ENOUGH_CREDITS') {
            ui.confirmBox('เครดิตไม่พอ', ui.errorText(e), 'ไปหน้าเครดิต').then(function (y) { if (y) app.go('#credits'); });
          } else ui.toast(ui.errorText(e), 'err');
        });
      }

      function downloadBtn() {
        var b = ui.button('go', 'ดาวน์โหลด Word', function () {
          ui.busy(b, 'กำลังเตรียมไฟล์…', function () {
            return api.call('jd.exportDocx', { positionId: positionId, version: v.version }).then(function (r) {
              var bytes = Uint8Array.from(atob(r.docxBase64), function (c) { return c.charCodeAt(0); });
              var url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
              var a = h('a', { href: url, download: r.fileName });
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
            });
          }).catch(function (e) { ui.toast(ui.errorText(e), 'err'); });
        }, { icon: 'download' });
        return b;
      }
    }
  };
})();

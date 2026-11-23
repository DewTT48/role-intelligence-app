/* landing.js – "ลองดูก่อน": four JDs written by the real engine (assets/sample-jds.js), and the scroll-in reveal. */
(function () {
  var SAMPLES = window.RI_SAMPLES || {};
  // Section numbers and titles as the app and the Word file show them (JdCatalog).
  var SEC = {
    job_purpose: [1, 'วัตถุประสงค์ของตำแหน่ง'], business_context_fit: [2, 'ความเชื่อมโยงกับธุรกิจ'],
    key_accountabilities: [3, 'ความรับผิดชอบหลัก'], key_responsibilities: [4, 'หน้าที่หลัก'],
    expected_outputs_summary: [5, 'ผลงานหรือสิ่งส่งมอบที่คาดหวัง'], key_indicators: [6, 'ตัวชี้วัดความสำเร็จ'],
    scope_of_responsibility: [7, 'ขอบเขตความรับผิดชอบ'], decision_making_authority: [8, 'อำนาจการตัดสินใจ'],
    working_relationship: [9, 'ความสัมพันธ์ในการทำงาน'], problem_solving_complexity: [10, 'ความซับซ้อนของปัญหา'],
    people_management_responsibility: [11, 'ความรับผิดชอบด้านการบริหารคน'], qualifications: [12, 'คุณสมบัติที่จำเป็น'],
    required_competencies: [13, 'สมรรถนะที่จำเป็น'], work_context_conditions: [14, 'บริบทและสภาพการทำงาน'],
    job_evaluation_information_summary: [15, 'ข้อมูลประกอบการประเมินค่างาน'], review_checklist: [16, 'รายการตรวจสอบก่อนใช้งาน'],
    hr_usage_guidance: [17, 'คำแนะนำการนำไปใช้ในงาน HR'], disclaimer_text: [18, 'ข้อจำกัดความรับผิดชอบ'],
    human_validation_points: [19, 'หมายเหตุการตรวจทาน']
  };
  var DIM = [
    ['knowledge_expertise', 'Knowledge & Expertise'], ['problem_solving_complexity', 'Problem Solving & Complexity'],
    ['accountability_business_impact', 'Accountability & Business Impact'], ['decision_authority', 'Decision Authority'],
    ['people_leadership_influence', 'People Leadership / Influence'], ['communication_stakeholder_complexity', 'Communication & Stakeholder Complexity'],
    ['risk_compliance_consequence_of_error', 'Risk, Compliance & Consequence of Error']
  ];
  var HR_AREA = { job_posting: 'ประกาศรับสมัคร', recruitment: 'สรรหาคัดเลือก', interview: 'สัมภาษณ์', onboarding: 'ปฐมนิเทศ', performance: 'ประเมินผลงาน',
    performance_management: 'ประเมินผลงาน', training: 'ฝึกอบรม', development: 'พัฒนาบุคลากร', training_development: 'ฝึกอบรมและพัฒนา',
    job_evaluation: 'ประเมินค่างาน', compensation: 'ค่าตอบแทน', career_path: 'เส้นทางอาชีพ', succession: 'วางแผนสืบทอดตำแหน่ง', succession_planning: 'วางแผนสืบทอดตำแหน่ง',
    screening: 'คัดกรองผู้สมัคร', probation_goals: 'เป้าหมายช่วงทดลองงาน', job_evaluation_preparation: 'เตรียมข้อมูลประเมินค่างาน' };

  function esc(s) { return String(s === undefined || s === null || s === '' ? '-' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  // A cell with several lines is a list, the same rule the app uses.
  function cell(x) {
    var lines = String(x || '').split('\n').map(function (l) { return l.replace(/^\s*(?:[•·\-*–]|\d+[.)])\s*/, '').trim(); }).filter(Boolean);
    if (lines.length < 2) return esc(lines[0] || '-');
    return '<ul class="cell-list">' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>';
  }
  function table(head, rows, cls) {
    return '<div class="tbl"><table' + (cls ? ' class="' + cls + '"' : '') + '><thead><tr>' + head.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (x) { return '<td>' + cell(x) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function kv(pairs) { return table(['หัวข้อ', 'รายละเอียด'], pairs.filter(function (p) { return p[1]; }), 'kv'); }
  function list(v) { return '<ol class="jd-list">' + (v || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>'; }
  var RENDER = {
    key_accountabilities: function (v) { return table(['Key Accountability', 'Description', 'Expected Output'], v.map(function (x) { return [x.accountability, x.description, x.expected_output]; })); },
    key_responsibilities: function (v) { return table(['Responsibility', 'Frequency', 'Stakeholder', 'Expected Standard'], v.map(function (x) { return [x.responsibility, x.frequency, x.stakeholder, x.expected_standard]; })); },
    expected_outputs_summary: list,
    key_indicators: function (v) { return table(['Indicator', 'Measurement', 'Target', 'Review'], v.map(function (x) { return [x.indicator, x.measurement_logic, x.suggested_target, x.review_frequency]; })); },
    decision_making_authority: function (v) { return kv([['ตัดสินใจได้เอง', v.own_authority], ['ต้องได้รับอนุมัติ', v.requires_approval]]); },
    working_relationship: function (v) { return kv([['ภายใน', v.internal], ['ภายนอก', v.external]]); },
    qualifications: function (v) {
      return kv([['การศึกษา', v.education], ['ประสบการณ์', v.experience], ['ทักษะเฉพาะทาง', v.technical_skills], ['ทักษะระบบ/ดิจิทัล', v.digital_system_skills],
        ['ภาษา', v.language_skills], ['ใบอนุญาต/ประกาศนียบัตร', v.certification], ['คุณลักษณะส่วนบุคคล', v.personal_attributes]]);
    },
    required_competencies: function (v) { return table(['Competency', 'Type', 'Definition', 'ตัวอย่างพฤติกรรม', 'Why It Matters'], v.map(function (x) { return [x.competency, x.type, x.definition, x.behavioral_indicators, x.why_it_matters]; }), 'comp-t'); },
    work_context_conditions: function (v) {
      return kv([['สภาพแวดล้อมการทำงาน', v.work_environment], ['เครื่องมือและระบบ', v.tools_systems], ['รูปแบบการทำงานร่วมกัน', v.collaboration_pattern], ['ข้อจำกัดหรือเงื่อนไข', v.constraints_conditions]]);
    },
    job_evaluation_information_summary: function (v) { return table(['ปัจจัยประเมินงาน', 'ข้อมูลประกอบ'], DIM.map(function (d) { return [d[1], v[d[0]]]; }), 'kv'); },
    review_checklist: list,
    hr_usage_guidance: function (v) { return table(['งาน HR', 'วิธีนำไปใช้', 'จุดที่ต้องตรวจสอบ'], v.map(function (x) { return [HR_AREA[x.hr_area] || x.hr_area, x.application_guidance, x.validation_point]; })); },
    human_validation_points: list
  };
  function section(key, val) {
    var s = SEC[key] || [0, key];
    var no = (s[0] < 10 ? '0' : '') + s[0];
    var body = RENDER[key] ? RENDER[key](val || []) : '<p>' + esc(val) + '</p>';
    return '<section class="jd-sec" id="jd-' + key + '"><h4><b>§' + no + '</b>' + esc(s[1]) + '</h4>' + body + '</section>';
  }

  var panel = document.getElementById('jd');
  var tabs = document.querySelectorAll('.roles [role=tab]');
  if (!panel || !tabs.length) return;
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var JUMP = ['key_accountabilities', 'key_indicators', 'decision_making_authority', 'qualifications', 'required_competencies', 'hr_usage_guidance'];

  function render(key) {
    var r = SAMPLES[key];
    if (!r) return;
    var order = (r.order || Object.keys(r.sections)).filter(function (k) { return r.sections[k] !== undefined; });
    panel.classList.remove('open');
    panel.innerHTML =
      '<header class="jd-head">' +
        '<p class="doc-eyebrow">JOB DESCRIPTION · ROLE BLUEPRINT · ' + order.length + ' หมวด</p>' +
        '<h3>' + esc(r.title) + '</h3>' +
        '<p class="jd-dept">' + esc(r.department) + ' · รายงานต่อ ' + esc(r.reports_to) + '</p>' +
        '<p class="jd-ctx"><b>บริษัทสมมติ</b>' + esc(r.company) + '</p>' +
        '<p class="jd-real">ระบบเขียนจริงจากคำตอบของหัวหน้างาน ไม่ได้แก้ข้อความ</p>' +
        '<nav class="jd-jump" aria-label="ไปที่หมวด">' + JUMP.filter(function (k) { return r.sections[k] !== undefined; }).map(function (k) {
          return '<a href="#jd-' + k + '" data-k="' + k + '">§' + (SEC[k][0] < 10 ? '0' : '') + SEC[k][0] + ' ' + esc(SEC[k][1]) + '</a>';
        }).join('') + '</nav>' +
      '</header>' +
      '<div class="jd-body">' + order.map(function (k) { return section(k, r.sections[k]); }).join('') + '</div>' +
      '<div class="jd-more"><button type="button" class="btn btn-ghost jd-toggle" aria-expanded="false">อ่านครบทั้ง ' + order.length + ' หมวด</button></div>' +
      '<footer class="jd-foot"><span>Role Brief ได้หมวดพื้นฐาน · Role Profile เพิ่มตัวชี้วัด คุณสมบัติ สมรรถนะ · Role Blueprint ครบ 19 หมวด</span><a class="btn btn-pink" href="app/#signin">เริ่มสร้าง JD ฟรี <span aria-hidden="true">→</span></a></footer>';
    if (!calm) { panel.classList.remove('play'); void panel.offsetWidth; panel.classList.add('play'); }
    if (window.thaiWrap) window.thaiWrap.walk(panel);
  }
  function setOpen(open) {
    panel.classList.toggle('open', open);
    var b = panel.querySelector('.jd-toggle');
    if (b) { b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'ย่อกลับ' : 'อ่านครบทั้ง ' + panel.querySelectorAll('.jd-sec').length + ' หมวด'; }
  }
  panel.addEventListener('click', function (e) {
    var t = e.target.closest('.jd-toggle');
    if (t) { var was = panel.classList.contains('open'); setOpen(!was); if (was) panel.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' }); return; }
    var a = e.target.closest('.jd-jump a');
    if (a) {
      e.preventDefault();
      setOpen(true);
      var sec = document.getElementById('jd-' + a.dataset.k);
      if (sec) sec.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
    }
  });
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.setAttribute('aria-selected', String(x === t)); });
      render(t.dataset.role);
    });
  });
  render(document.querySelector('.roles [aria-selected="true"]').dataset.role);

  // Sections slide in once as they come into view.
  if (!('IntersectionObserver' in window) || calm) return;
  var els = document.querySelectorAll('.sec-title, .costs li, .g-card, .chain, .ba > div, .steps li, .principle, .use-list li, .tier, .pack, .ent, .faq details, .pain-photo, .uses-photo');
  els.forEach(function (e) { e.classList.add('reveal'); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (e) { io.observe(e); });
})();

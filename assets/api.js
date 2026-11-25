/**
 * api.js – the only file that knows where the backend lives.
 * api.call(action, payload) -> Promise<data>; rejects with Error{code, message, ...}.
 * Demo mode (no apiUrl in config.js, or ?demo=1) answers from an in-browser fake backend (demo-data.js).
 */
(function () {
  var cfg = window.RI_CONFIG || {};
  var demo = !cfg.apiUrl || /[?&]demo=1/.test(location.search);
  var TOKEN_KEY = demo ? 'ri.demo.token' : 'ri.token';

  function store(kind) {
    try { return kind === 'session' ? sessionStorage : localStorage; } catch (e) { return null; }
  }
  function getToken() { try { return (store('local') || {}).getItem ? store('local').getItem(TOKEN_KEY) || '' : ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) store('local').setItem(TOKEN_KEY, t); else store('local').removeItem(TOKEN_KEY); } catch (e) { /* private mode */ } }

  function fail(code, message, extra) {
    var e = new Error(message);
    e.code = code;
    Object.keys(extra || {}).forEach(function (k) { e[k] = extra[k]; });
    return e;
  }

  function remote(action, payload) {
    return fetch(cfg.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids a CORS preflight on Apps Script
      body: JSON.stringify({ action: action, payload: payload || {}, token: getToken() })
    }).then(function (r) { return r.json(); }, function () {
      throw fail('NETWORK', 'ติดต่อเซิร์ฟเวอร์ไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่');
    }).then(function (res) {
      if (!res.ok) throw fail(res.error.code, res.error.message, res.error);
      return res.data;
    });
  }

  // ======================= demo backend =======================
  var D = window.RI_DEMO || {};
  var db = (function () {
    try { var s = sessionStorage.getItem('ri.demo.db'); if (s) return JSON.parse(s); } catch (e) { /* ignore */ }
    return { user: null, org: { id: 'org_demo', name: '', business_type: '', main_goal: '' }, ledger: [], positions: [], versions: [], gens: [],
      ai: { keys: { google: 'demo-key-not-real-0000' }, primary: { provider: 'google', model: 'gemini-3.8-flash', effort: '' }, fallback: null, routes: {} } };
  })();
  function persist() { try { sessionStorage.setItem('ri.demo.db', JSON.stringify(db)); } catch (e) { /* ignore */ } }
  var RANK = { bronze: 0, silver: 1, gold: 2 };
  var TNAME = { bronze: 'Role Brief', silver: 'Role Profile', gold: 'Role Blueprint' };
  var APPEND_KEYS = ['review_checklist', 'hr_usage_guidance', 'human_validation_points'];
  var FREE = (D.pricing || {}).freeBriefPerMonth || 3;
  var CREDITS = { bronze: 0, silver: 2, gold: 4 };
  function now() { return new Date().toISOString(); }
  function balance() { return Math.round(db.ledger.reduce(function (s, r) { return s + r.amount; }, 0) * 10) / 10; }
  function bronzeUsed() { var m = now().slice(0, 7); return db.gens.filter(function (g) { return g.tier === 'bronze' && g.at.slice(0, 7) === m; }).length; }
  function complete() { return !!(db.org.name && db.org.business_type && db.org.main_goal); }
  var DEMO_SETS = {
    core: [
      ['ใส่ใจลูกค้า (Customer Focus)', 'ฟังความต้องการของลูกค้า แก้ปัญหาให้จบ และคิดถึงประสบการณ์ลูกค้าก่อนตัดสินใจ', '• ตอบคำถามลูกค้าภายในวันเดียวกัน\n• ตามเรื่องที่ลูกค้าร้องเรียนจนปิดได้\n• เสนอวิธีที่ลูกค้าสะดวกขึ้นเมื่อเห็นปัญหาซ้ำ', 'ธุรกิจค้าปลีกอยู่ได้เพราะลูกค้ากลับมาซื้อซ้ำ'],
      ['ซื่อสัตย์และรับผิดชอบ (Integrity & Ownership)', 'ทำตามที่รับปาก ดูแลเงิน สินค้า และข้อมูลของบริษัทเหมือนเป็นของตัวเอง', '• ส่งงานตามที่รับปาก หรือแจ้งล่วงหน้าเมื่อทำไม่ทัน\n• รายงานความผิดพลาดของตัวเองทันที\n• นับและบันทึกเงินและสินค้าถูกต้องทุกครั้ง', 'งานหลายสาขาต้องไว้ใจกันได้โดยไม่ต้องตรวจทุกขั้น'],
      ['ทำงานเป็นทีมข้ามสาขา (Cross-team Collaboration)', 'แบ่งปันข้อมูลและช่วยสาขาหรือแผนกอื่นให้เป้าหมายรวมสำเร็จ', '• แจ้งข้อมูลสต็อกหรือปัญหาที่สาขาอื่นควรรู้\n• ช่วยสาขาข้างเคียงเมื่อขาดคน\n• รับฟังข้อเสนอจากแผนกอื่นก่อนตัดสินใจ', 'การขยายสาขาต้องอาศัยหลายทีมทำงานไปทางเดียวกัน'],
      ['ปรับปรุงงานอย่างต่อเนื่อง (Continuous Improvement)', 'มองหาจุดที่ทำให้งานเร็วขึ้น ถูกต้องขึ้น หรือประหยัดขึ้น แล้วลงมือทำ', '• เสนอวิธีลดขั้นตอนที่ซ้ำซ้อน\n• ทดลองวิธีใหม่ในขอบเขตเล็กก่อนขยาย\n• วัดผลก่อนและหลังปรับปรุง', 'ลดของขาดชั้นและต้นทุนต่อสาขาได้ทุกวัน'],
      ['ยึดมาตรฐานเดียวกัน (Standard Discipline)', 'ทำตามมาตรฐานและขั้นตอนของบริษัทอย่างสม่ำเสมอทุกสาขา', '• ทำตามขั้นตอนมาตรฐานแม้ไม่มีคนตรวจ\n• ใช้แบบฟอร์มและระบบที่บริษัทกำหนด\n• บอกทีมเมื่อเห็นการทำนอกมาตรฐาน', 'ลูกค้าได้ประสบการณ์เดียวกันไม่ว่าจะเข้าสาขาไหน'],
      ['เรียนรู้และปรับตัวเร็ว (Learning Agility)', 'เรียนรู้เครื่องมือและวิธีทำงานใหม่ และปรับตัวเมื่อสถานการณ์เปลี่ยน', '• ลองใช้ระบบใหม่ภายในสัปดาห์แรกที่เปิดใช้\n• ขอคำติชมแล้วนำไปปรับงาน\n• สรุปบทเรียนหลังงานที่ผิดพลาด', 'ตลาดค้าปลีกเปลี่ยนเร็ว ทีมที่ปรับตัวได้จะโตได้']
    ],
    leadership: [
      ['พัฒนาทีม (Developing People)', 'สอนงาน ให้คำติชม และสร้างโอกาสให้ลูกน้องเติบโต', '• สอนงานลูกน้องใหม่จนทำเองได้\n• ให้คำติชมที่เจาะจงอย่างน้อยเดือนละครั้ง\n• มอบงานท้าทายให้คนที่พร้อม', 'การขยายสาขาต้องมีหัวหน้ารุ่นใหม่พร้อมขึ้น'],
      ['กำหนดทิศทางและเป้าหมาย (Setting Direction)', 'แปลงเป้าหมายบริษัทเป็นเป้าหมายทีมที่ชัดและวัดได้', '• ตั้งเป้าหมายทีมรายเดือนที่วัดผลได้\n• อธิบายเหตุผลของเป้าหมายให้ทีมเข้าใจ\n• ทบทวนความคืบหน้ากับทีมทุกสัปดาห์', 'ทุกสาขาต้องเดินไปทางเดียวกับเป้าหมายบริษัท'],
      ['ตัดสินใจหน้างาน (Decisive Judgment)', 'ตัดสินใจทันเวลาจากข้อมูลที่มี และรับผิดชอบผลการตัดสินใจ', '• ตัดสินใจปัญหาหน้างานภายในวันเดียวกัน\n• ใช้ข้อมูลยอดขายและสต็อกประกอบการตัดสินใจ\n• ยอมรับและแก้ไขเมื่อการตัดสินใจผิดพลาด', 'งานค้าปลีกรอไม่ได้ ช้าแล้วเสียยอดขาย'],
      ['สร้างทีมที่ไว้ใจกัน (Building Trust)', 'สื่อสารเปิดเผย ปฏิบัติต่อทุกคนอย่างเป็นธรรม และรับฟังทีม', '• แจ้งข่าวสำคัญกับทีมก่อนที่จะรู้จากที่อื่น\n• ใช้เกณฑ์เดียวกันกับทุกคน\n• ถามความเห็นทีมก่อนเปลี่ยนวิธีทำงาน', 'ทีมที่ไว้ใจกันลาออกน้อยและทำงานได้เร็วกว่า'],
      ['บริหารผลงาน (Managing Performance)', 'ติดตามผลงาน ชมเมื่อดี และแก้ไขเมื่อไม่ถึงเกณฑ์อย่างตรงไปตรงมา', '• คุยผลงานรายบุคคลทุกเดือน\n• ชมผลงานดีต่อหน้าทีม\n• ทำแผนปรับปรุงเมื่อผลงานต่ำกว่าเกณฑ์', 'ผลงานของสาขาขึ้นกับผลงานของทุกคนในทีม'],
      ['บริหารการเปลี่ยนแปลง (Leading Change)', 'พาทีมผ่านการเปลี่ยนแปลงโดยอธิบายเหตุผลและช่วยให้ปรับตัวได้', '• อธิบายเหตุผลของการเปลี่ยนก่อนเริ่ม\n• ช่วยคนที่ปรับตัวช้าเป็นรายคน\n• ติดตามผลหลังเปลี่ยนและปรับแผน', 'บริษัทกำลังขยายตัว ระบบและวิธีทำงานเปลี่ยนบ่อย']
    ]
  };
  function demoLimits(kind) {
    var saved = db.org[kind === 'core' ? 'leadership' : 'core'] || [];
    var other = saved.length || 3;
    return { min: 3, max: Math.max(3, 10 - other), other: other, otherSaved: !!saved.length, total: 10 };
  }
  function useAi(kind) {
    var day = now().slice(0, 10);
    db.aiUse = db.aiUse && db.aiUse.day === day ? db.aiUse : { day: day, core: 0, leadership: 0 };
    if (db.aiUse[kind] >= 5) throw fail('LIMITED', 'วันนี้ใช้ AI ช่วยชุดนี้ครบ 5 ครั้งแล้ว แก้ถ้อยคำหรือพิมพ์เองได้ หรือใช้ AI ใหม่พรุ่งนี้');
    db.aiUse[kind]++;
    return 5 - db.aiUse[kind];
  }
  function demoSet(kind) { return DEMO_SETS[kind].map(function (x) { return { competency: x[0], definition: x[1], behavioral_indicators: x[2], why_it_matters: x[3] }; }); }
  var SET_TYPE = { core: 'Core', leadership: 'Leadership' };
  function coreNames(items) { return (items || []).map(function (c) { return c.competency; }).sort().join('|'); }
  function competencyStatus(jd) {
    var comps = jd.sections.required_competencies;
    var core = db.org.core || [], lead = db.org.leadership || [];
    var out = { core: core.length ? 'current' : 'none', leadership: 'n/a' };
    if (!comps) return out;
    var of = function (t) { return comps.filter(function (c) { return c.type === t; }); };
    if (core.length && coreNames(of('Core')) !== coreNames(core)) out.core = 'outdated';
    if (of('Leadership').length) out.leadership = !lead.length ? 'none' : coreNames(of('Leadership')) === coreNames(lead) ? 'current' : 'outdated';
    return out;
  }
  function withCompanySets(comps) {
    var core = db.org.core || [], lead = db.org.leadership || [];
    var hasMan = comps.some(function (c) { return c.type === 'Leadership'; });
    var keep = comps.filter(function (c) { return c.type === 'Core' ? !core.length : c.type === 'Leadership' ? !(lead.length && hasMan) : true; });
    return core.concat(lead.length && hasMan ? lead : []).concat(keep).sort(function (a, b) { var o = { Core: 1, Leadership: 2, Functional: 3 }; return o[a.type] - o[b.type]; });
  }
  function onboarding() {
    db.prefs = db.prefs || { welcomeSeen: false, checklistHidden: false, tips: [] };
    return { steps: { company: complete(), core: !!(db.org.core || []).length, leadership: !!(db.org.leadership || []).length,
      firstJd: db.versions.length > 0, firstWord: !!db.wordDone }, prefs: JSON.parse(JSON.stringify(db.prefs)) };
  }
  // Company bonuses once per taxpayer id (backend CompanyBonus.js). In demo mode 0107553000182 counts as "already used by another company".
  var DEMO_TAKEN_TAX_ID = '0107553000182';
  function bonusStatus() {
    var has = function (a) { return db.ledger.some(function (r) { return r.action === a; }); };
    var paid = { company: has('company_profile_bonus'), core: has('core_competency_bonus'), leadership: has('leadership_competency_bonus') };
    var dup = !!db.billing && db.billing.taxId === DEMO_TAKEN_TAX_ID;
    return { hasTaxId: !!db.billing, duplicate: dup, paid: paid, left: dup ? 0 : (paid.company ? 0 : 2) + (paid.core ? 0 : 1) + (paid.leadership ? 0 : 1) };
  }
  function grantDemo() {
    var st = bonusStatus(), total = 0;
    if (!st.hasTaxId || st.duplicate) return 0;
    [['company_profile_bonus', 2, 'โบนัสกรอกข้อมูลบริษัท', complete()],
     ['core_competency_bonus', 1, 'โบนัสกำหนด Core Competency ของบริษัท', !!(db.org.core || []).length],
     ['leadership_competency_bonus', 1, 'โบนัสกำหนด Leadership Competency ของบริษัท', !!(db.org.leadership || []).length]].forEach(function (x) {
      if (!x[3] || db.ledger.some(function (r) { return r.action === x[0]; })) return;
      db.ledger.push({ action: x[0], amount: x[1], note: x[2], at: now() }); total += x[1];
    });
    return total;
  }
  function me() {
    return { user: db.user, org: Object.assign({ complete: complete(), bonus: bonusStatus(), billing: db.billing || null, core: [], leadership: [], competencyLimits: { core: demoLimits('core'), leadership: demoLimits('leadership') } }, db.org),
      credits: { balance: balance(), freeBronzeLeft: Math.max(0, FREE - bronzeUsed()), costs: D.costs, packs: D.packs, pricing: D.pricing },
      onboarding: onboarding(), hasSample: !!db.sample,
      isFinance: ((db.paySet || {}).financeEmails || []).indexOf(db.user && db.user.email) >= 0 };
  }
  function pos(id) { var p = db.positions.filter(function (x) { return x.id === id; })[0]; if (!p) throw fail('NOT_FOUND', 'ไม่พบตำแหน่งนี้'); return p; }
  function view(p) {
    var vs = db.versions.filter(function (v) { return v.positionId === p.id; });
    var last = vs[vs.length - 1];
    return Object.assign({}, p, { latestVersion: last ? last.version : 0, latestTier: last ? last.tier : '',
      jdLang: last ? (last.jd.lang || 'th') : (p.jdLang || db.org.jd_lang || 'th'), answerLang: p.answerLang || 'th' });
  }
  function nextCode() {
    var pre = db.org.code_prefix || 'JD-';
    var max = 0;
    db.positions.forEach(function (x) { var c = String(x.code || ''); if (c.indexOf(pre) === 0 && /^\d+$/.test(c.slice(pre.length))) max = Math.max(max, Number(c.slice(pre.length))); });
    return pre + ('000' + (max + 1)).slice(-4);
  }
  function vers(id) { return db.versions.filter(function (v) { return v.positionId === id; }); }
  function addVersion(id, tier, jd) {
    var n = vers(id).length + 1;
    db.versions.push({ positionId: id, version: n, tier: tier, jd: jd, created_at: now() });
    return n;
  }
  function filled(v) { return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== ''; }
  function price(p, tier) {
    if (tier === 'bronze') { var left = Math.max(0, FREE - bronzeUsed()); return { tier: tier, credits: 0, reason: 'Role Brief ฟรี เหลือ ' + left + ' ครั้งเดือนนี้', blocked: !left }; }
    var paid = p.paidTier;
    var diff = Math.max(0, CREDITS[tier] - (paid ? CREDITS[paid] : 0));
    var NAME = { bronze: 'Role Brief', silver: 'Role Profile', gold: 'Role Blueprint' };
    var LABEL = { silver: 'Role Profile (พร้อมสรรหา + ไฟล์ Word)', gold: 'Role Blueprint (ฉบับเต็ม 19 หมวด + ไฟล์ Word)' };
    if (diff) return { tier: tier, credits: diff, reason: paid ? 'อัปเกรดจาก ' + NAME[paid] + ' เป็น ' + LABEL[tier] + ' จ่ายเฉพาะส่วนต่าง' : 'สร้าง ' + LABEL[tier] };
    var regens = db.gens.filter(function (g) { return g.positionId === p.id && g.tier === tier && g.charged === 0; }).length;
    return regens < 2 ? { tier: tier, credits: 0, reason: 'สร้างใหม่ฟรี เหลือ ' + (2 - regens) + ' ครั้งสำหรับระดับนี้' } : { tier: tier, credits: CREDITS[tier], reason: 'ใช้สิทธิ์สร้างใหม่ฟรีครบแล้ว' };
  }
  function buildJd(p, tier) {
    var q = D.questions;
    var a = p.answers;
    var answered = function (id) { var qq = q.questions.filter(function (x) { return x.id === id; })[0]; return qq.fields.some(function (f) { return filled(a[f]); }); };
    var goldCount = q.questions.filter(function (x) { return x.tier === 'gold' && answered(x.id); }).length;
    var order = [], omitted = [];
    q.sections.forEach(function (s) {
      if (RANK[s.tier] > RANK[tier]) return;
      var ok = s.key === 'business_context_fit' ? !!(db.org.business_type || db.org.main_goal)
        : s.key === 'job_evaluation_information_summary' ? goldCount >= 4 : s.question ? answered(s.question) : true;
      if (ok) order.push(s.key); else omitted.push({ key: s.key, title: s.title, reason: 'ข้อมูลยังไม่พอ' });
    });
    var sections = {};
    order.forEach(function (k) { sections[k] = D.sections[k]; });
    if (sections.required_competencies) {
      var comps = sections.required_competencies;
      if (a.people_management_type !== 'DIRECT_REPORTS') comps = comps.filter(function (c) { return c.type !== 'Leadership'; });
      sections.required_competencies = withCompanySets(comps);
    }
    return { tier: tier, title: a.position_title || '', department: a.department || '', reports_to: a.reports_to || '', sections: sections, order: order, omitted: omitted, meta: { provider: 'demo', model: 'demo' } };
  }
  function demoQueueState() {
    var rows = [], t = Date.now();
    ['nok@hrthai.co', 'pim@factory.co.th', 'somchai@logis.co', 'aom@retail.co.th', 'ben@agency.co', 'kae@clinic.co.th', 'mint@school.ac.th'].forEach(function (e, i) {
      rows.push({ id: 'wl' + i, email: e, name: '', company: '', status: i < 4 ? 'admitted' : 'waiting', admitted_by: i < 4 ? 'auto' : '',
        created_at: new Date(t - (8 - i) * 3600000).toISOString(), admitted_at: i < 4 ? new Date(t - (6 - i) * 3600000).toISOString() : '', signedUp: i < 2 });
    });
    return { mode: 'waitlist', dailyQuota: 4, rows: rows };
  }
  function demoQueue() {
    var q = db.queue || (db.queue = demoQueueState());
    var waiting = q.rows.filter(function (r) { return r.status === 'waiting'; });
    var auto = q.rows.filter(function (r) { return r.admitted_by === 'auto'; }).length;
    return { mode: q.mode, dailyQuota: q.dailyQuota, admittedToday: auto, remainingToday: Math.max(0, q.dailyQuota - auto), waiting: waiting.length, mailQuota: 96,
      rows: q.rows.map(function (r) { return Object.assign({}, r, { position: r.status === 'waiting' ? waiting.indexOf(r) + 1 : null }); }).reverse() };
  }
  function demoInquiries() {
    db.inquiries = db.inquiries || [{ id: 'iq1', created_at: now(), company: 'บริษัท ตัวอย่างอุตสาหกรรม จำกัด', name: 'คุณสมศรี', email: 'hrd@example.co.th', phone: '02-000-0000', positions: '450', message: 'อยากทำ JD ทั้งโรงงานพร้อม workshop', status: 'new' }];
    return { rows: db.inquiries, notify: 'อีเมลเจ้าของ (ตั้งในระบบจริง)', newCount: db.inquiries.filter(function (r) { return r.status === 'new'; }).length };
  }
  function demoAiSettings() {
    var L = { google: 'Google Gemini', openai: 'OpenAI', anthropic: 'Anthropic Claude' };
    var P = { google: 'AIza', openai: 'sk-', anthropic: 'sk-ant-' };
    return { providers: Object.keys(L).map(function (id) { var k = db.ai.keys[id]; return { id: id, label: L[id], prefix: P[id], hasKey: !!k, maskedKey: k ? k.slice(0, 6) + '••••' + k.slice(-4) : '' }; }),
      primary: db.ai.primary, fallback: db.ai.fallback, routes: db.ai.routes, tasks: ['full_jd', 'ai_edit', 'suggest_chips', 'org_competency', 'quality_check'] };
  }
  function demoCheck(p) {
    var key = (p.apiKey || '').trim() || db.ai.keys[p.provider] || '';
    var checks = [{ id: 'format', label: 'รูปแบบ key ตรงกับค่ายที่เลือก', status: key ? 'pass' : 'fail', detail: key ? 'โหมดตัวอย่าง' : 'ยังไม่ได้ใส่ API key' }];
    if (!key) return { ok: false, checks: checks, models: [] };
    var models = { google: ['gemini-3.8-flash', 'gemini-3.8-flash-lite'], openai: ['[รายชื่อจาก API]'], anthropic: ['claude-haiku-5-5', 'claude-opus-5-5', 'claude-sonnet-5-5'] }[p.provider];
    checks.push({ id: 'key', label: 'key ใช้งานได้', status: 'pass', detail: 'ตัวอย่าง' });
    checks.push({ id: 'model', label: 'โมเดลนี้เปิดให้ key นี้ใช้', status: models.indexOf(p.model) >= 0 ? 'pass' : 'fail', detail: p.model || '-' });
    var ok = models.indexOf(p.model) >= 0;
    if (ok) checks.push({ id: 'generate', label: 'ทดลองสร้าง JSON ตามโครง', status: 'pass', detail: 'ตัวอย่าง' });
    return { ok: ok, checks: checks, models: models };
  }

  var handlers = {
    'auth.requestCode': function (p) { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email || '')) throw fail('BAD_EMAIL', 'กรอกอีเมลให้ถูกต้อง'); return { sent: true }; },
    'auth.verifyCode': function (p) {
      if (String(p.code).trim() !== '123456') throw fail('CODE_WRONG', 'รหัสไม่ถูกต้อง (โหมดตัวอย่างใช้ 123456)');
      var isNew = !db.user;
      if (isNew) { db.user = { id: 'usr_demo', email: p.email, display_name: p.email.split('@')[0], role: 'admin' }; db.ledger.push({ action: 'signup_bonus', amount: 2, note: 'เครดิตฟรีเมื่อสมัคร', at: now() }); }
      return { token: 'demo-token', isNew: isNew, me: me() };
    },
    // ---- payments (demo) ----
    'pay.config': function () { return demoPayConfig(); },
    'billing.save': function (p) { db.billing = demoBilling(p); var out = JSON.parse(JSON.stringify(db.billing)); out.bonus = grantDemo(); out.duplicate = bonusStatus().duplicate; return out; },
    'pay.order': function (p) {
      var s = db.paySet || {};
      if (!s.enabled) throw fail('PAY_OFF', 'ยังไม่เปิดรับชำระเงิน ติดต่อผู้ดูแลระบบ');
      if (p.billing) db.billing = demoBilling(p.billing);
      if (!db.billing) throw fail('NEED_BILLING', 'กรอกข้อมูลสำหรับออกใบกำกับภาษีก่อน');
      var q = demoQuote(p.packId, !!p.wht && s.whtEnabled && db.billing.type === 'company');
      var o = { id: 'pay_' + Date.now(), ref: 'RI' + now().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000), packId: q.packId, credits: q.credits, bonusCredits: q.bonusCredits,
        total: q.total, whtThb: q.whtThb, amountDue: q.amountDue, status: 'awaiting_transfer', hasSlip: false, hasWhtCert: false, note: '', created_at: now(), paid_at: '', billing: db.billing, email: db.user.email };
      db.orders = [o].concat(db.orders || []);
      return o;
    },
    'pay.mine': function () { return db.orders || []; },
    'pay.attach': function (p) {
      var o = (db.orders || []).filter(function (x) { return x.id === p.id; })[0];
      if (!o) throw fail('NOT_FOUND', 'ไม่พบคำสั่งซื้อนี้');
      if (!p.slip && !o.hasSlip) throw fail('BAD_FILE', 'แนบสลิปการโอนก่อน');
      if (o.whtThb && !p.whtCert && !o.hasWhtCert) throw fail('BAD_FILE', 'แนบหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ) ด้วย');
      if (p.slip) { o.hasSlip = true; db.files = db.files || {}; db.files[o.id + 'slip'] = p.slip; }
      if (p.whtCert) { o.hasWhtCert = true; db.files = db.files || {}; db.files[o.id + 'whtCert'] = p.whtCert; }
      o.status = 'awaiting_review';
      return o;
    },
    'pay.cancel': function (p) { var o = (db.orders || []).filter(function (x) { return x.id === p.id; })[0]; o.status = 'cancelled'; return o; },
    'admin.pay.settings': function () { var s = db.paySet || {}; return { enabled: !!s.enabled, whtEnabled: !!s.whtEnabled, bank: s.bank || {}, promptpayId: s.promptpayId || '', notifyEmails: s.notifyEmails || [], financeEmails: s.financeEmails || [] }; },
    'admin.pay.settings.save': function (p) {
      var b = p.bank || {};
      if (p.enabled && (!b.bankName || !b.accountName || !/^[0-9][0-9 -]{6,25}$/.test(b.accountNo || ''))) throw fail('BAD_VALUE', 'ใส่ธนาคาร ชื่อบัญชี และเลขที่บัญชีให้ครบก่อนเปิดรับชำระเงิน');
      db.paySet = { enabled: !!p.enabled, whtEnabled: !!p.whtEnabled, bank: b, promptpayId: p.promptpayId || '', notifyEmails: p.notifyEmails || [], financeEmails: p.financeEmails || [] };
      return handlers['admin.pay.settings']();
    },
    'admin.payments': function () {
      var rows = (db.orders || []).slice();
      return { rows: rows, waiting: rows.filter(function (o) { return o.status === 'awaiting_review'; }).length };
    },
    'admin.payment.file': function (p) { var f = (db.files || {})[p.id + (p.which === 'whtCert' ? 'whtCert' : 'slip')]; if (!f) throw fail('NOT_FOUND', 'ไม่มีไฟล์'); return f; },
    'admin.payment.confirm': function (p) {
      var o = (db.orders || []).filter(function (x) { return x.id === p.id; })[0];
      if (o.status === 'paid') throw fail('ALREADY_PAID', 'ยืนยันคำสั่งซื้อนี้ไปแล้ว');
      o.status = 'paid'; o.paid_at = now(); db.paidOnce = true;
      db.ledger.push({ action: 'purchase', amount: o.credits + o.bonusCredits, note: 'ซื้อแพ็ก · ' + o.ref, at: now() });
      return o;
    },
    'admin.payment.reject': function (p) {
      if (String(p.reason || '').trim().length < 3) throw fail('BAD_VALUE', 'ใส่เหตุผลให้ลูกค้าเห็น');
      var o = (db.orders || []).filter(function (x) { return x.id === p.id; })[0]; o.status = 'rejected'; o.note = p.reason; return o;
    },
    'user.profile': function (p) {
      if (p.display_name !== undefined) { if (!String(p.display_name).trim()) throw fail('BAD_VALUE', 'ใส่ชื่อที่ใช้แสดง'); db.user.display_name = String(p.display_name).trim().slice(0, 60); }
      if (p.job_title !== undefined) db.user.job_title = String(p.job_title).trim().slice(0, 80);
      if (p.phone !== undefined) { var ph = String(p.phone).trim(); if (ph && !/^[+0-9][0-9 \-]{7,18}$/.test(ph)) throw fail('BAD_VALUE', 'เบอร์โทรไม่ถูกต้อง ใช้ตัวเลข เว้นวรรค หรือ - ได้'); db.user.phone = ph; }
      if (p.remindersOff !== undefined) db.user.remindersOff = !!p.remindersOff;
      return me();
    },
    'user.deleteRequest': function (p) { if (db.user.deleteRequestedAt) return { requestedAt: db.user.deleteRequestedAt, already: true }; db.user.deleteRequestedAt = now(); db.user.remindersOff = true; return { requestedAt: db.user.deleteRequestedAt, already: false }; },
    'user.deleteCancel': function () { db.user.deleteRequestedAt = ''; return me(); },
    'auth.me': function () { if (!db.user) throw fail('SIGNED_OUT', 'กรุณาเข้าสู่ระบบอีกครั้ง'); return me(); },
    'auth.logout': function () { return { loggedOut: true }; },
    'user.prefs': function (p) {
      var o = onboarding();
      if (p.welcomeSeen !== undefined) db.prefs.welcomeSeen = !!p.welcomeSeen;
      if (p.checklistHidden !== undefined) db.prefs.checklistHidden = !!p.checklistHidden;
      if (p.tip && db.prefs.tips.indexOf(p.tip) < 0) db.prefs.tips.push(p.tip);
      return onboarding();
    },
    'org.update': function (p) {
      ['name', 'business_type', 'main_goal', 'code_prefix', 'jd_lang'].forEach(function (k) { if (p[k] !== undefined) db.org[k] = String(p[k]).trim(); });
      var b = p.billing;
      if (b && [b.name, b.taxId, b.address].some(function (x) { return String(x || '').trim(); })) db.billing = demoBilling(b);
      return { bonus: grantDemo(), me: me() };
    },
    'org.competency.suggest': function (p) {
      if (!db.org.business_type) throw fail('NEED_INPUT', 'กรอก "ธุรกิจทำอะไร" ก่อน AI จึงช่วยให้ตรงกับบริษัทได้');
      var kind = p.kind === 'leadership' ? 'leadership' : 'core';
      var left = useAi(kind);
      var kept = (p.locked || []).map(function (c) { return String(c.competency).trim().toLowerCase(); });
      var want = Math.max(3, 6 - kept.length);
      var items = demoSet(kind).filter(function (c) { return kept.indexOf(c.competency.toLowerCase()) < 0; }).slice(0, want);
      return { items: items, cached: false, left: left };
    },
    'org.competency.write': function (p) {
      var name = String(p.competency || '').trim();
      if (!name) throw fail('NEED_INPUT', 'ใส่ชื่อ Competency ก่อน แล้วให้ AI ช่วยเขียน');
      if (!db.org.business_type) throw fail('NEED_INPUT', 'กรอก "ธุรกิจทำอะไร" ก่อน AI จึงช่วยให้ตรงกับบริษัทได้');
      var left = useAi(p.kind === 'leadership' ? 'leadership' : 'core');
      return { left: left, item: { competency: name, definition: 'แสดงออกเรื่อง "' + name + '" ในงานประจำวันอย่างสม่ำเสมอ จนทีมและลูกค้าเห็นได้ชัด (ข้อความตัวอย่าง)',
        behavioral_indicators: '• ตัวอย่างพฤติกรรมที่ 1 ของ ' + name + '\n• ตัวอย่างพฤติกรรมที่ 2\n• ตัวอย่างพฤติกรรมที่ 3', why_it_matters: 'ช่วยให้บริษัทไปถึงเป้าหมายปีนี้ (ข้อความตัวอย่าง)' } };
    },
    'org.competency.save': function (p) {
      var kind = p.kind === 'leadership' ? 'leadership' : 'core';
      var items = (p.items || []).filter(function (c) { return String(c.competency || '').trim(); }).map(function (c) {
        var beh = String(c.behavioral_indicators || '').split(/\n|•/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return '• ' + x; }).join('\n');
        return { competency: String(c.competency).trim(), type: SET_TYPE[kind], definition: String(c.definition || '').trim(), behavioral_indicators: beh, why_it_matters: String(c.why_it_matters || '').trim() };
      });
      var L = demoLimits(kind);
      if (items.length < 3 || items.length > L.max) throw fail('BAD_VALUE', 'เลือก 3–' + L.max + ' ข้อ (ตอนนี้ ' + items.length + ' ข้อ) · Core และ Leadership รวมกันได้ไม่เกิน 10 ข้อ');
      var bad = items.filter(function (c) { return !c.definition || !c.behavioral_indicators; })[0];
      if (bad) throw fail('BAD_VALUE', 'ใส่คำนิยามและตัวอย่างพฤติกรรมของ "' + bad.competency + '" ด้วย');
      db.org[kind] = items;
      var bonus = grantDemo();
      return { bonus: bonus, items: items, me: me() };
    },
    'jd.competency.apply': function (p) {
      var vs = db.versions.filter(function (v) { return v.positionId === p.positionId; });
      var last = vs[vs.length - 1];
      if (Number(p.version) !== last.version) throw fail('STALE_VERSION', 'มีการแก้ JD นี้จากที่อื่นแล้ว กรุณาโหลดหน้าใหม่');
      var jd = JSON.parse(JSON.stringify(last.jd));
      jd.sections.required_competencies = withCompanySets(jd.sections.required_competencies);
      db.versions.push({ positionId: p.positionId, version: last.version + 1, tier: last.tier, jd: jd, created_at: now() });
      return { version: last.version + 1, jd: jd };
    },
    'quest.questions': function () { return D.questions; },
    'quest.suggest': function (p) { return { items: (D.chips || {})[p.question] || [], cached: true }; },
    'quest.suggestAll': function () { return { chips: D.chips || {}, cached: true }; },
    'quest.suggestStage': function (p) {
      var qsByStage = { 1: ['purpose', 'responsibilities'], 2: ['outputs', 'kpi', 'qualifications'], 3: ['scope', 'decision', 'relationships', 'complexity', 'conditions', 'risk'] };
      var out = {};
      (qsByStage[p.stage] || []).forEach(function (q) { out[q] = (D.chips || {})[q] || []; });
      return { stage: p.stage, chips: out, cached: true };
    },
    'positions.list': function () {
      db.positions.forEach(function (x) { if (!x.code) x.code = nextCode(); });
      return db.positions.map(view).reverse();
    },
    'positions.setCode': function (p) {
      var row = pos(p.id);
      var code = String(p.code || '').trim();
      if (!/^[A-Za-z0-9ก-๙._\-\/]{1,30}$/.test(code)) throw fail('BAD_VALUE', 'รหัสใช้ได้ 1–30 ตัว: ตัวอักษร ตัวเลข และ - _ . /');
      if (db.positions.some(function (x) { return x !== row && String(x.code).toLowerCase() === code.toLowerCase(); })) throw fail('CODE_TAKEN', 'รหัส ' + code + ' มีตำแหน่งอื่นใช้แล้ว');
      row.code = code;
      return view(row);
    },
    'positions.duplicate': function (p) {
      var src = pos(p.id);
      var full = p.mode === 'full';
      var last = vers(src.id).slice(-1)[0];
      if (full && !last) throw fail('NOT_FOUND', 'ตำแหน่งนี้ยังไม่มี JD ให้คัดลอก ใช้แบบคัดลอกคำตอบแทน');
      if (full && balance() < 1) throw fail('NOT_ENOUGH_CREDITS', 'เครดิตไม่พอ', { needed: 1, balance: balance() });
      var title = String(p.title || '').trim() || src.title + ' (สำเนา)';
      var row = { id: 'pos_' + Date.now(), status: 'draft', paidTier: '', code: nextCode(), answers: Object.assign({}, src.answers, { position_title: title }),
        skipped: (src.skipped || []).slice(), title: title, department: src.department, updated_at: now() };
      db.positions.push(row);
      if (full) {
        db.ledger.push({ action: 'jd_duplicate', amount: -1, note: src.code + ' → ' + row.code, at: now() });
        var jd = JSON.parse(JSON.stringify(last.jd));
        jd.title = title;
        jd.meta = Object.assign({}, jd.meta, { copied_from: src.code + ' Rev. ' + last.version });
        delete jd.meta.edit_note;
        addVersion(row.id, last.tier, jd);
        row.paidTier = last.tier === 'bronze' ? '' : last.tier;
      }
      return { position: view(row), charged: full ? 1 : 0, credits: me().credits };
    },
    'jd.versions': function (p) {
      return vers(p.positionId).map(function (v, i) {
        var m = v.jd.meta || {};
        var note = m.edit_note || (m.translated_from ? 'เปลี่ยนภาษาเป็น' + (v.jd.lang === 'en' ? 'อังกฤษ' : 'ไทย') : m.restored_from ? 'กลับไปใช้ Rev. ' + m.restored_from : m.copied_from ? 'คัดลอกจาก ' + m.copied_from
          : m.upgraded_from ? 'อัปเกรดเป็น ' + TNAME[v.tier] + ' (เพิ่มหมวดใหม่ หมวดเดิมไม่เปลี่ยน)' : (i ? 'สร้างใหม่ทั้งฉบับ ' : 'สร้าง ') + TNAME[v.tier]);
        return { version: v.version, tier: v.tier, note: note, created_at: v.created_at, by: db.user ? db.user.email : '' };
      }).reverse();
    },
    'jd.restore': function (p) {
      var list = vers(p.positionId);
      var old = list.filter(function (v) { return v.version === Number(p.version); })[0];
      if (!old) throw fail('NOT_FOUND', 'ไม่พบเวอร์ชันนี้');
      if (old === list[list.length - 1]) throw fail('ALREADY_LATEST', 'นี่คือฉบับล่าสุดอยู่แล้ว');
      var jd = JSON.parse(JSON.stringify(old.jd));
      jd.meta = Object.assign({}, jd.meta, { restored_from: old.version });
      delete jd.meta.edit_note;
      return { version: addVersion(p.positionId, old.tier, jd), tier: old.tier, jd: jd };
    },
    'positions.get': function (p) { return view(pos(p.id)); },
    'positions.save': function (p) {
      var row = p.id ? pos(p.id) : null;
      if (!row) { row = { id: 'pos_' + Date.now(), status: 'draft', paidTier: '', code: nextCode() }; db.positions.push(row); }
      row.answers = p.answers || {}; row.skipped = p.skipped || [];
      if (p.jdLang) row.jdLang = p.jdLang;
      if (p.answerLang) row.answerLang = p.answerLang;
      row.title = row.answers.position_title || ''; row.department = row.answers.department || ''; row.updated_at = now();
      return view(row);
    },
    'positions.delete': function (p) { db.positions = db.positions.filter(function (x) { return x.id !== p.id; }); return { deleted: true }; },
    'jd.quote': function (p) { return price(pos(p.positionId), p.tier); },
    'jd.translate': function (p) {
      var row = pos(p.positionId);
      var last = vers(row.id).slice(-1)[0];
      if (!last) throw fail('NOT_FOUND', 'ยังไม่มี JD ของตำแหน่งนี้');
      if ((last.jd.lang || 'th') === p.lang) throw fail('SAME_LANG', 'JD นี้เป็นภาษานี้อยู่แล้ว');
      if (balance() < 1) throw fail('NOT_ENOUGH_CREDITS', 'เครดิตไม่พอ', { needed: 1, balance: balance() });
      db.ledger.push({ action: 'jd_translate', amount: -1, note: row.code + ' → ' + p.lang, at: now() });
      var jd = JSON.parse(JSON.stringify(last.jd));
      jd.lang = p.lang === 'en' ? 'en' : 'th';
      jd.meta = Object.assign({}, jd.meta, { translated_from: last.jd.lang || 'th' });
      delete jd.meta.edit_note;
      row.jdLang = jd.lang;
      return { version: addVersion(row.id, last.tier, jd), jd: jd, charged: 1, credits: me().credits };
    },
    'jd.generate': function (p) {
      var row = pos(p.positionId);
      var pr = price(row, p.tier);
      if (pr.blocked) throw fail('BRONZE_LIMIT', pr.reason);
      if (pr.credits > balance()) throw fail('NOT_ENOUGH_CREDITS', 'เครดิตไม่พอ', { needed: pr.credits, balance: balance() });
      if (pr.credits) db.ledger.push({ action: 'jd_' + p.tier, amount: -pr.credits, note: row.title + ' · ' + p.tier, at: now() });
      db.gens.push({ positionId: row.id, tier: p.tier, charged: pr.credits, at: now() });
      var jd = buildJd(row, p.tier);
      var prev = vers(row.id).slice(-1)[0];
      jd.lang = prev ? (prev.jd.lang || 'th') : (row.jdLang || db.org.jd_lang || 'th');   // demo text stays Thai; labels follow the language
      // Upgrade: existing sections stay exactly as they are; summary sections get extra items.
      var last = vers(row.id).slice(-1)[0];
      var upgraded = !!(last && RANK[p.tier] > RANK[last.tier]);
      if (upgraded) {
        last.jd.order.forEach(function (k) {
          if (APPEND_KEYS.indexOf(k) >= 0) jd.sections[k] = last.jd.sections[k].concat(['(ข้อเพิ่มสำหรับหมวดใหม่ · โหมดตัวอย่าง)']);
          else jd.sections[k] = last.jd.sections[k];
        });
        jd.meta = Object.assign({}, jd.meta, { upgraded_from: last.tier });
      }
      var version = addVersion(row.id, p.tier, jd);
      if (p.tier !== 'bronze' && (!row.paidTier || RANK[p.tier] > RANK[row.paidTier])) row.paidTier = p.tier;
      return { version: version, jd: jd, charged: pr.credits, upgraded: upgraded, credits: me().credits };
    },
    'jd.get': function (p) {
      var vs = vers(p.positionId);
      var v = p.version ? vs.filter(function (x) { return x.version === Number(p.version); })[0] : vs[vs.length - 1];
      if (!v) throw fail('NOT_FOUND', 'ยังไม่มี JD');
      var used = (db.edits || []).filter(function (e) { return e.positionId === p.positionId; }).length;
      return { version: v.version, tier: v.tier, jd: v.jd, created_at: v.created_at, versions: vs.length, latest: v === vs[vs.length - 1],
        code: pos(p.positionId).code || '', changedSections: [],
        freeAiEdits: Math.max(0, 3 - used), editCosts: { item: 0.2, section: 0.5 }, competencyStatus: competencyStatus(v.jd) };
    },
    'jd.edit.saveMany': function (p) {
      var vs = vers(p.positionId);
      var last = vs[vs.length - 1];
      if (Number(p.version) !== last.version) throw fail('STALE_VERSION', 'มีการแก้ JD นี้จากที่อื่นแล้ว กรุณาโหลดหน้าใหม่');
      var keys = Object.keys(p.changes || {});
      if (!keys.length) throw fail('NEED_INPUT', 'ยังไม่มีอะไรเปลี่ยน');
      var jd = JSON.parse(JSON.stringify(last.jd));
      keys.forEach(function (k) { jd.sections[k] = p.changes[k]; });
      var titles = keys.map(function (k) { var s = D.questions.sections.filter(function (x) { return x.key === k; })[0]; return s ? s.title : k; });
      jd.meta = Object.assign({}, jd.meta, { edit_note: 'แก้เอง: ' + titles.join(', ') });
      delete jd.meta.restored_from;
      return { version: addVersion(p.positionId, last.tier, jd), tier: last.tier, jd: jd };
    },
    'jd.edit.save': function (p) {
      var vs = db.versions.filter(function (v) { return v.positionId === p.positionId; });
      var last = vs[vs.length - 1];
      if (Number(p.version) !== last.version) throw fail('STALE_VERSION', 'มีการแก้ JD นี้จากที่อื่นแล้ว กรุณาโหลดหน้าใหม่');
      var jd = JSON.parse(JSON.stringify(last.jd));
      jd.sections[p.sectionKey] = p.value;
      jd.meta = Object.assign({}, jd.meta, { edit_note: p.note || 'แก้ด้วยตัวเอง' });
      delete jd.meta.restored_from;
      db.versions.push({ positionId: p.positionId, version: last.version + 1, tier: last.tier, jd: jd, created_at: now() });
      return { version: last.version + 1, jd: jd };
    },
    // Demo of the soft-launch queue and company-wide requests (admin tabs).
    'admin.waitlist': function () { return demoQueue(); },
    'admin.waitlist.config': function (p) {
      var q = db.queue || (db.queue = demoQueueState());
      if (p.mode) q.mode = p.mode === 'waitlist' ? 'waitlist' : 'open';
      if (p.dailyQuota !== undefined) q.dailyQuota = Math.max(0, Math.floor(Number(p.dailyQuota) || 0));
      return demoQueue();
    },
    'admin.waitlist.admit': function (p) {
      var q = db.queue || (db.queue = demoQueueState());
      q.rows.forEach(function (r) { if ((p.ids || []).indexOf(r.id) >= 0 && r.status === 'waiting') { r.status = 'admitted'; r.admitted_by = 'admin'; r.admitted_at = now(); } });
      return demoQueue();
    },
    'admin.waitlist.remove': function (p) { var q = db.queue || (db.queue = demoQueueState()); q.rows = q.rows.filter(function (r) { return r.id !== p.id; }); return demoQueue(); },
    'admin.inquiries': function () { return demoInquiries(); },
    'admin.inquiry.update': function (p) { demoInquiries().rows.forEach(function (r) { if (r.id === p.id && p.status) r.status = p.status; }); return demoInquiries(); },
    // Demo of the consistency check: a fixed example result (the real one comes from AI reading the whole JD).
    'jd.quality': function (p) {
      var vs = db.versions.filter(function (v) { return v.positionId === p.positionId; });
      var v = p.version ? vs.filter(function (x) { return Number(x.version) === Number(p.version); })[0] : vs[vs.length - 1];
      if (!v) throw fail('NOT_FOUND', 'ยังไม่มี JD ของตำแหน่งนี้');
      var m = v.jd.meta || {}, auto = !(m.edit_note || m.restored_from);
      db.checks = db.checks || {};
      var key = p.positionId + '/' + v.version;
      if (!db.checks[key] && !auto && !p.run) return { status: 'not_checked', issues: [], auto: auto };
      var has = function (k) { return (v.jd.order || []).indexOf(k) >= 0; };
      db.checks[key] = db.checks[key] || [
        { sections: ['key_indicators', 'key_responsibilities'].filter(has), problem: 'ตัวชี้วัดเรื่องอัตราการลาออก ไม่มีหน้าที่ในหมวดหน้าที่หลักที่ดูแลเรื่องการรักษาพนักงานโดยตรง', suggestion: 'เพิ่มหน้าที่ด้านการรักษาพนักงาน หรือปรับตัวชี้วัดให้ตรงกับหน้าที่ที่มี' },
        { sections: ['people_management_responsibility', 'job_evaluation_information_summary'].filter(has), problem: 'จำนวนลูกน้องในหมวดการบริหารคน กับข้อมูลประเมินค่างาน เขียนไม่ตรงกัน', suggestion: 'ยืนยันจำนวนลูกน้องโดยตรงที่ถูกต้อง แล้วแก้ให้ตรงกันทั้งสองหมวด' }
      ].filter(function (x) { return x.sections.length === 2; });
      return { status: 'done', issues: db.checks[key], checkedAt: now(), version: Number(v.version), auto: auto };
    },
    'jd.edit.reject': function () { return { ok: true }; },
    'jd.edit.ai': function (p) {
      if (!String(p.instruction || '').trim()) throw fail('NEED_INPUT', 'บอก AI ว่าอยากให้แก้อย่างไร');
      db.edits = db.edits || [];
      var used = db.edits.filter(function (e) { return e.positionId === p.positionId; }).length;
      var isItem = p.itemIndex !== undefined;
      var cost = used < 3 ? 0 : (isItem ? 0.2 : 0.5);
      if (cost > balance()) throw fail('NOT_ENOUGH_CREDITS', 'เครดิตไม่พอ', { needed: cost, balance: balance() });
      if (cost) db.ledger.push({ action: isItem ? 'ai_edit_item' : 'ai_edit_section', amount: -cost, note: p.sectionKey, at: now() });
      db.edits.push({ positionId: p.positionId });
      var vs = db.versions.filter(function (v) { return v.positionId === p.positionId; });
      var cur = vs[vs.length - 1].jd.sections[p.sectionKey];
      var target = isItem ? cur[p.itemIndex] : cur;
      var tweak = function (x) {
        if (typeof x === 'string') return x + ' (ปรับตาม: ' + p.instruction + ')';
        if (Array.isArray(x)) return x.map(tweak);
        var o = {}; Object.keys(x).forEach(function (k, i) { o[k] = i === 0 ? tweak(x[k]) : x[k]; }); return o;
      };
      return { proposal: tweak(target), scope: isItem ? 'item' : 'section', itemIndex: isItem ? p.itemIndex : null, charged: cost, freeLeft: Math.max(0, 3 - used - 1), credits: me().credits };
    },
    'jd.exportDocx': function () { db.wordDone = true; throw fail('DEMO', 'โหมดตัวอย่างดาวน์โหลดไฟล์ Word ไม่ได้ ใช้ได้เมื่อเชื่อมระบบจริง'); },
    'credits.history': function () { return db.ledger.slice().reverse().map(function (r, i) { return { id: 'l' + i, action: r.action, amount: r.amount, note: r.note, created_at: r.at }; }); },
    'ai.settings.get': demoAiSettings,
    'ai.models.list': function (p) { return { provider: p.provider, models: demoCheck(Object.assign({ model: 'x' }, p)).models }; },
    'ai.connection.check': demoCheck,
    'ai.connection.save': function (p) {
      var r = demoCheck(p);
      if (!r.ok) return { saved: false, check: r };
      if ((p.apiKey || '').trim()) db.ai.keys[p.provider] = p.apiKey.trim();
      db.ai[p.role === 'fallback' ? 'fallback' : 'primary'] = { provider: p.provider, model: p.model, effort: p.effort || '' };
      return { saved: true, check: r, settings: demoAiSettings() };
    },
    'ai.routes.save': function (p) { db.ai.routes = p.routes || {}; return { saved: true, routes: db.ai.routes }; },

    // ---- admin (sample numbers; the demo has no other customers) ----
    'admin.overview': function () {
      return { days: 30, users: { total: 14, today: 1, week: 5, month: 14, period: 14, active: 8, suspended: 0 }, orgs: 14, positions: 23,
        jds: { total: 31, byTier: { bronze: 19, silver: 8, gold: 4 } }, credits: { given: 61, bought: 0, used: 34, outstanding: 57 + balance() },
        revenue: 0, aiCost: 342.18, margin: -342.18, unpricedModels: [],
        funnel: [{ step: 'signup', count: 14 }, { step: 'company', count: 11 }, { step: 'firstJd', count: 9 }, { step: 'paid', count: 0 }] };
    },
    'admin.aiCost': function () { return demoCost(); },
    'admin.prices.refresh': function () { db.pricesFetched = now(); return demoCost(); },
    'admin.orgs': function (p) {
      var q = String(p.q || '').toLowerCase();
      var st = bonusStatus();
      var rows = [{ id: db.org.id, name: db.org.name || '', business_type: db.org.business_type || '', created_at: now(),
        taxId: db.billing ? db.billing.taxId : '', legalName: db.billing ? db.billing.name : '', taxType: db.billing ? db.billing.type : '', taxDuplicate: st.duplicate, taxShared: st.duplicate,
        users: [{ id: 'usr_demo', email: (db.user || {}).email || 'demo@example.com', role: 'admin', status: 'active' }], balance: balance(),
        positions: db.positions.length, jds: db.positions.filter(function (x) { return db.versions.some(function (v) { return v.positionId === x.id; }); }).length, last_login_at: now() }]
        .concat((db.demoOrgs = db.demoOrgs || [
          { id: 'org_a', name: 'ร้านตัวอย่าง ก', business_type: 'ค้าปลีกเครื่องสำอาง', created_at: '2026-11-20T03:00:00Z', taxId: '0107553000182', legalName: 'บริษัท ตัวอย่าง ก จำกัด', taxType: 'company', taxShared: true, users: [{ id: 'u_a', email: 'hr@shop-a.example', role: 'owner', status: 'active', deleteRequestedAt: '2026-11-22T05:00:00Z', deleteReason: 'ปิดกิจการ' }], balance: 5, positions: 3, jds: 2, last_login_at: '2026-11-22T02:10:00Z' },
          { id: 'org_b', name: '', business_type: '', created_at: '2026-11-21T09:00:00Z', users: [{ id: 'u_b', email: 'owner@shop-b.example', role: 'owner', status: 'active' }], balance: 3, positions: 0, jds: 0, last_login_at: '2026-11-21T09:00:00Z' }]));
      rows = rows.filter(function (r) { return !q || r.name.toLowerCase().indexOf(q) >= 0 || String(r.taxId || '').indexOf(q) >= 0 || r.users.some(function (u) { return u.email.indexOf(q) >= 0; }); });
      return { total: rows.length, rows: rows };
    },
    'admin.org.ledger': function (p) {
      if (p.orgId === db.org.id) return db.ledger.slice().reverse().map(function (r) { return { action: r.action, amount: r.amount, note: r.note, created_at: r.at }; });
      return [{ action: 'signup_bonus', amount: 2, note: 'เครดิตฟรีเมื่อสมัคร', created_at: '2026-11-20T03:00:00Z' }];
    },
    'admin.credits.adjust': function (p) {
      var amount = Math.round(Number(p.amount) * 10) / 10;
      if (!amount || Math.abs(amount) > 1000) throw fail('BAD_VALUE', 'จำนวนเครดิตต้องไม่เป็น 0 และไม่เกิน 1,000');
      if (String(p.reason || '').trim().length < 3) throw fail('BAD_VALUE', 'ใส่เหตุผลก่อน');
      if (p.orgId === db.org.id) {
        if (amount < 0 && balance() + amount < 0) throw fail('BAD_VALUE', 'หักได้ไม่เกินที่เหลือ (' + balance() + ' เครดิต)');
        db.ledger.push({ action: amount > 0 ? 'admin_grant' : 'admin_deduct', amount: amount, note: p.reason, at: now() });
        return { orgId: p.orgId, balance: balance() };
      }
      var o = (db.demoOrgs || []).filter(function (x) { return x.id === p.orgId; })[0];
      if (!o) throw fail('NOT_FOUND', 'ไม่พบบริษัทนี้');
      if (amount < 0 && o.balance + amount < 0) throw fail('BAD_VALUE', 'หักได้ไม่เกินที่เหลือ (' + o.balance + ' เครดิต)');
      o.balance = Math.round((o.balance + amount) * 10) / 10;
      return { orgId: o.id, balance: o.balance };
    },
    'admin.dormant': function () { return demoDormant(); },
    'admin.reminders.set': function (p) { db.remind = Object.assign({}, db.remind, { enabled: !!p.enabled }); return demoDormant(); },
    'admin.reminders.run': function () {
      if (!(db.remind || {}).enabled) throw fail('REMINDERS_OFF', 'เปิดอีเมลเตือนก่อน แล้วค่อยกดส่ง');
      db.remind.sentB = true; db.remind.lastRun = now(); db.remind.lastResult = { sent: 1, errors: 0 };
      var d = demoDormant(); d.justSent = { sent: 1, errors: 0 }; return d;
    },
    'admin.org.positions': function (p) {
      if (p.orgId === db.org.id) return db.positions.filter(function (x) { return vers(x.id).length; }).map(function (x) { var v = vers(x.id); return { id: x.id, code: x.code || '', title: x.title || x.answers.position_title || '', tier: v[v.length - 1].tier, version: v.length }; });
      return [{ id: 'pos_hr', code: 'JD-0001', title: 'HR Manager', tier: 'gold', version: 1 }];
    },
    'admin.sample.set': function (p) {
      var x = db.positions.filter(function (q) { return q.id === p.positionId; })[0];
      var v = x ? vers(x.id) : [];
      var jd = v.length ? v[v.length - 1].jd : (D.sampleJd || null);
      db.sample = jd ? { title: jd.title || 'HR Manager', department: jd.department || '', reports_to: jd.reports_to || '', tier: v.length ? v[v.length - 1].tier : 'gold',
        order: jd.order || Object.keys(jd.sections || {}), sections: jd.sections || {}, from: { code: x ? x.code || '' : 'JD-0001', version: v.length || 1 }, set_at: now() } : null;
      if (!db.sample) throw fail('NOT_FOUND', 'โหมดตัวอย่างมีเฉพาะ JD ที่สร้างในเครื่องนี้');
      return demoDormant().sample;
    },
    'admin.sample.clear': function () { db.sample = null; return null; },
    'sample.get': function () { return db.sample ? { title: db.sample.title, department: db.sample.department, reports_to: db.sample.reports_to, tier: db.sample.tier, order: db.sample.order, sections: db.sample.sections } : null; },
    'user.unsubscribe': function (p) { if (String(p.token || '').length < 20) throw fail('BAD_LINK', 'ลิงก์ไม่ถูกต้อง'); return { unsubscribed: true }; },
    'admin.user.deletePreview': function (p) {
      var u = null, org = null;
      (db.demoOrgs || []).forEach(function (o) { o.users.forEach(function (x) { if (x.id === p.userId) { u = x; org = o; } }); });
      if (!u) throw fail('NOT_FOUND', 'ไม่พบผู้ใช้นี้ (อาจถูกลบไปแล้ว)');
      return { userId: u.id, email: u.email, orgName: org.name, wholeOrg: org.users.length === 1, otherUsers: org.users.length - 1,
        positions: org.positions || 0, versions: org.jds || 0, docs: Math.min(org.jds || 0, 2), competencies: 2, ordersRemoved: 0, paidKept: 0,
        balance: org.balance || 0, deleteRequestedAt: u.deleteRequestedAt || '', deleteReason: u.deleteReason || '' };
    },
    'admin.user.delete': function (p) {
      var found = null;
      (db.demoOrgs || []).forEach(function (o) { o.users.forEach(function (x) { if (x.id === p.userId) found = { o: o, u: x }; }); });
      if (!found) throw fail('NOT_FOUND', 'ไม่พบผู้ใช้นี้ (อาจถูกลบไปแล้ว)');
      if (String(p.confirmEmail || '').trim().toLowerCase() !== found.u.email) throw fail('BAD_VALUE', 'อีเมลที่พิมพ์ยืนยันไม่ตรงกับบัญชีนี้');
      found.o.users = found.o.users.filter(function (x) { return x !== found.u; });
      if (!found.o.users.length) db.demoOrgs = db.demoOrgs.filter(function (o) { return o !== found.o; });
      return { deleted: true, userId: p.userId, wholeOrg: !found.o.users.length, files: 0, filesFailed: 0, mailed: true, paidKept: 0, creditsClosed: 0 };
    },
    'admin.user.status': function (p) {
      var u = null;
      (db.demoOrgs || []).forEach(function (o) { o.users.forEach(function (x) { if (x.id === p.userId) u = x; }); });
      if (!u) throw fail('BAD_VALUE', 'ระงับบัญชีนี้ไม่ได้');
      u.status = p.suspend ? 'suspended' : 'active';
      return { userId: u.id, status: u.status };
    }
  };

  function demoBilling(b) {
    b = b || {};
    var id = String(b.taxId || '').replace(/[\s-]/g, '');
    var ok = /^\d{13}$/.test(id) && (function () { var s = 0; for (var i = 0; i < 12; i++) s += Number(id[i]) * (13 - i); return (11 - (s % 11)) % 10 === Number(id[12]); })();
    if (!String(b.name || '').trim()) throw fail('BAD_VALUE', 'ใส่ชื่อสำหรับออกใบกำกับภาษี');
    if (!ok) throw fail('BAD_VALUE', 'เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลักที่ถูกต้อง');
    if (String(b.address || '').trim().length < 10) throw fail('BAD_VALUE', 'ใส่ที่อยู่ตามที่จดทะเบียนให้ครบ');
    var br = String(b.branch || '').trim();
    br = b.type === 'person' ? '' : (!br || /^(สำนักงานใหญ่|00000)$/.test(br) ? 'สำนักงานใหญ่' : /^\d{1,5}$/.test(br) ? ('00000' + br).slice(-5) : null);
    if (br === null) throw fail('BAD_VALUE', 'สาขาใส่ "สำนักงานใหญ่" หรือเลขสาขา 5 หลัก');
    return { type: b.type === 'person' ? 'person' : 'company', name: String(b.name).trim(), taxId: id, branch: br, address: String(b.address).trim(), email: String(b.email || '').trim() || (db.user || {}).email };
  }
  function demoQuote(packId, wht) {
    var pk = (D.packs || []).filter(function (p) { return p.id === packId; })[0] || { id: packId, name: packId, credits: 0, priceThb: 0 };
    var before = pk.priceThb / 1.07, w = wht ? Math.round(before * 0.03 * 100) / 100 : 0;
    var r2 = function (n) { return Math.round(n * 100) / 100; };
    return { packId: pk.id, packName: pk.name, credits: pk.credits, bonusCredits: db.paidOnce ? 0 : Math.round(pk.credits * 0.2), beforeVat: r2(before), vat: r2(pk.priceThb - before),
      total: pk.priceThb, whtThb: w, amountDue: r2(pk.priceThb - w) };
  }
  function demoPayConfig() {
    var s = db.paySet || {};
    return { enabled: !!(s.enabled && s.bank && s.bank.accountNo), whtEnabled: !!s.whtEnabled, whtRate: 0.03, bank: s.enabled ? s.bank : null, promptpayId: s.promptpayId || '',
      packs: (D.packs || []).map(function (p) { return demoQuote(p.id, false); }), billing: db.billing || null, vatRate: 0.07, pricesIncludeVat: true, orders: db.orders || [],
      seller: { name: 'บริษัท ภูมิใจ ดีใจ จำกัด', branch: 'สำนักงานใหญ่', taxId: '0575562000046', address: '103 ม.13 ต.ป่าอ้อดอนชัย อ.เมือง จ.เชียงราย 57000' } };
  }

  function demoDormant() {
    var r = db.remind || {};
    var day = function (n) { return new Date(Date.now() - n * 86400000).toISOString(); };
    var mail = function (subject, lines) { return '<div style="font-family:sans-serif;font-size:15px;line-height:1.6">' + lines.map(function (l) { return '<p>' + l + '</p>'; }).join('') +
      '<p><a href="#" style="display:inline-block;background:#1B3A6B;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">เริ่มสร้าง JD แรก</a></p><p style="font-size:12px;color:#5B6472">ไม่อยากรับอีเมลแนะนำแบบนี้อีก <a href="#">กดเลิกรับ</a></p></div>'; };
    return { enabled: !!r.enabled, lastRun: r.lastRun || '', lastResult: r.lastResult || null, dueNow: r.enabled && !r.sentB ? 1 : (r.enabled ? 0 : 1),
      rows: [
        { userId: 'u_b', email: 'owner@shop-b.example', status: 'active', created_at: day(2), days: 2, stage: 'company', sent: r.sentB ? [{ key: 'r1', at: now() }] : [], unsubscribed: false, next: r.sentB ? { key: 'r2', due: false } : { key: 'r1', due: true } },
        { userId: 'u_c', email: 'hr@shop-c.example', status: 'active', created_at: day(5), days: 5, stage: 'answering', sent: [{ key: 'r1', at: day(4) }, { key: 'r2', at: day(1) }], unsubscribed: false, next: { key: 'r3', due: false } }],
      templates: [
        { key: 'r1', days: 1, subject: 'เหลืออีกขั้นเดียวก็ได้ JD แรกของคุณ', html: mail('', ['ขอบคุณที่สมัครใช้ Role Intelligence', 'ตอบคำถามเรื่องตำแหน่ง 5 ข้อแรก (ราว 3 นาที) แล้วกดสร้าง Role Brief ได้ฟรี']) },
        { key: 'r2', days: 3, subject: 'คุณมี 3 เครดิตรออยู่ใน Role Intelligence', html: mail('', ['บัญชีของคุณมี 3 เครดิต และสร้าง Role Brief ได้ฟรีเดือนละ 3 ครั้ง', 'ลองดูตัวอย่าง JD ที่ระบบสร้างได้ก่อนก็ได้']) },
        { key: 'r3', days: 7, subject: 'ติดตรงไหนในการสร้าง JD ไหมครับ', html: mail('', ['เห็นว่าคุณยังไม่ได้สร้าง JD แรก ถ้าติดตรงไหน ตอบอีเมลนี้กลับมาบอกได้เลย เราอ่านทุกฉบับ']) }],
      sample: db.sample ? { title: db.sample.title, tier: db.sample.tier, from: db.sample.from, set_at: db.sample.set_at } : null };
  }

  function demoCost() {
    var L = function (a, b, prov) { return { 'in': a, out: b, provider: prov, source: 'litellm' }; };
    var prices = { usdThb: 32.47, fx: { source: 'open.er-api.com' }, fetched_at: db.pricesFetched || '2026-11-22T01:00:00Z', errors: [],
      featured: { anthropic: ['claude-fable-5-2', 'claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'], openai: ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra'], google: ['gemini-4-neon', 'gemini-4-carbon', 'gemini-3.8-flash'] },
      models: { 'claude-fable-5-2': L(8, 40, 'anthropic'), 'claude-opus-5-5': L(4, 20, 'anthropic'), 'claude-sonnet-5-5': L(2, 10, 'anthropic'), 'claude-haiku-5-5': L(0.1, 0.5, 'anthropic'),
        'gpt-6.2-astra': L(8, 40, 'openai'), 'gpt-6.2-sol': L(2, 10, 'openai'), 'gpt-6.1-terra': L(1, 5, 'openai'),
        'gemini-4-neon': { 'in': 3, out: 15, provider: 'google', source: 'openrouter' }, 'gemini-4-carbon': L(2, 10, 'google'), 'gemini-3.8-flash': L(0.75, 3.75, 'google') } };
    var k = 1;
    var r2 = function (n) { return Math.round(n * k * 100) / 100; };
    var rate = { value: 92.52, pack: 'Organization' };
    var chips = r2(1.35);
    var write = { bronze: r2(4.62), silver: r2(9.8), gold: r2(15.4) };
    return { days: 30, total: r2(342.18), calls: 412, failed: 3, positions: 23, chipsPerPosition: chips, bahtPerCredit: rate, prices: prices,
      unpricedModels: [], modelsSeen: ['claude-opus-5-5', 'gemini-3.8-flash'],
      perJd: ['bronze', 'silver', 'gold'].map(function (t) {
        return { tier: t, chips: chips, write: write[t], total: Math.round((chips + write[t]) * 100) / 100, credits: CREDITS[t], revenue: Math.round(CREDITS[t] * rate.value * 100) / 100 };
      }),
      generations: [
        { tier: 'bronze', kind: 'new', count: 19, avgCost: write.bronze, avgSeconds: 21.4, avgCredits: 0, revenue: 0, margin: -write.bronze },
        { tier: 'silver', kind: 'new', count: 3, avgCost: write.silver, avgSeconds: 33.1, avgCredits: 2, revenue: 185.04, margin: Math.round((185.04 - write.silver) * 100) / 100 },
        { tier: 'silver', kind: 'upgrade', count: 5, avgCost: r2(5.9), avgSeconds: 24.8, avgCredits: 2, revenue: 185.04, margin: Math.round((185.04 - r2(5.9)) * 100) / 100 },
        { tier: 'gold', kind: 'upgrade', count: 4, avgCost: r2(8.7), avgSeconds: 31.5, avgCredits: 2, revenue: 185.04, margin: Math.round((185.04 - r2(8.7)) * 100) / 100 }],
      tasks: [
        { task: 'suggest_chips', calls: 286, failed: 1, cost: r2(31.05), perCall: r2(0.11), avgSeconds: 7.2, inTokens: 512400, outTokens: 201300 },
        { task: 'full_jd', calls: 58, failed: 2, cost: r2(258.4), perCall: r2(4.45), avgSeconds: 26.3, inTokens: 690200, outTokens: 1101800 },
        { task: 'org_competency', calls: 41, failed: 0, cost: r2(37.9), perCall: r2(0.92), avgSeconds: 14.8, inTokens: 98200, outTokens: 134000 },
        { task: 'ai_edit', calls: 27, failed: 0, cost: r2(14.83), perCall: r2(0.55), avgSeconds: 9.1, inTokens: 120400, outTokens: 48000 }],
      daily: ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'].map(function (d, i) {
        return { day: d, cost: r2([12.4, 30.1, 18.9, 61.2, 48.7, 102.5, 68.38][i]) };
      }) };
  }

  function local(action, payload) {
    var delay = action === 'jd.generate' ? 2500 : action === 'jd.quality' ? 1800 : action === 'quest.suggest' ? 600 : 250;
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        try {
          var hnd = handlers[action];
          if (!hnd) throw fail('NOT_FOUND', 'ไม่รู้จักคำสั่ง ' + action);
          var out = JSON.parse(JSON.stringify(hnd(payload || {})));
          persist();
          resolve(out);
        } catch (e) { reject(e); }
      }, delay);
    });
  }

  window.api = {
    demo: demo,
    call: function (action, payload) { return demo ? local(action, payload) : remote(action, payload); },
    setToken: setToken,
    hasToken: function () { return !!getToken(); }
  };
})();

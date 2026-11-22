/* pages-onboard.js – getting started: welcome page (first sign-in), checklist card, first-time tips. */
(function () {
  var h = ui.h;
  window.pages = window.pages || {};

  function ob() { return (app.me && app.me.onboarding) || { steps: {}, prefs: { tips: [] } }; }
  function savePrefs(patch) {
    return api.call('user.prefs', patch).then(function (o) { if (app.me) app.me.onboarding = o; return o; }, function () { /* not critical */ });
  }

  // ---------------- 1. welcome page (once, right after the first sign-in) ----------------
  window.pages.welcome = function (view) {
    var s = ob().steps;
    var bonusLeft = ['company', 'core', 'leadership'].filter(function (k) { return !s[k]; }).length;
    var credits = app.me.credits || {};
    function step(no, title, meta, body, extra) {
      return h('li.welcome-step', {},
        h('span.welcome-no', { text: '§0' + no }),
        h('div.stack', {}, h('div', {}, h('h2', { text: title }), h('span.welcome-meta', { text: meta })), h('p', { text: body }), extra || null));
    }
    var tiers = h('div.welcome-tiers', {},
      [['bronze', 'ฟรี', 'ร่างดูบนจอ 9 หมวด'], ['silver', '2 เครดิต', 'พร้อมสรรหา 13 หมวด + ไฟล์ Word'], ['gold', '4 เครดิต', 'ฉบับเต็ม 19 หมวด + ไฟล์ Word']].map(function (t) {
        return h('div.welcome-tier', {}, ui.tierPill(t[0]), h('strong', { text: t[1] }), h('span.small', { text: t[2] }));
      }));
    function start() {
      savePrefs({ welcomeSeen: true });
      app.go(s.company ? '#quest' : '#company');
    }
    ui.mount(view, h('section.welcome', {},
      h('header.stack', {},
        h('span.eyebrow', { text: 'ยินดีต้อนรับ' }),
        h('h1', { text: 'สร้าง JD แรกได้ใน 3 ขั้น' }),
        h('p', { text: 'ไม่ต้องเขียนเองทั้งหมด ตอบคำถามทีละข้อ AI เสนอตัวเลือกให้กดเลือก แล้วระบบเขียน JD ให้' })),
      h('ol.welcome-steps', {},
        step(1, 'บอกเรื่องบริษัท', '3 คำถาม · 1 นาที · +1 เครดิต', 'ช่วยให้ AI เขียนให้ตรงกับธุรกิจของคุณ ชื่อบริษัทไม่ถูกส่งให้ AI'),
        step(2, 'ตอบคำถามเรื่องตำแหน่ง', '5 ข้อแรก · ราว 3 นาที', 'กดเลือกจากตัวเลือกที่ AI เสนอ หรือพิมพ์เอง ข้อไหนไม่แน่ใจกดข้ามได้ ระบบบันทึกให้อัตโนมัติ'),
        step(3, 'เลือกระดับ JD', 'สร้างได้ทันทีที่ข้อมูลพอ', 'เริ่มจาก Role Brief ฟรีก่อนก็ได้ อัปเกรดทีหลังได้ จ่ายเฉพาะส่วนต่าง และหมวดที่มีอยู่แล้วไม่เปลี่ยน', tiers)),
      h('div.welcome-credit', {},
        h('span', {}, 'ตอนนี้คุณมี ', h('strong', { text: ui.fmtCredits(credits.balance || 0) + ' เครดิต' }),
          bonusLeft ? ' · รับเพิ่มได้อีก ' + bonusLeft + ' เครดิต จากการตั้งค่าบริษัทให้ครบ' : '')),
      h('div.row', {}, ui.button('primary', s.company ? 'เริ่มสร้าง JD' : 'เริ่มขั้นที่ 1', start),
        ui.button('ghost', 'ข้ามไปสร้าง JD เลย', function () { savePrefs({ welcomeSeen: true }); app.go('#quest'); }))));
  };

  // ---------------- 2. getting-started checklist (until done or hidden) ----------------
  var ITEMS = [
    ['company', 'กรอกข้อมูลบริษัท', '+1 เครดิต', '#company'],
    ['firstJd', 'สร้าง JD แรก', 'Role Brief ฟรี', '#quest'],
    ['core', 'กำหนด Core Competency', '+1 เครดิต', '#company/core'],
    ['leadership', 'กำหนด Leadership Competency', '+1 เครดิต', '#company/leadership'],
    ['firstWord', 'ดาวน์โหลด JD เป็นไฟล์ Word', 'ตั้งแต่ Role Profile', '#jds']
  ];
  function checklist() {
    var o = ob();
    if (o.prefs.checklistHidden) return null;
    var done = ITEMS.filter(function (it) { return o.steps[it[0]]; }).length;
    if (done === ITEMS.length) return null;
    var next = ITEMS.filter(function (it) { return !o.steps[it[0]]; })[0];
    var card = h('section.card.checklist', { 'aria-label': 'เริ่มต้นใช้งาน' },
      h('div.row-between', {},
        h('div', {}, h('span.eyebrow', { text: 'เริ่มต้นใช้งาน · ' + done + ' / ' + ITEMS.length }), h('h2', { text: 'ทำให้ครบ แล้วใช้งานได้เต็มที่' })),
        ui.button('ghost.small-btn', 'ซ่อน', function () { card.remove(); savePrefs({ checklistHidden: true }); })),
      h('div.meter', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(ITEMS.length), 'aria-valuenow': String(done) },
        h('span', { style: 'width:' + Math.round(done / ITEMS.length * 100) + '%' })),
      h('ul.check-items', {}, ITEMS.map(function (it) {
        var ok = !!o.steps[it[0]];
        return h('li' + (ok ? '.done' : '') + (it === next ? '.next' : ''), {},
          h('span.check-box', { 'aria-hidden': 'true' }, ok ? ui.icon('check') : null),
          ok ? h('span.check-label', { text: it[1] }) : h('a.check-label', { href: it[3], text: it[1] }),
          h('span.check-reward', { text: ok ? 'เสร็จแล้ว' : it[2] }));
      })));
    return card;
  }

  // ---------------- 4. first-time tips (each shown once per user) ----------------
  function tip(id, text) {
    var o = ob();
    if ((o.prefs.tips || []).indexOf(id) >= 0) return null;
    var el = h('div.tip', { role: 'note' },
      h('span.tip-icon', { 'aria-hidden': 'true' }, ui.icon('info')),
      h('span.tip-text', { text: text }),
      ui.button('tip-ok', 'เข้าใจแล้ว', function () { dismiss(id); el.remove(); }, { icon: 'check', 'aria-label': 'เข้าใจแล้ว ซ่อนคำแนะนำนี้' }));
    return el;
  }
  function dismiss(id) {
    var o = ob();
    o.prefs.tips = (o.prefs.tips || []).concat([id]);
    savePrefs({ tip: id });
  }
  function seen(id) { return (ob().prefs.tips || []).indexOf(id) >= 0; }

  window.onboard = { checklist: checklist, tip: tip, dismiss: dismiss, seen: seen };
})();

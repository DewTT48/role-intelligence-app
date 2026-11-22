/* pages-account.js – sign-in, company profile (3 questions), credits. */
(function () {
  var h = ui.h;
  window.pages = window.pages || {};

  // ---------------- sign-in ----------------
  window.pages.signin = function (view) {
    var state = { step: 'email', email: '', msg: null };
    render();

    function render() {
      var email = h('input', { type: 'email', id: 'signin-email', autocomplete: 'email', inputmode: 'email', placeholder: 'name@company.com', value: state.email });
      var code = h('input.mono.code-input', { type: 'text', id: 'signin-code', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', placeholder: '______' });
      var msg = state.msg ? ui.note(state.msg.kind, state.msg.text) : null;

      var form = state.step === 'email'
        ? h('form.stack', { onsubmit: function (e) { e.preventDefault(); sendCode(e.submitter || form.querySelector('button')); } },
          h('label.field', { for: 'signin-email' }, 'อีเมลที่ใช้ทำงาน', email),
          msg,
          h('button.btn.primary.wide', { type: 'submit', text: 'รับรหัสเข้าสู่ระบบ' }))
        : h('form.stack', { onsubmit: function (e) { e.preventDefault(); verify(e.submitter || form.querySelector('button.primary')); } },
          h('p', {}, 'ส่งรหัส 6 หลักไปที่ ', h('strong', { text: state.email }), ' แล้ว (ใช้ได้ 10 นาที)'),
          h('label.field', { for: 'signin-code' }, 'รหัสจากอีเมล', code),
          msg,
          h('button.btn.primary.wide', { type: 'submit', text: 'เข้าสู่ระบบ' }),
          h('div.row', {}, ui.button('ghost', 'เปลี่ยนอีเมล', function () { state.step = 'email'; state.msg = null; render(); }),
            ui.button('ghost', 'ส่งรหัสอีกครั้ง', function (e) { sendCode(e.target); })));

      ui.mount(view, h('div.signin', {},
        h('div.signin-card', {},
          h('div.brand.big', { 'aria-label': 'Role Intelligence' }, h('span.wordmark', { 'aria-hidden': 'true' }, 'RI', h('span.wm-dot')),
            h('span.brand-text', {}, h('strong', { text: 'Role Intelligence' }), h('small.tagline', {}, 'Blueprint your roles', h('span.wm-dot')))),
          h('h1', { text: 'เข้าสู่ระบบ' }),
          h('p.muted', { text: 'สมัครฟรี กรอกข้อมูลบริษัทครบ ได้ Role Blueprint ฉบับเต็มฟรี 1 ฉบับ และร่าง Role Brief ได้ฟรีทุกเดือน' }),
          form,
          api.demo ? h('p.muted.small', { text: 'โหมดตัวอย่าง: ใช้รหัส 123456' }) : null)));
      (state.step === 'email' ? email : code).focus();

      function sendCode(btn) {
        state.email = (email.value || state.email).trim();
        ui.busy(btn, 'กำลังส่ง…', function () {
          return api.call('auth.requestCode', { email: state.email }).then(function () {
            state.step = 'code'; state.msg = null; render();
          });
        }).catch(function (e) { state.msg = { kind: 'err', text: ui.errorText(e) }; render(); });
      }
      function verify(btn) {
        ui.busy(btn, 'กำลังตรวจ…', function () {
          return api.call('auth.verifyCode', { email: state.email, code: code.value }).then(function (r) {
            api.setToken(r.token);
            app.setMe(r.me);
            var o = r.me.onboarding;
            app.go(o && !o.prefs.welcomeSeen ? '#welcome' : r.me.org.complete ? '#quest' : '#company');
          });
        }).catch(function (e) { state.msg = { kind: 'err', text: ui.errorText(e) }; render(); });
      }
    }
  };

  // ---------------- company profile ----------------
  window.pages.company = function (view) {
    var org = app.me.org;
    var name = h('input', { type: 'text', id: 'org-name', value: org.name || '', placeholder: 'เช่น บริษัท ตัวอย่าง จำกัด' });
    var type = h('input', { type: 'text', id: 'org-type', value: org.business_type || '', placeholder: 'เช่น ค้าปลีกสินค้าอุปโภคบริโภค 25 สาขา' });
    var goal = h('input', { type: 'text', id: 'org-goal', value: org.main_goal || '', placeholder: 'เช่น ขยายเป็น 40 สาขา และลดสินค้าขาดชั้น' });
    var prefix = h('input', { type: 'text', id: 'org-prefix', value: org.code_prefix || '', placeholder: 'JD-', maxlength: '12' });
    var msg = h('div');
    var sets = {
      core: { box: h('section.card.narrow.core-card', { id: 'core' }), no: '2', title: 'Core Competency ของบริษัท',
        intro: 'พฤติกรรมที่พนักงานทุกคนต้องมี ไม่ว่าจะทำตำแหน่งไหน ระบบใส่ให้ทุก JD ในหมวด Competency',
        empty: 'ยังไม่ได้กำหนด ตอนนี้ JD ใช้ Core กลาง 3 ข้อไปก่อน',
        hint: 'เช่น บริการลูกค้าเป็นเลิศ ซื่อสัตย์ ทำงานเร็ว', example: 'ใส่ใจลูกค้า (Customer Focus)' },
      leadership: { box: h('section.card.narrow.core-card', { id: 'leadership' }), no: '3', title: 'Leadership Competency ของบริษัท',
        intro: 'พฤติกรรมที่หัวหน้าทุกคนต้องมี ระบบใส่ให้ JD ของตำแหน่งที่มีลูกน้อง แทนที่ AI คิดใหม่ทุกตำแหน่ง หัวหน้าทุกแผนกจึงใช้มาตรฐานเดียวกัน',
        empty: 'ยังไม่ได้กำหนด ตอนนี้ AI คิด Leadership ให้แต่ละตำแหน่งแยกกัน',
        hint: 'เช่น สอนงานลูกน้อง ตัดสินใจเร็ว เป็นตัวอย่างที่ดี', example: 'พัฒนาทีม (Developing People)' }
    };
    var save = ui.button('primary', 'บันทึก', function () {
      ui.busy(save, 'กำลังบันทึก…', function () {
        return api.call('org.update', { name: name.value, business_type: type.value, main_goal: goal.value, code_prefix: prefix.value }).then(function (r) {
          app.setMe(r.me);
          if (r.bonus) ui.toast('ได้ +' + r.bonus + ' เครดิต ขอบคุณที่กรอกข้อมูลบริษัท');
          else ui.toast('บันทึกแล้ว');
          if ((r.me.org.core || []).length) { app.go('#quest'); return; }
          ui.mount(msg, null);
          drawSet('core');
          sets.core.box.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }).catch(function (e) { ui.mount(msg, ui.note('err', ui.errorText(e))); });
    });
    ui.mount(view, [
      ui.pageHead('ใช้กับทุก JD ของบริษัท', 'ข้อมูลบริษัท'),
      h('section.card.narrow', {},
        h('h2', { text: '1. ข้อมูลบริษัท · 3 คำถาม' }),
        h('p', { text: 'ข้อมูลนี้ช่วยให้ AI เขียนหมวด "ความเชื่อมโยงกับธุรกิจ" ได้ตรงกับบริษัท ชื่อบริษัทจะไม่ถูกส่งให้ AI' }),
        org.complete ? null : ui.note('info', 'กรอกครบ 3 ข้อ รับ +1 เครดิต'),
        h('label.field', { for: 'org-name' }, 'ชื่อบริษัท (แสดงบนเอกสาร)', name),
        h('label.field', { for: 'org-type' }, 'ธุรกิจทำอะไร', type),
        h('label.field', { for: 'org-goal' }, 'เป้าหมายหลักปีนี้', goal),
        h('label.field', { for: 'org-prefix' }, 'คำนำหน้ารหัส JD (ไม่บังคับ เช่น HR- ได้รหัส HR-0001; เว้นว่าง = JD-)', prefix),
        msg,
        h('div.row.end', {}, org.complete ? null : ui.button('ghost', 'ข้ามไปก่อน', function () { app.go('#quest'); }), save)),
      sets.core.box, sets.leadership.box
    ]);
    drawSet('core');
    drawSet('leadership');
    var target = location.hash.indexOf('leadership') >= 0 ? sets.leadership.box : location.hash.indexOf('core') >= 0 ? sets.core.box : null;
    if (target) target.scrollIntoView({ block: 'start' });
    else name.focus();

    // ---------------- company competency sets (can be added or changed any time) ----------------
    function lim(kind) {
      var l = (app.me.org.competencyLimits || {})[kind];
      return l || { min: 3, max: 5, total: 10, other: 3, otherSaved: false };
    }
    function limitText(kind) { var l = lim(kind); return l.min + '–' + l.max + ' ข้อ'; }

    function head(S) { return [h('h2', { text: S.no + '. ' + S.title }), h('p', { text: S.intro })]; }

    function drawSet(kind) {
      var S = sets[kind];
      var items = app.me.org[kind] || [];
      if (!items.length) {
        ui.mount(S.box, head(S).concat([
          ui.note('info', S.empty + ' · กำหนดของบริษัทเอง ' + limitText(kind) + ' รับ +1 เครดิต (ครั้งแรก)'),
          h('div.row', {}, ui.button('ai-go', 'ให้ AI เสนอ', function () { openEditor(kind, [], true); }),
            ui.button('', 'พิมพ์เอง', function () { openEditor(kind, [], false); }))]));
        return;
      }
      ui.mount(S.box, head(S).concat([
        h('ol.core-list', {}, items.map(function (c) {
          return h('li', {}, h('strong', { text: c.competency }), h('span.small', { text: c.definition }),
            c.behavioral_indicators ? h('span.muted.small.pre', { text: c.behavioral_indicators }) : null);
        })),
        h('p.muted.small', { text: 'เปลี่ยนเมื่อไรก็ได้ ฟรี · JD ที่สร้างไว้ก่อนจะขึ้นปุ่มให้อัปเดตในหน้า JD (ฟรี)' }),
        h('div.row', {}, ui.button('', 'เปลี่ยน ' + S.title.replace(' ของบริษัท', ''), function () { openEditor(kind, items, false); }))]));
    }

    function openEditor(kind, current, askAi) {
      var S = sets[kind];
      var box = S.box;
      var blank = function () { return { competency: '', definition: '', behavioral_indicators: '', why_it_matters: '' }; };
      // locked = kept by the user (saved, and never touched by "AI เสนอเพิ่ม"); unlocked rows are AI options.
      var rows = current.map(function (c) { return { c: copy(c), locked: true }; });
      var left = null;
      var hint = h('input', { type: 'text', id: kind + '-hint', placeholder: S.hint });
      var aiMsg = h('div');
      var list = h('div.core-rows');
      var count = h('p.small');
      var saveMsg = h('div');
      var leftLine = h('p.muted.small');
      var aiBtn = ui.button('ai-go', rows.length ? 'AI เสนอเพิ่ม' : 'ให้ AI เสนอ', function () { suggest(); });
      var saveBtn = ui.button('primary', 'บันทึก', function () { saveSet(); });
      ui.mount(box, [
        h('h2', { text: S.no + '. ' + S.title }),
        h('p', { text: 'กดปุ่มกุญแจ "เก็บข้อนี้" กับข้อที่ใช่ ' + limitText(kind) + ' ข้อที่เก็บแล้ว AI จะไม่แตะ ส่วนข้อที่ไม่ได้เก็บ จะถูกแทนเมื่อกด "AI เสนอเพิ่ม"' }),
        h('label.field', { for: kind + '-hint' }, 'บริษัทให้ความสำคัญกับอะไร (ไม่บังคับ ช่วยให้ AI เสนอได้ตรงขึ้น)', hint),
        h('div.row', {}, aiBtn, ui.button('', 'พิมพ์เอง', function () { rows.push({ c: blank(), locked: true }); draw(); }, { icon: 'plus' })),
        leftLine, aiMsg, list, count, saveMsg,
        h('div.row.end', {}, ui.button('ghost', 'ยกเลิก', function () { drawSet(kind); }), saveBtn)
      ]);
      draw();
      if (askAi) suggest();
      else if (!rows.length) { rows.push({ c: blank(), locked: true }); draw(); }

      function copy(c) { return { competency: c.competency || '', definition: c.definition || '', behavioral_indicators: c.behavioral_indicators || '', why_it_matters: c.why_it_matters || '' }; }
      function kept() { return rows.filter(function (r) { return r.locked && r.c.competency.trim(); }); }
      function setLeft(n) {
        if (n !== undefined && n !== null) left = n;
        leftLine.textContent = 'ใช้ AI ช่วยได้ฟรีวันละ 5 ครั้งต่อชุด (เสนอเพิ่ม + เขียนทีละข้อ)' + (left === null ? '' : ' · วันนี้เหลือ ' + left + ' ครั้ง');
      }
      setLeft();
      function updateCount() {
        var n = kept().length;
        var L = lim(kind);
        var other = kind === 'core' ? 'Leadership' : 'Core';
        count.textContent = 'เก็บแล้ว ' + n + ' ข้อ' + (n < L.min ? ' · ต้องเก็บอย่างน้อย ' + L.min + ' ข้อ'
          : n > L.max ? ' · ชุดนี้เก็บได้ไม่เกิน ' + L.max + ' ข้อ เอาออก ' + (n - L.max) + ' ข้อก่อนบันทึก' : ' · พร้อมบันทึก') +
          ' · Core + Leadership รวมไม่เกิน ' + L.total + ' ข้อ (' + other + (L.otherSaved ? ' ใช้ไป ' + L.other : ' เผื่อไว้ ' + L.other) + ' ข้อ)';
        count.className = 'small ' + (n >= L.min && n <= L.max ? 'ok-text' : 'muted');
        saveBtn.disabled = n < L.min || n > L.max;
        ui.setLabel(aiBtn, rows.length ? 'AI เสนอเพิ่ม' : 'ให้ AI เสนอ');
      }
      function draw() {
        ui.mount(list, rows.map(function (r) { return rowEl(r); }));
        updateCount();
      }
      function rowEl(r) {
        var row, lockBtn, compare = h('div');
        var touch = function () { if (!r.locked) { r.locked = true; paintLock(); updateCount(); } };
        function paintLock() {
          row.classList.toggle('off', !r.locked);
          ui.setLabel(lockBtn, r.locked ? 'เก็บแล้ว' : 'เก็บข้อนี้');
          lockBtn.setAttribute('aria-pressed', r.locked ? 'true' : 'false');
          lockBtn.className = 'btn small-btn has-icon' + (r.locked ? ' lock-on' : '');
        }
        lockBtn = ui.button('small-btn', '', function () { r.locked = !r.locked; paintLock(); updateCount(); }, { icon: 'lock' });
        var field = function (label, el) { return h('label.mini-field', {}, h('span.muted.small', { text: label }), el); };
        var nameIn = h('input', { type: 'text', value: r.c.competency, placeholder: 'เช่น ' + S.example, oninput: function (e) { r.c.competency = e.target.value; touch(); updateCount(); } });
        var defIn = h('textarea', { rows: '2', oninput: function (e) { r.c.definition = e.target.value; touch(); } }, r.c.definition);
        var behIn = h('textarea', { rows: '4', placeholder: '• ตอบลูกค้าภายในวันเดียวกัน', oninput: function (e) { r.c.behavioral_indicators = e.target.value; touch(); } }, r.c.behavioral_indicators);
        var whyIn = h('input', { type: 'text', value: r.c.why_it_matters, oninput: function (e) { r.c.why_it_matters = e.target.value; touch(); } });
        var writeBtn = ui.button('small-btn.ai-btn', 'AI ช่วยเขียนข้อนี้', function () { write(); });
        row = h('div.core-row', {},
          h('div.row-between', {}, lockBtn, h('div.row', {}, writeBtn,
            ui.button('ghost.small-btn', 'ลบ', function () { rows.splice(rows.indexOf(r), 1); draw(); }))),
          field('ชื่อ', nameIn), field('คำนิยาม', defIn), field('ตัวอย่างพฤติกรรม (บรรทัดละ 1 ข้อ)', behIn),
          field('สำคัญกับบริษัทอย่างไร (ไม่บังคับ)', whyIn), compare);
        paintLock();
        return row;

        function apply(item) {
          r.c.definition = item.definition; r.c.behavioral_indicators = item.behavioral_indicators; r.c.why_it_matters = item.why_it_matters;
          if (item.competency) r.c.competency = item.competency;
          r.locked = true;
          draw();
        }
        function write() {
          if (!r.c.competency.trim()) { ui.mount(compare, ui.note('err', 'ใส่ชื่อก่อน แล้วให้ AI ช่วยเขียน')); return; }
          var hadText = !!(r.c.definition.trim() || r.c.behavioral_indicators.trim());
          ui.mount(compare, h('p.muted.small', {}, h('span.spinner'), ' AI กำลังเขียน…'));
          ui.busy(writeBtn, 'กำลังเขียน…', function () {
            var others = rows.filter(function (x) { return x !== r && x.locked && x.c.competency.trim(); }).map(function (x) { return x.c.competency; });
            return api.call('org.competency.write', { kind: kind, competency: r.c.competency, definition: r.c.definition, others: others }).then(function (res) {
              setLeft(res.left);
              if (!hadText) { apply(res.item); ui.toast('AI เขียนให้แล้ว แก้ต่อได้'); return; }
              ui.mount(compare, h('div.compare-box', {},
                h('strong', { text: 'ข้อความใหม่จาก AI' }),
                h('p.small', { text: res.item.definition }), h('p.small.pre', { text: res.item.behavioral_indicators }),
                h('div.row', {}, ui.button('primary.small-btn', 'ใช้ข้อความใหม่', function () { apply(res.item); }),
                  ui.button('ghost.small-btn', 'เก็บของเดิม', function () { ui.mount(compare, null); }))));
            });
          }).catch(function (e) { ui.mount(compare, ui.note('err', ui.errorText(e))); });
        }
      }
      function suggest() {
        ui.mount(aiMsg, h('p.muted.small', {}, h('span.spinner'), ' AI กำลังคิดจากธุรกิจและเป้าหมายของบริษัท…'));
        ui.busy(aiBtn, 'กำลังเสนอ…', function () {
          var locked = kept().map(function (r) { return { competency: r.c.competency, definition: r.c.definition }; });
          return api.call('org.competency.suggest', { kind: kind, hint: hint.value, locked: locked }).then(function (res) {
            setLeft(res.left);
            // Unlocked options are replaced by the new ones; kept rows stay as they are.
            rows = rows.filter(function (x) { return x.locked && (x.c.competency.trim() || x.c.definition.trim()); });
            var have = rows.map(function (x) { return x.c.competency.trim().toLowerCase(); });
            var added = 0;
            res.items.forEach(function (c) {
              if (have.indexOf(c.competency.trim().toLowerCase()) >= 0) return;
              rows.push({ c: copy(c), locked: false });
              added++;
            });
            ui.mount(aiMsg, ui.note('ok', 'AI เสนอมา ' + added + ' ข้อ' + (locked.length ? ' ที่ไม่ซ้ำกับ ' + locked.length + ' ข้อที่เก็บไว้' : '') + ' กดเก็บข้อที่ใช่'));
            draw();
          });
        }).catch(function (e) { ui.mount(aiMsg, ui.note('err', ui.errorText(e))); });
      }
      function saveSet() {
        var items = kept().map(function (r) { return r.c; });
        ui.busy(saveBtn, 'กำลังบันทึก…', function () {
          return api.call('org.competency.save', { kind: kind, items: items, source: 'user' }).then(function (res) {
            app.setMe(res.me);
            ui.toast(res.bonus ? 'บันทึกแล้ว ได้ +' + res.bonus + ' เครดิต' : 'บันทึกแล้ว');
            drawSet(kind);
          });
        }).catch(function (e) { ui.mount(saveMsg, ui.note('err', ui.errorText(e))); });
      }
    }
  };

  // ---------------- credits ----------------
  var ACTION_LABEL = {
    signup_bonus: 'เครดิตฟรีเมื่อสมัคร', company_profile_bonus: 'โบนัสข้อมูลบริษัท', core_competency_bonus: 'โบนัส Core Competency', jd_duplicate: 'คัดลอก JD ทั้งฉบับ', ai_edit_item: 'AI แก้ทีละข้อ', ai_edit_section: 'AI แก้ทั้งหมวด', leadership_competency_bonus: 'โบนัส Leadership Competency', admin_grant: 'เครดิตจากผู้ดูแลระบบ', jd_silver: 'สร้าง Role Profile',
    jd_gold: 'สร้าง Role Blueprint', refund: 'คืนเครดิต', topup: 'เติมเครดิต', launch_bonus: 'โบนัสเปิดตัว', test: 'ปรับเครดิต'
  };

  window.pages.credits = function (view) {
    var c = app.me.credits;
    var pr = c.pricing || { pricesIncludeVat: true, validMonths: 12, launchBonusPct: 20, launchBonusCustomers: 30, freeBriefPerMonth: 10, freeRegenerations: 2 };
    var hist = h('div.stack', {}, h('p.muted', { text: 'กำลังโหลด…' }));
    ui.mount(view, [
      ui.pageHead('ซื้อเมื่อหมด ไม่มีรายเดือน · เครดิตอายุ ' + pr.validMonths + ' เดือน', 'เครดิต',
        h('div.balance', {}, h('span', { text: 'คงเหลือ' }), h('strong', { text: ui.fmtCredits(c.balance) }), h('span', { text: 'เครดิต' }))),
      pr.launchBonusPct ? h('div.launch', {}, h('strong', { text: 'โปรเปิดตัว แถมเครดิต +' + pr.launchBonusPct + '%' }),
        h('span', { text: 'สำหรับลูกค้า ' + pr.launchBonusCustomers + ' รายแรก เช่น ซื้อ Team 30 เครดิต ได้ ' + Math.round(30 * (1 + pr.launchBonusPct / 100)) + ' เครดิต' })) : null,
      h('div.packs', {}, c.packs.map(function (p) {
        var bonus = Math.round(p.credits * pr.launchBonusPct / 100);
        return h('div.card.pack' + (p.recommended ? '.rec' : ''), {},
          h('div.row-between', {}, h('strong', { text: p.name || p.id }), p.recommended ? h('span.pill', { text: 'คุ้มที่สุดสำหรับทีม' }) : null),
          h('div.pack-num', { text: p.credits + ' เครดิต' }),
          bonus ? h('span.bonus', { text: '+ แถม ' + bonus + ' เครดิต ช่วงเปิดตัว' }) : null,
          h('div.pack-price', { text: p.priceThb.toLocaleString('th-TH') + ' ฿' + (pr.pricesIncludeVat ? '' : ' + VAT') }),
          h('span.muted.small', { text: (pr.pricesIncludeVat ? 'รวม VAT แล้ว · ' : '') + '~' + Math.round(p.priceThb / p.credits) + ' ฿ ต่อเครดิต · Role Blueprint ' + Math.floor(p.credits / c.costs.gold) + ' ฉบับ' }),
          h('button.btn' + (p.recommended ? '.primary' : ''), { type: 'button', disabled: true, text: 'ชำระเงินออนไลน์ เร็ว ๆ นี้' }));
      }).concat([h('div.card.pack', {},
        h('strong', { text: 'Enterprise / ที่ปรึกษา' }),
        h('div.pack-num', { text: 'ตกลงราคา' }),
        h('span.muted.small', { text: 'ทำ JD ทั้งองค์กร 300 ตำแหน่งขึ้นไป พร้อม workshop และ Competency ขององค์กร' }),
        window.RI_CONFIG.contactEmail ? h('a.btn', { href: 'mailto:' + window.RI_CONFIG.contactEmail, text: 'ติดต่อเรา' }) : h('span.muted.small', { text: 'ติดต่อผู้ดูแลระบบเพื่อตกลงราคา' }),
        window.RI_CONFIG.contactEmail ? h('span.muted.small', { text: window.RI_CONFIG.contactEmail }) : null)])),
      ui.note('info', 'ช่วงเปิดตัว ติดต่อเติมเครดิตกับผู้ดูแลระบบได้โดยตรง ระบบชำระเงินออนไลน์และใบกำกับภาษีเต็มรูปจะเปิดในเฟสถัดไป'),
      h('div.grid-2', {},
        h('section.card', {},
          h('h2', { text: 'ใช้เครดิตกับอะไร' }),
          priceRow('Role Brief · ร่างดูบนจอ', 'ฟรี ' + pr.freeBriefPerMonth + ' ครั้ง/เดือน'),
          priceRow('Role Profile · พร้อมสรรหา + ไฟล์ Word', c.costs.silver),
          priceRow('Role Blueprint · ฉบับเต็ม 19 หมวด', c.costs.gold),
          priceRow('อัปเกรด Profile เป็น Blueprint', '+' + (c.costs.gold - c.costs.silver)),
          priceRow('สร้างระดับเดิมใหม่', 'ฟรี ' + pr.freeRegenerations + ' ครั้ง'),
          h('p.muted.small', { text: 'สร้างไม่สำเร็จเพราะระบบขัดข้อง ระบบคืนเครดิตอัตโนมัติ · ซื้อแล้วไม่คืนเงิน' })),
        h('section.card', {}, h('h2', { text: 'ประวัติเครดิต' }), hist))
    ]);
    api.call('credits.history').then(function (rows) {
      ui.mount(hist, rows.length ? rows.map(function (r) {
        return h('div.price-row', {},
          h('span', {}, ACTION_LABEL[r.action] || r.action, h('small.muted.block', { text: (r.note || '') + ' · ' + new Date(r.created_at).toLocaleString('th-TH') })),
          h('strong.' + (r.amount >= 0 ? 'plus' : 'minus'), { text: (r.amount > 0 ? '+' : '') + ui.fmtCredits(r.amount) }));
      }) : h('p.muted', { text: 'ยังไม่มีรายการ' }));
    }, function (e) { ui.mount(hist, ui.note('err', ui.errorText(e))); });

    function priceRow(label, cost) {
      return h('div.price-row', {}, h('span', { text: label }), h('strong', { text: typeof cost === 'number' ? cost + ' เครดิต' : cost }));
    }
  };
})();

/* pages-admin.js – admin pages (admin role only): overview, AI cost, customers and credits, AI settings. */
(function () {
  var h = ui.h;
  window.pages = window.pages || {};
  var TASK_LABEL = {
    full_jd: 'สร้าง JD', ai_edit: 'AI แก้ทีละข้อ / ทั้งหมวด', suggest_chips: 'เสนอตัวเลือก (chips)', org_competency: 'เสนอ Core / Leadership Competency ของบริษัท', quality_check: 'ตรวจคุณภาพ JD ก่อนส่ง'
  };

  function aiSettings(view) {
    // draft = what the admin typed/picked; kept across re-renders so a check never wipes the form.
    var state = { settings: null, provider: 'google', models: [], check: null, busy: false, msg: null, draft: { key: '', model: '', effort: null } };
    var body = h('div.grid-2');
    ui.mount(view, [h('p.muted', { text: 'key เก็บใน Script Properties ไม่อยู่ใน Sheet และไม่ถูกส่งกลับมาที่หน้าเว็บ (เห็นแค่ตัวย่อ)' }), body]);

    api.call('ai.settings.get').then(function (s) {
      state.settings = s;
      if (s.primary) state.provider = s.primary.provider;
      render();
    }, function (e) { ui.mount(body, ui.note('err', ui.errorText(e))); });

    function providerInfo(id) { return state.settings.providers.filter(function (p) { return p.id === id; })[0]; }

    function render() {
      ui.mount(body, [connectionCard(), h('div.stack', {}, currentCard(), routesCard())]);
    }

    function connectionCard() {
      var info = providerInfo(state.provider);
      var radios = state.settings.providers.map(function (p) {
        return h('label.provider', {},
          h('span', {}, h('input', { type: 'radio', name: 'provider', value: p.id, checked: p.id === state.provider, onchange: function () {
            state.provider = p.id; state.models = []; state.check = null; state.msg = null;
            state.draft = { key: '', model: '', effort: null }; render();
          } }), p.label),
          h('small.mono', { text: 'key มักขึ้นต้น ' + p.prefix }));
      });
      var keyInput = h('input.mono', { type: 'password', id: 'api-key', autocomplete: 'off', value: state.draft.key,
        placeholder: info.hasKey ? 'เว้นว่าง = ใช้ key เดิม ' + info.maskedKey : 'วาง API key ของ ' + info.label,
        oninput: function (e) { state.draft.key = e.target.value; } });
      var current = [];
      ['primary', 'fallback'].forEach(function (r) {
        var c = state.settings[r];
        if (c && c.provider === state.provider && current.indexOf(c.model) < 0) current.push(c.model);
      });
      var list = state.models.length ? state.models : (current.length ? current : ['— กดดึงรายชื่อโมเดล —']);
      var isCurrent = function (m) { var c = state.settings.primary; return !!c && c.provider === state.provider && c.model === m; };
      var modelSelect = h('select.mono', { id: 'model', onchange: function (e) { state.draft.model = e.target.value; } },
        list.map(function (m) { return h('option', { value: m, text: m, selected: state.draft.model ? state.draft.model === m : isCurrent(m) }); }));
      var savedEffort = state.settings.primary && state.settings.primary.provider === 'anthropic' ? state.settings.primary.effort : '';
      var effortValue = state.draft.effort === null ? savedEffort : state.draft.effort;
      var effort = state.provider === 'anthropic' ? h('label.field', { for: 'effort' }, 'ระดับการคิด (effort)',
        h('select', { id: 'effort', onchange: function (e) { state.draft.effort = e.target.value; } },
          [['', 'ค่าเริ่มต้นของโมเดล'], ['low', 'low'], ['medium', 'medium'], ['high', 'high']].map(function (o) {
            return h('option', { value: o[0], text: o[1], selected: effortValue === o[0] });
          }))) : null;

      function payload(role) {
        return { provider: state.provider, apiKey: keyInput.value, model: modelSelect.value, effort: effort ? effort.querySelector('select').value : '', role: role };
      }
      function run(btn, fn) {
        ui.busy(btn, 'กำลังตรวจ…', fn).then(render, function (e) { state.msg = { kind: 'err', text: ui.errorText(e) }; render(); });
      }
      var fetchBtn = ui.button('', 'ดึงรายชื่อโมเดล', function () {
        run(fetchBtn, function () {
          return api.call('ai.models.list', { provider: state.provider, apiKey: keyInput.value }).then(function (r) {
            state.models = r.models; state.msg = { kind: 'ok', text: 'ได้รายชื่อ ' + r.models.length + ' โมเดล เลือกตัวที่ต้องการแล้วกดตรวจสอบ' };
          });
        });
      });
      var checkBtn = ui.button('primary', 'ตรวจสอบการเชื่อมต่อ', function () {
        run(checkBtn, function () {
          return api.call('ai.connection.check', payload()).then(function (r) {
            state.check = r; if (r.models && r.models.length) state.models = r.models;
            state.msg = r.ok ? { kind: 'ok', text: 'ผ่าน บันทึกได้' } : { kind: 'err', text: 'ยังบันทึกไม่ได้ แก้ข้อที่ไม่ผ่านก่อน' };
          });
        });
      });
      function saveBtn(role, label) {
        var b = ui.button(role === 'primary' ? 'go' : '', label, function () {
          run(b, function () {
            return api.call('ai.connection.save', payload(role)).then(function (r) {
              state.check = r.check;
              if (r.saved) { state.settings = r.settings; state.draft.key = ''; state.msg = { kind: 'ok', text: role === 'primary' ? 'บันทึกเป็นตัวหลักแล้ว' : 'บันทึกเป็นตัวสำรองแล้ว' }; }
              else state.msg = { kind: 'err', text: 'ไม่ได้บันทึก เพราะการตรวจสอบไม่ผ่าน' };
            });
          });
        });
        return b;
      }
      return h('section.card', { 'aria-labelledby': 'conn-h' },
        h('h2', { id: 'conn-h', text: 'การเชื่อมต่อ' }),
        h('fieldset.providers', {}, h('legend.muted', { text: 'ค่าย AI' }), radios),
        h('label.field', { for: 'api-key' }, 'API key', keyInput),
        h('div.row', {}, h('label.field', { for: 'model', style: 'flex:1 1 220px' }, 'โมเดล', modelSelect), fetchBtn),
        effort,
        h('div.row', {}, checkBtn),
        state.check ? checksList(state.check.checks) : h('p.muted', { text: 'ตรวจ 4 ข้อ: key ตรงค่าย · key ใช้ได้ · โมเดลเปิดให้ key นี้ · ลองสร้าง JSON จริง' }),
        state.msg ? ui.note(state.msg.kind, state.msg.text) : null,
        h('div.row.end', {}, saveBtn('fallback', 'บันทึกเป็นตัวสำรอง'), saveBtn('primary', 'บันทึกเป็นตัวหลัก')));
    }

    function checksList(checks) {
      return h('div.checks', {}, checks.map(function (c) {
        return h('div.check', {},
          h('span.dot.' + c.status, { 'aria-hidden': 'true', text: c.status === 'pass' ? '✓' : c.status === 'warn' ? '?' : '!' }),
          h('div', {}, h('div', { text: c.label }), h('div.muted', { text: c.detail })),
          h('span.status.' + c.status, { text: { pass: 'ผ่าน', warn: 'ตรวจต่อ', fail: 'ไม่ผ่าน' }[c.status] }));
      }));
    }

    function connLine(title, c) {
      return h('div.conn', {}, h('span.muted', { text: title }),
        c ? h('div.row', {}, h('span.pill', { text: providerInfo(c.provider).label }), h('span.mono', { text: c.model + (c.effort ? ' · effort ' + c.effort : '') }))
          : h('span', { text: 'ยังไม่ได้ตั้ง' }));
    }

    function currentCard() {
      return h('section.card', {},
        h('h2', { text: 'ตอนนี้ใช้อะไรอยู่' }),
        connLine('ตัวหลัก', state.settings.primary),
        connLine('ตัวสำรอง (ใช้เมื่อตัวหลักล้มเหลว)', state.settings.fallback),
        h('div.conn', {}, h('span.muted', { text: 'key ที่บันทึกไว้' }),
          h('div.row', {}, state.settings.providers.map(function (p) {
            return h('span.pill' + (p.hasKey ? '' : '.gray'), { text: p.label + ': ' + (p.hasKey ? p.maskedKey : 'ไม่มี') });
          }))));
    }

    function routesCard() {
      var withKey = state.settings.providers.filter(function (p) { return p.hasKey; });
      var rows = state.settings.tasks.map(function (task) {
        var r = state.settings.routes[task] || {};
        var prov = h('select', { 'aria-label': TASK_LABEL[task] + ' ค่าย' },
          [h('option', { value: '', text: 'ใช้ตัวหลัก' })].concat(withKey.map(function (p) { return h('option', { value: p.id, text: p.label, selected: r.provider === p.id }); })));
        var model = h('input.mono', { type: 'text', 'aria-label': TASK_LABEL[task] + ' โมเดล', value: r.model || '', placeholder: 'ชื่อโมเดล' });
        return { task: task, el: h('div.route', {}, h('span', { text: TASK_LABEL[task] }), prov, model), prov: prov, model: model };
      });
      var msg = h('div');
      var save = ui.button('', 'บันทึกการแบ่งงาน', function () {
        var routes = {};
        rows.forEach(function (r) { if (r.prov.value && r.model.value.trim()) routes[r.task] = { provider: r.prov.value, model: r.model.value.trim() }; });
        api.call('ai.routes.save', { routes: routes }).then(function (res) {
          state.settings.routes = res.routes; ui.mount(msg, ui.note('ok', 'บันทึกแล้ว'));
        }, function (e) { ui.mount(msg, ui.note('err', ui.errorText(e))); });
      });
      return h('section.card', {}, h('h2', { text: 'ใช้โมเดลไหนกับงานไหน' }),
        h('p.muted', { text: 'งานเล็กใช้โมเดลถูก งานหลักใช้โมเดลที่เก่งกว่า เว้นว่าง = ใช้ตัวหลัก เลือกได้เฉพาะค่ายที่มี key แล้ว' }),
        rows.map(function (r) { return r.el; }), msg, h('div.row.end', {}, save));
    }
  }

  // ======================= admin home: tabs =======================
  var TABS = [['overview', 'ภาพรวม'], ['cost', 'ค่า AI'], ['customers', 'ลูกค้าและเครดิต'], ['payments', 'การชำระเงิน'], ['followup', 'ผู้ใช้ใหม่ที่ยังไม่เริ่ม'], ['ai', 'ตั้งค่า AI']];
  var KIND_LABEL = { 'new': 'สร้างใหม่', upgrade: 'อัปเกรดจากระดับก่อน', rewrite: 'เขียนใหม่ทั้งฉบับ' };
  var FUNNEL_LABEL = { signup: 'สมัคร', company: 'กรอกข้อมูลบริษัท', firstJd: 'สร้าง JD แรก', paid: 'ซื้อเครดิต' };
  var ACTION_LABEL = { signup_bonus: 'เครดิตฟรีเมื่อสมัคร', company_profile_bonus: 'โบนัสข้อมูลบริษัท', core_competency_bonus: 'โบนัส Core Competency',
    leadership_competency_bonus: 'โบนัส Leadership Competency', admin_grant: 'ผู้ดูแลเพิ่มให้', admin_deduct: 'ผู้ดูแลหักออก', purchase: 'ซื้อเครดิต',
    refund: 'คืนเครดิต', jd_silver: 'สร้าง Role Profile', jd_gold: 'สร้าง Role Blueprint', jd_bronze: 'สร้าง Role Brief', jd_duplicate: 'ทำซ้ำทั้งฉบับ',
    ai_edit_item: 'AI แก้ทีละข้อ', ai_edit_section: 'AI แก้ทั้งหมวด' };
  var period = 30;

  function baht(n) {
    if (n === null || n === undefined) return '–';
    return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ฿';
  }
  function num(n) { return Number(n || 0).toLocaleString('th-TH'); }
  function when(iso) { if (!iso) return '–'; var d = new Date(iso); return isNaN(d) ? '–' : d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }); }
  function table(head, rows, cls) {
    return h('div.table-wrap' + (cls ? '.' + cls : ''), {}, h('table', {},
      h('thead', {}, h('tr', {}, head.map(function (x) { return h('th', { text: x }); }))),
      h('tbody', {}, rows.length ? rows : [h('tr', {}, h('td.muted', { colspan: String(head.length), text: 'ยังไม่มีข้อมูลในช่วงนี้' }))])));
  }
  function stat(label, value, sub, tone) {
    return h('div.stat' + (tone ? '.' + tone : ''), {}, h('span.stat-label', { text: label }), h('strong.stat-value', { text: value }), sub ? h('span.stat-sub', { text: sub }) : null);
  }
  function periodPicker(onChange) {
    var opts = [[7, '7 วัน'], [30, '30 วัน'], [90, '90 วัน'], ['all', 'ทั้งหมด']];
    return h('div.seg', { role: 'group', 'aria-label': 'ช่วงเวลา' }, opts.map(function (o) {
      return h('button.seg-btn' + (period === o[0] ? '.on' : ''), { type: 'button', 'aria-pressed': String(period === o[0]), text: o[1],
        onclick: function () { period = o[0]; onChange(); } });
    }));
  }
  function loading(el) { ui.mount(el, h('p.muted', { text: 'กำลังโหลด…' })); }
  function failed(el, e) { ui.mount(el, ui.note('err', ui.errorText(e))); }

  window.pages.admin = function (view, arg) {
    if (!app.me || app.me.user.role !== 'admin') { ui.mount(view, ui.note('err', 'หน้านี้สำหรับผู้ดูแลระบบเท่านั้น')); return; }
    var tab = TABS.some(function (t) { return t[0] === arg; }) ? arg : 'overview';
    var body = h('div.admin-body');
    ui.mount(view, [
      ui.pageHead('เฉพาะผู้ดูแลระบบ · ลูกค้ามองไม่เห็นหน้านี้', 'ผู้ดูแลระบบ'),
      h('nav.admin-tabs', { 'aria-label': 'ส่วนของหน้าผู้ดูแล' }, TABS.map(function (t) {
        return h('a' + (t[0] === tab ? '.on' : ''), { href: '#admin/' + t[0], text: t[1], 'aria-current': t[0] === tab ? 'page' : null });
      })),
      body]);
    ({ overview: overviewTab, cost: costTab, customers: customersTab, payments: paymentsTab, followup: followupTab, ai: aiSettings })[tab](body);
  };
  window.pages['ai-settings'] = function (view) { window.pages.admin(view, 'ai'); };

  // ---------------- ภาพรวม ----------------
  function overviewTab(el) {
    var out = h('div.stack');
    ui.mount(el, [h('div.row-between', {}, h('p.muted', { text: 'ตัวเลขคำนวณจากข้อมูลจริงทุกครั้งที่เปิด' }), periodPicker(function () { overviewTab(el); })), out]);
    loading(out);
    api.call('admin.overview', { days: period }).then(function (o) {
      var max = Math.max(1, o.funnel[0].count);
      ui.mount(out, [
        o.unpricedModels.length ? ui.note('warn', 'ยังไม่มีราคาของโมเดล ' + o.unpricedModels.join(', ') + ' ค่า AI จึงยังไม่รวมโมเดลนี้ ใส่ราคาได้ที่แท็บค่า AI') : null,
        h('div.stats', {},
          stat('ผู้ใช้ทั้งหมด', num(o.users.total), 'ใหม่วันนี้ ' + num(o.users.today) + ' · 7 วัน ' + num(o.users.week) + ' · 30 วัน ' + num(o.users.month)),
          stat('เข้าใช้ใน 7 วัน', num(o.users.active), o.users.suspended ? 'ถูกระงับ ' + num(o.users.suspended) + ' บัญชี' : 'บริษัททั้งหมด ' + num(o.orgs)),
          stat('JD ที่สร้าง', num(o.jds.total), 'Brief ' + o.jds.byTier.bronze + ' · Profile ' + o.jds.byTier.silver + ' · Blueprint ' + o.jds.byTier.gold),
          stat('ตำแหน่งที่เริ่มทำ', num(o.positions), 'รวมที่ยังไม่ได้สร้าง JD')),
        h('div.stats', {},
          stat('รายได้', baht(o.revenue), o.revenue ? 'จากการซื้อเครดิตที่ชำระแล้ว' : 'ยังไม่มีระบบชำระเงิน', 'green'),
          stat('ค่า AI', baht(o.aiCost), 'ค่าที่จ่ายให้ผู้ให้บริการ AI', 'pink'),
          stat('กำไรขั้นต้น', baht(o.margin), 'รายได้ − ค่า AI (ยังไม่รวมค่าอื่น)'),
          stat('เครดิตที่ลูกค้าถืออยู่', ui.fmtCredits(o.credits.outstanding), 'แจกฟรี ' + ui.fmtCredits(o.credits.given) + ' · ขาย ' + ui.fmtCredits(o.credits.bought) + ' · ใช้ไป ' + ui.fmtCredits(o.credits.used))),
        h('section.card', {},
          h('h2', { text: 'ลูกค้าใหม่ไปถึงขั้นไหน' }),
          h('p.muted', { text: 'นับเฉพาะคนที่สมัครในช่วงเวลาที่เลือก ช่วยให้เห็นว่าคนหลุดตรงไหน' }),
          h('ol.funnel', {}, o.funnel.map(function (f, i) {
            var pct = Math.round(f.count / max * 100);
            return h('li', {},
              h('span.funnel-label', { text: FUNNEL_LABEL[f.step] }),
              h('span.funnel-bar', { 'aria-hidden': 'true' }, h('span', { style: 'width:' + pct + '%' })),
              h('span.funnel-num', { text: num(f.count) + (i ? ' · ' + pct + '%' : '') }));
          })))
      ]);
    }, function (e) { failed(out, e); });
  }

  // ---------------- ค่า AI ----------------
  function costTab(el) {
    var out = h('div.stack');
    ui.mount(el, [h('div.row-between', {}, h('p.muted', { text: 'คิดจากจำนวน token ที่บันทึกทุกครั้งที่เรียก AI × ราคาโมเดลด้านล่าง' }), periodPicker(function () { costTab(el); })), out]);
    loading(out);
    api.call('admin.aiCost', { days: period }).then(function (r) { renderCost(out, r, el); }, function (e) { failed(out, e); });
  }

  function renderCost(out, r, el) {
    var rate = r.bahtPerCredit;
    var perJd = h('section.card', {},
      h('h2', { text: 'ต้นทุน AI ต่อ JD หนึ่งฉบับ' }),
      h('p.muted', { text: 'ตัวเลือกคำตอบ (เฉลี่ยต่อตำแหน่ง) + เขียน JD ครั้งแรกที่ระดับนั้น เทียบกับรายได้จากเครดิต (คิดราคาต่อเครดิตต่ำสุด ' + baht(rate.value) + ' จากแพ็ก ' + rate.pack + ' ไม่รวม VAT)' }),
      table(['ระดับ', 'ตัวเลือกคำตอบ', 'เขียน JD', 'รวมต่อ JD', 'เครดิต', 'รายได้', 'เหลือหลังหักค่า AI'], r.perJd.map(function (x) {
        var left = x.total === null ? null : x.revenue - x.total;
        return h('tr', {}, h('td', {}, ui.tierPill(x.tier)), h('td', { text: baht(x.chips) }), h('td', { text: x.write === null ? 'ยังไม่มีข้อมูล' : baht(x.write) }),
          h('td', {}, h('strong', { text: x.total === null ? '–' : baht(x.total) })), h('td', { text: x.credits ? ui.fmtCredits(x.credits) : 'ฟรี' }),
          h('td', { text: baht(x.revenue) }), h('td' + (left !== null && left < 0 ? '.neg' : ''), { text: left === null ? '–' : baht(left) }));
      })),
      h('p.small.muted', { text: 'ตัวเลือกคำตอบเฉลี่ย ' + baht(r.chipsPerPosition) + ' ต่อตำแหน่ง (' + num(r.positions) + ' ตำแหน่งในช่วงนี้) · Role Brief ฟรีจึงเป็นต้นทุนทั้งหมด' }));

    var gens = h('section.card', {},
      h('h2', { text: 'การสร้าง JD แยกระดับและแบบ' }),
      table(['ระดับ', 'แบบ', 'ครั้ง', 'ค่า AI เฉลี่ย', 'เวลาเฉลี่ย', 'เครดิตเฉลี่ย', 'เหลือต่อครั้ง'], r.generations.map(function (g) {
        return h('tr', {}, h('td', {}, ui.tierPill(g.tier)), h('td', { text: KIND_LABEL[g.kind] || g.kind }), h('td', { text: num(g.count) }),
          h('td', { text: baht(g.avgCost) }), h('td', { text: g.avgSeconds + ' วิ' }), h('td', { text: ui.fmtCredits(g.avgCredits) }),
          h('td' + (g.margin < 0 ? '.neg' : ''), { text: baht(g.margin) }));
      })),
      h('p.small.muted', { text: 'เขียนใหม่ทั้งฉบับ 2 ครั้งแรกของแต่ละระดับไม่คิดเครดิต จึงอาจติดลบได้' }));

    var tasks = h('section.card', {},
      h('h2', { text: 'แยกตามงาน' }),
      table(['งาน', 'ครั้ง', 'ล้มเหลว', 'ค่า AI รวม', 'ต่อครั้ง', 'เวลาเฉลี่ย', 'token เข้า / ออก'], r.tasks.map(function (t) {
        return h('tr', {}, h('td', { text: TASK_LABEL[t.task] || t.task }), h('td', { text: num(t.calls) }), h('td' + (t.failed ? '.neg' : ''), { text: num(t.failed) }),
          h('td', { text: baht(t.cost) }), h('td', { text: baht(t.perCall) }), h('td', { text: t.avgSeconds + ' วิ' }),
          h('td.mono', { text: num(t.inTokens) + ' / ' + num(t.outTokens) }));
      })));

    var maxDay = Math.max.apply(null, [0.01].concat(r.daily.map(function (d) { return d.cost; })));
    var daily = h('section.card', {},
      h('div.row-between', {}, h('h2', { text: 'ค่า AI รายวัน' }), h('strong', { text: 'รวม ' + baht(r.total) })),
      r.daily.length ? h('div.daybars', { role: 'img', 'aria-label': 'กราฟค่า AI รายวัน' }, r.daily.map(function (d) {
        return h('div.daybar', { title: d.day + ' · ' + baht(d.cost) },
          h('span.daybar-fill', { style: 'height:' + Math.max(2, Math.round(d.cost / maxDay * 100)) + '%' }),
          h('span.daybar-label', { text: d.day.slice(8) + '/' + d.day.slice(5, 7) }));
      })) : h('p.muted', { text: 'ยังไม่มีการเรียก AI ในช่วงนี้' }),
      h('p.small.muted', { text: 'เรียก AI ' + num(r.calls) + ' ครั้ง ล้มเหลว ' + num(r.failed) + ' ครั้ง (ครั้งที่ล้มเหลวมักไม่มีค่าใช้จ่าย)' }));

    ui.mount(out, [
      r.unpricedModels.length ? ui.note('warn', 'ยังไม่มีราคาของ ' + r.unpricedModels.join(', ') + ' ตัวเลขด้านล่างจึงยังไม่รวมโมเดลนี้') : null,
      perJd, daily, gens, tasks, pricesCard(r, el)]);
  }

  var PROV_LABEL = { anthropic: 'Anthropic Claude', openai: 'OpenAI', google: 'Google Gemini' };
  var SOURCE_LABEL = { litellm: 'ราคาตรงจากผู้ให้บริการ', openrouter: 'ราคาผ่าน OpenRouter (อาจต่างจากราคาตรง)', 'default': 'ค่าเริ่มต้นในระบบ' };

  function pricesCard(r, el) {
    var P = r.prices;
    var inUse = {};
    r.modelsSeen.forEach(function (m) { inUse[m] = true; });
    var groups = {};
    Object.keys(P.models).forEach(function (m) {
      var x = P.models[m];
      var prov = x.provider || 'other';
      var isNew = Object.keys(P.featured || {}).some(function (k) { return (P.featured[k] || []).indexOf(m) >= 0; });
      if (!isNew && !inUse[m]) return; // only what is newest or what this system uses
      (groups[prov] = groups[prov] || []).push(m);
    });
    r.unpricedModels.forEach(function (m) { (groups.other = groups.other || []).push(m); });
    var rows = [];
    ['anthropic', 'openai', 'google', 'other'].forEach(function (prov) {
      if (!groups[prov]) return;
      rows.push(h('tr.group-row', {}, h('td', { colspan: '4' }, h('strong', { text: PROV_LABEL[prov] || 'อื่น ๆ' }))));
      groups[prov].sort().forEach(function (m) {
        var x = P.models[m];
        rows.push(h('tr', {},
          h('td', {}, h('span.mono', { text: m }), inUse[m] ? h('span.pill', { text: 'ใช้อยู่' }) : null),
          h('td.mono', { text: x ? '$' + x['in'] : '–' }),
          h('td.mono', { text: x ? '$' + x.out : '–' }),
          h('td.small', { text: x ? (SOURCE_LABEL[x.source] || x.source) : 'ยังหาราคาไม่ได้' })));
      });
    });
    var refresh = ui.button('small-btn', 'อัปเดตราคาตอนนี้', function () {
      ui.busy(refresh, 'กำลังดึงราคา…', function () {
        return api.call('admin.prices.refresh', { days: period }).then(function (res) {
          renderCost(el.querySelector('.stack'), res, el);
          ui.toast(res.prices.errors && res.prices.errors.length ? 'ดึงได้บางส่วน: ' + res.prices.errors.join(', ') : 'อัปเดตราคาแล้ว คำนวณใหม่ให้แล้ว');
        });
      }).catch(function (e) { ui.toast(ui.errorText(e), 'err'); });
    }, { icon: 'history' });
    return h('section.card', {},
      h('div.row-between', {}, h('h2', { text: 'ราคาโมเดล' }), refresh),
      h('p.muted', { text: 'ระบบดึงราคาเองทุก 7 วัน: รุ่นใหม่ล่าสุดของแต่ละค่ายที่ใช้สร้างข้อความได้ และทุกรุ่นที่ระบบนี้ใช้อยู่ หน่วยเป็นดอลลาร์ต่อ 1 ล้าน token (การคิดของ AI นับเป็น output)' }),
      h('div.stats', {},
        stat('อัตราแลกเปลี่ยน', '1 $ = ' + Number(P.usdThb).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' ฿', P.fx ? 'จาก ' + P.fx.source : 'ค่าเริ่มต้น (ยังดึงไม่ได้)'),
        stat('ดึงราคาล่าสุด', P.fetched_at ? new Date(P.fetched_at).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : 'ยังไม่เคย',
          (P.fetched_at ? 'เวลา ' + new Date(P.fetched_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น. · ' : '') +
          (P.errors && P.errors.length ? 'ไม่สำเร็จบางแหล่ง: ' + P.errors.join(', ') : 'ราคาตรงจากรายการราคา LiteLLM · รุ่นใหม่จาก OpenRouter'))),
      table(['โมเดล', 'input', 'output', 'ที่มาของราคา'], rows, 'prices'));
  }

  // ---------------- ลูกค้าและเครดิต ----------------
  function customersTab(el) {
    var list = h('div.stack');
    var q = h('input', { type: 'search', placeholder: 'ค้นหาด้วยอีเมลหรือชื่อบริษัท', 'aria-label': 'ค้นหาลูกค้า' });
    var search = ui.debounce(function () { load(); }, 350);
    q.addEventListener('input', search);
    ui.mount(el, [h('div.row', {}, q), list]);
    function load() {
      loading(list);
      api.call('admin.orgs', { q: q.value }).then(function (r) {
        ui.mount(list, [
          h('p.muted', { text: 'พบ ' + num(r.total) + ' บริษัท' + (r.total > r.rows.length ? ' แสดง ' + r.rows.length + ' รายการล่าสุด' : '') + ' · ไม่แสดงเนื้อหา JD ของลูกค้า' }),
          table(['บริษัท', 'ผู้ใช้', 'เครดิต', 'ตำแหน่ง / JD', 'ใช้ล่าสุด', ''], r.rows.map(row), 'customers')]);
      }, function (e) { failed(list, e); });
    }
    function row(o) {
      var users = h('div.stack-tight', {}, o.users.map(function (u) {
        var off = u.status !== 'active';
        var who = [u.name && u.name !== u.email.split('@')[0] ? u.name : '', u.job_title, u.phone].filter(Boolean).join(' · ');
        return h('div.user-line', {},
          h('span' + (off ? '.struck' : ''), { text: u.email }),
          who ? h('span.small.muted.block', { text: who }) : null,
          u.deleteRequestedAt ? h('span.pill.del-pill', { text: 'ขอลบบัญชี ' + new Date(u.deleteRequestedAt).toLocaleDateString('th-TH'), title: u.deleteReason || '' }) : null,
          u.role === 'admin' ? h('span.pill', { text: 'admin' }) : null,
          off ? h('span.pill.gray', { text: 'ถูกระงับ' }) : null,
          u.role === 'admin' ? null : ui.button('small-btn' + (off ? '' : '.danger'), off ? 'เปิดใช้บัญชี' : 'ระงับบัญชี', function () { toggleUser(u, off); }, { icon: off ? 'check' : 'lock' }));
      }));
      return h('tr', {},
        h('td', {}, h('strong', { text: o.name || '(ยังไม่ตั้งชื่อ)' }), o.business_type ? h('div.small.muted', { text: o.business_type }) : null),
        h('td', {}, users),
        h('td', {}, h('strong.credit-cell', { text: ui.fmtCredits(o.balance) })),
        h('td', { text: num(o.positions) + ' / ' + num(o.jds) }),
        h('td.small', { text: when(o.last_login_at) }),
        h('td', {}, h('div.row-tight', {},
          ui.button('small-btn', 'ปรับเครดิต', function () { adjust(o); }, { icon: 'credits' }),
          ui.button('ghost.small-btn', 'ประวัติ', function () { ledger(o); }, { icon: 'history' }),
          o.jds ? ui.button('ghost.small-btn', 'ใช้เป็น JD ตัวอย่าง', function () { pickSample(o); }, { icon: 'jds' }) : null)));
    }
    function adjust(o) {
      var amount = h('input.mono', { type: 'number', step: '0.5', id: 'adj-amount', placeholder: 'เช่น 10 หรือ -2' });
      var reason = h('input', { type: 'text', id: 'adj-reason', maxlength: '200', placeholder: 'เช่น ให้ลองใช้งาน, ชดเชยระบบขัดข้อง' });
      var body = h('div.stack', {},
        h('p', { text: (o.name || o.users.map(function (u) { return u.email; }).join(', ')) + ' · ตอนนี้มี ' + ui.fmtCredits(o.balance) + ' เครดิต' }),
        h('label.field', { for: 'adj-amount' }, 'จำนวน (ใส่ลบเพื่อหัก)', amount),
        h('label.field', { for: 'adj-reason' }, 'เหตุผล (บันทึกไว้ในประวัติ แก้ทีหลังไม่ได้)', reason));
      ui.confirmBox('ปรับเครดิต', body, 'บันทึก').then(function (yes) {
        if (!yes) return;
        api.call('admin.credits.adjust', { orgId: o.id, amount: Number(amount.value), reason: reason.value }).then(function (r) {
          ui.toast('บันทึกแล้ว เหลือ ' + ui.fmtCredits(r.balance) + ' เครดิต');
          if (app.me.org.id === o.id) app.refreshMe();
          load();
        }, function (e) { ui.toast(ui.errorText(e), 'err'); });
      });
    }
    function ledger(o) {
      api.call('admin.org.ledger', { orgId: o.id }).then(function (rows) {
        var body = table(['วันที่', 'รายการ', 'เครดิต', 'หมายเหตุ'], rows.map(function (r) {
          return h('tr', {}, h('td.small', { text: when(r.created_at) }), h('td', { text: ACTION_LABEL[r.action] || r.action }),
            h('td.mono' + (r.amount < 0 ? '.neg' : '.pos'), { text: (r.amount > 0 ? '+' : '') + ui.fmtCredits(r.amount) }), h('td.small', { text: r.note || '' }));
        }), 'ledger');
        ui.confirmBox('ประวัติเครดิต · ' + (o.name || o.users[0] && o.users[0].email || ''), body, 'ปิด');
      }, function (e) { ui.toast(ui.errorText(e), 'err'); });
    }
    function pickSample(o) {
      api.call('admin.org.positions', { orgId: o.id }).then(function (list) {
        var chosen = null;
        var body = h('div.stack', {},
          h('p', { text: 'เลือก JD ที่จะแสดงเป็นตัวอย่างให้ผู้ใช้ทุกคน ระบบจะคัดลอกฉบับล่าสุดไปเก็บไว้ (ถ้าเจ้าของแก้ภายหลัง ตัวอย่างไม่เปลี่ยน) และเอาชื่อบริษัทออก' }),
          h('div.stack-tight', {}, list.map(function (x) {
            return h('label.provider', {}, h('span', {}, h('input', { type: 'radio', name: 'sample-pick', value: x.id, onchange: function () { chosen = x; } }),
              ' ' + (x.code ? x.code + ' · ' : '') + x.title), h('small', {}, ui.tierPill(x.tier), ' Rev. ' + x.version));
          })),
          h('p.small.muted', { text: 'ควรขออนุญาตเจ้าของ JD ก่อน ถ้าไม่ใช่บัญชีของคุณเอง' }));
        ui.confirmBox('ใช้เป็น JD ตัวอย่าง · ' + (o.name || o.users[0].email), body, 'ใช้ JD นี้').then(function (yes) {
          if (!yes) return;
          if (!chosen) { ui.toast('ยังไม่ได้เลือก JD', 'err'); return; }
          api.call('admin.sample.set', { positionId: chosen.id }).then(function () {
            ui.toast('ตั้งเป็นตัวอย่างแล้ว ผู้ใช้ทุกคนเห็นได้ที่ "ดูตัวอย่าง JD"');
            app.me.hasSample = true;
          }, function (e) { ui.toast(ui.errorText(e), 'err'); });
        });
      }, function (e) { ui.toast(ui.errorText(e), 'err'); });
    }
    function toggleUser(u, isOff) {
      var title = isOff ? 'เปิดใช้บัญชีนี้อีกครั้ง?' : 'ระงับบัญชีนี้?';
      var text = isOff ? u.email + ' จะเข้าระบบได้ตามปกติ' : u.email + ' จะถูกออกจากระบบทันทีและเข้าระบบไม่ได้ ข้อมูลและเครดิตยังอยู่ครบ เปิดใช้ใหม่ได้ภายหลัง';
      ui.confirmBox(title, text, isOff ? 'เปิดใช้' : 'ระงับบัญชี').then(function (yes) {
        if (!yes) return;
        api.call('admin.user.status', { userId: u.id, suspend: !isOff }).then(function () { ui.toast(isOff ? 'เปิดใช้แล้ว' : 'ระงับแล้ว'); load(); },
          function (e) { ui.toast(ui.errorText(e), 'err'); });
      });
    }
    load();
  }

  // ---------------- ผู้ใช้ใหม่ที่ยังไม่เริ่ม ----------------
  var STAGE_LABEL = { company: 'ยังไม่กรอกข้อมูลบริษัท', firstJd: 'กรอกบริษัทแล้ว ยังไม่เริ่ม JD', answering: 'ตอบคำถามค้างไว้ ยังไม่กดสร้าง' };
  var REMIND_LABEL = { r1: 'ฉบับ 1', r2: 'ฉบับ 2', r3: 'ฉบับ 3' };

  function followupTab(el) {
    var out = h('div.stack');
    ui.mount(el, out);
    loading(out);
    api.call('admin.dormant').then(function (d) { renderFollowup(out, d); }, function (e) { failed(out, e); });
  }

  function renderFollowup(out, d) {
    var toggle = ui.button(d.enabled ? '' : 'go', d.enabled ? 'ปิดอีเมลเตือน' : 'เปิดอีเมลเตือนอัตโนมัติ', function () {
      var on = !d.enabled;
      ui.confirmBox(on ? 'เปิดอีเมลเตือนอัตโนมัติ?' : 'ปิดอีเมลเตือน?',
        on ? 'ระบบจะส่งอีเมลถึงผู้ใช้จริงที่สมัครแล้วยังไม่ได้สร้าง JD วันละรอบ (ตอนมีคนเข้าใช้ระบบครั้งแรกของวัน) คนละไม่เกิน 3 ฉบับ ตอนนี้มีคนที่ถึงกำหนด ' + d.dueNow + ' คน'
          : 'จะไม่มีอีเมลเตือนออกไปอีกจนกว่าจะเปิดใหม่', on ? 'เปิดและเริ่มส่ง' : 'ปิด').then(function (yes) {
        if (!yes) return;
        api.call('admin.reminders.set', { enabled: on }).then(function (nd) { renderFollowup(out, nd); ui.toast(on ? 'เปิดแล้ว' : 'ปิดแล้ว'); },
          function (e) { ui.toast(ui.errorText(e), 'err'); });
      });
    }, { icon: d.enabled ? 'lock' : 'check' });
    var runBtn = d.enabled && d.dueNow ? ui.button('small-btn', 'ส่งรอบนี้เลย (' + d.dueNow + ' คน)', function () {
      ui.busy(runBtn, 'กำลังส่ง…', function () {
        return api.call('admin.reminders.run').then(function (nd) { renderFollowup(out, nd); ui.toast('ส่งแล้ว ' + nd.justSent.sent + ' ฉบับ'); });
      }).catch(function (e) { ui.toast(ui.errorText(e), 'err'); });
    }) : null;

    var status = h('section.card', {},
      h('div.row-between', {}, h('div', {}, h('h2', { text: 'อีเมลเตือนอัตโนมัติ' }),
        h('span.pill' + (d.enabled ? '' : '.gray'), { text: d.enabled ? 'เปิดอยู่' : 'ปิดอยู่' })), h('div.row', {}, runBtn, toggle)),
      h('p.muted', { text: 'ส่งเฉพาะคนที่สมัครแล้วยังไม่มี JD: ฉบับ 1 วันที่ 1 · ฉบับ 2 วันที่ 3 · ฉบับ 3 วันที่ 7 (ห่างกันอย่างน้อย 2 วัน) หยุดทันทีเมื่อเขาสร้าง JD หรือกดเลิกรับ ไม่ส่งถึงคนที่สมัครเกิน 30 วัน ผู้รับตอบกลับได้ อีเมลตอบกลับจะเข้ากล่องของบัญชีที่ระบบใช้ส่ง' }),
      d.lastRun ? h('p.small.muted', { text: 'ส่งรอบล่าสุด ' + when(d.lastRun) + ' · ' + (d.lastResult ? d.lastResult.sent + ' ฉบับ' + (d.lastResult.errors ? ' · ส่งไม่สำเร็จ ' + d.lastResult.errors : '') : '') }) : null,
      h('details.mail-preview', {}, h('summary', { text: 'ดูข้อความทั้ง 3 ฉบับ' }),
        h('div.stack', {}, d.templates.map(function (t) {
          var frame = h('div.mail-body');
          frame.innerHTML = t.html; // our own template from the backend
          return h('div.mail-card', {}, h('div.small.muted', { text: REMIND_LABEL[t.key] + ' · วันที่ ' + t.days }), h('strong', { text: t.subject }), frame);
        }))));

    var rows = d.rows.map(function (r) {
      return h('tr', {},
        h('td', {}, h('span' + (r.status !== 'active' ? '.struck' : ''), { text: r.email })),
        h('td.small', { text: when(r.created_at) + ' · ' + r.days + ' วันก่อน' }),
        h('td', { text: STAGE_LABEL[r.stage] || r.stage }),
        h('td.small', { text: r.sent.length ? r.sent.map(function (x) { return REMIND_LABEL[x.key]; }).join(', ') : '–' }),
        h('td.small', { text: r.unsubscribed ? 'เลิกรับแล้ว' : r.status !== 'active' ? 'ถูกระงับ' : !r.next ? 'ครบแล้ว' : r.next.due ? 'ถึงกำหนด ' + REMIND_LABEL[r.next.key] : 'รอ ' + REMIND_LABEL[r.next.key] }));
    });
    var counts = {};
    d.rows.forEach(function (r) { counts[r.stage] = (counts[r.stage] || 0) + 1; });

    var sample = h('section.card', {},
      h('h2', { text: 'JD ตัวอย่างที่ผู้ใช้เห็น' }),
      d.sample ? h('p', {}, 'ตอนนี้ใช้ ', h('strong', { text: (d.sample.from.code ? d.sample.from.code + ' · ' : '') + d.sample.title }), ' ', ui.tierPill(d.sample.tier),
        ' Rev. ' + d.sample.from.version + ' (ตั้งเมื่อ ' + when(d.sample.set_at) + ')') : h('p.muted', { text: 'ยังไม่ได้ตั้ง เลือกได้จากแท็บลูกค้าและเครดิต ปุ่ม "ใช้เป็น JD ตัวอย่าง"' }),
      h('p.small.muted', { text: 'ผู้ใช้เห็นปุ่ม "ดูตัวอย่าง JD" ในหน้าต้อนรับ หน้าสร้าง JD และหน้า JD ของฉันตอนที่ยังไม่มี JD' }),
      d.sample ? h('div.row', {}, h('a.btn.small-btn', { href: '#sample', target: '_blank', text: 'เปิดดูตัวอย่าง' }),
        ui.button('ghost.small-btn.danger', 'เลิกใช้ตัวอย่างนี้', function () {
          ui.confirmBox('เลิกใช้ JD ตัวอย่าง?', 'ผู้ใช้จะไม่เห็นปุ่มดูตัวอย่างจนกว่าจะตั้งใหม่', 'เลิกใช้').then(function (yes) {
            if (!yes) return;
            api.call('admin.sample.clear').then(function () { app.me.hasSample = false; followupTab(out.parentNode); }, function (e) { ui.toast(ui.errorText(e), 'err'); });
          });
        })) : null);

    ui.mount(out, [
      h('div.stats', {},
        stat('สมัครแล้วยังไม่มี JD', num(d.rows.length), ''),
        stat('ยังไม่กรอกบริษัท', num(counts.company || 0), ''),
        stat('กรอกบริษัทแล้ว ยังไม่เริ่ม', num(counts.firstJd || 0), ''),
        stat('ตอบค้างไว้', num(counts.answering || 0), '')),
      status,
      h('section.card', {}, h('h2', { text: 'รายชื่อ' }),
        h('p.muted', { text: 'คนที่ค้างนาน ลองโทรหรือทักไปถามตรง ๆ ได้ผลกว่าอีเมล และได้รู้ว่าติดตรงไหน' }),
        table(['อีเมล', 'สมัครเมื่อ', 'ค้างที่', 'อีเมลที่ส่งแล้ว', 'ฉบับถัดไป'], rows, 'customers')),
      sample]);
  }

  // ---------------- การชำระเงิน ----------------
  function paymentsTab(el) {
    var settingsBox = h('div');
    var listBox = h('div.stack');
    ui.mount(el, [listBox, settingsBox]);
    api.call('admin.pay.settings').then(function (s) { drawSettings(s); }, function (e) { failed(settingsBox, e); });
    loadList();

    function drawSettings(s) {
      var b = s.bank || {};
      var f = {
        bankName: h('input', { type: 'text', id: 'ps-bank', value: b.bankName || '', placeholder: 'ธนาคารไทยพาณิชย์' }),
        branch: h('input', { type: 'text', id: 'ps-branch', value: b.branch || '', placeholder: 'สาขา' }),
        accountName: h('input', { type: 'text', id: 'ps-name', value: b.accountName || '', placeholder: 'บริษัท … จำกัด' }),
        accountNo: h('input', { type: 'text', id: 'ps-no', value: b.accountNo || '', placeholder: '000-000000-0', inputmode: 'numeric' }),
        promptpay: h('input', { type: 'text', id: 'ps-pp', value: s.promptpayId || '', placeholder: 'ไม่บังคับ: เลขผู้เสียภาษีหรือเบอร์ที่ผูก PromptPay' }),
        notify: h('input', { type: 'text', id: 'ps-notify', value: (s.notifyEmails || []).join(', '), placeholder: 'เว้นว่าง = อีเมลผู้ดูแลระบบ' })
      };
      var enabled = h('input', { type: 'checkbox', id: 'ps-on', checked: !!s.enabled });
      var whtOn = h('input', { type: 'checkbox', id: 'ps-wht', checked: !!s.whtEnabled });
      var msg = h('div');
      var save = ui.button('primary', 'บันทึก', function () {
        var payload = { enabled: enabled.checked, whtEnabled: whtOn.checked, promptpayId: f.promptpay.value,
          notifyEmails: f.notify.value.split(/[,\s]+/).filter(Boolean),
          bank: { bankName: f.bankName.value, branch: f.branch.value, accountName: f.accountName.value, accountNo: f.accountNo.value } };
        var run = function () {
          ui.busy(save, 'กำลังบันทึก…', function () {
            return api.call('admin.pay.settings.save', payload).then(function (ns) { ui.toast('บันทึกแล้ว'); drawSettings(ns); });
          }).catch(function (e) { ui.mount(msg, ui.note('err', ui.errorText(e))); });
        };
        if (payload.enabled && !s.enabled) {
          ui.confirmBox('เปิดรับชำระเงิน?', 'ลูกค้าจะเห็นปุ่ม "ซื้อแพ็กนี้" และเลขบัญชี ' + payload.bank.accountNo + ' ทันที ตรวจเลขบัญชีให้ถูกก่อน', 'เปิดรับชำระเงิน').then(function (yes) { if (yes) run(); });
        } else run();
      });
      ui.mount(settingsBox, h('section.card', { 'aria-labelledby': 'ps-h' },
        h('div.row-between', {}, h('h2', { id: 'ps-h', text: 'บัญชีรับเงินและการตั้งค่า' }), h('span.pill' + (s.enabled ? '' : '.gray'), { text: s.enabled ? 'เปิดรับชำระเงินอยู่' : 'ยังไม่เปิด' })),
        h('p.muted', { text: 'ข้อมูลนี้เก็บในการตั้งค่าของระบบ ลูกค้าเห็นเลขบัญชีเฉพาะตอนสั่งซื้อ' }),
        h('div.form-grid', {},
          h('label.field', { for: 'ps-bank' }, 'ธนาคาร', f.bankName), h('label.field', { for: 'ps-branch' }, 'สาขา', f.branch),
          h('label.field', { for: 'ps-name' }, 'ชื่อบัญชี', f.accountName), h('label.field', { for: 'ps-no' }, 'เลขที่บัญชี', f.accountNo),
          h('label.field', { for: 'ps-pp' }, 'PromptPay (ไม่บังคับ)', f.promptpay), h('label.field', { for: 'ps-notify' }, 'อีเมลรับแจ้งเตือนสลิปใหม่', f.notify)),
        h('label.check-line', { for: 'ps-wht' }, whtOn, h('span', {}, h('strong', { text: 'ให้ลูกค้านิติบุคคลเลือกหักภาษี ณ ที่จ่าย 3% ได้' }),
          h('span.small.muted.block', { text: 'ลูกค้าโอนยอดหลังหัก และต้องแนบ 50 ทวิ · ปิดได้ถ้าผู้ทำบัญชีบอกว่าไม่ต้องหัก' }))),
        h('label.check-line', { for: 'ps-on' }, enabled, h('span', {}, h('strong', { text: 'เปิดรับชำระเงิน' }),
          h('span.small.muted.block', { text: 'ลูกค้าเห็นปุ่มซื้อในหน้าเครดิต' }))),
        msg, h('div.row.end', {}, save)));
    }

    function loadList() {
      loading(listBox);
      api.call('admin.payments').then(function (r) {
        var rows = r.rows.map(function (o) {
          var b = o.billing || {};
          return h('tr', {},
            h('td', {}, h('strong.mono', { text: o.ref }), h('div.small.muted', { text: when(o.created_at) })),
            h('td', {}, h('div', { text: o.email }), h('div.small.muted', { text: (b.name || '') + (b.taxId ? ' · ' + b.taxId : '') + (b.branch ? ' · ' + b.branch : '') })),
            h('td', {}, h('div', { text: o.credits + (o.bonusCredits ? ' + ' + o.bonusCredits : '') + ' เครดิต' }),
              h('div.small.muted', { text: 'รวม ' + baht(o.total) + (o.whtThb ? ' · หัก ณ ที่จ่าย ' + baht(o.whtThb) : '') })),
            h('td', {}, h('strong', { text: baht(o.amountDue) })),
            h('td', {}, window.pay.statusTag(o.status), o.note ? h('div.small.muted', { text: o.note }) : null),
            h('td', {}, h('div.row-tight', {},
              o.hasSlip ? ui.button('ghost.small-btn', 'ดูสลิป', function () { showFile(o, 'slip'); }) : null,
              o.hasWhtCert ? ui.button('ghost.small-btn', 'ดู 50 ทวิ', function () { showFile(o, 'whtCert'); }) : null,
              o.status === 'awaiting_review' || o.status === 'awaiting_transfer' ? ui.button('small-btn.go', 'ยืนยันรับเงิน', function () { confirmPay(o); }) : null,
              o.status === 'awaiting_review' || o.status === 'awaiting_transfer' ? ui.button('ghost.small-btn.danger', 'ไม่ผ่าน', function () { rejectPay(o); }) : null)));
        });
        ui.mount(listBox, [
          r.waiting ? ui.note('info', 'มีสลิปรอตรวจ ' + r.waiting + ' รายการ') : null,
          h('section.card', {}, h('h2', { text: 'คำสั่งซื้อ' }),
            table(['เลขอ้างอิง', 'ผู้ซื้อ / ออกใบกำกับในนาม', 'แพ็ก', 'ยอดโอน', 'สถานะ', ''], rows, 'customers'),
            h('p.small.muted', { text: 'ตรวจยอดในบัญชีธนาคารให้ตรงก่อนกดยืนยัน เครดิตเข้าทันทีและยกเลิกเองไม่ได้ (ปรับคืนได้ที่แท็บลูกค้าและเครดิต)' }))]);
      }, function (e) { failed(listBox, e); });
    }

    function showFile(o, which) {
      api.call('admin.payment.file', { id: o.id, which: which }).then(function (f) {
        var src = 'data:' + f.mimeType + ';base64,' + f.base64;
        var body = f.mimeType === 'application/pdf' ? h('iframe.file-view', { src: src, title: 'ไฟล์แนบ' }) : h('img.file-view', { src: src, alt: which === 'slip' ? 'สลิปการโอน' : 'หนังสือรับรองการหักภาษี' });
        ui.confirmBox((which === 'slip' ? 'สลิป ' : '50 ทวิ ') + o.ref + ' · ยอดที่ต้องได้ ' + baht(o.amountDue), body, 'ปิด');
      }, function (e) { ui.toast(ui.errorText(e), 'err'); });
    }
    function confirmPay(o) {
      ui.confirmBox('ยืนยันรับเงิน ' + o.ref + '?', 'ตรวจแล้วว่าได้รับ ' + baht(o.amountDue) + ' เข้าบัญชีบริษัท ระบบจะเพิ่ม ' + (o.credits + o.bonusCredits) + ' เครดิตให้ ' + o.email + ' และส่งอีเมลแจ้ง', 'ยืนยันรับเงิน').then(function (yes) {
        if (!yes) return;
        api.call('admin.payment.confirm', { id: o.id }).then(function () { ui.toast('เพิ่มเครดิตแล้ว'); loadList(); }, function (e) { ui.toast(ui.errorText(e), 'err'); });
      });
    }
    function rejectPay(o) {
      var reason = h('input', { type: 'text', id: 'rej-reason', maxlength: '300', placeholder: 'เช่น ยอดโอนไม่ตรง, สลิปไม่ชัด' });
      ui.confirmBox('ตรวจไม่ผ่าน ' + o.ref, h('label.field', { for: 'rej-reason' }, 'เหตุผล (ลูกค้าเห็นในอีเมล)', reason), 'บันทึก').then(function (yes) {
        if (!yes) return;
        api.call('admin.payment.reject', { id: o.id, reason: reason.value }).then(function () { ui.toast('บันทึกแล้ว'); loadList(); }, function (e) { ui.toast(ui.errorText(e), 'err'); });
      });
    }
  }
})();

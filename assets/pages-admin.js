/* pages-admin.js – AI settings (admin role only). */
(function () {
  var h = ui.h;
  window.pages = window.pages || {};
  var TASK_LABEL = {
    full_jd: 'สร้าง JD', ai_edit: 'AI แก้ทีละข้อ / ทั้งหมวด', suggest_chips: 'เสนอตัวเลือก (chips)', org_competency: 'เสนอ Core / Leadership Competency ของบริษัท', quality_check: 'ตรวจคุณภาพ JD ก่อนส่ง'
  };

  window.pages['ai-settings'] = function (view) {
    if (app.me.user.role !== 'admin') { ui.mount(view, ui.note('err', 'หน้านี้สำหรับผู้ดูแลระบบเท่านั้น')); return; }
    // draft = what the admin typed/picked; kept across re-renders so a check never wipes the form.
    var state = { settings: null, provider: 'google', models: [], check: null, busy: false, msg: null, draft: { key: '', model: '', effort: null } };
    var body = h('div.grid-2');
    ui.mount(view, [ui.pageHead('เฉพาะผู้ดูแลระบบ · key เก็บใน Script Properties ไม่อยู่ใน Sheet', 'ตั้งค่า AI'), body]);

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
  };
})();

/* ui.js – tiny DOM helpers shared by every page. Text always goes in via textContent. */
(function () {
  /** h('div.card.wide', {attrs, onclick, text}, ...children) */
  function h(tag, attrs) {
    var parts = tag.split('.');
    var el = document.createElement(parts[0]);
    if (parts.length > 1) el.className = parts.slice(1).join(' ');
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function mount(el, children) { clear(el); append(el, children); }

  function pageHead(eyebrow, title, right) {
    return h('header.page-head.row-between', {},
      h('div', {}, h('span.eyebrow', { text: eyebrow }), h('h1', { text: title })),
      right || null);
  }

  function note(kind, text) { return h('div.note.' + kind, { role: 'status', text: text }); }

  /** Single-stroke line icons (24×24, 1.75px stroke, currentColor). Drawn for this app. */
  var ICONS = {
    quest: ['M4 20h4L19 9l-4-4L4 16v4z', 'M14 6l4 4'],
    jds: ['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M10 13h6', 'M10 17h6'],
    credits: ['M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3z', 'M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6', 'M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6'],
    company: ['M4 21V5l8-2v18', 'M12 9h8v12', 'M3 21h18', 'M7.5 8h1', 'M7.5 12h1', 'M7.5 16h1', 'M15.5 13h1', 'M15.5 17h1'],
    'ai-settings': ['M4 6h9', 'M17 6h3', 'M4 12h3', 'M11 12h9', 'M4 18h11', 'M19 18h1', 'M15 4v4', 'M9 10v4', 'M17 16v4'],
    lock: ['M6 11h12v10H6z', 'M8.5 11V8a3.5 3.5 0 0 1 7 0v3'],
    ai: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z', 'M18.5 15.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z'],
    download: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
    edit: ['M4 20h4L19 9l-4-4L4 16v4z'],
    plus: ['M12 5v14', 'M5 12h14'],
    history: ['M4 12a8 8 0 1 0 2.4-5.7', 'M4 4v4h4', 'M12 8v4l3 2'],
    copy: ['M9 9h11v11H9z', 'M5 15H4V4h11v1'],
    trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
    up: ['M12 19V5', 'M6 11l6-6 6 6'],
    check: ['M5 12l5 5 9-10'],
    info: ['M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z', 'M12 11v6', 'M12 7.5v.5'],
    down: ['M12 5v14', 'M6 13l6 6 6-6'],
    logout: ['M14 4h5v16h-5', 'M10 8l-4 4 4 4', 'M6 12h10']
  };
  function icon(name) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    (ICONS[name] || []).forEach(function (d) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    return svg;
  }

  /** extra.icon adds a line icon; AI buttons get the AI icon automatically. Label lives in .btn-label so busy() keeps the icon. */
  function button(cls, label, onclick, extra) {
    extra = Object.assign({}, extra || {});
    var name = extra.icon || (/\bai-(go|btn)\b/.test(cls || '') ? 'ai' : '');
    delete extra.icon;
    return h('button.btn' + (cls ? '.' + cls : '') + (name ? '.has-icon' : ''), Object.assign({ type: 'button', onclick: onclick }, extra),
      name ? icon(name) : null, h('span.btn-label', { text: label }));
  }
  function setLabel(btn, text) { (btn.querySelector('.btn-label') || btn).textContent = text; }

  /** Disables the button and shows a label while fn() (a promise) runs. */
  function busy(btn, label, fn) {
    if (btn.disabled) return Promise.resolve();
    var lab = btn.querySelector('.btn-label') || btn;
    var old = lab.textContent;
    btn.disabled = true;
    lab.textContent = label;
    return fn().then(function (x) { btn.disabled = false; lab.textContent = old; return x; },
      function (e) { btn.disabled = false; lab.textContent = old; throw e; });
  }

  /** In-page confirm (no window.confirm). Resolves true/false. */
  function confirmBox(title, body, okLabel) {
    return new Promise(function (resolve) {
      var back = h('div.modal-back', { role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
      function close(v) { back.remove(); resolve(v); }
      back.appendChild(h('div.modal', {},
        h('h2', { text: title }),
        typeof body === 'string' ? h('p', { text: body }) : body,
        h('div.row.end', {}, button('', 'ยกเลิก', function () { close(false); }), button('primary', okLabel || 'ตกลง', function () { close(true); }))));
      back.addEventListener('click', function (e) { if (e.target === back) close(false); });
      document.body.appendChild(back);
      back.querySelector('.btn.primary').focus();
    });
  }

  function toast(text, kind) {
    var t = h('div.toast.' + (kind || 'ok'), { role: 'status', text: text });
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }

  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms); };
  }

  function fmtCredits(n) { return (Math.round(Number(n) * 10) / 10).toLocaleString('th-TH'); }

  // Internal ids stay bronze/silver/gold; customers see these names (same as backend TIER_NAMES).
  var TIER = {
    bronze: { label: 'Role Brief', short: 'Brief', name: 'ร่างดูบนจอ', cls: 'brief' },
    silver: { label: 'Role Profile', short: 'Profile', name: 'พร้อมสรรหา', cls: 'profile' },
    gold: { label: 'Role Blueprint', short: 'Blueprint', name: 'ฉบับเต็ม', cls: 'blueprint' }
  };
  var TIERS = ['bronze', 'silver', 'gold'];

  function tierPill(tier, short) {
    var t = TIER[tier];
    return t ? h('span.tier.' + t.cls + (short ? '.mini' : ''), { text: short ? t.short : t.label }) : null;
  }

  function errorText(e) {
    if (e && e.code === 'NOT_ENOUGH_CREDITS') return 'เครดิตไม่พอ ต้องใช้ ' + e.needed + ' เครดิต แต่เหลือ ' + e.balance + ' เครดิต';
    return (e && e.message) || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง';
  }

  window.ui = {
    h: h, append: append, clear: clear, mount: mount, pageHead: pageHead, note: note, button: button, busy: busy,
    confirmBox: confirmBox, toast: toast, debounce: debounce, fmtCredits: fmtCredits, TIER: TIER, TIERS: TIERS,
    tierPill: tierPill, errorText: errorText, icon: icon, setLabel: setLabel
  };
})();

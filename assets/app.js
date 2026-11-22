/* app.js – session state, sidebar and hash router. Pages live in pages-*.js and register on window.pages. */
(function () {
  var h = ui.h;
  var view = document.getElementById('view');
  var app = window.app = {
    me: null,
    questions: null,
    view: view,
    /** Reloads the signed-in user (credits change after most actions). */
    refreshMe: function () {
      return api.call('auth.me').then(function (me) { app.me = me; renderSide(); return me; });
    },
    setMe: function (me) { app.me = me; renderSide(); },
    loadQuestions: function () {
      if (app.questions) return Promise.resolve(app.questions);
      return api.call('quest.questions').then(function (q) { app.questions = q; return q; });
    },
    go: function (hash) { if (location.hash === hash) route(); else location.hash = hash; }
  };

  // Line icons in the menu (added once).
  document.querySelectorAll('#side .nav a').forEach(function (a) {
    if (!a.querySelector('.icon')) a.insertBefore(ui.icon(a.getAttribute('data-route')), a.firstChild);
  });
  var logoutBtn = document.getElementById('logout');
  if (logoutBtn && !logoutBtn.querySelector('.icon')) logoutBtn.insertBefore(ui.icon('logout'), logoutBtn.firstChild);

  function renderSide() {
    var side = document.getElementById('side');
    var me = app.me;
    side.hidden = !me;
    if (!me) return;
    document.getElementById('nav-admin').hidden = me.user.role !== 'admin';
    document.getElementById('who').textContent = me.user.email;
    var c = me.credits;
    ui.mount(document.getElementById('credit-box'), [
      h('span.credit-label', { text: 'เครดิตคงเหลือ' }),
      h('strong.credit-num', { text: ui.fmtCredits(c.balance) }),
      h('span.muted', { text: 'Role Brief ฟรีเหลือ ' + c.freeBronzeLeft + ' ครั้งเดือนนี้' }),
      h('a', { href: '#credits', text: 'เติมเครดิต' })
    ]);
  }

  function route() {
    var raw = (location.hash || '').slice(1);
    var parts = raw.split('/');
    var name = parts[0] || 'quest';
    var arg = parts.slice(1).join('/');

    if (!api.hasToken()) {
      name = 'signin';
    } else if (!app.me) {
      ui.mount(view, h('p.muted', { text: 'กำลังโหลด…' }));
      app.refreshMe().then(route, function (e) {
        if (e.code === 'SIGNED_OUT') { api.setToken(''); route(); return; }
        ui.mount(view, ui.note('err', ui.errorText(e)));
      });
      return;
    }
    if (name === 'signin' && api.hasToken() && app.me) name = 'quest';

    var page = window.pages[name] || window.pages.quest;
    document.querySelectorAll('.nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.route === name || (name === 'jd' && a.dataset.route === 'jds')); });
    page(view, arg);
    view.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  document.getElementById('logout').addEventListener('click', function () {
    api.call('auth.logout').catch(function () {}).then(function () {
      api.setToken('');
      app.me = null;
      renderSide();
      app.go('#signin');
    });
  });

  document.getElementById('demo-badge').hidden = !api.demo;
  // Unsaved edits: a page sets app.leaveGuard = function () { return true while there are unsaved changes }.
  var currentHash = location.hash;
  var bouncing = false;
  window.addEventListener('hashchange', function () {
    if (bouncing) { bouncing = false; return; }
    var target = location.hash;
    if (app.leaveGuard && app.leaveGuard()) {
      bouncing = true;
      location.hash = currentHash;
      ui.confirmBox('ออกจากหน้านี้?', 'ที่แก้ไว้ยังไม่ได้บันทึก ถ้าออกตอนนี้จะหายไป', 'ออกโดยไม่บันทึก').then(function (yes) {
        if (!yes) return;
        app.leaveGuard = null;
        location.hash = target;
      });
      return;
    }
    app.leaveGuard = null;
    currentHash = target;
    route();
  });
  window.addEventListener('beforeunload', function (e) {
    if (app.leaveGuard && app.leaveGuard()) { e.preventDefault(); e.returnValue = ''; }
  });
  app.route = route;
  route();
})();

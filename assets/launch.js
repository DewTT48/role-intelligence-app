/* launch.js – landing page: soft-launch queue (today's quota, places left, sign-up form), the company-wide
 * request form and the click-to-play video. Talks to the backend directly (the landing page has no app code).
 * ?mock=1 (or no apiUrl) uses made-up numbers so the page can be shown without the backend. */
(function () {
  var cfg = window.RI_CONFIG || {};
  var demo = /[?&]mock=1/.test(location.search) || !cfg.apiUrl;   // ?demo=1 on this page already means "open the app demo"
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var DEMO = { mode: 'waitlist', dailyQuota: 10, admittedToday: 6, remainingToday: 4, waiting: 0 };

  function call(action, payload) {
    if (demo) return new Promise(function (res) { setTimeout(function () { res(fake(action, payload || {})); }, 500); });
    return fetch(cfg.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, payload: payload || {} }) })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r.ok) { var e = new Error(r.error.message); e.code = r.error.code; throw e; } return r.data; });
  }
  function fake(action, p) {
    if (action === 'waitlist.join') {
      if (DEMO.remainingToday > 0) { DEMO.remainingToday--; DEMO.admittedToday++; return Object.assign({ status: 'admitted' }, DEMO); }
      DEMO.waiting++; return Object.assign({ status: 'waiting', position: DEMO.waiting, etaDays: Math.ceil(DEMO.waiting / DEMO.dailyQuota) }, DEMO);
    }
    if (action === 'inquiry.submit') return { received: true };
    return Object.assign({}, DEMO);
  }
  function num(n) { return Number(n || 0).toLocaleString('th-TH'); }

  // ---------- queue ----------
  var join = $('#join');
  function paint(s) {
    if (!join || !s) return;
    $('.js-quota', join).textContent = num(s.dailyQuota);
    $('.js-left', join).textContent = num(s.remainingToday);
    $('.js-waiting', join).textContent = num(s.waiting);
    join.classList.toggle('full', !s.remainingToday);
  }
  // The backend answers in 1–6 s. Until then a click on a start button waits for the answer instead of going to
  // sign-in, and the mode seen last time is shown straight away (kept in this browser only).
  var MODE_KEY = 'ri_launch_mode';
  var ctas = $$('.js-cta');
  var head = $('.final h2 span'), note = $('.final-cta p');
  var orig = {
    cta: ctas.map(function (a) { return { href: a.getAttribute('href'), html: a.innerHTML }; }),
    head: null,                         // taken when first changed: thai-wrap.js may still rewrap it before then
    note: note ? note.textContent : null
  };
  function remember(mode) { try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* private window */ } }
  function remembered() { try { return localStorage.getItem(MODE_KEY); } catch (e) { return null; } }

  function waitlistMode(s) {
    join.hidden = false;
    paint(s);
    ctas.forEach(function (a) {
      a.setAttribute('href', '#join');
      a.innerHTML = 'ลงชื่อขอใช้งาน <span aria-hidden="true">→</span>';
    });
    if (head) {                         // thai-wrap.js wraps the words in spans, so rebuild it and keep the pink dot
      if (orig.head == null) orig.head = head.innerHTML;
      var dot = head.querySelector('.dot');
      head.textContent = 'ลงชื่อวันนี้ ได้ใช้ก่อน';
      if (dot) head.appendChild(dot);
    }
    if (note) note.textContent = 'ทยอยเปิดทุกวัน · ถึงคิวรับฟรี 3 เครดิต';
  }
  function openMode() {
    join.hidden = true;
    ctas.forEach(function (a, i) { a.setAttribute('href', orig.cta[i].href); a.innerHTML = orig.cta[i].html; });
    if (head && orig.head != null) head.innerHTML = orig.head;
    if (note && orig.note != null) note.textContent = orig.note;
  }
  if (join) {
    if (remembered() === 'waitlist') waitlistMode(null);   // numbers stay "–" until the backend answers
    var settled = false;
    var status = call('waitlist.status').then(function (s) {
      remember(s.mode === 'waitlist' ? 'waitlist' : 'open');
      if (s.mode === 'waitlist') waitlistMode(s); else openMode();
    }).catch(function () { /* page still works as before */ }).then(function () { settled = true; });
    var timeout = new Promise(function (res) { setTimeout(res, 12000); });
    ctas.forEach(function (a) {
      a.addEventListener('click', function (e) {
        if (settled) return;
        e.preventDefault();
        if (a.classList.contains('is-wait')) return;
        var html = a.innerHTML;
        a.classList.add('is-wait'); a.setAttribute('aria-busy', 'true');
        a.textContent = 'กำลังเปิด…';
        Promise.race([status, timeout]).then(function () {
          a.classList.remove('is-wait'); a.removeAttribute('aria-busy');
          if (!settled) a.innerHTML = html;          // backend too slow: carry on with what the button says
          var href = a.getAttribute('href');
          if (href.charAt(0) === '#') { var t = $(href); if (t) t.scrollIntoView({ behavior: 'smooth' }); history.replaceState(null, '', href); }
          else location.href = href;
        });
      });
    });
    var form = $('.join-form', join);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form-msg', form), btn = $('button', form);
      var data = { email: form.email.value.trim(), name: form.name.value.trim(), company: form.company.value.trim(), website: form.website.value };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) { msg.className = 'form-msg err'; msg.textContent = 'กรอกอีเมลให้ถูกต้อง'; return; }
      btn.disabled = true; msg.className = 'form-msg'; msg.textContent = 'กำลังลงชื่อ…';
      call('waitlist.join', data).then(function (r) {
        paint(r);
        if (r.status === 'admitted' || r.status === 'open') {
          msg.className = 'form-msg ok';
          msg.innerHTML = 'ถึงคิวคุณแล้ว! <a href="app/#signin">เข้าสู่ระบบด้วยอีเมลนี้</a> ได้เลย (เราส่งอีเมลแจ้งไปด้วย)';
        } else if (r.status === 'member') {
          msg.className = 'form-msg ok';
          msg.innerHTML = 'อีเมลนี้มีบัญชีอยู่แล้ว <a href="app/#signin">เข้าสู่ระบบ</a> ได้เลย';
        } else {
          msg.className = 'form-msg ok';
          msg.textContent = 'ลงชื่อแล้ว คุณอยู่คิวที่ ' + num(r.position) + (r.etaDays ? ' · คาดว่าถึงคิวภายในราว ' + num(r.etaDays) + ' วัน' : '') + ' · เราส่งอีเมลยืนยันให้แล้ว';
        }
        form.reset();
      }).catch(function (err) {
        msg.className = 'form-msg err'; msg.textContent = err.message || 'ลงชื่อไม่สำเร็จ ลองใหม่อีกครั้ง';
      }).then(function () { btn.disabled = false; });
    });
  }

  // ---------- company-wide request ----------
  var org = $('#org-contact'), orgDlg = $('#org-dialog');
  function openDlg(d) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  function closeDlg(d) { if (d.close) d.close(); else d.removeAttribute('open'); }
  $$('.js-pop-close').forEach(function (b) { b.addEventListener('click', function () { closeDlg(b.closest('dialog')); }); });
  $$('dialog.pop').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d) closeDlg(d); }); });   // click outside closes
  if (org && orgDlg) {
    $$('.js-org-open').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        openDlg(orgDlg);
        setTimeout(function () { org.name.focus(); }, 50);
      });
    });
    org.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = $('.form-msg', org), btn = $('button', org);
      var data = {};
      ['name', 'company', 'email', 'phone', 'positions', 'message', 'website'].forEach(function (k) { data[k] = org[k].value.trim(); });
      if (!data.name || !data.company) { msg.className = 'form-msg err'; msg.textContent = 'กรอกชื่อและบริษัท'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) { msg.className = 'form-msg err'; msg.textContent = 'กรอกอีเมลให้ถูกต้อง'; return; }
      btn.disabled = true; msg.className = 'form-msg'; msg.textContent = 'กำลังส่ง…';
      call('inquiry.submit', data).then(function () {
        msg.className = 'form-msg ok'; msg.textContent = 'ส่งแล้ว ขอบคุณครับ ทีมงานจะติดต่อกลับโดยเร็ว (เราส่งอีเมลยืนยันให้แล้ว)';
        org.reset();
      }).catch(function (err) {
        msg.className = 'form-msg err'; msg.textContent = err.message || 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง';
      }).then(function () { btn.disabled = false; });
    });
  }

  // ---------- video: opens in a window; the YouTube player loads only then and stops when the window closes ----------
  var vDlg = $('#video-dialog');
  if (vDlg) {
    $$('.js-video-open').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/' + b.getAttribute('data-yt') + '?autoplay=1&rel=0';
        f.title = 'วิธีใช้งาน Role Intelligence';
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        var box = $('.pop-player', vDlg);
        box.innerHTML = ''; box.appendChild(f);
        openDlg(vDlg);
      });
    });
    vDlg.addEventListener('close', function () { $('.pop-player', vDlg).innerHTML = ''; });
  }
})();

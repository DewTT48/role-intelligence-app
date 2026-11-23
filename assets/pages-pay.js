/* pages-pay.js – buying credit packs by bank transfer: tax-invoice details (asked once), order, slip upload. */
(function () {
  var h = ui.h;
  window.pages = window.pages || {};

  var STATUS = {
    awaiting_transfer: ['รอโอนเงิน', 'wait'], awaiting_review: ['รอตรวจสลิป', 'review'], paid: ['ชำระแล้ว', 'paid'],
    rejected: ['ตรวจไม่ผ่าน', 'rejected'], cancelled: ['ยกเลิกแล้ว', 'cancelled']
  };
  function baht(n) { return Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท'; }
  function statusTag(s) { var t = STATUS[s] || [s, '']; return h('span.pay-status.' + t[1], { text: t[0] }); }
  function copyBtn(text, label) {
    return ui.button('ghost.small-btn', label || 'คัดลอก', function () {
      try { navigator.clipboard.writeText(text).then(function () { ui.toast('คัดลอกแล้ว'); }); } catch (e) { ui.toast(text); }
    }, { icon: 'copy' });
  }

  // ---------------- tax-invoice details form (asked once, then reused) ----------------
  function billingForm(b, opts) {
    b = b || { type: 'company' };
    var type = b.type || 'company';
    var f = {
      name: h('input', { type: 'text', id: 'bill-name', maxlength: '200', value: b.name || '', placeholder: 'บริษัท ตัวอย่าง จำกัด' }),
      taxId: h('input', { type: 'text', id: 'bill-tax', inputmode: 'numeric', maxlength: '17', value: b.taxId || '', placeholder: 'ตัวเลข 13 หลัก' }),
      branch: h('input', { type: 'text', id: 'bill-branch', maxlength: '20', value: b.branch || 'สำนักงานใหญ่', placeholder: 'สำนักงานใหญ่ หรือเลขสาขา 5 หลัก' }),
      address: h('textarea', { id: 'bill-addr', rows: '3', maxlength: '400', placeholder: 'ที่อยู่ตามที่จดทะเบียน' }, b.address || ''),
      email: h('input', { type: 'email', id: 'bill-email', maxlength: '120', value: b.email || '', placeholder: app.me.user.email })
    };
    var branchField = h('label.field', { for: 'bill-branch' }, 'สำนักงานใหญ่ / สาขา', f.branch);
    function radio(v, label) {
      return h('label.radio-pill', {}, h('input', { type: 'radio', name: 'bill-type', value: v, checked: type === v, onchange: function () {
        type = v; branchField.hidden = v !== 'company'; if (opts && opts.onType) opts.onType(v);
      } }), h('span', { text: label }));
    }
    branchField.hidden = type !== 'company';
    var el = h('div.stack', {},
      h('div.row', { role: 'radiogroup', 'aria-label': 'ออกใบกำกับภาษีในนาม' }, radio('company', 'นิติบุคคล'), radio('person', 'บุคคลธรรมดา')),
      h('label.field', { for: 'bill-name' }, 'ชื่อตามที่จดทะเบียน', f.name),
      h('label.field', { for: 'bill-tax' }, 'เลขประจำตัวผู้เสียภาษี', f.taxId),
      branchField,
      h('label.field', { for: 'bill-addr' }, 'ที่อยู่', f.address),
      h('label.field', { for: 'bill-email' }, 'อีเมลรับใบกำกับภาษี (เว้นว่าง = อีเมลของคุณ)', f.email));
    return {
      el: el,
      type: function () { return type; },
      value: function () { return { type: type, name: f.name.value, taxId: f.taxId.value, branch: f.branch.value, address: f.address.value, email: f.email.value }; }
    };
  }

  function billingSummary(b) {
    return h('div.bill-summary', {},
      h('strong', { text: b.name }),
      h('span', { text: 'เลขผู้เสียภาษี ' + b.taxId + (b.branch ? ' · ' + b.branch : '') }),
      h('span.small.muted', { text: b.address }),
      h('span.small.muted', { text: 'ส่งเอกสารไปที่ ' + (b.email || app.me.user.email) }));
  }

  /** Card for the company page: view / edit the saved details. */
  function billingCard() {
    var card = h('section.card.narrow', { 'aria-labelledby': 'bill-h' }, h('p.muted', { text: 'กำลังโหลด…' }));
    api.call('pay.config').then(function (cfg) { draw(cfg.billing, false); }, function () { card.remove(); });
    function draw(b, editing) {
      if (!b && !editing) {
        ui.mount(card, [h('h2', { id: 'bill-h', text: 'ข้อมูลออกใบกำกับภาษี' }),
          h('p.muted', { text: 'ยังไม่ได้กรอก ระบบจะถามตอนซื้อเครดิตครั้งแรก แล้วใช้ข้อมูลเดิมครั้งต่อไป' }),
          h('div.row', {}, ui.button('', 'กรอกตอนนี้', function () { draw(null, true); }))]);
        return;
      }
      if (!editing) {
        ui.mount(card, [h('h2', { id: 'bill-h', text: 'ข้อมูลออกใบกำกับภาษี' }), billingSummary(b),
          h('div.row', {}, ui.button('', 'แก้ไข', function () { draw(b, true); }, { icon: 'edit' }))]);
        return;
      }
      var form = billingForm(b);
      var msg = h('div');
      var save = ui.button('primary', 'บันทึก', function () {
        ui.busy(save, 'กำลังบันทึก…', function () {
          return api.call('billing.save', form.value()).then(function (nb) { ui.toast('บันทึกแล้ว'); draw(nb, false); });
        }).catch(function (e) { ui.mount(msg, ui.note('err', ui.errorText(e))); });
      });
      ui.mount(card, [h('h2', { id: 'bill-h', text: 'ข้อมูลออกใบกำกับภาษี' }), form.el, msg,
        h('div.row.end', {}, b ? ui.button('ghost', 'ยกเลิก', function () { draw(b, false); }) : null, save)]);
    }
    return card;
  }

  // ---------------- buy: pick details, see the total, create the order ----------------
  window.pages.buy = function (view, packId) {
    ui.mount(view, [ui.pageHead('ซื้อเครดิต · โอนเข้าบัญชีบริษัท', 'สั่งซื้อ'), h('p.muted', { text: 'กำลังโหลด…' })]);
    api.call('pay.config').then(function (cfg) {
      var q = cfg.packs.filter(function (p) { return p.packId === packId; })[0];
      if (!cfg.enabled) { ui.mount(view, [ui.pageHead('ซื้อเครดิต', 'สั่งซื้อ'), ui.note('info', 'ยังไม่เปิดรับชำระเงิน ติดต่อผู้ดูแลระบบ')]); return; }
      if (!q) { app.go('#credits'); return; }
      var editing = !cfg.billing;
      var form = null;
      var wht = h('input', { type: 'checkbox', id: 'buy-wht', onchange: drawTotal });
      var whtRow = cfg.whtEnabled ? h('label.check-line', { for: 'buy-wht' }, wht, h('span', {},
        h('strong', { text: 'บริษัทของฉันหักภาษี ณ ที่จ่าย 3%' }),
        h('span.small.muted.block', { text: 'โอนยอดหลังหัก แล้วแนบหนังสือรับรองการหักภาษี (50 ทวิ) พร้อมสลิป' }))) : null;
      var billBox = h('div');
      var total = h('div.pay-total');
      var msg = h('div');

      function drawBilling() {
        if (editing) {
          form = billingForm(cfg.billing, { onType: function (t) { if (whtRow) whtRow.hidden = t !== 'company'; if (t !== 'company') wht.checked = false; drawTotal(); } });
          ui.mount(billBox, form.el);
        } else {
          form = null;
          ui.mount(billBox, [billingSummary(cfg.billing), h('div.row', {}, ui.button('ghost.small-btn', 'แก้ไขข้อมูล', function () { editing = true; drawBilling(); }, { icon: 'edit' }))]);
          if (whtRow) whtRow.hidden = cfg.billing.type !== 'company';
        }
      }
      function drawTotal() {
        var w = wht.checked ? Math.round(q.beforeVat * cfg.whtRate * 100) / 100 : 0;
        var line = function (a, b, cls) { return h('div.pay-line' + (cls ? '.' + cls : ''), {}, h('span', { text: a }), h('strong', { text: b })); };
        ui.mount(total, [
          line(q.packName + ' · ' + q.credits + ' เครดิต' + (q.bonusCredits ? ' + แถม ' + q.bonusCredits : ''), ''),
          line('ราคาก่อน VAT', baht(q.beforeVat)),
          line('VAT ' + Math.round(cfg.vatRate * 100) + '%', baht(q.vat)),
          line('รวม', baht(q.total)),
          w ? line('หัก ณ ที่จ่าย 3%', '− ' + baht(w)) : null,
          line('ยอดที่ต้องโอน', baht(Math.round((q.total - w) * 100) / 100), 'due')]);
      }
      var go = ui.button('primary', 'สร้างคำสั่งซื้อ', function () {
        var payload = { packId: q.packId, wht: wht.checked };
        if (form) payload.billing = form.value();
        ui.busy(go, 'กำลังสร้าง…', function () {
          return api.call('pay.order', payload).then(function (o) { app.go('#order/' + o.id); });
        }).catch(function (e) { ui.mount(msg, ui.note('err', ui.errorText(e))); });
      });
      ui.mount(view, [
        ui.pageHead('ซื้อเครดิต · โอนเข้าบัญชีบริษัท', 'สั่งซื้อ ' + q.packName),
        h('div.grid-2', {},
          h('section.card', {}, h('h2', { text: 'ออกใบกำกับภาษีในนาม' }),
            editing ? h('p.muted', { text: 'กรอกครั้งแรกครั้งเดียว ครั้งต่อไประบบใช้ข้อมูลนี้ให้ (แก้ได้ที่หน้าข้อมูลบริษัท)' }) : null,
            billBox, whtRow),
          h('section.card', {}, h('h2', { text: 'สรุปยอด' }), total,
            h('p.small.muted', { text: 'กดสร้างคำสั่งซื้อแล้ว ระบบแสดงบัญชีที่ต้องโอน เครดิตเข้าหลังผู้ดูแลตรวจสลิป ใบกำกับภาษีส่งทางอีเมลแยกต่างหาก' }),
            msg, h('div.row.end', {}, ui.button('ghost', 'ย้อนกลับ', function () { app.go('#credits'); }), go)))
      ]);
      drawBilling();
      drawTotal();
    }, function (e) { ui.mount(view, ui.note('err', ui.errorText(e))); });
  };

  // ---------------- one order: where to transfer, attach the slip ----------------
  /** Shrinks a photo to ≤1600px JPEG so uploads stay small. PDFs go as they are. */
  function readFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { resolve(null); return; }
      var rd = new FileReader();
      rd.onerror = function () { reject(new Error('อ่านไฟล์ไม่ได้')); };
      if (file.type === 'application/pdf') {
        if (file.size > 2 * 1024 * 1024) { reject(new Error('ไฟล์ PDF ใหญ่เกิน 2 MB')); return; }
        rd.onload = function () { resolve({ mimeType: 'application/pdf', base64: String(rd.result).split(',')[1] }); };
        rd.readAsDataURL(file);
        return;
      }
      if (!/^image\//.test(file.type)) { reject(new Error('แนบได้เฉพาะรูปภาพหรือ PDF')); return; }
      rd.onload = function () {
        var img = new Image();
        img.onload = function () {
          var k = Math.min(1, 1600 / Math.max(img.width, img.height));
          var cv = document.createElement('canvas');
          cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          resolve({ mimeType: 'image/jpeg', base64: cv.toDataURL('image/jpeg', 0.82).split(',')[1] });
        };
        img.onerror = function () { reject(new Error('เปิดรูปไม่ได้ ลองถ่ายภาพหน้าจอสลิปใหม่')); };
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }

  window.pages.order = function (view, id) {
    ui.mount(view, [ui.pageHead('คำสั่งซื้อ', 'กำลังโหลด…'), h('p.muted', { text: 'กำลังโหลด…' })]);
    api.call('pay.config').then(function (cfg) {
      var o = cfg.orders.filter(function (x) { return x.id === id; })[0];
      if (!o) { ui.mount(view, ui.note('err', 'ไม่พบคำสั่งซื้อนี้')); return; }
      var open = o.status === 'awaiting_transfer' || o.status === 'awaiting_review';
      var b = cfg.bank || {};
      var slipIn = h('input', { type: 'file', id: 'slip', accept: 'image/*,application/pdf' });
      var certIn = h('input', { type: 'file', id: 'cert', accept: 'image/*,application/pdf' });
      var msg = h('div');
      var send = ui.button('primary', o.status === 'awaiting_review' ? 'ส่งไฟล์ใหม่' : 'ส่งสลิป', function () {
        ui.busy(send, 'กำลังส่ง…', function () {
          return Promise.all([readFile(slipIn.files[0]), readFile(certIn.files[0])]).then(function (f) {
            if (!f[0] && !o.hasSlip) throw new Error('เลือกไฟล์สลิปก่อน');
            return api.call('pay.attach', { id: o.id, slip: f[0], whtCert: f[1] });
          }).then(function () { ui.toast('ส่งแล้ว รอผู้ดูแลตรวจ'); window.pages.order(view, id); });
        }).catch(function (e) { ui.mount(msg, ui.note('err', ui.errorText(e))); });
      });
      var cancel = o.status === 'awaiting_transfer' ? ui.button('ghost.danger', 'ยกเลิกคำสั่งซื้อ', function () {
        ui.confirmBox('ยกเลิกคำสั่งซื้อ ' + o.ref + '?', 'ถ้าโอนเงินไปแล้ว อย่ายกเลิก ให้แนบสลิปแทน', 'ยกเลิกคำสั่งซื้อ').then(function (yes) {
          if (!yes) return;
          api.call('pay.cancel', { id: o.id }).then(function () { app.go('#credits'); }, function (e) { ui.toast(ui.errorText(e), 'err'); });
        });
      }) : null;
      var field = function (label, value, copy) {
        return h('div.bank-line', {}, h('span.muted', { text: label }), h('strong', { text: value }), copy ? copyBtn(copy) : null);
      };
      ui.mount(view, [
        ui.pageHead('คำสั่งซื้อ ' + o.ref + ' · ' + new Date(o.created_at).toLocaleString('th-TH'), o.credits + ' เครดิต' + (o.bonusCredits ? ' + แถม ' + o.bonusCredits : ''), statusTag(o.status)),
        o.status === 'paid' ? ui.note('ok', 'ได้รับเงินแล้ว เพิ่ม ' + (o.credits + o.bonusCredits) + ' เครดิตเข้าบัญชีแล้ว ใบกำกับภาษีส่งทางอีเมลแยกต่างหาก') : null,
        o.status === 'rejected' ? ui.note('err', 'ตรวจสลิปไม่ผ่าน: ' + (o.note || '') + ' · สร้างคำสั่งซื้อใหม่ หรือติดต่อผู้ดูแลระบบ') : null,
        o.status === 'awaiting_review' ? ui.note('info', 'ได้รับสลิปแล้ว รอผู้ดูแลตรวจ เครดิตจะเข้าเมื่อยืนยันแล้ว และได้อีเมลแจ้ง') : null,
        open ? h('div.grid-2', {},
          h('section.card.bank-card', {},
            h('span.eyebrow', { text: 'ขั้นที่ 1 · โอนเงิน' }),
            h('div.pay-amount', {}, h('span', { text: 'ยอดที่ต้องโอน' }), h('strong', { text: baht(o.amountDue) }), copyBtn(String(o.amountDue), 'คัดลอกยอด')),
            field('ธนาคาร', [b.bankName, b.branch].filter(Boolean).join(' ')),
            field('ชื่อบัญชี', b.accountName),
            field('เลขที่บัญชี', b.accountNo, String(b.accountNo || '').replace(/\D/g, '')),
            cfg.promptpayId ? field('PromptPay', cfg.promptpayId, cfg.promptpayId) : null,
            field('เลขอ้างอิง (ใส่ในบันทึกการโอน)', o.ref, o.ref),
            o.whtThb ? h('p.small.muted', { text: 'ยอดนี้หักภาษี ณ ที่จ่าย 3% แล้ว (' + baht(o.whtThb) + ') จากราคารวม ' + baht(o.total) }) : null),
          h('section.card', {},
            h('span.eyebrow', { text: 'ขั้นที่ 2 · แนบหลักฐาน' }),
            h('label.field', { for: 'slip' }, 'สลิปการโอน (รูปหรือ PDF)' + (o.hasSlip ? ' · ส่งแล้ว เลือกใหม่ถ้าจะเปลี่ยน' : ''), slipIn),
            o.whtThb ? h('label.field', { for: 'cert' }, 'หนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)' + (o.hasWhtCert ? ' · ส่งแล้ว' : ''), certIn) : null,
            o.whtThb && cfg.seller ? h('div.seller-box', {},
              h('p.small.muted', { text: 'ออกหนังสือ 50 ทวิ ในนามผู้ถูกหักภาษี' }),
              field('ชื่อ', cfg.seller.name + ' (' + cfg.seller.branch + ')'),
              field('เลขประจำตัวผู้เสียภาษี', cfg.seller.taxId, cfg.seller.taxId),
              field('ที่อยู่', cfg.seller.address)) : null,
            msg, h('div.row.end', {}, cancel, send))) : null,
        h('section.card', {}, h('h2', { text: 'ออกใบกำกับภาษีในนาม' }), o.billing ? billingSummary(o.billing) : h('p.muted', { text: '-' }),
          cfg.seller ? h('p.small.muted', { text: 'ผู้ขาย: ' + cfg.seller.name + ' (' + cfg.seller.branch + ') เลขประจำตัวผู้เสียภาษี ' + cfg.seller.taxId + ' · ' + cfg.seller.address }) : null),
        h('div.row', {}, h('a.btn', { href: '#credits', text: 'กลับไปหน้าเครดิต' }))
      ]);
    }, function (e) { ui.mount(view, ui.note('err', ui.errorText(e))); });
  };

  /** "คำสั่งซื้อของฉัน" list for the credits page. */
  function ordersCard(orders) {
    if (!orders.length) return null;
    return h('section.card', {}, h('h2', { text: 'คำสั่งซื้อของฉัน' }),
      h('div.stack-tight', {}, orders.map(function (o) {
        return h('a.order-row', { href: '#order/' + o.id },
          h('span', {}, h('strong', { text: o.ref }), h('span.small.muted.block', { text: o.credits + ' เครดิต' + (o.bonusCredits ? ' + แถม ' + o.bonusCredits : '') + ' · ' + baht(o.amountDue) })),
          statusTag(o.status));
      })));
  }

  // The company page gets the tax-invoice card at the end.
  var company = window.pages.company;
  if (company) {
    window.pages.company = function (view, arg) {
      company(view, arg);
      view.appendChild(billingCard());
    };
  }

  window.pay = { billingForm: billingForm, billingCard: billingCard, ordersCard: ordersCard, statusTag: statusTag, baht: baht, readFile: readFile };
})();

/* landing.js – "ลองดูก่อน" role picker (pre-written sample JDs, no AI call) and the scroll-in reveal. */
(function () {
  // Short excerpts in the shape the app writes them. Kept here so the page costs nothing to show.
  var ROLES = {
    branch: {
      title: 'ผู้จัดการสาขา', dept: 'ปฏิบัติการสาขา · รายงานตรงต่อ Area Manager · ดูแลทีม 8–12 คน',
      purpose: 'ดูแลให้สาขาทำยอดขายตามเป้า ควบคุมสต็อกและมาตรฐานบริการให้เป็นแบบเดียวกันทุกวัน และพัฒนาทีมหน้าร้านให้ทำงานได้เองตามมาตรฐานบริษัท',
      acc: [['บริหารยอดขายสาขา', 'ยอดขายรายเดือนถึงเป้า ≥ 95%'], ['ควบคุมสต็อกและของขาดชั้น', 'ของขาดชั้นไม่เกิน 2% ต่อสัปดาห์'], ['พัฒนาทีมหน้าร้าน', 'พนักงานใหม่ทำงานเองได้ใน 30 วัน']],
      kpi: ['ยอดขายเทียบเป้า', 'อัตราของขาดชั้น', 'คะแนนบริการจากลูกค้า'],
      comp: [['ภาวะผู้นำทีม', 'Leadership'], ['ใส่ใจลูกค้า', 'Core'], ['บริหารสต็อก', 'Functional']]
    },
    sales: {
      title: 'พนักงานขาย', dept: 'ฝ่ายขาย · รายงานตรงต่อหัวหน้าฝ่ายขาย',
      purpose: 'หาลูกค้าใหม่และดูแลลูกค้าเดิมในเขตที่รับผิดชอบ ให้ได้ยอดขายตามเป้า และสร้างความสัมพันธ์ที่ทำให้ลูกค้ากลับมาซื้อซ้ำ',
      acc: [['หาและปิดการขายลูกค้าใหม่', 'ลูกค้าใหม่อย่างน้อย 6 รายต่อเดือน'], ['ดูแลลูกค้าเดิม', 'อัตราซื้อซ้ำ ≥ 70%'], ['บันทึกข้อมูลการขาย', 'ข้อมูลลูกค้าครบและเป็นปัจจุบันทุกสัปดาห์']],
      kpi: ['ยอดขายเทียบเป้า', 'จำนวนลูกค้าใหม่', 'อัตราการปิดการขาย'],
      comp: [['การเจรจาต่อรอง', 'Functional'], ['ใส่ใจลูกค้า', 'Core'], ['มุ่งผลลัพธ์', 'Core']]
    },
    warehouse: {
      title: 'หัวหน้าคลังสินค้า', dept: 'คลังสินค้าและจัดส่ง · รายงานตรงต่อผู้จัดการฝ่ายปฏิบัติการ · ดูแลทีม 6 คน',
      purpose: 'ควบคุมการรับ จัดเก็บ และส่งสินค้าให้ถูกต้องและทันเวลา รักษาความแม่นยำของสต็อก และดูแลความปลอดภัยในคลัง',
      acc: [['รับและจ่ายสินค้า', 'ส่งสินค้าตรงเวลา ≥ 98%'], ['ควบคุมความแม่นยำของสต็อก', 'ผลต่างจากการตรวจนับ ≤ 0.5%'], ['ความปลอดภัยในคลัง', 'ไม่มีอุบัติเหตุที่ทำให้หยุดงาน']],
      kpi: ['ความแม่นยำของสต็อก', 'อัตราส่งตรงเวลา', 'ต้นทุนจัดเก็บต่อหน่วย'],
      comp: [['วางแผนและจัดลำดับงาน', 'Functional'], ['ความปลอดภัยในการทำงาน', 'Functional'], ['ภาวะผู้นำทีม', 'Leadership']]
    },
    account: {
      title: 'เจ้าหน้าที่บัญชี', dept: 'บัญชีและการเงิน · รายงานตรงต่อผู้จัดการบัญชี',
      purpose: 'บันทึกบัญชีและจัดทำเอกสารทางการเงินให้ถูกต้องตามมาตรฐานและกำหนดเวลา เพื่อให้ปิดงบได้ตรงเวลาและยื่นภาษีได้ถูกต้อง',
      acc: [['บันทึกบัญชีรายวัน', 'บันทึกครบภายในวันทำการถัดไป'], ['กระทบยอดบัญชีธนาคาร', 'กระทบยอดเสร็จภายในวันที่ 5 ของเดือน'], ['เตรียมเอกสารยื่นภาษี', 'ยื่นภาษีตรงเวลา ไม่มีค่าปรับ']],
      kpi: ['ปิดงบตรงเวลา', 'ความถูกต้องของรายการ', 'ยื่นภาษีตรงเวลา'],
      comp: [['ความละเอียดรอบคอบ', 'Functional'], ['ความซื่อสัตย์และรับผิดชอบ', 'Core'], ['ใช้โปรแกรมบัญชี', 'Functional']]
    },
    hr: {
      title: 'HR Officer', dept: 'ทรัพยากรบุคคล · รายงานตรงต่อผู้จัดการฝ่ายบุคคล',
      purpose: 'ดูแลงานบุคคลตั้งแต่สรรหาจนถึงพ้นสภาพให้ถูกต้องตามกฎหมายแรงงาน และช่วยให้พนักงานได้รับข้อมูลและบริการด้านบุคคลอย่างรวดเร็ว',
      acc: [['สรรหาและคัดเลือก', 'ปิดตำแหน่งว่างภายใน 30 วัน'], ['ดูแลข้อมูลและเงินเดือน', 'ข้อมูลเงินเดือนถูกต้อง 100%'], ['ปฐมนิเทศพนักงานใหม่', 'คนใหม่ผ่านปฐมนิเทศครบในสัปดาห์แรก']],
      kpi: ['ระยะเวลาปิดตำแหน่ง', 'อัตราผ่านทดลองงาน', 'ความถูกต้องของข้อมูลบุคคล'],
      comp: [['รักษาความลับ', 'Core'], ['กฎหมายแรงงาน', 'Functional'], ['การสื่อสาร', 'Core']]
    }
  };

  var panel = document.getElementById('jd');
  var tabs = document.querySelectorAll('.roles [role=tab]');
  if (!panel || !tabs.length) return;
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function render(key) {
    var r = ROLES[key];
    panel.innerHTML =
      '<header class="jd-head"><p class="doc-eyebrow">JOB DESCRIPTION · ROLE PROFILE · ตัวอย่าง</p><h3>' + esc(r.title) + '</h3><p class="jd-dept">' + esc(r.dept) + '</p></header>' +
      '<div class="jd-body">' +
        '<section class="jd-sec s1"><h4><b>§01</b>วัตถุประสงค์ของตำแหน่ง</h4><p>' + esc(r.purpose) + '</p></section>' +
        '<section class="jd-sec s2"><h4><b>§03</b>ความรับผิดชอบหลัก</h4><table><thead><tr><th>Key Accountability</th><th>Expected Output</th></tr></thead><tbody>' +
          r.acc.map(function (a) { return '<tr><td>' + esc(a[0]) + '</td><td>' + esc(a[1]) + '</td></tr>'; }).join('') + '</tbody></table></section>' +
        '<div class="jd-two">' +
          '<section class="jd-sec s3"><h4><b>§06</b>ตัวชี้วัดความสำเร็จ</h4><ul>' + r.kpi.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul></section>' +
          '<section class="jd-sec s4"><h4><b>§13</b>สมรรถนะที่จำเป็น</h4><ul class="comp">' +
            r.comp.map(function (c) { return '<li><span>' + esc(c[0]) + '</span><em class="t-' + c[1].toLowerCase() + '">' + c[1] + '</em></li>'; }).join('') + '</ul></section>' +
        '</div>' +
      '</div>' +
      '<footer class="jd-foot"><span>+ อีก 9 หมวดในระดับ Role Profile · ครบ 19 หมวดใน Role Blueprint</span><a class="btn btn-pink" href="app/#signin">เขียนของตำแหน่งคุณ <span aria-hidden="true">→</span></a></footer>';
    if (!calm) { panel.classList.remove('play'); void panel.offsetWidth; panel.classList.add('play'); }
    if (window.thaiWrap) window.thaiWrap.walk(panel);
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.setAttribute('aria-selected', String(x === t)); });
      render(t.dataset.role);
    });
  });
  render('branch');

  // Sections slide in once as they come into view.
  if (!('IntersectionObserver' in window) || calm) return;
  var els = document.querySelectorAll('.sec-title, .costs li, .ba > div, .steps li, .principle, .use-list li, .tier, .pack, .faq details, .pain-photo, .uses-photo');
  els.forEach(function (e) { e.classList.add('reveal'); });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (e) { io.observe(e); });
})();

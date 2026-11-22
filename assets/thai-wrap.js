/* thai-wrap.js – Thai line breaking by phrase.
 * Browsers break Thai between any two dictionary words, so lines often end on "การ", "ของ" or start with "นี้".
 * This splits Thai text into words (Intl.Segmenter), glues words that belong together into phrases,
 * and wraps each phrase in <span class="tw"> (no break inside). Lines then break only between phrases.
 * Runs on everything added to the page (MutationObserver); text in inputs and textareas is left alone.
 */
(function () {
  if (typeof Intl === 'undefined' || !Intl.Segmenter) return; // older browsers keep the default breaking
  var seg = new Intl.Segmenter('th', { granularity: 'word' });
  var THAI = /[฀-๿]/;
  // Never start a line with these: they belong to the word before.
  var GLUE_PREV = ['นี้', 'นั้น', 'โน้น', 'แล้ว', 'อยู่', 'กัน', 'ด้วย', 'เลย', 'ๆ', 'ฯ', 'ได้', 'ไป', 'มา', 'ไว้', 'ขึ้น', 'ลง', 'ออก', 'เอง',
    'ครับ', 'ค่ะ', 'จริง', 'เท่านั้น', 'ก่อน', 'ต่อ', 'อีก', 'ครั้ง', 'คน', 'ข้อ', 'หมวด', 'วัน', 'เดือน', 'ปี', 'บาท', 'เครดิต', 'ฉบับ'];
  // Never end a line with these: they lead into the next word.
  var GLUE_NEXT = ['การ', 'ความ', 'ผู้', 'นัก', 'ไม่', 'ที่', 'ซึ่ง', 'และ', 'หรือ', 'เพื่อ', 'ของ', 'ใน', 'จาก', 'กับ', 'แต่', 'โดย', 'ให้',
    'ทุก', 'แต่ละ', 'จะ', 'ต้อง', 'ควร', 'ยัง', 'กำลัง', 'เป็น', 'มี', 'ตาม', 'ด้าน', 'เรื่อง', 'ระหว่าง', 'สำหรับ', 'ถ้า', 'หาก', 'ว่า', 'อย่าง', 'ได้รับ', 'ราย', 'ส่วน', 'ปรับ', 'เกี่ยว', 'แผน', 'ระบบ'];
  var MAX = 18; // a phrase longer than this may still break, so narrow columns never overflow
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1 };

  function phrases(text) {
    var words = Array.from(seg.segment(text), function (s) { return s.segment; });
    var out = [];
    var glueNext = false;
    var prevWord = '';
    words.forEach(function (w) {
      var last = out[out.length - 1];
      var isSpace = !w.trim();
      var thai = THAI.test(w);
      // "2 ครั้ง", "0.5 เครดิต": a number stays with its unit.
      if (thai && GLUE_PREV.indexOf(w) >= 0 && last === ' ' && /\d$/.test(out[out.length - 2] || '')) {
        out.pop();
        out[out.length - 1] += ' ' + w;
        glueNext = false;
        return;
      }
      var lastThai = last !== undefined && THAI.test(last.slice(-1));
      var join = last !== undefined && !isSpace && !/\s$/.test(last) &&
        (glueNext || /[(\[“‘"']$/.test(last) ||
          (thai && GLUE_PREV.indexOf(w) >= 0) ||
          // very short words ("โยง", "ทาง", "คน") are usually the tail of a compound the segmenter split
          (thai && lastThai && w.length <= 3 && GLUE_NEXT.indexOf(w) < 0 && last.length <= 12) ||
          // two short words in a row are usually one compound the segmenter split ("คาด|หวัง", "เชื่อม|โยง")
          (thai && lastThai && THAI.test(prevWord) && prevWord.length <= 3 && w.length <= 4 && GLUE_NEXT.indexOf(w) < 0) ||
          (!thai && /^[)\]"'”’.,:;!?…%]/.test(w))) &&
        (last + w).length <= MAX;
      if (join) out[out.length - 1] = last + w; else out.push(w);
      glueNext = thai && GLUE_NEXT.indexOf(w) >= 0;
      prevWord = w;
    });
    return out;
  }

  function wrapNode(node) {
    var text = node.nodeValue;
    if (!text || !THAI.test(text) || text.length < 6) return;
    var parent = node.parentNode;
    if (!parent || SKIP[parent.nodeName] || parent.isContentEditable || (parent.classList && (parent.classList.contains('tw') || parent.classList.contains('tw-run') || parent.classList.contains('tw-chunk')))) return;
    var parts = phrases(text);
    if (parts.length < 2) return;
    // One wrapper per text, so flex/grid parents still see a single item (no gaps between phrases).
    var run = document.createElement('span');
    run.className = 'tw-run';
    // Thai writers put a space where a clause ends, so a space is the best place for a line to end.
    // Each Thai stretch between spaces goes into one inline-block (.tw-chunk): it moves to the next line
    // whole, and only breaks between its phrases when it is wider than the whole line.
    var multi = parts.some(function (p) { return !p.trim(); });
    var box = run;
    parts.forEach(function (p, i) {
      if (!p.trim()) { box = run; run.appendChild(document.createTextNode(p)); return; }
      if (multi && box === run && THAI.test(p)) {
        box = document.createElement('span');
        box.className = 'tw-chunk';
        run.appendChild(box);
      } else if (i > 0 && parts[i - 1].trim()) box.appendChild(document.createElement('wbr'));
      if (THAI.test(p)) { var s = document.createElement('span'); s.className = 'tw'; s.textContent = p; box.appendChild(s); }
      else box.appendChild(document.createTextNode(p));
    });
    parent.replaceChild(run, node);
  }

  function walk(root) {
    if (root.nodeType === 3) { wrapNode(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName] || (root.classList && (root.classList.contains('tw') || root.classList.contains('tw-run') || root.classList.contains('tw-chunk')))) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var list = [];
    while (tw.nextNode()) list.push(tw.currentNode);
    list.forEach(wrapNode);
  }

  window.thaiWrap = { phrases: phrases, walk: walk };
  var mo = new MutationObserver(function (records) {
    records.forEach(function (r) {
      if (r.type === 'characterData') wrapNode(r.target);
      else r.addedNodes.forEach(walk);
    });
  });
  function start() { walk(document.body); mo.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();

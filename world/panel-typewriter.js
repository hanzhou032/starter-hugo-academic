// Reveal the original semantic DOM in reading order, without rebuilding links
// or changing line wrapping. The title and everything above it stay visible.
export function createPanelTypewriter(content, dialog) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const highlightName = 'panel-untyped';
  const excluded = '#panel-title,.sr-only,[aria-hidden="true"],script,style';
  const boxes = '.panel-links a,.paper-links a,.paper-filters button,input';
  let frame = 0, active = null;

  function finish() {
    if (!active) return;
    cancelAnimationFrame(frame);
    CSS.highlights.delete(highlightName);
    content.classList.remove('panel-typing');
    for (const gate of active.gates.values()) {
      delete gate.element.dataset.terminalEffect;
      delete gate.element.dataset.terminalState;
    }
    active.caret.remove();
    content.dataset.typing = 'complete';
    active = null;
  }

  function start(animate = true) {
    finish();
    content.dataset.typing = 'complete';
    if (!animate || motion.matches || !globalThis.CSS?.highlights || !globalThis.Highlight) return;

    const title = content.querySelector('#panel-title');
    function shouldAnimate(node) {
      const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      return !element.closest(excluded) && (!title || Boolean(title.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING));
    }

    // Gates hide the element itself, including borders, backgrounds, and pseudo
    // elements. Nested gates keep later cards/buttons hidden when a group opens.
    const gates = new Map();
    function addGate(element, effect) {
      if (shouldAnimate(element)) gates.set(element, { element, effect, shown: false });
    }
    for (const element of content.children) addGate(element, 'region');
    for (const element of content.querySelectorAll('.interest,.timeline-item,.news-item,.paper')) addGate(element, 'region');
    for (const element of content.querySelectorAll('img')) addGate(element, 'logo');
    for (const element of content.querySelectorAll(boxes)) addGate(element, 'box');

    const items = [], pending = new Highlight();
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    const viewport = dialog.getBoundingClientRect();
    let node;
    while ((node = walker.nextNode())) {
      const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      if (!shouldAnimate(node)) continue;
      let item;
      if (node.nodeType === Node.TEXT_NODE && node.data.trim()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const text = node.data;
        const ends = segmenter ? [...segmenter.segment(text)].map(s => s.index + s.segment.length) : [];
        if (!segmenter) { let end = 0; for (const char of text) { end += char.length; ends.push(end); } }
        item = { kind: 'text', element, node, range, ends, count: ends.length, last: -1, duration: ends.length * 24 };
        pending.add(range);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const gate = gates.get(node);
        if (gate && gate.effect !== 'region') item = { kind: 'visual', element, duration: gate.effect === 'logo' ? 440 : 300 };
      }
      if (!item) continue;
      const rect = item.range ? item.range.getBoundingClientRect() : element.getBoundingClientRect();
      item.visible = rect.top < viewport.bottom - 20;
      items.push(item);
    }
    if (!items.length) return;

    // Keep the slower 24 ms/glyph cadence, with room for the new element reveals.
    // The lower archive remains bounded; readers can always skip by interacting.
    const totals = items.reduce((sum, item) => { sum[item.visible ? 0 : 1] += item.duration; return sum; }, [0, 0]);
    let end = 320;
    for (const item of items) {
      const budget = item.visible ? 24000 : 9000;
      item.duration *= Math.min(1, budget / Math.max(1, totals[item.visible ? 0 : 1]));
      item.start = end;
      end += item.duration;
    }
    for (const gate of gates.values()) {
      gate.element.dataset.terminalEffect = gate.effect;
      gate.element.dataset.terminalState = 'waiting';
    }
    const caret = document.createElement('span');
    caret.className = 'terminal-caret';
    caret.style.opacity = '0';
    caret.setAttribute('aria-hidden', 'true');
    content.append(caret);
    content.classList.add('panel-typing');
    content.dataset.typing = 'pending';
    CSS.highlights.set(highlightName, pending);
    active = { caret, gates, scrollTop: dialog.scrollTop };
    const run = active;
    let started, settlingUntil = 0, index = 0;
    const caretRange = document.createRange();

    function revealElement(item, elapsed) {
      const ancestors = [];
      for (let element = item.element; element && element !== content; element = element.parentElement) {
        const gate = gates.get(element);
        if (gate && !gate.shown) ancestors.unshift(gate);
      }
      for (const gate of ancestors) {
        gate.shown = true;
        gate.element.dataset.terminalState = 'revealed';
        settlingUntil = Math.max(settlingUntil, elapsed + (gate.effect === 'logo' ? 520 : gate.effect === 'box' ? 440 : 200));
      }
    }

    function moveCaret(item, count) {
      if (item.kind !== 'text') { caret.style.opacity = '0'; return; }
      const offset = count ? item.ends[count - 1] : 0;
      caretRange.setStart(item.node, count > 0 ? (count > 1 ? item.ends[count - 2] : 0) : 0);
      caretRange.setEnd(item.node, offset);
      const rects = caretRange.getClientRects(), rect = rects[rects.length - 1];
      if (!rect) { caret.style.opacity = '0'; return; }
      const root = content.getBoundingClientRect();
      caret.style.opacity = '';
      caret.style.left = Math.min(content.clientWidth - 8, Math.max(0, rect.right - root.left)) + 'px';
      caret.style.top = rect.top - root.top + 'px';
      caret.style.height = Math.max(10, rect.height * .88) + 'px';
    }

    function tick(now) {
      if (active !== run) return;
      const elapsed = now - started;
      if (elapsed >= 320) content.dataset.typing = 'typing';
      while (index < items.length) {
        const item = items[index];
        if (elapsed < item.start) { if (index === 0) moveCaret(item, 0); break; }
        if (!item.entered) { revealElement(item, elapsed); item.entered = true; }
        if (item.kind === 'visual') {
          caret.style.opacity = '0';
          if (elapsed < item.start + item.duration) break;
          index++;
          continue;
        }
        const count = Math.min(item.count, Math.floor((elapsed - item.start) / Math.max(1, item.duration) * item.count));
        if (count !== item.last) {
          if (count === item.count) pending.delete(item.range);
          else item.range.setStart(item.node, count ? item.ends[count - 1] : 0);
          moveCaret(item, count);
          item.last = count;
        }
        if (count < item.count) break;
        index++;
      }
      if (index === items.length && elapsed >= settlingUntil) finish();
      else {
        if (index === items.length) caret.style.opacity = '0';
        frame = requestAnimationFrame(tick);
      }
    }
    // A newly used font weight can load when mounted. Keep content hidden until
    // fonts settle, so lines do not rewrap while they are being typed.
    document.fonts.ready.then(() => {
      if (active !== run) return;
      started = performance.now();
      frame = requestAnimationFrame(tick);
    });
  }

  // Interaction lets the visitor read, select, search, or follow a link now.
  // Ignore the queued scroll event from resetting the previous panel to its top.
  dialog.addEventListener('scroll', () => { if (active && dialog.scrollTop !== active.scrollTop) finish(); }, { passive: true });
  content.addEventListener('pointerdown', finish, { passive: true });
  content.addEventListener('focusin', finish);
  content.addEventListener('keydown', finish);
  motion.addEventListener('change', () => { if (motion.matches) finish(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
  return { start, finish };
}

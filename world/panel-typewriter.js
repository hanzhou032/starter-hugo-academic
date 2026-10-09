// Highlight ranges hide only the untyped glyphs. The real text, links, headings,
// and their final layout remain intact, including in the accessibility tree.
export function createPanelTypewriter(content, dialog) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const highlightName = 'panel-untyped';
  let frame = 0, active = null;

  function finish() {
    if (!active) return;
    cancelAnimationFrame(frame);
    CSS.highlights.delete(highlightName);
    for (const item of active.items) {
      if (item.kind === 'placeholder') item.node.placeholder = item.text;
      if (item.kind === 'image') item.node.classList.remove('terminal-image-ready');
    }
    active.caret.remove();
    content.classList.remove('panel-typing');
    content.dataset.typing = 'complete';
    active = null;
  }

  function start(animate = true) {
    finish();
    content.dataset.typing = 'complete';
    if (!animate || motion.matches || !globalThis.CSS?.highlights || !globalThis.Highlight) return;

    const items = [], pending = new Highlight();
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    const viewport = dialog.getBoundingClientRect();
    let node;
    while ((node = walker.nextNode())) {
      const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
      if (element.closest('.sr-only,[aria-hidden="true"],script,style')) continue;
      let item;
      if (node.nodeType === Node.TEXT_NODE && node.data.trim()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const text = node.data;
        const ends = segmenter ? [...segmenter.segment(text)].map(s => s.index + s.segment.length) : [];
        if (!segmenter) { let end = 0; for (const char of text) { end += char.length; ends.push(end); } }
        const heading = !!element.closest('h2');
        item = { kind: 'text', node, range, ends, count: ends.length, last: -1, duration: ends.length * (heading ? 26 : 5) };
        pending.add(range);
      } else if (element.matches('input[placeholder]')) {
        const text = element.placeholder, chars = Array.from(text);
        item = { kind: 'placeholder', node: element, text, chars, count: chars.length, last: -1, duration: chars.length * 10 };
      } else if (element.matches('img')) {
        item = { kind: 'image', node: element, count: 0, duration: 0 };
      }
      if (!item) continue;
      const rect = item.range ? item.range.getBoundingClientRect() : element.getBoundingClientRect();
      item.visible = rect.top < viewport.bottom - 20;
      items.push(item);
    }
    if (!items.length) return;

    // Give the initial viewport a readable pace. The longer archive finishes
    // below the fold within a bounded time instead of withholding papers for a minute.
    const totals = items.reduce((sum, item) => { sum[item.visible ? 0 : 1] += item.duration; return sum; }, [0, 0]);
    let end = 320;
    for (const item of items) {
      const budget = item.visible ? 4200 : 1800;
      item.duration *= Math.min(1, budget / Math.max(1, totals[item.visible ? 0 : 1]));
      item.start = end;
      end += item.duration;
      if (item.kind === 'placeholder') item.node.placeholder = '';
    }
    const caret = document.createElement('span');
    caret.className = 'terminal-caret';
    caret.setAttribute('aria-hidden', 'true');
    content.append(caret);
    content.classList.add('panel-typing');
    content.dataset.typing = 'pending';
    CSS.highlights.set(highlightName, pending);
    active = { items, caret, scrollTop: dialog.scrollTop };
    const run = active;
    let started;
    const caretRange = document.createRange();
    let index = 0;

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
        if (item.kind === 'image') { item.node.classList.add('terminal-image-ready'); index++; continue; }
        const count = Math.min(item.count, Math.floor((elapsed - item.start) / Math.max(1, item.duration) * item.count));
        if (count !== item.last) {
          if (item.kind === 'text') {
            if (count === item.count) pending.delete(item.range);
            else item.range.setStart(item.node, count ? item.ends[count - 1] : 0);
          } else item.node.placeholder = item.chars.slice(0, count).join('');
          moveCaret(item, count);
          item.last = count;
        }
        if (count < item.count) break;
        index++;
      }
      if (index === items.length) finish();
      else frame = requestAnimationFrame(tick);
    }
    // A newly used font weight can load when the panel is mounted. Keep the
    // blank opening until fonts settle, so typed lines do not rewrap mid-reveal.
    document.fonts.ready.then(() => {
      if (active !== run) return;
      started = performance.now();
      frame = requestAnimationFrame(tick);
    });
  }

  // Interaction means the visitor is ready to read, select, search, or follow a link.
  // Ignore the queued scroll event from resetting the previous panel to its top.
  dialog.addEventListener('scroll', () => { if (active && dialog.scrollTop !== active.scrollTop) finish(); }, { passive: true });
  content.addEventListener('pointerdown', finish, { passive: true });
  content.addEventListener('focusin', finish);
  content.addEventListener('keydown', finish);
  motion.addEventListener('change', () => { if (motion.matches) finish(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
  return { start, finish };
}

// Highlight ranges hide only the untyped glyphs. The real text, links, headings,
// and their final layout remain intact, including in the accessibility tree.
export function createPanelTypewriter(content, dialog) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const highlightName = 'panel-untyped';
  const staticText = '.sr-only,[aria-hidden="true"],script,style,h1,h2,h3,h4,h5,h6,.eyebrow,.panel-tag,.timeline-title,.number,.date,.paper-meta,.paper-filters,.result-count,label,button';
  let frame = 0, active = null;

  function finish() {
    if (!active) return;
    cancelAnimationFrame(frame);
    CSS.highlights.delete(highlightName);
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
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const viewport = dialog.getBoundingClientRect();
    let node;
    while ((node = walker.nextNode())) {
      const element = node.parentElement;
      if (!node.data.trim() || element.closest(staticText)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const text = node.data;
      const ends = segmenter ? [...segmenter.segment(text)].map(s => s.index + s.segment.length) : [];
      if (!segmenter) { let end = 0; for (const char of text) { end += char.length; ends.push(end); } }
      const item = { node, range, ends, count: ends.length, last: -1, duration: ends.length * 24 };
      pending.add(range);
      const rect = range.getBoundingClientRect();
      item.visible = rect.top < viewport.bottom - 20;
      items.push(item);
    }
    if (!items.length) return;

    // Body copy types at about 42 characters per second (previously 200).
    // Keep large archives bounded; interaction can always reveal everything now.
    const totals = items.reduce((sum, item) => { sum[item.visible ? 0 : 1] += item.duration; return sum; }, [0, 0]);
    let end = 320;
    for (const item of items) {
      const budget = item.visible ? 18000 : 7000;
      item.duration *= Math.min(1, budget / Math.max(1, totals[item.visible ? 0 : 1]));
      item.start = end;
      end += item.duration;
    }
    const caret = document.createElement('span');
    caret.className = 'terminal-caret';
    caret.setAttribute('aria-hidden', 'true');
    content.append(caret);
    content.classList.add('panel-typing');
    content.dataset.typing = 'pending';
    CSS.highlights.set(highlightName, pending);
    active = { caret, scrollTop: dialog.scrollTop };
    const run = active;
    let started;
    const caretRange = document.createRange();
    let index = 0;

    function moveCaret(item, count) {
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
      if (index === items.length) finish();
      else frame = requestAnimationFrame(tick);
    }
    // A newly used font weight can load when the panel is mounted. Keep the
    // body copy blank until fonts settle, so typed lines do not rewrap mid-reveal.
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

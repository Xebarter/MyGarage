/** Jump the window and nested page scrollers to the top after a route change. */

let soonRaf = 0;
let soonRaf2 = 0;
const soonTimers: number[] = [];

function isPageScroller(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  const overflowY = style.overflowY;
  if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') return false;
  return el.scrollHeight > el.clientHeight + 1;
}

export function resetPageScroll(): void {
  if (typeof window === 'undefined') return;

  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  } catch {
    /* ignore */
  }

  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    const tag = active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable) {
      active.blur();
    }
  }

  const top = { top: 0, left: 0, behavior: 'instant' as ScrollBehavior };
  window.scrollTo(top);
  document.documentElement.scrollTop = 0;
  document.documentElement.scrollLeft = 0;
  document.body.scrollTop = 0;
  document.body.scrollLeft = 0;

  document.querySelectorAll<HTMLElement>('[data-page-scroll]').forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });

  document.querySelectorAll<HTMLElement>('main').forEach((el) => {
    if (isPageScroller(el)) {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    }
  });
}

export function resetPageScrollSoon(): void {
  if (typeof window === 'undefined') return;

  if (soonRaf) cancelAnimationFrame(soonRaf);
  if (soonRaf2) cancelAnimationFrame(soonRaf2);
  soonTimers.splice(0).forEach((id) => window.clearTimeout(id));

  resetPageScroll();
  soonRaf = window.requestAnimationFrame(() => {
    resetPageScroll();
    soonRaf2 = window.requestAnimationFrame(resetPageScroll);
  });
  for (const ms of [0, 80, 200, 400]) {
    soonTimers.push(window.setTimeout(resetPageScroll, ms));
  }
}

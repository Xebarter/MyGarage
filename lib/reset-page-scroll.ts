/** Jump the window and nested page scrollers to the top after a route change. */
export function resetPageScroll(): void {
  if (typeof window === 'undefined') return;

  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  document.querySelectorAll<HTMLElement>('[data-page-scroll]').forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
}

export function resetPageScrollSoon(): void {
  resetPageScroll();
  requestAnimationFrame(() => {
    resetPageScroll();
    requestAnimationFrame(resetPageScroll);
  });
  window.setTimeout(resetPageScroll, 50);
}

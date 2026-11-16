import type Phaser from 'phaser';

/** Read the final parent bounds after browser layout; coalesce orientation/fullscreen events. */
export function bindViewportResize(game: Phaser.Game, parent: HTMLElement) {
  let frame = 0;
  const apply = () => {
    frame = 0;
    if (!game.isRunning) return;
    const { width, height } = parent.getBoundingClientRect();
    if (width > 0 && height > 0) game.scale.setParentSize(width, height);
  };
  const request = () => { if (!frame) frame = requestAnimationFrame(apply); };
  const observer = new ResizeObserver(request);
  observer.observe(parent);
  window.addEventListener('resize', request);
  window.addEventListener('orientationchange', request);
  window.visualViewport?.addEventListener('resize', request);
  document.addEventListener('fullscreenchange', request);
  request();
  game.events.once('destroy', () => {
    observer.disconnect(); cancelAnimationFrame(frame);
    window.removeEventListener('resize', request);
    window.removeEventListener('orientationchange', request);
    window.visualViewport?.removeEventListener('resize', request);
    document.removeEventListener('fullscreenchange', request);
  });
}

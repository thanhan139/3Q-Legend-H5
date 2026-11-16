import { afterEach, describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { bindViewportResize } from '../src/ui/resizeViewport';

afterEach(() => vi.unstubAllGlobals());

function fixture() {
  const events = new EventTarget();
  const viewport = new EventTarget();
  const documentEvents = new EventTarget();
  const callbacks = new Map<number, FrameRequestCallback>();
  const bounds = { width: 390, height: 844 };
  let counter = 0;
  let destroy = () => {};
  let notify = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal('window', Object.assign(events, { visualViewport: viewport }));
  vi.stubGlobal('document', documentEvents);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callbacks.set(++counter, callback); return counter; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notify = callback; }
    observe() {}
    disconnect = disconnect;
  });
  const resize = vi.fn();
  const game = { isRunning: true, scale: { setParentSize: resize }, events: {
    once: (_event: string, callback: () => void) => { destroy = callback; },
  } };
  bindViewportResize(game as unknown as Phaser.Game, { getBoundingClientRect: () => bounds } as HTMLElement);
  const flush = () => {
    for (const [id, callback] of [...callbacks]) { callbacks.delete(id); callback(0); }
  };
  return { bounds, resize, game, callbacks, disconnect, flush, notify: () => notify(), destroy: () => destroy(), events, viewport, documentEvents };
}

describe('viewport resize lifecycle', () => {
  it('uses final DOM dimensions after racing orientation/observer/fullscreen notifications', () => {
    const f = fixture();
    f.notify(); f.events.dispatchEvent(new Event('orientationchange'));
    f.viewport.dispatchEvent(new Event('resize')); f.documentEvents.dispatchEvent(new Event('fullscreenchange'));
    expect(f.callbacks.size).toBe(1);
    f.bounds.width = 844; f.bounds.height = 390;
    f.flush();
    expect(f.resize).toHaveBeenCalledExactlyOnceWith(844, 390);
    f.bounds.width = 0; f.events.dispatchEvent(new Event('resize')); f.flush();
    expect(f.resize).toHaveBeenCalledTimes(1);
  });

  it('cancels pending work and unregisters resize listeners when the game is destroyed', () => {
    const f = fixture();
    f.game.isRunning = false; f.flush();
    expect(f.resize).not.toHaveBeenCalled();
    f.game.isRunning = true; f.notify(); f.destroy();
    expect(f.disconnect).toHaveBeenCalledOnce();
    expect(f.callbacks.size).toBe(0);
    f.events.dispatchEvent(new Event('resize')); f.events.dispatchEvent(new Event('orientationchange'));
    f.viewport.dispatchEvent(new Event('resize')); f.documentEvents.dispatchEvent(new Event('fullscreenchange'));
    f.flush();
    expect(f.resize).not.toHaveBeenCalled();
  });
});

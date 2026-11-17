import type Phaser from 'phaser';

/** One cancellable presentation transaction per Core step, on Phaser's scaled clock. */
export class BattleAnimationEventBridge {
  private generation = 0;
  private timers = new Set<Phaser.Time.TimerEvent>();
  private delivered = new Set<number>();
  constructor(private readonly scene: Phaser.Scene) {}
  begin() { this.cancel(); }
  after(delay: number, callback: () => void, eventIndex?: number) {
    const generation = this.generation;
    const timer = this.scene.time.delayedCall(Math.max(0,delay),()=>{
      this.timers.delete(timer);
      if (generation !== this.generation || (eventIndex !== undefined && this.delivered.has(eventIndex))) return;
      if (eventIndex !== undefined) this.delivered.add(eventIndex);
      callback();
    });
    this.timers.add(timer);return timer;
  }
  cancel() {
    this.generation++;for (const timer of this.timers) timer.remove(false);
    this.timers.clear();this.delivered.clear();
  }
}

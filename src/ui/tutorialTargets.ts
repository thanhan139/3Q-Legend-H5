import type Phaser from 'phaser';

export type TutorialTarget = Phaser.GameObjects.GameObject & { getBounds(): Phaser.Geom.Rectangle };
const targets = new WeakMap<Phaser.Scene, Map<string, TutorialTarget>>();
export function registerTutorialTarget(scene: Phaser.Scene, id: string, target?: TutorialTarget) {
  if (!target) return;
  let entries = targets.get(scene);
  if (!entries) {
    entries = new Map();
    targets.set(scene, entries);
    scene.events.once('shutdown', () => targets.delete(scene));
  }
  entries.set(id, target);
  target.on('pointerup', () => window.dispatchEvent(new CustomEvent('3q:tutorial-target', { detail: id })));
}
export function tutorialTarget(scene: Phaser.Scene, id: string) {
  const target = targets.get(scene)?.get(id);
  return target?.scene ? target.getBounds() : undefined;
}

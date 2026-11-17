import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

it('ships a real RGBA frame atlas and a high-resolution dedicated Dai Qiao portrait', () => {
  const atlas = readFileSync('public/assets/summon/smooth/card-atlas.png');
  expect(atlas.readUInt32BE(16)/atlas.readUInt32BE(20)).toBeCloseTo(2/3);
  expect(atlas[25]).toBe(6);
  const portrait = readFileSync('public/assets/summon/smooth/da-qiao.png');
  expect(portrait.readUInt32BE(16)).toBeGreaterThanOrEqual(1024);
  expect(portrait.readUInt32BE(20)).toBeGreaterThanOrEqual(1024);
});

import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {REMASTER_RIGS,RIG_PARTS} from '../src/data/characterRemaster';
import {characterRigPose,REST_POSE} from '../src/ui/characterRigPose';

describe('adult articulated battle character pipeline',()=>{
  it('imports five identity-specific transparent atlases with sixteen valid source frames',()=>{
    expect(Object.keys(REMASTER_RIGS)).toEqual(['zhao-yun','guan-yu','liu-bei','zhang-fei','dian-wei']);
    const hashes=new Set();
    for(const spec of Object.values(REMASTER_RIGS)){
      const bytes=readFileSync('public/'+spec.texture);expect(bytes.subarray(1,4).toString()).toBe('PNG');
      expect(bytes[25]).toBe(6); // RGBA PNG; preserve generated alpha, no opaque pasted concept.
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(spec.sha256);hashes.add(spec.sha256);
      expect(spec.texture.endsWith('parts-v2.png')).toBe(true);
      const reference=readFileSync('docs/battle/remaster/source/normalized/'+spec.provenance.sourceHeroKey+'.png');
      expect(createHash('sha256').update(reference).digest('hex')).toBe(spec.provenance.referenceSha256);
      expect(Object.keys(spec.frames)).toHaveLength(16);
      for(const part of RIG_PARTS){const [x,y,w,h]=spec.frames[part];
        expect(w).toBeGreaterThan(8);expect(h).toBeGreaterThan(8);expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);
        expect(x+w).toBeLessThanOrEqual(spec.size[0]);expect(y+h).toBeLessThanOrEqual(spec.size[1]);
      }
    }
    expect(hashes.size).toBe(5);
  });
  it.each(Object.keys(REMASTER_RIGS))('%s has breathing, an alternating gait and a distinct skill contact pose',hero=>{
    const a=characterRigPose(hero,'idle',0),b=characterRigPose(hero,'idle',600);
    expect(b.torso).not.toBe(a.torso);expect(b.nearKnee).toBe(a.nearKnee); // idle feet stay planted
    const left=characterRigPose(hero,'run',112.5),right=characterRigPose(hero,'run',337.5);
    expect(left.nearLeg*right.nearLeg).toBeLessThan(0);expect(left.nearKnee).not.toBe(right.nearKnee);
    expect(left.farLeg).toBe(-left.nearLeg);
    const strike=characterRigPose(hero,'attack',420,700),skill=characterRigPose(hero,'skill',420,700);
    expect(strike).not.toEqual(skill);expect(strike.nearArm).not.toBe(REST_POSE.nearArm);
    expect(characterRigPose(hero,'attack',700,700)).toEqual(REST_POSE);
    const hit=characterRigPose(hero,'hit',125,250),critical=characterRigPose(hero,'criticalHit',125,250);
    expect(critical.torso).toBeGreaterThan(hit.torso);
    const death=characterRigPose(hero,'death',430,430);expect(death.hipY).toBeGreaterThan(REST_POSE.hipY);expect(death.nearKnee).toBeGreaterThan(80);
  });
});

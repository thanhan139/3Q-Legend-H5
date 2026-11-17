import {describe,it,expect} from 'vitest';
import {solveArm} from '../src/ui/characterRigIK';
describe('polearm hand socket IK',()=>{
  it.each([[10,25],[-20,-10],[27,16],[-10,32]])('reaches (%s,%s) without stretching either bone',(x,y)=>{
    for(const bend of [-1,1]){
      const p=solveArm(x,y,20,19,bend),a=p.shoulder*Math.PI/180,b=p.elbow*Math.PI/180;
      expect(-Math.sin(a)*20-Math.sin(a+b)*19).toBeCloseTo(x,8);
      expect(Math.cos(a)*20+Math.cos(a+b)*19).toBeCloseTo(y,8);
    }
  });
  it('clamps unreachable and coincident targets to finite joint rotations',()=>{
    for(const [x,y] of [[0,0],[1000,1000]]){
      const p=solveArm(x,y,20,19);expect(Number.isFinite(p.shoulder)&&Number.isFinite(p.elbow)).toBe(true);
    }
  });
});

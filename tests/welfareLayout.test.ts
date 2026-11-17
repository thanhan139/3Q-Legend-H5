import {describe,it,expect} from 'vitest';
import {welfareLayout} from '../src/ui/welfareLayout';
import {contains} from '../src/ui/lobbyContentLayout';

describe('responsive welfare grid',()=>{
  it.each([[1920,1080],[1280,720],[844,390]])('keeps three columns and seven usable reward cells at %ix%i',(w,h)=>{
    const scale=Math.min(w/1280,h/720),width=w/scale,height=h/scale,l=welfareLayout(width,height);
    expect(l.sidebar.x+l.sidebar.width).toBeLessThan(l.host.x);
    expect(l.host.x+l.host.width).toBeLessThan(l.panel.x);
    expect(l.panel.x+l.panel.width).toBeLessThanOrEqual(width-24);
    expect(l.days).toHaveLength(7);
    for(const day of l.days){expect(contains(l.body,day)).toBe(true);expect(day.width*scale).toBeGreaterThan(70);}
    for(let i=0;i<l.days.length;i++)for(let j=i+1;j<l.days.length;j++){
      const a=l.days[i],b=l.days[j];
      expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);
    }
    expect(l.hostess.height/541).toBeGreaterThanOrEqual(.8);
    expect(l.hostess.height/541).toBeLessThanOrEqual(.85);
    expect(l.tabs.every(t=>t.height===60)).toBe(true);
    expect(l.back.y+l.back.height).toBeLessThan(l.panel.y);
  });
});

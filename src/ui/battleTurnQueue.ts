import type {BattleUnit} from '../domain/battle';

/** Forecast only: copies scheduling fields, never advances or mutates Battle Core.
 * Rebuilt from confirmed state after actions; later deaths/statuses can change the forecast.
 */
export function battleTurnQueue(units:readonly BattleUnit[],length=6):BattleUnit[]{
  const schedule=units.filter(u=>u.hp>0).map((unit,order)=>({unit,order,next:unit.nextActionAt})),result:BattleUnit[]=[];
  for(let i=0;i<length&&schedule.length;i++){
    schedule.sort((a,b)=>a.next-b.next||b.unit.speed-a.unit.speed||a.order-b.order);
    const next=schedule[0];result.push(next.unit);next.next+=100/next.unit.speed;
  }
  return result;
}

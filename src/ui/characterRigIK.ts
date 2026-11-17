/** Two rigid bones, measured from the downward local axis. No gameplay dependency. */
export function solveArm(dx:number,dy:number,upper:number,fore:number,bend=1){
  const distance=Math.min(upper+fore-.001,Math.max(Math.abs(upper-fore)+.001,Math.hypot(dx,dy)));
  const elbow=bend*Math.acos(Math.max(-1,Math.min(1,(distance*distance-upper*upper-fore*fore)/(2*upper*fore))));
  const shoulder=Math.atan2(-dx,dy)-Math.atan2(fore*Math.sin(elbow),upper+fore*Math.cos(elbow));
  return{shoulder:shoulder*180/Math.PI,elbow:elbow*180/Math.PI};
}

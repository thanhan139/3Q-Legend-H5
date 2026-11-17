export function inventoryCategoryLayout(width:number,height:number){
 const mobile=height<520||width<1000,panelWidth=Math.min(1080,width-40),panelHeight=mobile?310:414;
 const x=(width-panelWidth)/2,y=Math.max(12,(height-panelHeight)/2),pitch=mobile?132:Math.min(146,(panelWidth-32)/7);
 return{mobile,x,y,width:panelWidth,height:panelHeight,pitch,icon:mobile?74:98,row:mobile?106:146,
  top:y+(mobile?48:64),viewport:panelWidth-32,content:7*pitch};
}

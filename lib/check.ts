import type {BoardSpec,Cmd} from './lesson';
import {fnOf} from '@/app/Board';
type R={x0:number;x1:number;y0:number;y1:number};
const box=(m:Cmd):R=>{const px=(m.size||4.5)*6,w=(m.text||'').length*px*0.045,h=px/6,x=m.x??0,y=m.y??0;return {x0:x-w/2,x1:x+w/2,y0:y-h/2,y1:y+h/2}};
const ov=(a:R,b:R)=>a.x0<b.x1&&a.x1>b.x0&&a.y0<b.y1&&a.y1>b.y0;
// Free, instant checks + automatic layout fixes (clamping into the safe zone, nudging overlapping labels).
export function checkBoard(b:BoardSpec):{board:BoardSpec;issues:string[];fixed:number}{
 const issues:string[]=[];let fixed=0;const cmds:Cmd[]=b.cmds.map(m=>({...m}));
 const cl=(v:number|undefined,lo:number,hi:number)=>{if(v===undefined||isNaN(v))return v;const n=Math.min(hi,Math.max(lo,v));if(n!==v)fixed++;return n};
 for(const m of cmds){
  if(m.t==='plot'){m.x=cl(m.x,5,60);m.y=cl(m.y,14,60);if(m.x!==undefined&&m.w!==undefined&&m.x+m.w>95){m.w=95-m.x;fixed++}
   if(m.y!==undefined&&m.h!==undefined&&m.y+m.h>86){m.h=86-m.y;fixed++}
   const f=fnOf(m.fn||'');if(!f)issues.push(`Plot function "${m.fn}" cannot be parsed`);
   else{const[x0,x1]=m.xr||[-5,5],[y0,y1]=m.yr||[-5,5];let ok=0;for(let i=0;i<=60;i++){const y=f(x0+(x1-x0)*i/60);if(isFinite(y)&&y>=y0&&y<=y1)ok++}if(!ok)issues.push('Plot curve is blank in the chosen ranges')}}
  else{m.x=cl(m.x,5,95);m.y=cl(m.y,14,86);m.x2=cl(m.x2,5,95);m.y2=cl(m.y2,14,86)}
  if(m.t==='chain'&&(m.x??0)+((m.atoms?.length||1)-1)*(m.d||8)*0.866>95)issues.push('Chain runs off the board');
 }
 const tx=cmds.filter(m=>m.t==='text');
 tx.forEach((m,i)=>{for(let t=0;t<8&&tx.slice(0,i).some(o=>ov(box(m),box(o)));t++){const a=box(m);m.y=(m.y??0)+(a.y1-a.y0)+1;fixed++}
  if(tx.slice(0,i).some(o=>ov(box(m),box(o))))issues.push(`Label "${m.text}" overlaps another label`);
  if((m.y??0)>86)issues.push(`Label "${m.text}" runs off the board`)});
 return {board:{...b,cmds},issues,fixed};}

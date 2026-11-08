'use client';
import {useEffect,useRef,useState} from 'react';
import type {BoardSpec,Cmd} from '@/lib/lesson';
type P={x:number;y:number};
const COL:Record<string,string>={w:'#f4f4ee',y:'#ffe066',b:'#8ecae6',p:'#ff9ecf',o:'#ffb347'};
const W=1000,H=600,PI=Math.PI;
export function fnOf(s:string):((x:number)=>number)|null{
 const l=s.toLowerCase();if(!/^[0-9x+\-*/^().\s]*$/.test(l.replace(/\b(sin|cos|tan|sqrt|abs|exp|ln|pi)\b/g,'')))return null;
 const e=l.replace(/(\d)\s*x/g,'$1*x').replace(/x\s*\^\s*(\d+(\.\d+)?)/g,'Math.pow(x,$1)').replace(/\^/g,'**')
  .replace(/\bpi\b/g,'Math.PI').replace(/\b(sin|cos|tan|sqrt|abs|exp)\b/g,'Math.$1').replace(/\bln\b/g,'Math.log');
 try{return new Function('x','return '+e) as (x:number)=>number}catch{return null}}
function paint(g:CanvasRenderingContext2D,b:BoardSpec|undefined,shown:number,us:P[][]){
  const gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#24473a');gr.addColorStop(1,'#1b352b');g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.strokeStyle='#8a5a2b';g.lineWidth=12;g.strokeRect(0,0,W,H);g.lineCap='round';g.lineJoin='round';
  const X=(v=0)=>v/100*W,Y=(v=0)=>v/100*H;let seed=1;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-.5};
  const line=(a:P,z:P,k:string,dash=false)=>{g.strokeStyle=k;g.setLineDash(dash?[10,8]:[]);
   for(let n=0;n<2;n++){g.globalAlpha=n?.45:.95;g.lineWidth=n?1.6:2.6;const j=n?1.4:0.6;g.beginPath();g.moveTo(a.x+rnd()*j,a.y+rnd()*j);g.lineTo(z.x+rnd()*j,z.y+rnd()*j);g.stroke()}g.globalAlpha=1;g.setLineDash([])};
  const txt=(s:string,x:number,y:number,k:string,px=28,al:CanvasTextAlign='center')=>{g.font=`600 ${px}px Caveat, "Comic Sans MS", cursive`;g.fillStyle=k;g.textAlign=al;g.textBaseline='middle';g.fillText(s,x,y)};
  const head=(f:P,t:P,k:string)=>{const a=Math.atan2(t.y-f.y,t.x-f.x);for(const s of[-.45,.45])line(t,{x:t.x-16*Math.cos(a+s),y:t.y-16*Math.sin(a+s)},k)};
  const poly=(ps:P[],k:string,close:boolean)=>ps.forEach((p,n)=>{const q=ps[n+1]||(close?ps[0]:null);if(q)line(p,q,k)});
  const one=(m:Cmd)=>{const k=COL[m.c||'w']||COL.w;const pt=(x?:number,y?:number):P=>({x:X(x),y:Y(y)});
   switch(m.t){
   case 'text':txt(m.text||'',X(m.x),Y(m.y),k,(m.size||4.5)*H/100);break;
   case 'frac':{const w=Math.max((m.num||'').length,(m.den||'').length)*13+14;txt(m.num||'',X(m.x),Y(m.y)-22,k);line({x:X(m.x)-w/2,y:Y(m.y)},{x:X(m.x)+w/2,y:Y(m.y)},k);txt(m.den||'',X(m.x),Y(m.y)+22,k);break}
   case 'line':case 'arrow':{const a=pt(m.x,m.y),z=pt(m.x2,m.y2);
    if(m.curve){const q={x:(a.x+z.x)/2-(z.y-a.y)*m.curve*.5,y:(a.y+z.y)/2+(z.x-a.x)*m.curve*.5};g.strokeStyle=k;g.lineWidth=2.6;g.setLineDash(m.dash?[10,8]:[]);
     g.beginPath();g.moveTo(a.x,a.y);g.quadraticCurveTo(q.x,q.y,z.x,z.y);g.stroke();g.setLineDash([]);if(m.t==='arrow')head(q,z,k)}
    else{line(a,z,k,m.dash);if(m.t==='arrow')head(a,z,k)}break}
   case 'rect':{const x=X(m.x),y=Y(m.y),w=X(m.w),h=Y(m.h);poly([{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}],k,true);break}
   case 'circle':case 'ellipse':g.strokeStyle=k;g.lineWidth=2.6;g.beginPath();g.ellipse(X(m.x),Y(m.y),m.t==='circle'?X(m.r||5):X(m.w||6),m.t==='circle'?X(m.r||5):Y(m.h||6),0,0,2*PI);g.stroke();break;
   case 'poly':case 'path':poly((m.pts||[]).map(p=>pt(p[0],p[1])),k,m.t==='poly');break;
   case 'angle':{const v=pt(m.x,m.y),r=X(m.r||6),a1=(m.a1||0)*PI/180,a2=(m.a2||90)*PI/180;const u=(a:number)=>({x:Math.cos(a),y:-Math.sin(a)});
    if(Math.abs((m.a2||90)-(m.a1||0))===90){const s=r*.7,p1=u(a1),p2=u(a2);poly([{x:v.x+s*p1.x,y:v.y+s*p1.y},{x:v.x+s*(p1.x+p2.x),y:v.y+s*(p1.y+p2.y)},{x:v.x+s*p2.x,y:v.y+s*p2.y}],k,false)}
    else{g.strokeStyle=k;g.lineWidth=2.6;g.beginPath();g.arc(v.x,v.y,r,-a2,-a1);g.stroke()}
    if(m.text){const md=u((a1+a2)/2);txt(m.text,v.x+md.x*r*1.7,v.y+md.y*r*1.7,k,26)}break}
   case 'plot':{const bx=X(m.x),by=Y(m.y),bw=X(m.w),bh=Y(m.h),[x0,x1]=m.xr||[-5,5],[y0,y1]=m.yr||[-5,5];
    const px=(v:number)=>bx+(v-x0)/(x1-x0)*bw,py=(v:number)=>by+bh-(v-y0)/(y1-y0)*bh;
    const ox=Math.min(Math.max(px(0),bx),bx+bw),oy=Math.min(Math.max(py(0),by),by+bh),w=COL.w;
    line({x:bx,y:oy},{x:bx+bw,y:oy},w);line({x:ox,y:by+bh},{x:ox,y:by},w);head({x:bx,y:oy},{x:bx+bw,y:oy},w);head({x:ox,y:by+bh},{x:ox,y:by},w);
    txt('x',bx+bw+14,oy,w,24);txt('y',ox,by-14,w,24);
    const st=(r:number)=>r>12?2:1;
    for(let v=Math.ceil(x0);v<=x1;v+=st(x1-x0))if(v){line({x:px(v),y:oy-5},{x:px(v),y:oy+5},w);txt(''+v,px(v),oy+18,w,18)}
    for(let v=Math.ceil(y0);v<=y1;v+=st(y1-y0))if(v){line({x:ox-5,y:py(v)},{x:ox+5,y:py(v)},w);txt(''+v,ox-16,py(v),w,18)}
    (m.asym||[]).forEach(a=>line({x:px(a),y:by},{x:px(a),y:by+bh},COL.p,true));
    const f=fnOf(m.fn||'');if(f){g.strokeStyle=k==='#f4f4ee'?COL.y:k;g.lineWidth=3.2;g.beginPath();let on=false,lp=0;
     for(let n=0;n<=300;n++){const xv=x0+(x1-x0)*n/300,yv=f(xv),yy=py(yv);
      if(!isFinite(yv)||yv<y0-(y1-y0)*.05||yv>y1+(y1-y0)*.05||(on&&Math.abs(yy-lp)>bh*.6)){on=false;continue}
      if(on)g.lineTo(px(xv),yy);else g.moveTo(px(xv),yy);on=true;lp=yy}g.stroke();
     (m.marks||[]).forEach(a=>{const yv=f(a);if(!isFinite(yv))return;g.fillStyle=COL.o;g.beginPath();g.arc(px(a),py(yv),6,0,2*PI);g.fill();txt(`(${a}, ${+yv.toFixed(2)})`,px(a)+10,py(yv)-18,COL.o,22,'left')})}break}
   case 'chain':{const L=X(m.d||8),at=m.atoms||['C'],bd=m.bonds||[];const ps:P[]=[pt(m.x,m.y)];
    at.forEach((_,n)=>{if(n)ps.push({x:ps[n-1].x+L*Math.cos(PI/6),y:ps[n-1].y+(n%2?1:-1)*L*Math.sin(PI/6)})});
    const lab=(n:number)=>at[n]!=='C';
    for(let n=0;n<at.length-1;n++){const a=ps[n],z=ps[n+1],d=Math.hypot(z.x-a.x,z.y-a.y),ux=(z.x-a.x)/d,uy=(z.y-a.y)/d,o=bd[n]||1;
     const s={x:a.x+(lab(n)?18:0)*ux,y:a.y+(lab(n)?18:0)*uy},e={x:z.x-(lab(n+1)?18:0)*ux,y:z.y-(lab(n+1)?18:0)*uy};
     (o===1?[0]:o===2?[-4,4]:[-7,0,7]).forEach(f=>line({x:s.x-uy*f,y:s.y+ux*f},{x:e.x-uy*f,y:e.y+ux*f},k))}
    at.forEach((e,n)=>{if(lab(n))txt(e,ps[n].x,ps[n].y,e==='O'?COL.p:e==='N'?COL.b:COL.y,34)});break}
   case 'ring':{const n=m.n||6,r=X(m.r||8),c=pt(m.x,m.y);const v=(s:number,f=1)=>({x:c.x+r*f*Math.cos(-PI/2+2*PI*s/n),y:c.y+r*f*Math.sin(-PI/2+2*PI*s/n)});
    for(let s=0;s<n;s++)line(v(s),v(s+1),k);
    if(m.aromatic&&n%2===0)for(let s=0;s<n;s+=2){const a=v(s,.72),z=v(s+1,.72);line({x:a.x*.85+z.x*.15,y:a.y*.85+z.y*.15},{x:z.x*.85+a.x*.15,y:z.y*.85+a.y*.15},k)}break}
   case 'box3d':{const x=X(m.x),y=Y(m.y),w=X(m.w),h=Y(m.h),d=X(m.d||8)*.7,B=(px:number,py:number):P=>({x:px,y:py});
    const f=[B(x,y),B(x+w,y),B(x+w,y+h),B(x,y+h)],bk=f.map(p=>B(p.x+d,p.y-d));
    poly(f,k,true);line(f[0],bk[0],k);line(bk[0],bk[1],k);line(bk[1],f[1],k);line(f[2],bk[2],k);line(bk[2],bk[1],k);
    line(f[3],bk[3],k,true);line(bk[3],bk[2],k,true);line(bk[3],bk[0],k,true);break}
   }};
  seed=1;
  if(!b){txt('Ask the teacher to draw something ✏️',500,300,COL.w,40)}
  else{txt(b.title,500,46,COL.y,48);line({x:300,y:76},{x:700,y:76},COL.y);
   b.cmds.slice(0,shown).forEach(m=>{try{one(m)}catch{}});if(shown>=b.cmds.length)txt('✎ '+b.caption,500,H-34,COL.b,30)}
  for(const s of us){g.strokeStyle=COL.p;g.lineWidth=3;g.beginPath();s.forEach((p,n)=>n?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke()}}
export function renderPng(b:BoardSpec):string{const c=document.createElement('canvas');c.width=W;c.height=H;paint(c.getContext('2d')!,b,b.cmds.length,[]);return c.toDataURL('image/png').split(',')[1]}
export default function Board({boards,onClear}:{boards:BoardSpec[];onClear:()=>void}){
 const ref=useRef<HTMLCanvasElement>(null);const strokes=useRef<P[][]>([]);const cur=useRef<P[]|null>(null);
 const [i,setI]=useState(0);const [shown,setShown]=useState(0);const [rp,setRp]=useState(0);
 const b=boards[Math.min(i,boards.length-1)];
 useEffect(()=>{if(boards.length)setI(boards.length-1)},[boards.length]);
 useEffect(()=>{setShown(0);if(!b)return;const t=setInterval(()=>setShown(s=>{if(s>=b.cmds.length){clearInterval(t);return s}return s+1}),650);return()=>clearInterval(t)},[b,rp]);
 useEffect(()=>{document.fonts?.load('600 24px Caveat').then(()=>setRp(r=>r))},[]);
 const draw=()=>{const c=ref.current;if(!c)return;paint(c.getContext('2d')!,b,shown,[...strokes.current,...(cur.current?[cur.current]:[])])};
 useEffect(draw);
 const pt=(e:React.PointerEvent):P=>{const c=ref.current!,r=c.getBoundingClientRect();return {x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}};
 return <div className="space-y-1"><canvas ref={ref} width={W} height={H} className="w-full touch-none rounded-lg"
  onPointerDown={e=>{cur.current=[pt(e)]}} onPointerMove={e=>{if(cur.current){cur.current.push(pt(e));draw()}}}
  onPointerUp={()=>{if(cur.current)strokes.current.push(cur.current);cur.current=null;draw()}}/>
  <div className="flex flex-wrap items-center gap-2"><button className="btn" disabled={i<1} onClick={()=>setI(i-1)}>◀</button>
   <span className="text-sm">Board {boards.length?Math.min(i,boards.length-1)+1:0}/{boards.length}</span>
   <button className="btn" disabled={i>=boards.length-1} onClick={()=>setI(i+1)}>▶</button>
   <button className="btn" onClick={()=>setRp(r=>r+1)}>⟲ Replay</button>
   <button className="btn" onClick={()=>setShown(b?.cmds.length||0)}>⏭ Show all</button>
   <button className="btn" onClick={()=>{strokes.current=[];onClear()}}>Clear</button>
   <span className="text-xs opacity-70">Pink chalk = your drawing.</span>{b?.note&&<span className="text-xs text-green-600 dark:text-green-400">✔ Self-check{b.score!==undefined?` ${b.score}/10`:''} — {b.note}</span>}</div></div>}

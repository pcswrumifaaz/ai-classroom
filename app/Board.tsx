'use client';
import {useEffect,useRef} from 'react';
import type {Cmd} from '@/lib/lesson';
type P={x:number;y:number};
export default function Board({cmds,onClear}:{cmds:Cmd[];onClear:()=>void}){
 const ref=useRef<HTMLCanvasElement>(null);const strokes=useRef<P[][]>([]);const cur=useRef<P[]|null>(null);
 const draw=()=>{const c=ref.current;if(!c)return;const g=c.getContext('2d')!;const W=c.width,H=c.height;
  g.clearRect(0,0,W,H);g.fillStyle='#fff';g.fillRect(0,0,W,H);g.strokeStyle='#4f46e5';g.fillStyle='#111';g.lineWidth=2;g.font='16px sans-serif';
  const X=(v=0)=>v/100*W,Y=(v=0)=>v/100*H;
  for(const m of cmds){g.beginPath();
   if(m.t==='rect')g.strokeRect(X(m.x),Y(m.y),X(m.w??10),Y(m.h??10));
   else if(m.t==='circle'){g.arc(X(m.x),Y(m.y),X(m.r??5),0,7);g.stroke()}
   else if(m.t==='line'||m.t==='arrow'){g.moveTo(X(m.x),Y(m.y));g.lineTo(X(m.x2),Y(m.y2));g.stroke();
    if(m.t==='arrow'){const a=Math.atan2(Y(m.y2)-Y(m.y),X(m.x2)-X(m.x));g.beginPath();
     g.moveTo(X(m.x2),Y(m.y2));g.lineTo(X(m.x2)-12*Math.cos(a-0.4),Y(m.y2)-12*Math.sin(a-0.4));
     g.moveTo(X(m.x2),Y(m.y2));g.lineTo(X(m.x2)-12*Math.cos(a+0.4),Y(m.y2)-12*Math.sin(a+0.4));g.stroke()}}
   else if(m.t==='text')g.fillText(m.text??'',X(m.x),Y(m.y));}
  g.strokeStyle='#e11d48';
  for(const s of [...strokes.current,...(cur.current?[cur.current]:[])]){g.beginPath();s.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke()}};
 useEffect(draw,[cmds]);
 const pt=(e:React.PointerEvent):P=>{const c=ref.current!,r=c.getBoundingClientRect();return {x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}};
 return <div className="space-y-1"><canvas ref={ref} width={800} height={450} className="w-full touch-none rounded-lg border border-slate-300"
  onPointerDown={e=>{cur.current=[pt(e)]}} onPointerMove={e=>{if(cur.current){cur.current.push(pt(e));draw()}}}
  onPointerUp={()=>{if(cur.current)strokes.current.push(cur.current);cur.current=null;draw()}}/>
  <button className="btn" onClick={()=>{strokes.current=[];onClear()}}>Clear board</button>
  <span className="ml-2 text-xs opacity-70">Draw with mouse/finger. The teacher draws here too.</span></div>}

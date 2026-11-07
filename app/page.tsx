'use client';
import {useEffect,useState} from 'react';
import {PROVIDERS,Provider,Cfg} from '@/lib/providers';
import {Lesson,Cmd,AGENTS,generateLesson,orchestrate,gradeShort} from '@/lib/lesson';
import {extractPdf} from '@/lib/pdf';
import Board from './Board';
import {exportPptx,toMarkdown,download} from '@/lib/export';
type Turn={who:string;text:string};
export default function Home(){
 const [cfg,setCfg]=useState<Cfg>({provider:'gemini',key:'',model:PROVIDERS.gemini.model});
 const [lesson,setLesson]=useState<Lesson|null>(null);
 const [tab,setTab]=useState('settings');const [slide,setSlide]=useState(0);
 const [topic,setTopic]=useState('');const [doc,setDoc]=useState('');
 const [busy,setBusy]=useState(false);const [err,setErr]=useState('');
 const [log,setLog]=useState<Turn[]>([]);const [q,setQ]=useState('');
 const [picked,setPicked]=useState<Record<number,number>>({});
 const [cmds,setCmds]=useState<Cmd[]>([]);const [sa,setSa]=useState<Record<number,string>>({});const [fb,setFb]=useState<Record<number,{score:number;feedback:string}>>({});
 useEffect(()=>{try{const c=localStorage.getItem('cfg'),l=localStorage.getItem('lesson');
  if(c){setCfg(JSON.parse(c));setTab('lesson')}if(l){const x=JSON.parse(l);setLesson(x);setLog(x.dialogue)}}catch{}},[]);
 const saveCfg=(c:Cfg)=>{setCfg(c);localStorage.setItem('cfg',JSON.stringify(c))};
 const speak=(t:Turn)=>{if(!('speechSynthesis' in window))return;const a=AGENTS[t.who],v=speechSynthesis.getVoices();
  const u=new SpeechSynthesisUtterance(t.text);if(v.length)u.voice=v[a.v%v.length];u.pitch=a.pitch;u.rate=a.rate;speechSynthesis.speak(u)};
 const run=async(f:()=>Promise<void>)=>{setBusy(true);setErr('');try{await f()}catch(e:any){setErr(e.message)}setBusy(false)};
 const gen=()=>run(async()=>{const l=await generateLesson(cfg,topic,doc);setLesson(l);setLog(l.dialogue);setSlide(0);setPicked({});
  localStorage.setItem('lesson',JSON.stringify(l));setTab('lesson')});
 const ask=()=>run(async()=>{if(!lesson||!q.trim())return;const me={who:'You',text:q};setLog(x=>[...x,me]);setQ('');
  const t=await orchestrate(cfg,lesson,slide,me.text);setLog(x=>[...x,...t]);setCmds(c=>[...c,...t.flatMap((u:any)=>Array.isArray(u.draw)?u.draw:[])]);t.forEach(speak)});
 const sketch=()=>run(async()=>{if(!lesson)return;const t=await orchestrate(cfg,lesson,slide,'Teacher, please sketch a simple labeled diagram for this slide on the whiteboard.');setLog(x=>[...x,...t]);setCmds(c=>[...c,...t.flatMap((u:any)=>Array.isArray(u.draw)?u.draw:[])]);t.forEach(speak)});
 const upload=(f?:File)=>run(async()=>{if(!f)return;setDoc(/pdf$/i.test(f.name)?await extractPdf(f):await f.text())});
 const mic=()=>{const R=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!R)return setErr('Speech recognition is not supported in this browser.');
  const r=new R();r.onresult=(e:any)=>setQ(e.results[0][0].transcript);r.start()};
 const tabs=['settings','lesson','classroom','quiz','project'];
 const s=lesson?.slides[slide];const p=PROVIDERS[cfg.provider];
 return <main className="mx-auto max-w-4xl space-y-4 p-4">
  <h1 className="text-2xl font-bold">🎓 AI Classroom</h1>
  <nav className="flex flex-wrap gap-2">{tabs.map(t=><button key={t} onClick={()=>setTab(t)} className={'rounded-lg px-3 py-1 text-sm '+(tab===t?'bg-indigo-600 text-white':'card !p-1 !px-3')}>{t}</button>)}</nav>
  {err&&<div className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{err}</div>}
  {busy&&<div className="animate-pulse text-sm">Working… (retries automatically on rate limits)</div>}
  {tab==='settings'&&<div className="card space-y-3">
   <p className="text-sm">⏱ 1-minute setup: pick Gemini, open the link, create a free key, paste it below. Keys stay in your browser and go only to the provider.</p>
   <select className="inp" value={cfg.provider} onChange={e=>{const k=e.target.value as Provider;saveCfg({...cfg,provider:k,model:PROVIDERS[k].model})}}>
    {Object.entries(PROVIDERS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select>
   <a className="text-sm text-indigo-500 underline" href={p.link} target="_blank">Get a free key ↗</a> <span className="text-sm">{p.tip}</span>
   <input className="inp" type="password" placeholder="API key" value={cfg.key} onChange={e=>saveCfg({...cfg,key:e.target.value})}/>
   <input className="inp" placeholder="Model" value={cfg.model} onChange={e=>saveCfg({...cfg,model:e.target.value})}/>
   <hr/><input className="inp" placeholder="Topic (e.g. How photosynthesis works)" value={topic} onChange={e=>setTopic(e.target.value)}/>
   <input type="file" accept=".txt,.md,.pdf" onChange={e=>upload(e.target.files?.[0])} className="text-sm"/>{doc&&<span className="text-xs"> 📄 {doc.length} characters loaded</span>}
   <button className="btn" disabled={busy||(!topic&&!doc)} onClick={gen}>Generate lesson</button></div>}
  {tab!=='settings'&&!lesson&&<div className="card">No lesson yet — create one in Settings.</div>}
  {lesson&&tab==='lesson'&&s&&<div className="card space-y-3"><h2 className="text-xl font-semibold">{lesson.title}</h2>
   <div className="text-xs opacity-70">Outline: {lesson.outline.join(' → ')}</div>
   <div className="rounded-lg bg-indigo-50 p-4 dark:bg-slate-800"><h3 className="font-semibold">{slide+1}. {s.title}</h3>
    <ul className="list-disc pl-5">{s.bullets.map((b,i)=><li key={i}>{b}</li>)}</ul></div>
   <div className="flex flex-wrap gap-2"><button className="btn" disabled={slide===0} onClick={()=>setSlide(slide-1)}>◀</button>
    <button className="btn" disabled={slide>=lesson.slides.length-1} onClick={()=>setSlide(slide+1)}>▶</button>
    <button className="btn" onClick={()=>{speechSynthesis.cancel();speak({who:'Teacher',text:s.script})}}>🔊 Narrate</button>
    <button className="btn" onClick={()=>exportPptx(lesson)}>Export .pptx</button>
    <button className="btn" onClick={()=>download('lesson.md',toMarkdown(lesson))}>.md</button>
    <button className="btn" onClick={()=>download('lesson.json',JSON.stringify(lesson,null,2))}>.json</button></div></div>}
  {lesson&&tab==='classroom'&&<div className="card space-y-3">
   <div className="max-h-96 space-y-2 overflow-auto">{log.map((t,i)=><div key={i} className="flex gap-2 text-sm cursor-pointer" onClick={()=>t.who!=='You'&&speak(t)}>
    <span className="text-2xl">{AGENTS[t.who]?.emoji??'🧑'}</span><div><b>{t.who}</b><div>{t.text}</div></div></div>)}</div>
   <div className="flex gap-2"><input className="inp" placeholder="✋ Raise a hand — ask a question" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()}/>
    <button className="btn" onClick={mic}>🎤</button><button className="btn" disabled={busy} onClick={ask}>Ask</button></div>
   <Board cmds={cmds} onClear={()=>setCmds([])}/><button className="btn" disabled={busy} onClick={sketch}>🖍 Teacher, draw this slide</button>
   <p className="text-xs opacity-70">One orchestrator call per question decides who answers. Click a message to hear it.</p></div>}
  {lesson&&tab==='quiz'&&<div className="space-y-3">{lesson.quiz.map((x,i)=><div key={i} className="card space-y-1"><b>{i+1}. {x.q}</b>
   {x.options.map((o,j)=><button key={j} disabled={picked[i]!==undefined} onClick={()=>setPicked({...picked,[i]:j})}
    className={'block w-full rounded border p-2 text-left text-sm '+(picked[i]!==undefined?(j===x.answer?'bg-green-200 dark:bg-green-900':j===picked[i]?'bg-red-200 dark:bg-red-900':''):'')}>{o}</button>)}
   {picked[i]!==undefined&&<p className="text-sm">💡 {x.explanation}</p>}</div>)}
   {(lesson.short??[]).map((x,i)=><div key={'s'+i} className="card space-y-2"><b>Short answer: {x.q}</b>
    <textarea className="inp" rows={2} value={sa[i]??''} onChange={e=>setSa({...sa,[i]:e.target.value})}/>
    <button className="btn" disabled={busy||!sa[i]} onClick={()=>run(async()=>{const r=await gradeShort(cfg,x.q,x.ideal,sa[i]);setFb({...fb,[i]:r})})}>Check</button>
    {fb[i]&&<p className="text-sm">{fb[i].score>=0.7?'✅':'🟡'} {fb[i].feedback}</p>}</div>)}
   <div className="card">Score: {lesson.quiz.filter((x,i)=>picked[i]===x.answer).length}/{lesson.quiz.length}</div></div>}
  {lesson&&tab==='project'&&<div className="card space-y-2"><p>{lesson.project.task}</p>
   <ol className="list-decimal pl-5">{lesson.project.steps.map((x,i)=><li key={i}>{x}</li>)}</ol>
   <b>Rubric</b><ul className="list-disc pl-5">{lesson.project.rubric.map((x,i)=><li key={i}>{x}</li>)}</ul></div>}
 </main>}

import {chat,chatMeta,Cfg,PROVIDERS} from './providers';
import {parseLoose} from './json';
import {checkBoard} from './check';
import {renderPng} from '@/app/Board';
export type Lesson={title:string;outline:string[];objectives?:string[];vocab?:{term:string;def:string}[];slides:{title:string;bullets:string[];script:string}[];
 dialogue:{who:string;text:string}[];quiz:{q:string;options:string[];answer:number;explanation:string}[];
 project:{task:string;steps:string[];rubric:string[]};short?:{q:string;ideal:string}[]};
export type Cmd={t:string;c?:string;x?:number;y?:number;x2?:number;y2?:number;w?:number;h?:number;r?:number;d?:number;n?:number;size?:number;text?:string;dash?:boolean;curve?:number;aromatic?:boolean;fn?:string;xr?:[number,number];yr?:[number,number];pts?:number[][];marks?:number[];asym?:number[];atoms?:string[];bonds?:number[];a1?:number;a2?:number;num?:string;den?:string};
export type BoardSpec={title:string;caption:string;cmds:Cmd[];score?:number;note?:string};
export const AGENTS:Record<string,{emoji:string;persona:string;v:number;pitch:number;rate:number}>={
 Teacher:{emoji:'👩‍🏫',persona:'Ms. Rivera, warm, clear teacher',v:0,pitch:1,rate:1},
 Maya:{emoji:'🙋‍♀️',persona:'Maya, curious classmate who asks "why?"',v:1,pitch:1.4,rate:1.1},
 Leo:{emoji:'🤨',persona:'Leo, skeptical classmate who challenges claims',v:2,pitch:0.7,rate:0.95},
 Sam:{emoji:'😅',persona:'Sam, quiet classmate who struggles and needs simple explanations',v:3,pitch:1.1,rate:0.9}};
export const parseJSON=parseLoose as (t:string)=>any;
export async function orchestrate(c:Cfg,l:Lesson,slide:number,q:string){
 const sys='You orchestrate a classroom. Reply ONLY with a JSON array of 1-3 turns [{"who":"Teacher|Maya|Leo|Sam","text":str}]. Pick only the agents who should respond; keep each turn under 50 words and in character.'+BOARD_SPEC+'';
 const usr=`Agents: ${Object.values(AGENTS).map(a=>a.persona).join('; ')}.\nLesson: ${l.title}. Current slide: ${l.slides[slide].title} — ${l.slides[slide].bullets.join('; ')}.\nStudent says: ${q}`;
 const r=parseJSON(await chat(c,sys,usr));return (Array.isArray(r)?r:[r]).filter((t:any)=>AGENTS[t.who]&&t.text).map((t:any)=>({...t,board:cleanBoard(t.board)}));}

export async function gradeShort(c:Cfg,q:string,ideal:string,ans:string){
 const r=parseJSON(await chat(c,'You grade student answers. Reply ONLY with JSON {"score":0-1,"feedback":str} (feedback under 40 words, encouraging).',`Question: ${q}\nModel answer: ${ideal}\nStudent answer: ${ans}`));
 return {score:Number(r.score)||0,feedback:String(r.feedback||'')};}

const BOARD_SPEC=" A Teacher turn may add \"board\":{\"title\":str,\"caption\":str (one-line takeaway),\"cmds\":[...]} when a visual helps. Blackboard is a 100x100 grid (y down). Title and caption are drawn automatically, so keep cmds inside x 5-95, y 14-86 with no overlaps, in the order a teacher would draw (max 14 cmds, one idea per board). Optional color c: w (default chalk white), y yellow, b blue, p pink, o orange for key terms only. Commands: text{x,y,text,size?} centered, use unicode for math (x\u00b2 \u222b \u03a3 \u221a \u03c0 \u03b8 \u2192 \u21cc); frac{x,y,num,den}; line|arrow{x,y,x2,y2,dash?,curve?(-1..1, for curved mechanism arrows)}; rect{x,y,w,h}; circle{x,y,r}; ellipse{x,y,w,h radii}; poly{pts:[[x,y]..]} closed; path{pts} open; plot{x,y,w,h,fn:\"x^2-1\" (in x; sin cos tan sqrt abs ln exp pi),xr:[min,max],yr:[min,max],asym?:[x..],marks?:[x..]} draws axes with ticks and the exact curve; chain{x,y,atoms:[\"C\",\"C\",\"O\"],bonds:[1,2],d?} skeletal formula with exact 120-degree zigzag, bonds 1/2/3, only heteroatoms labeled; ring{x,y,n,r,aromatic?} regular polygon, benzene when n=6 and aromatic; box3d{x,y,w,h,d} 3D box with hidden edges dashed; angle{x,y,r,a1,a2,text?} degrees counterclockwise, right angles get a square. Prefer plot, chain, ring, box3d and angle over hand-placed coordinates. Accuracy comes first: never draw anything scientifically or mathematically wrong, label what matters, and split complex ideas across several boards.";

const ALIAS:Record<string,string>={rectangle:'rect',square:'rect',label:'text',caption:'text',polygon:'poly',polyline:'path',vector:'arrow',graph:'plot',function:'plot',molecule:'chain',benzene:'ring',cube:'box3d',box:'box3d'};
const COLS:Record<string,string>={white:'w',yellow:'y',blue:'b',pink:'p',orange:'o'};
export function cleanBoard(b:any):BoardSpec|null{
 if(!b||typeof b!=='object')return null;
 const raw=[b.cmds,b.commands,b.draw,b.shapes].find(Array.isArray)||[];
 const cmds=raw.map((m:any)=>{if(!m||typeof m!=='object')return null;
  const t0=String(m.t??m.type??m.shape??m.kind??'').toLowerCase(),t=ALIAS[t0]||t0;if(!t)return null;
  const o:any={...m,t};for(const k of ['x','y','x2','y2','w','h','r','d','n','size','curve','a1','a2'])if(o[k]!==undefined)o[k]=Number(o[k]);
  if(t==='text'&&!o.text)o.text=String(m.label??m.content??'');
  if(typeof o.c==='string')o.c=COLS[o.c.toLowerCase()]||o.c[0];return o}).filter(Boolean);
 return cmds.length?{title:String(b.title||''),caption:String(b.caption||''),cmds}:null;}
const EX1='{"title":"Ionic Bond in NaCl","caption":"Na gives one electron to Cl; opposite charges attract","cmds":[{"t":"circle","x":30,"y":45,"r":9,"c":"o"},{"t":"text","x":30,"y":45,"text":"Na⁺","size":7,"c":"o"},{"t":"circle","x":70,"y":45,"r":12,"c":"b"},{"t":"text","x":70,"y":45,"text":"Cl⁻","size":7,"c":"b"},{"t":"arrow","x":38,"y":38,"x2":56,"y2":38,"curve":-0.4,"c":"y"},{"t":"text","x":47,"y":26,"text":"e⁻ transferred","c":"y"},{"t":"text","x":50,"y":74,"text":"Na (2,8,1) → Na⁺ (2,8)     Cl (2,8,7) → Cl⁻ (2,8,8)"}]}';
const EX2='{"title":"y = x² − 1","caption":"Parabola: roots at x = ±1, vertex (0, −1)","cmds":[{"t":"plot","x":15,"y":16,"w":70,"h":66,"fn":"x^2-1","xr":[-3,3],"yr":[-2,8],"marks":[-1,0,1]}]}';
export async function makeBoard(c:Cfg,l:Lesson,slide:number,req:string):Promise<BoardSpec>{
 const sys='You are a blackboard artist. Reply ONLY with JSON {"title":str,"caption":str,"cmds":[...]}. cmds MUST be a non-empty array and every command MUST have a "t" key.'+BOARD_SPEC+'\nExample 1: '+EX1+'\nExample 2: '+EX2;
 const usr=`Lesson: ${l.title}. Slide: ${l.slides[slide]?.title}.\nDraw a board for: ${req}`;
 for(let i=0;i<3;i++){try{const b=cleanBoard(parseJSON(await chat(c,sys,usr)));if(b)return b}catch(e:any){if(/key|quota|Network|rejected|Provider error/i.test(e.message))throw e}}
 throw new Error('The model did not return a usable drawing. Try again, or pick a stronger model in Settings.');}

type Iss={problem:string;fix:string;accuracy?:boolean};
const boardSys=()=>'You are a blackboard artist. Reply ONLY with JSON {"title":str,"caption":str,"cmds":[...]}. cmds MUST be a non-empty array and every command MUST have a "t" key.'+BOARD_SPEC+'\nExample 1: '+EX1+'\nExample 2: '+EX2;
async function critique(c:Cfg,b:BoardSpec,req:string,see:boolean):Promise<{score:number;issues:Iss[]}|null>{
 try{const sys='You are a strict teacher checking a chalkboard drawing. Reply ONLY with JSON {"score":0-10,"issues":[{"problem":str,"fix":str,"accuracy":bool}]} (max 5 issues). Check (1) Accuracy: anything scientifically, mathematically or structurally wrong? (2) Completeness: is everything important labeled and does the caption state the takeaway? (3) Clarity: overlap, clutter, tiny text, confusing order? Be harsh: give 8+ only if it is correct and clean.';
  const out=await chat(c,sys,`Topic: ${req}. Board title: ${b.title}. Caption: ${b.caption}.`+(see?' The attached image is the rendered board.':'\nBoard commands (100x100 grid, y down): '+JSON.stringify(b.cmds)),see?renderPng(b):undefined);
  const r=parseJSON(out);return {score:Number(r.score)||0,issues:(Array.isArray(r.issues)?(r.issues as any[]):([] as any[])).map((i:any):Iss=>({problem:String(i.problem||''),fix:String(i.fix||''),accuracy:!!i.accuracy}))};
 }catch{return null}}
async function reviseBoard(c:Cfg,req:string,b:BoardSpec,issues:Iss[]):Promise<BoardSpec>{
 const usr=`Topic: ${req}\nPrevious board: ${JSON.stringify({title:b.title,caption:b.caption,cmds:b.cmds})}\nProblems found:\n- ${issues.map(i=>i.problem+' → '+i.fix).join('\n- ')}\nReturn the full corrected board JSON. If unsure about a detail, draw the simpler correct version.`;
 for(let i=0;i<2;i++){try{const n=cleanBoard(parseJSON(await chat(c,boardSys(),usr)));if(n)return n}catch{}}
 return b;}
// generate -> check -> fix -> show. At most 4 model calls: draw, critique, revise, critique.
export async function buildBoard(c:Cfg,l:Lesson,slide:number,req:string,st:(s:string)=>void):Promise<BoardSpec>{
 st('Drawing…');let b=await makeBoard(c,l,slide,req);
 const see=PROVIDERS[c.provider].vision;let fixed=0,score:number|undefined,note='';
 for(let r=0;r<2;r++){
  const ck=checkBoard(b);b=ck.board;fixed+=ck.fixed;st('Checking…');
  const cr=await critique(c,b,req,see);
  if(!cr){note=' · could not fully verify';break}
  score=cr.score;
  if(!(cr.score<8||cr.issues.some((i:Iss)=>!!i.accuracy)||ck.issues.length))break;
  if(r===1){note=' · some issues may remain';break}
  st('Fixing…');b=await reviseBoard(c,req,b,[...ck.issues.map(p=>({problem:p,fix:'fix it'})),...cr.issues]);
 }
 const fin=checkBoard(b);fixed+=fin.fixed;
 return {...fin.board,score,note:`checked accuracy, labels and layout${see?'':' (text-only check: this model cannot see images)'}${fixed?` · auto-fixed ${fixed} layout issue(s)`:''}${note}`};}

// ---------- Staged lesson generation (small calls, tolerant parsing, retry only what failed) ----------
export type Stage='outline'|'slides'|'dialogue'|'quiz'|'project';
export type Progress=Partial<Record<Stage,'run'|'ok'|'fail'>>;
export class StageError extends Error{
 constructor(public stage:Stage,public finish:string,public raw:string,public partial:Partial<Lesson>,msg:string){super(msg)}}
const txt=(v:any):string=>typeof v==='string'?v:v==null?'':typeof v==='object'?Object.values(v).filter(x=>typeof x==='string').join(' — '):String(v);
const strs=(v:any):string[]=>(Array.isArray(v)?v:v?[v]:[]).map(txt).filter(Boolean);
const arr=(v:any):any[]=>Array.isArray(v)?v:[];
function ansIndex(a:any,opts:string[]):number{
 if(typeof a==='number')return a;
 const s=txt(a).trim();
 if(/^[a-d]$/i.test(s))return s.toUpperCase().charCodeAt(0)-65;
 if(/^\d+$/.test(s))return Number(s);
 return opts.findIndex(o=>o.trim().toLowerCase()===s.toLowerCase());}
const nOutline=(r:any)=>{
 const title=txt(r?.title),outline=strs(r?.outline);
 if(!title||!outline.length)return null;
 return {title,outline,objectives:strs(r.objectives),
  vocab:arr(r.vocab).map(v=>({term:txt(v?.term),def:txt(v?.def??v?.definition)})).filter(v=>v.term&&v.def)};};
const nSlides=(r:any)=>{
 const s=arr(r?.slides??r).map(x=>({title:txt(x?.title),bullets:strs(x?.bullets),script:txt(x?.script)})).filter(x=>x.title&&x.bullets.length);
 return s.length?s:null;};
const nDialogue=(r:any)=>{
 const d=arr(r?.dialogue??r).map(x=>{
  const w=txt(x?.who).trim().toLowerCase();
  return {who:Object.keys(AGENTS).find(k=>k.toLowerCase()===w)||'',text:txt(x?.text)};}).filter(x=>x.who&&x.text);
 return d.length?d:null;};
const nQuiz=(r:any)=>{
 const quiz=arr(r?.quiz??r).map(x=>{
  const options=strs(x?.options??x?.choices);
  return {q:txt(x?.q??x?.question),options,answer:ansIndex(x?.answer??x?.correct,options),explanation:txt(x?.explanation)};
 }).filter(x=>x.q&&x.options.length>=2&&x.answer>=0&&x.answer<x.options.length);
 const short=arr(r?.short).map(x=>({q:txt(x?.q??x?.question),ideal:txt(x?.ideal??x?.answer)})).filter(x=>x.q&&x.ideal);
 return quiz.length?{quiz,short}:null;};
const nProject=(r:any)=>{
 const p=r?.project??r,task=txt(p?.task),steps=strs(p?.steps);
 return task&&steps.length?{task,steps,rubric:strs(p?.rubric)}:null;};
async function stage<T>(c:Cfg,name:Stage,sys:string,usr:string,norm:(r:any)=>T|null):Promise<T>{
 let extra='',finish='',raw='';
 for(let i=0;i<3;i++){
  const r=await chatMeta(c,sys,usr+extra);finish=r.finish;raw=r.text;
  try{
   const v=norm(parseLoose(raw));
   if(v)return v;
   extra='\nYour last answer had the wrong shape. Follow the schema exactly.';
  }catch{
   extra=finish==='MAX_TOKENS'?'\nYour last answer was cut off. Be much shorter: fewer items, fewer words.':'\nYour last answer was not valid JSON. Output JSON only.';
  }}
 const why=finish==='MAX_TOKENS'?'the output was too long and got cut off':'the model returned unusable output';
 throw new StageError(name,finish,raw.slice(0,500),{},`Stage "${name}" failed: ${why}. Open "Show details" and use "Retry this stage".`);}
const LSYS='You write lessons for students. Reply with ONLY valid JSON, no markdown, no commentary. Keep wording concise.';
export async function generateLesson(c:Cfg,topic:string,doc:string,onProgress:(p:Progress)=>void=()=>{},partial:Partial<Lesson>={}):Promise<Lesson>{
 const out:Partial<Lesson>={...partial};
 const prog:Progress={};
 const mark=(s:Stage,v:'run'|'ok'|'fail')=>{prog[s]=v;onProgress({...prog})};
 const subject=topic||'the attached document';
 const src=(n:number)=>doc?`\nSource material:\n${doc.slice(0,n)}`:'';
 const run=async<T>(s:Stage,usr:string,norm:(r:any)=>T|null,apply:(v:T)=>void)=>{
  mark(s,'run');
  try{apply(await stage(c,s,LSYS,usr,norm));mark(s,'ok')}catch(e){mark(s,'fail');throw e}};
 if(out.outline)mark('outline','ok');
 else{
  try{
   await run('outline',`Plan a lesson on: ${subject}.${src(12000)}\nJSON: {"title":str,"outline":[5-7 str],"objectives":[3-4 str starting "You can..."],"vocab":[{"term":str,"def":str}] (4-6)}`,nOutline,v=>Object.assign(out,v));
  }catch(e){if(e instanceof StageError)e.partial=out;throw e}
 }
 const ctx=`Lesson: ${out.title}\nOutline: ${out.outline!.join(' | ')}\nObjectives: ${(out.objectives||[]).join(' | ')}${src(6000)}`;
 const tasks:(()=>Promise<void>)[]=[];
 if(out.slides)mark('slides','ok');else tasks.push(()=>run('slides',`${ctx}\nWrite 5-7 slides, one per outline item. JSON: {"slides":[{"title":str,"bullets":[3-4 short str],"script":str (natural spoken text, max 80 words)}]}`,nSlides,v=>{out.slides=v}));
 if(out.dialogue)mark('dialogue','ok');else tasks.push(()=>run('dialogue',`${ctx}\nWrite a classroom conversation of 8 turns between Teacher, Maya (curious), Leo (skeptical) and Sam (quiet, struggling), max 30 words each. JSON: {"dialogue":[{"who":"Teacher|Maya|Leo|Sam","text":str}]}`,nDialogue,v=>{out.dialogue=v}));
 if(out.quiz)mark('quiz','ok');else tasks.push(()=>run('quiz',`${ctx}\nWrite 5 multiple-choice questions and 2 short-answer questions. JSON: {"quiz":[{"q":str,"options":[4 str],"answer":0-3 (index of the correct option),"explanation":str}],"short":[{"q":str,"ideal":str}]}`,nQuiz,v=>{out.quiz=v.quiz;out.short=v.short}));
 if(out.project)mark('project','ok');else tasks.push(()=>run('project',`${ctx}\nDesign a hands-on project. JSON: {"project":{"task":str,"steps":[4-6 str],"rubric":[3-4 str]}}`,nProject,v=>{out.project=v}));
 const errors:unknown[]=[];let next=0;
 const worker=async()=>{while(next<tasks.length){const t=tasks[next++];try{await t()}catch(e){errors.push(e)}}};
 await Promise.all([worker(),worker()]);
 if(errors.length){const e=errors[0];if(e instanceof StageError)e.partial=out;throw e}
 return {title:out.title!,outline:out.outline!,objectives:out.objectives,vocab:out.vocab,slides:out.slides!,dialogue:out.dialogue!,quiz:out.quiz!,short:out.short,project:out.project!};}

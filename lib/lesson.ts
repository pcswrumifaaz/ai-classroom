import {chat,Cfg,PROVIDERS} from './providers';
import {checkBoard} from './check';
import {renderPng} from '@/app/Board';
export type Lesson={title:string;outline:string[];slides:{title:string;bullets:string[];script:string}[];
 dialogue:{who:string;text:string}[];quiz:{q:string;options:string[];answer:number;explanation:string}[];
 project:{task:string;steps:string[];rubric:string[]};short?:{q:string;ideal:string}[]};
export type Cmd={t:string;c?:string;x?:number;y?:number;x2?:number;y2?:number;w?:number;h?:number;r?:number;d?:number;n?:number;size?:number;text?:string;dash?:boolean;curve?:number;aromatic?:boolean;fn?:string;xr?:[number,number];yr?:[number,number];pts?:number[][];marks?:number[];asym?:number[];atoms?:string[];bonds?:number[];a1?:number;a2?:number;num?:string;den?:string};
export type BoardSpec={title:string;caption:string;cmds:Cmd[];score?:number;note?:string};
export const AGENTS:Record<string,{emoji:string;persona:string;v:number;pitch:number;rate:number}>={
 Teacher:{emoji:'👩‍🏫',persona:'Ms. Rivera, warm, clear teacher',v:0,pitch:1,rate:1},
 Maya:{emoji:'🙋‍♀️',persona:'Maya, curious classmate who asks "why?"',v:1,pitch:1.4,rate:1.1},
 Leo:{emoji:'🤨',persona:'Leo, skeptical classmate who challenges claims',v:2,pitch:0.7,rate:0.95},
 Sam:{emoji:'😅',persona:'Sam, quiet classmate who struggles and needs simple explanations',v:3,pitch:1.1,rate:0.9}};
export function parseJSON(t:string){const s=t.replace(/```json|```/g,'');const a=s.search(/[\[{]/);
 const e=Math.max(s.lastIndexOf('}'),s.lastIndexOf(']'));return JSON.parse(s.slice(a,e+1));}
function valid(l:any):l is Lesson{return l&&typeof l.title==='string'&&Array.isArray(l.slides)&&l.slides.length>0&&
 l.slides.every((s:any)=>s.title&&Array.isArray(s.bullets)&&typeof s.script==='string')&&Array.isArray(l.dialogue)&&
 Array.isArray(l.quiz)&&l.quiz.every((q:any)=>Array.isArray(q.options)&&Number.isInteger(q.answer))&&l.project&&Array.isArray(l.project.steps);}
export async function generateLesson(c:Cfg,topic:string,doc:string):Promise<Lesson>{
 const sys='You are a lesson designer. Reply with ONLY valid JSON, no prose or markdown.';
 const usr=`Create a lesson on: ${topic||'the attached document'}.\n${doc?'Source material:\n'+doc.slice(0,24000):''}
JSON shape: {"title":str,"outline":[str],"slides":[{"title":str,"bullets":[str],"script":str}] (5-7 slides),
"dialogue":[{"who":"Teacher|Maya|Leo|Sam","text":str}] (8-10 turns),
"quiz":[{"q":str,"options":[4 str],"answer":0-3 index,"explanation":str}] (5),
"short":[{"q":str,"ideal":str}] (2 short-answer questions with a model answer),
"project":{"task":str,"steps":[str],"rubric":[str]}}`;
 let err='';
 for(let i=0;i<3;i++){try{const l=parseJSON(await chat(c,sys,usr+err));if(valid(l))return l;err='\nYour last output had the wrong shape. Follow the schema exactly.';}
  catch(e:any){if(/key|quota|Network|rejected/i.test(e.message))throw e;err='\nYour last output was not valid JSON. Output JSON only.';}}
 throw new Error('Model kept returning malformed lessons. Try again or pick a stronger model.');}
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
async function critique(c:Cfg,b:BoardSpec,req:string,see:boolean){
 try{const sys='You are a strict teacher checking a chalkboard drawing. Reply ONLY with JSON {"score":0-10,"issues":[{"problem":str,"fix":str,"accuracy":bool}]} (max 5 issues). Check (1) Accuracy: anything scientifically, mathematically or structurally wrong? (2) Completeness: is everything important labeled and does the caption state the takeaway? (3) Clarity: overlap, clutter, tiny text, confusing order? Be harsh: give 8+ only if it is correct and clean.';
  const out=await chat(c,sys,`Topic: ${req}. Board title: ${b.title}. Caption: ${b.caption}.`+(see?' The attached image is the rendered board.':'\nBoard commands (100x100 grid, y down): '+JSON.stringify(b.cmds)),see?renderPng(b):undefined);
  const r=parseJSON(out);return {score:Number(r.score)||0,issues:(Array.isArray(r.issues)?r.issues:[]).map((i:any):Iss=>({problem:String(i.problem||''),fix:String(i.fix||''),accuracy:!!i.accuracy}))};
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
  if(!(cr.score<8||cr.issues.some(i=>i.accuracy)||ck.issues.length))break;
  if(r===1){note=' · some issues may remain';break}
  st('Fixing…');b=await reviseBoard(c,req,b,[...ck.issues.map(p=>({problem:p,fix:'fix it'})),...cr.issues]);
 }
 const fin=checkBoard(b);fixed+=fin.fixed;
 return {...fin.board,score,note:`checked accuracy, labels and layout${see?'':' (text-only check: this model cannot see images)'}${fixed?` · auto-fixed ${fixed} layout issue(s)`:''}${note}`};}

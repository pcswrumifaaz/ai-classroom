import {chat,Cfg} from './providers';
export type Lesson={title:string;outline:string[];slides:{title:string;bullets:string[];script:string}[];
 dialogue:{who:string;text:string}[];quiz:{q:string;options:string[];answer:number;explanation:string}[];
 project:{task:string;steps:string[];rubric:string[]};short?:{q:string;ideal:string}[]};
export type Cmd={t:string;c?:string;x?:number;y?:number;x2?:number;y2?:number;w?:number;h?:number;r?:number;d?:number;n?:number;size?:number;text?:string;dash?:boolean;curve?:number;aromatic?:boolean;fn?:string;xr?:[number,number];yr?:[number,number];pts?:number[][];marks?:number[];asym?:number[];atoms?:string[];bonds?:number[];a1?:number;a2?:number;num?:string;den?:string};
export type BoardSpec={title:string;caption:string;cmds:Cmd[]};
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
 const sys='You orchestrate a classroom. Reply ONLY with a JSON array of 1-3 turns [{"who":"Teacher|Maya|Leo|Sam","text":str}]. Pick only the agents who should respond; keep each turn under 50 words and in character. A Teacher turn may add "board":{"title":str,"caption":str (one-line takeaway),"cmds":[...]} when a visual helps. Blackboard is a 100x100 grid (y down). Title and caption are drawn automatically, so keep cmds inside x 5-95, y 14-86 with no overlaps, in the order a teacher would draw (max 14 cmds, one idea per board). Optional color c: w (default chalk white), y yellow, b blue, p pink, o orange for key terms only. Commands: text{x,y,text,size?} centered, use unicode for math (x² ∫ Σ √ π θ → ⇌); frac{x,y,num,den}; line|arrow{x,y,x2,y2,dash?,curve?(-1..1, for curved mechanism arrows)}; rect{x,y,w,h}; circle{x,y,r}; ellipse{x,y,w,h radii}; poly{pts:[[x,y]..]} closed; path{pts} open; plot{x,y,w,h,fn:"x^2-1" (in x; sin cos tan sqrt abs ln exp pi),xr:[min,max],yr:[min,max],asym?:[x..],marks?:[x..]} draws axes with ticks and the exact curve; chain{x,y,atoms:["C","C","O"],bonds:[1,2],d?} skeletal formula with exact 120-degree zigzag, bonds 1/2/3, only heteroatoms labeled; ring{x,y,n,r,aromatic?} regular polygon, benzene when n=6 and aromatic; box3d{x,y,w,h,d} 3D box with hidden edges dashed; angle{x,y,r,a1,a2,text?} degrees counterclockwise, right angles get a square. Prefer plot, chain, ring, box3d and angle over hand-placed coordinates. Accuracy comes first: never draw anything scientifically or mathematically wrong, label what matters, and split complex ideas across several boards.';
 const usr=`Agents: ${Object.values(AGENTS).map(a=>a.persona).join('; ')}.\nLesson: ${l.title}. Current slide: ${l.slides[slide].title} — ${l.slides[slide].bullets.join('; ')}.\nStudent says: ${q}`;
 const r=parseJSON(await chat(c,sys,usr));return (Array.isArray(r)?r:[r]).filter((t:any)=>AGENTS[t.who]&&t.text);}

export async function gradeShort(c:Cfg,q:string,ideal:string,ans:string){
 const r=parseJSON(await chat(c,'You grade student answers. Reply ONLY with JSON {"score":0-1,"feedback":str} (feedback under 40 words, encouraging).',`Question: ${q}\nModel answer: ${ideal}\nStudent answer: ${ans}`));
 return {score:Number(r.score)||0,feedback:String(r.feedback||'')};}

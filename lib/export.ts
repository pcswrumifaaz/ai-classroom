import type {Lesson} from './lesson';
export async function exportPptx(l:Lesson){
 const P=(await import('pptxgenjs')).default;const p=new P();
 l.slides.forEach(s=>{const sl=p.addSlide();
  sl.addShape(p.ShapeType.rect,{x:0,y:0,w:'100%',h:1.1,fill:{color:'4F46E5'}});
  sl.addText(s.title,{x:0.5,y:0.2,w:9,h:0.7,fontSize:28,bold:true,color:'FFFFFF'});
  sl.addText(s.bullets.map(b=>({text:b,options:{bullet:true,breakLine:true}})),{x:0.6,y:1.5,w:8.8,h:3.8,fontSize:20});
  sl.addNotes(s.script);});
 await p.writeFile({fileName:l.title.replace(/\W+/g,'_')+'.pptx'});}
export const toMarkdown=(l:Lesson)=>`# ${l.title}\n\n## Outline\n${l.outline.map(o=>'- '+o).join('\n')}\n\n`+
 l.slides.map((s,i)=>`## ${i+1}. ${s.title}\n${s.bullets.map(b=>'- '+b).join('\n')}\n\n> ${s.script}\n`).join('\n')+
 `\n## Quiz\n`+l.quiz.map((q,i)=>`${i+1}. ${q.q}\n${q.options.map((o,j)=>`   - ${j===q.answer?'**':''}${o}${j===q.answer?'**':''}`).join('\n')}`).join('\n')+
 `\n\n## Project\n${l.project.task}\n${l.project.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}\n\nRubric:\n${l.project.rubric.map(r=>'- '+r).join('\n')}\n`;
export function download(name:string,text:string,type='text/plain'){const a=document.createElement('a');
 a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();}

export async function extractPdf(f:File):Promise<string>{
 // @ts-ignore deep import has no types
 const pdf:any=await import('pdfjs-dist/build/pdf');
 pdf.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const d=await pdf.getDocument({data:await f.arrayBuffer()}).promise;let t='';
 for(let i=1;i<=d.numPages;i++){const c=await (await d.getPage(i)).getTextContent();t+=c.items.map((x:any)=>x.str).join(' ')+'\n'}
 return t;}

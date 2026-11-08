export type Provider='gemini'|'groq'|'openrouter'|'openai'|'anthropic';
type Adapter={name:string;vision:boolean;models:string[];finish?:(d:any)=>string;model:string;link:string;tip:string;
 req:(k:string,m:string,sys:string,usr:string,img?:string)=>{url:string;headers:Record<string,string>;body:any};
 parse:(d:any)=>string};
const oai=(url:string,vis=false)=>(k:string,m:string,sys:string,usr:string,img?:string)=>({url,headers:{Authorization:'Bearer '+k},
 body:{model:m,messages:[{role:'system',content:sys},{role:'user',content:vis&&img?[{type:'text',text:usr},{type:'image_url',image_url:{url:'data:image/png;base64,'+img}}]:usr}]}});
const oparse=(d:any)=>d.choices?.[0]?.message?.content??'';
// Adding a provider = adding one entry here.
export const PROVIDERS:Record<Provider,Adapter>={
 gemini:{name:'Google Gemini (free tier)',vision:true,models:['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-2.5-pro','gemini-2.0-flash'],model:'gemini-2.5-flash',link:'https://aistudio.google.com/apikey',
  tip:'Sign in with Google, click "Create API key", paste it here.',
  req:(k,m,s,u,img)=>({url:`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`,headers:{},
   body:{systemInstruction:{parts:[{text:s}]},generationConfig:{responseMimeType:'application/json',maxOutputTokens:8192,temperature:0.4,...(/2\.5-flash/.test(m)?{thinkingConfig:{thinkingBudget:0}}:{})},contents:[{role:'user',parts:[{text:u},...(img?[{inlineData:{mimeType:'image/png',data:img}}]:[])]}]}}),
  parse:d=>{const c=d.candidates?.[0];if(!c)throw new Error('Gemini returned no answer'+(d.promptFeedback?.blockReason?' (blocked: '+d.promptFeedback.blockReason+')':'')+'. Try rephrasing the topic.');if(c.finishReason==='SAFETY')throw new Error('Gemini blocked this response for safety reasons. Try a different topic or wording.');return c.content?.parts?.map((p:any)=>p.text||'').join('')??''},
  finish:d=>d.candidates?.[0]?.finishReason||''},
 groq:{name:'Groq (free tier)',vision:false,models:['openai/gpt-oss-120b','openai/gpt-oss-20b'],model:'openai/gpt-oss-120b',link:'https://console.groq.com/keys',
  tip:'Create a free account, open API Keys, create one.',req:oai('https://api.groq.com/openai/v1/chat/completions'),parse:oparse},
 openrouter:{name:'OpenRouter (free models)',vision:false,models:['meta-llama/llama-3.3-70b-instruct:free'],model:'meta-llama/llama-3.3-70b-instruct:free',link:'https://openrouter.ai/keys',
  tip:'Create a key, use model IDs ending in ":free".',req:oai('https://openrouter.ai/api/v1/chat/completions'),parse:oparse},
 openai:{name:'OpenAI (paid)',vision:true,models:['gpt-4o-mini','gpt-4o'],model:'gpt-4o-mini',link:'https://platform.openai.com/api-keys',
  tip:'Requires billing.',req:oai('https://api.openai.com/v1/chat/completions',true),parse:oparse},
 anthropic:{name:'Anthropic (paid)',vision:true,models:['claude-sonnet-4-5','claude-haiku-4-5'],model:'claude-sonnet-4-5',link:'https://console.anthropic.com/settings/keys',
  tip:'Requires billing.',
  req:(k,m,s,u,img)=>({url:'https://api.anthropic.com/v1/messages',
   headers:{'x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
   body:{model:m,max_tokens:8000,system:s,messages:[{role:'user',content:img?[{type:'image',source:{type:'base64',media_type:'image/png',data:img}},{type:'text',text:u}]:u}]}}),
  parse:d=>d.content?.map((c:any)=>c.text).join('')??''}};
export type Cfg={provider:Provider;key:string;model:string};
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
export async function chatMeta(c:Cfg,sys:string,usr:string,img?:string):Promise<{text:string;finish:string}>{
 if(!c.key)throw new Error('Missing API key — add one in Settings.');
 const a=PROVIDERS[c.provider];const r=a.req(c.key,c.model,sys,usr,img);
 for(let i=0;i<4;i++){
  let res:Response;
  try{res=await fetch(r.url,{method:'POST',headers:{'Content-Type':'application/json',...r.headers},body:JSON.stringify(r.body)});}
  catch{throw new Error('Network error — check your connection (or CORS/ad-blocker).');}
  if(res.status===429||res.status===503){if(i===3)throw new Error('Quota/rate limit exceeded. Wait a minute or switch provider.');await sleep(2000*2**i);continue;}
  if(!res.ok){const t=await res.text().catch(()=>'');
   const hint=res.status===404?' The model name may be wrong; pick one from the Model list in Settings (try gemini-2.5-flash).':res.status===401||res.status===403?' Check that your API key is correct and enabled.':'';
   throw new Error(`Provider error ${res.status}.${hint} ${t.slice(0,300)}`);}
  const d=await res.json();return {text:a.parse(d),finish:a.finish?.(d)||''};
 }
 throw new Error('Failed');
}

export async function chat(c:Cfg,sys:string,usr:string,img?:string):Promise<string>{return (await chatMeta(c,sys,usr,img)).text}

/** DealHunter v1: auditable local-only price observations, no network fetching. */
export const VERSION=1;
export const CATEGORIES=Object.freeze(['Electronics','Computers','Home','Fashion','Beauty','Games','Travel','Other']);
export const CONDITIONS=Object.freeze(['new','refurbished','used']);
export const STATUSES=Object.freeze(['watching','purchased','archived']);
export const money=(n)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:2}).format(n);
export const dateLabel=(iso)=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(iso));
export const todayUTC=()=>new Date().toISOString().slice(0,10);
export const localID=()=>globalThis.crypto?.randomUUID?.()||`dh-${Date.now()}-${Math.floor(Math.random()*1e9)}`;
export function decimal(value,max=1000000){
 const n=typeof value==='string'?Number(value.trim()):value;
 if(!Number.isFinite(n)||n<0||n>max||!/^\d+(?:\.\d{1,2})?$/.test(String(value).trim()))throw Error('Enter a valid non-negative GBP amount with at most 2 decimal places.');
 return Math.round(n*100)/100;
}
export function safeURL(value){
 if(!value)return '';
 if(typeof value!=='string'||value.length>2048)throw Error('Invalid URL');
 try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||!u.hostname)throw Error('url');return u.href;}catch{throw Error('Use an http or https product URL.');}
}
export function cleanText(value,max=160,required=false){
 if(typeof value!=='string')throw Error('Invalid text');const s=value.trim().replace(/[\u0000-\u001f\u007f]/g,' ');
 if(s.length>max||required&&!s)throw Error(`Text must be ${required?'1 to ':''}${max} characters or fewer.`);
 return s;
}
export function checkDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw Error('Use a valid ISO date.');
 const now=todayUTC();if(value>now)throw Error('Price observations cannot be dated in the future.');return value;
}
export function makeItem(values,id=localID(),createdAt=new Date().toISOString()){
 const title=cleanText(values.title,120,true),target=values.target===''||values.target==null?null:decimal(values.target);
 return {id,title,brand:cleanText(values.brand||'',60),model:cleanText(values.model||'',80),category:CATEGORIES.includes(values.category)?values.category:'Other',condition:CONDITIONS.includes(values.condition)?values.condition:'new',target,priority:values.priority==='high'?'high':'normal',status:STATUSES.includes(values.status)?values.status:'watching',notes:cleanText(values.notes||'',1200),createdAt,observations:[]};
}
export function makeObservation(values,id=localID()){
 const retailer=cleanText(values.retailer,100,true);
 return {id,retailer,price:decimal(values.price),shipping:decimal(values.shipping??0),date:checkDate(values.date||todayUTC()),url:safeURL(values.url||''),source:'manual',createdAt:new Date().toISOString()};
}
export const total=(o)=>Math.round((o.price+o.shipping)*100)/100;
export const sortObs=(items)=>[...items].sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
export function latestByRetailer(item){
 const map=new Map();for(const obs of sortObs(item.observations))map.set(obs.retailer.trim().toLowerCase(),obs);
 return [...map.values()].sort((a,b)=>total(a)-total(b)||a.retailer.localeCompare(b.retailer));
}
export function bestOffer(item){return latestByRetailer(item)[0]||null;}
export function historicalStats(item,now=todayUTC()){
 const obs=sortObs(item.observations);const latest=latestByRetailer(item);const current=latest[0]||null;
 const totals=obs.map(total).sort((a,b)=>a-b);
 const median=totals.length?totals.length%2?totals[(totals.length-1)/2]:(totals[totals.length/2-1]+totals[totals.length/2])/2:null;
 const anchor=new Date(now+'T12:00:00Z').getTime();
 const within=(d)=>obs.filter(o=>anchor-Date.parse(o.date+'T12:00:00Z')>=0&&anchor-Date.parse(o.date+'T12:00:00Z')<=d*86400000);
 const past30=within(30),past90=within(90);
 const prior=obs.filter(o=>current&&o.date<current.date);
 const prev=prior.length?prior[prior.length-1]:null;
 const minimum=totals.length?totals[0]:null;
 const currentTotal=current?total(current):null;
 const distinctDays=new Set(past30.map(o=>o.date)).size;
 const daysAgo=current?Math.max(0,Math.floor((anchor-Date.parse(current.date+'T12:00:00Z'))/86400000)):null;
 const targetHit=current!==null&&item.target!==null&&currentTotal<=item.target;
 const newLow=current!==null&&obs.some(o=>o.id!==current.id)&&currentTotal<=minimum;
 const confidence=distinctDays>=5&&past30.length>=5?'strong':distinctDays>=3?'moderate':'limited';
 const dropFromMedian=median===null||currentTotal===null||median===0?null:(median-currentTotal)/median*100;
 const prevChange=prev&&current?total(prev)-currentTotal:null;
 const median30=past30.length?medianOf(past30.map(total)):null;
 const below30=median30!==null&&currentTotal<median30;
 const alert=targetHit?'target':newLow?'low':below30&&confidence!=='limited'?'below30':'none';
 return {count:obs.length,days:distinctDays,current,currentTotal,latest,median,minimum,maximum:totals.at(-1)??null,median30,median90:past90.length?medianOf(past90.map(total)):null,prior:prev,prevChange,targetHit,newLow,alert,confidence,dropFromMedian,daysAgo,past30:past30.length,past90:past90.length};
}
export function medianOf(nums){if(!nums.length)return null;const x=[...nums].sort((a,b)=>a-b);return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2;}
export function summary(items){const active=items.filter(x=>x.status==='watching');const results=active.map(item=>({item,stats:historicalStats(item)}));return {total:items.length,watching:active.length,observations:items.reduce((n,i)=>n+i.observations.length,0),alerts:results.filter(x=>x.stats.alert!=='none'),targets:results.filter(x=>x.stats.targetHit),stale:results.filter(x=>x.stats.daysAgo!==null&&x.stats.daysAgo>=14),tracked:results.filter(x=>x.stats.currentTotal!==null),potentialSaving:results.reduce((s,x)=>s+(x.stats.prior&&x.stats.prevChange>0?x.stats.prevChange:0),0)};}
export function assertStore(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==VERSION||!Array.isArray(value.items)||value.items.length>2000)throw Error('Unsupported DealHunter backup format.');
 const ids=new Set(),out=[];let observations=0;
 for(const item of value.items){
  if(!item||typeof item!=='object'||!Array.isArray(item.observations)||item.observations.length>20000)throw Error('Invalid watchlist item.');
  if(typeof item.id!=='string'||item.id.length>100||ids.has(item.id))throw Error('Duplicate or invalid item ID.');ids.add(item.id);
  const clean=makeItem(item,item.id);
  if(item.category!==clean.category||item.condition!==clean.condition||item.status!==clean.status||item.priority!==clean.priority)throw Error('Invalid item metadata.');
  if(item.createdAt&&(!Number.isFinite(Date.parse(item.createdAt))||String(item.createdAt).length>40))throw Error('Invalid creation date');clean.createdAt=item.createdAt||new Date().toISOString();
  const obsIDs=new Set();clean.observations=item.observations.map(o=>{
   if(!o||typeof o!=='object'||typeof o.id!=='string'||o.id.length>100||obsIDs.has(o.id))throw Error('Invalid or duplicate observation ID.');obsIDs.add(o.id);
   if(o.source!=='manual')throw Error('Only verifiable manual observations are supported.');
   const co=makeObservation({...o,retailer:o.retailer,price:o.price,shipping:o.shipping,date:o.date,url:o.url},o.id);
   co.createdAt=Number.isFinite(Date.parse(o.createdAt))&&String(o.createdAt).length<=40?o.createdAt:new Date().toISOString();return co;
  });observations+=clean.observations.length;if(observations>100000)throw Error('Backup is too large.');out.push(clean);
 }
 return {version:VERSION,items:out};
}
export const EMPTY=()=>({version:VERSION,items:[]});
export function parseBackup(raw){if(typeof raw!=='string'||raw.length>8*1024*1024)throw Error('Backup exceeds 8 MB.');let o;try{o=JSON.parse(raw);}catch{throw Error('Invalid JSON backup.');}return assertStore(o);}
export function csvCell(value){const s=String(value??'');const safe=/^[\s]*[=+@\-\t\r]/.test(s)?"'"+s:s;return '"'+safe.replaceAll('"','""')+'"';}
export function observationsCSV(items){const header=['Product','Category','Condition','Target GBP','Retailer','Price GBP','Shipping GBP','Total GBP','Observation date','Source','URL'];const rows=[];
 for(const item of items)for(const o of sortObs(item.observations))rows.push([item.title,item.category,item.condition,item.target??'',o.retailer,o.price.toFixed(2),o.shipping.toFixed(2),total(o).toFixed(2),o.date,o.source,o.url]);
 return [header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
export function pricesTimeline(item){return sortObs(item.observations).map(o=>({id:o.id,date:o.date,retailer:o.retailer,price:total(o)}));}
export function upsertItem(store,item){return {...store,items:store.items.some(i=>i.id===item.id)?store.items.map(i=>i.id===item.id?{...item,observations:i.observations}:i):[item,...store.items]};}
export function recordObservation(store,itemId,obs){return {...store,items:store.items.map(i=>i.id===itemId?{...i,observations:[...i.observations,obs]}:i)};}
export function removeItem(store,id){return {...store,items:store.items.filter(i=>i.id!==id)};}
export function removeObservation(store,itemId,obsId){return {...store,items:store.items.map(i=>i.id===itemId?{...i,observations:i.observations.filter(o=>o.id!==obsId)}:i)};}

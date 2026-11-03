import {VERSION} from './engine.mjs';
/** Explicitly synthetic demonstration data, NEVER actual market prices. */
export function demoStore(){const date=(n)=>{const d=new Date();d.setUTCHours(12,0,0,0);d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10);};
 const rows=[
  {id:'demo-1',title:'Example RTX laptop (fictional listing)',brand:'Demo',model:'16 GB GPU',category:'Computers',target:950,priority:'high',series:[['Demo Retailer A',1149,35],['Demo Retailer A',1080,22],['Demo Retailer B',999,15],['Demo Retailer A',925,0]]},
  {id:'demo-2',title:'Example wireless headphones (fictional listing)',brand:'Demo',model:'Wireless',category:'Electronics',target:90,priority:'normal',series:[['Demo Retailer A',130,40],['Demo Retailer B',115,20],['Demo Retailer A',99,4]]},
  {id:'demo-3',title:'Example coffee machine (fictional listing)',brand:'Demo',model:'Compact',category:'Home',target:70,priority:'normal',series:[['Demo Retailer B',89,28],['Demo Retailer B',85,15],['Demo Retailer C',78,2]]}
 ];
 return {version:VERSION,items:rows.map(x=>({id:x.id,title:x.title,brand:x.brand,model:x.model,category:x.category,condition:'new',target:x.target,priority:x.priority,status:'watching',notes:'SYNTHETIC DEMO DATA. All prices and retailer names are fictional and not current offers.',createdAt:new Date().toISOString(),observations:x.series.map(([retailer,price,days],i)=>({id:`${x.id}-${i}`,retailer,price,shipping:0,date:date(days),url:'',source:'manual',createdAt:new Date(Date.parse(date(days)+'T12:00:00Z')).toISOString()}))}))};
}

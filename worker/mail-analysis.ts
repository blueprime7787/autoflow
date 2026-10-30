// Conservative local analysis: prices are always resolved by quoteData, never extracted from mail.
export function analyzeMail(mail:any,products:any[],customers:any[]){
 const text=String(mail.subject||'')+'\n'+String(mail.body||'');
 const lines=text.split(/\r?\n/).filter(Boolean);const items:any[]=[];
 for(const row of products){const p=row.data;if(p.archived)continue;
  const terms=[p.code,p.model,p.name].filter((v:any)=>typeof v==='string'&&v.trim().length>=2);
  const matched=lines.filter(line=>terms.some((term:string)=>new RegExp('(?<![\\p{L}\\p{N}])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}])','iu').test(line)));
  if(!matched.length)continue;
  const quantities=matched.flatMap(line=>[...line.matchAll(/(?<![\d.,-])(\d+)\s*(?:개|대|박스|세트|ea\b)/gi)].map(m=>Number(m[1])));
  const unique=[...new Set(quantities)];const qty=unique.length===1&&unique[0]>0&&unique[0]<=100000?unique[0]:null;
  items.push({productId:row.id,name:p.name,qty,evidence:matched.join('\n').slice(0,500),review:qty===null?'수량 확인 필요':'제품·수량을 확인하세요'});
 }
 const matches=customers.filter(c=>!c.data.archived&&c.data.email&&String(c.data.email).trim().toLowerCase()===String(mail.from||'').trim().toLowerCase());
 return{mode:'규칙 기반 분석',customerId:matches.length===1?matches[0].id:'',items,warnings:[...(matches.length!==1?['발신자와 일치하는 거래처를 선택하거나 먼저 등록하세요.']:[]),...(items.length===0?['등록 제품과 일치하지 않습니다. 제품을 직접 선택하세요.']:[]),'첨부파일은 분석하지 않습니다. 제품 후보·수량을 확인한 뒤 저장하세요.']};
}

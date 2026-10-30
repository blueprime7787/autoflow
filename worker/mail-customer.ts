import{hash}from'./security';
export function customerSuggestion(mail:any){
 const text=String(mail.body||'').replace(/&nbsp;|&#160;/gi,' ').replace(/안녕하세요[.!。]?/g,'\n');
 const explicit=text.match(/(?:업체명|회사명|병원명)\s*[:：]\s*([^\n<]{1,60})/);
 const intro=text.match(/(?:^|[\n.!。])\s*([가-힣A-Za-z0-9㈜(][가-힣A-Za-z0-9㈜() ·&_-]{0,59}?)\s*입니다/);
 const sender=String(mail.senderName||'').trim();const email=String(mail.from||'').trim().toLowerCase();
 return{name:(explicit?.[1]||intro?.[1]||sender||email.split('@')[0]||'신규 거래처').trim().slice(0,100),contact:sender.slice(0,100),email,phone:'',memo:'메일에서 자동 등록 · 업체명 확인 필요',status:'잠재고객'};
}
export async function ensureMailCustomer(e:any,u:any,mail:any){
 const data=customerSuggestion(mail.data);
 const matches=data.email?(await e.DB.prepare("SELECT * FROM records WHERE tenant_id=? AND kind='customer' AND lower(trim(json_extract(data,'$.email')))=?").bind(u.tenant_id,data.email).all()).results:[];
 const active=matches.filter((r:any)=>!JSON.parse(r.data).archived);
 if(active.length===1)return{customer:{...active[0],data:JSON.parse(active[0].data)},created:false};
 if(matches.length)return{customer:null,created:false,warning:active.length>1?'같은 이메일의 거래처가 여러 곳입니다. 연결할 거래처를 선택하세요.':'보관된 거래처입니다. 거래처를 선택하거나 보관을 해제하세요.'};
 const id='mail-customer-'+await hash(u.tenant_id+'|'+(data.email||mail.id));
 const result=await e.DB.prepare("INSERT OR IGNORE INTO records(id,tenant_id,kind,data) VALUES(?,?,'customer',?)").bind(id,u.tenant_id,JSON.stringify(data)).run();
 const row=await e.DB.prepare("SELECT * FROM records WHERE tenant_id=? AND id=? AND kind='customer'").bind(u.tenant_id,id).first();
 if(!row||JSON.parse(row.data).archived)return{customer:null,created:false,warning:'거래처 정보를 확인하세요.'};
 if(result.meta.changes)await e.DB.prepare("INSERT INTO audit(tenant_id,user_id,action,target) VALUES(?,?,'mail:customer-create',?)").bind(u.tenant_id,u.id,id).run();
 return{customer:{...row,data:JSON.parse(row.data)},created:!!result.meta.changes};
}

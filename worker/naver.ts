import {connect} from 'cloudflare:sockets';
import PostalMime from 'postal-mime';
import {Imap,quoted,ImapRejected} from './imap';
import {hash,limit} from './security';
type Env={DB:D1Database;FILES:R2Bucket;NAVER_EMAIL?:string;NAVER_APP_PASSWORD?:string;NAVER_TENANT_ID?:string;TEMP_ADMIN_TENANT?:string};
export function owner(e:Env){return e.NAVER_TENANT_ID||e.TEMP_ADMIN_TENANT}
// Temporary and password sessions use the same company administrator permissions.
export function allowed(e:Env,u:any){return !!owner(e)&&owner(e)===u.tenant_id&&u.role==='admin'}
export async function naver(req:Request,e:Env,u:any,path:string){
 if(!['/api/integrations','/api/integrations/test','/api/integrations/collect'].includes(path))return null;
 const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{'Cache-Control':'no-store'}});
 if(!allowed(e,u))return json({error:'이 메일 계정에 접근할 관리자 권한이 없습니다'},403);
 e={...e,NAVER_EMAIL:e.NAVER_EMAIL?.trim(),NAVER_APP_PASSWORD:e.NAVER_APP_PASSWORD?.replace(/\s/g,'')};
 const configured=!!(e.NAVER_EMAIL&&e.NAVER_APP_PASSWORD);
 if(path==='/api/integrations'&&req.method==='GET'){const last:any=await e.DB.prepare("SELECT action,created FROM audit WHERE tenant_id=? AND action IN ('naver:collect','naver:test','naver:error') ORDER BY id DESC LIMIT 1").bind(u.tenant_id).first();return json({configured,email:e.NAVER_EMAIL||'',mode:'naver',lastRun:last||null,schedule:'수동 수집',sending:false})}
 if(req.method!=='POST')return json({error:'지원하지 않는 요청'},405);
 if(!configured)return json({error:'Cloudflare에 NAVER_EMAIL과 NAVER_APP_PASSWORD를 설정하고 재배포하세요'},400);
 if(!/^[^\s@]+@naver\.com$/i.test(e.NAVER_EMAIL!))return json({error:'NAVER_EMAIL은 네이버 메일 주소 전체여야 합니다'},400);
 if(!await limit(e.DB,'naver:'+u.tenant_id,10))return json({error:'15분에 10회까지 연결할 수 있습니다'},429);
 const socket=connect({hostname:'imap.naver.com',port:993},{secureTransport:'on',allowHalfOpen:false});socket.closed.catch(()=>{});
 let phase="TLS 연결";let timedOut=false;const timer=setTimeout(()=>{timedOut=true;void socket.close().catch(()=>{})},25000);
 try{
  await socket.opened;phase="서버 인사 응답";const imap=new Imap(socket.readable,socket.writable);
  if(!(await imap.line()).startsWith('* OK'))throw Error('네이버 초기 응답을 확인할 수 없습니다');
  phase='네이버 로그인';await imap.command('LOGIN '+quoted(e.NAVER_EMAIL!)+' '+quoted(e.NAVER_APP_PASSWORD!));
  phase='수신함 열기';const box=await imap.command('EXAMINE INBOX');const validity=box.lines.join('\n').match(/\[UIDVALIDITY (\d+)\]/)?.[1];
  if(!validity)throw Error('메일함 식별정보를 확인할 수 없습니다');
  let added=0,duplicates=0;const skipped:{uid:number;reason:string}[]=[];
  if(path.endsWith('/collect')){phase='메일 수집·저장';
   const count=Number(box.lines.join('\n').match(/\* (\d+) EXISTS/)?.[1]||0);
   if(count){const meta=await imap.command(`FETCH ${Math.max(1,count-9)}:${count} (UID RFC822.SIZE)`);
    for(const line of meta.lines){const uid=Number(line.match(/\bUID (\d+)/)?.[1]);const size=Number(line.match(/\bRFC822.SIZE (\d+)/)?.[1]);if(!uid||!size)continue;
     const id='naver-'+await hash([u.tenant_id,e.NAVER_EMAIL!.toLowerCase(),'INBOX',validity,uid].join('|'));
     if(await e.DB.prepare('SELECT id FROM records WHERE tenant_id=? AND id=?').bind(u.tenant_id,id).first()){duplicates++;continue}
     if(size>5*1024*1024){skipped.push({uid,reason:'5MB 초과'});continue}
     const message=await imap.command(`UID FETCH ${uid} (BODY.PEEK[])`);if(message.literals.length!==1){skipped.push({uid,reason:'메일 이동 또는 삭제로 원문 없음'});continue}
     const raw=message.literals[0];const parsed=await PostalMime.parse(raw,{maxNestingDepth:20,maxHeadersSize:65536});
     const attachments=[];const statements:D1PreparedStatement[]=[];
     for(let n=0;n<parsed.attachments.length;n++){const a=parsed.attachments[n],fileId=id+'-'+n,key=u.tenant_id+'/'+fileId;
      await e.FILES.put(key,a.content,{httpMetadata:{contentType:'application/octet-stream'}});
      statements.push(e.DB.prepare('INSERT OR IGNORE INTO files VALUES(?,?,?,?,?)').bind(fileId,u.tenant_id,key,(a.filename||'attachment').slice(0,100),'application/octet-stream'));attachments.push({id:fileId,name:a.filename||'첨부파일',size:typeof a.content==='string'?new TextEncoder().encode(a.content).length:a.content.byteLength});
     }
     const body=parsed.text||parsed.html?.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ')||'';
     const data={subject:parsed.subject||'(제목 없음)',from:parsed.from?.address||'',senderName:parsed.from?.name||'',body:body.slice(0,100000),date:parsed.date||'',messageId:parsed.messageId||'',attachments,mode:'naver',status:'검토 대기',uid,uidValidity:validity};
     statements.push(e.DB.prepare("INSERT OR IGNORE INTO records(id,tenant_id,kind,data) VALUES(?,?,'mail',?)").bind(id,u.tenant_id,JSON.stringify(data)));
     const results=await e.DB.batch(statements);if(results[results.length-1].meta.changes)added++;else duplicates++;
    }
   }
  }
  await e.DB.prepare('INSERT INTO audit(tenant_id,user_id,action,target) VALUES(?,?,?,?)').bind(u.tenant_id,u.id,path.endsWith('/test')?'naver:test':'naver:collect',JSON.stringify({added,duplicates,skipped:skipped.length})).run();
  return json({ok:true,added,duplicates,skipped,message:path.endsWith('/test')?'네이버 로그인·수신함 연결 성공':`${added}통 저장 · 중복 ${duplicates}통 · 제외 ${skipped.length}통`});
 }catch(err){const serverReason=phase==='네이버 로그인'&&err instanceof ImapRejected?err.response.split(e.NAVER_APP_PASSWORD!).join('[redacted]').split(e.NAVER_EMAIL!).join('[account]').split(e.NAVER_EMAIL!.split('@')[0]).join('[account]'):undefined;await e.DB.prepare("INSERT INTO audit(tenant_id,user_id,action,target) VALUES(?,?,'naver:error','connection-or-collection')").bind(u.tenant_id,u.id).run();return json({phase,serverReason,error:timedOut?'연결 시간이 초과되었습니다. 일부 저장된 메일은 유지됩니다. 다시 가져오기를 누르세요.':'네이버 연결 또는 수집 실패. IMAP 사용함·앱 비밀번호·Cloudflare 설정을 확인하세요. 이미 저장된 메일은 유지됩니다.'},502)}finally{clearTimeout(timer);await socket.close().catch(()=>{})}
}

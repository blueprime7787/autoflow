import{connect}from'cloudflare:sockets';
export const base64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)};
export const utf64=(s:string)=>base64(new TextEncoder().encode(s));
export function address(s:any){if(typeof s!=='string'||s.length>254||! /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(s))throw Error('이메일 주소를 확인하세요');return s}
export function mimeMail(m:{from:string;to:string;subject:string;html:string;text:string;messageId:string;replyId?:string;pdf:Uint8Array;filename:string}){
 address(m.from);address(m.to);if(/[\r\n]/.test(m.subject)||m.subject.length>180)throw Error('제목을 확인하세요');
 const b='autoflow-'+crypto.randomUUID(),a=b+'-alternative',fold=(s:string)=>s.match(/.{1,76}/g)?.join('\r\n')||'',enc=(s:string)=>fold(utf64(s));
 const subject=Array.from(m.subject).reduce((arr:string[],c,i)=>{const n=Math.floor(i/10);arr[n]=(arr[n]||'')+c;return arr},[]).map(s=>'=?UTF-8?B?'+utf64(s)+'?=').join('\r\n ');
 const reply=m.replyId&&/^<[^<>\s]+@[^<>\s]+>$/.test(m.replyId)?['In-Reply-To: '+m.replyId,'References: '+m.replyId]:[];
 return ['From: '+m.from,'To: '+m.to,'Subject: '+subject,'Date: '+new Date().toUTCString(),'Message-ID: '+m.messageId,...reply,'MIME-Version: 1.0','Content-Type: multipart/mixed; boundary="'+b+'"','','--'+b,'Content-Type: multipart/alternative; boundary="'+a+'"','','--'+a,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',enc(m.text),'--'+a,'Content-Type: text/html; charset=UTF-8','Content-Transfer-Encoding: base64','',enc(m.html),'--'+a+'--','--'+b,'Content-Type: application/pdf','Content-Disposition: attachment; filename="'+m.filename.replace(/[^a-zA-Z0-9._-]/g,'_')+'"','Content-Transfer-Encoding: base64','',fold(base64(m.pdf)),'--'+b+'--',''].join('\r\n');
}
export class SmtpFailure extends Error{constructor(public uncertain:boolean){super(uncertain?'발송 결과를 확인할 수 없습니다. 중복 방지를 위해 재발송을 잠갔습니다. 수신자와 네이버 발송 내역을 확인하세요.':'네이버 SMTP 발송이 실패했습니다. 계정 설정을 확인한 뒤 다시 시도하세요.')}}
export async function smtpSend(email:string,password:string,to:string,message?:string){
 address(email);address(to);let socket:any,submitted=false;
 try{socket=connect({hostname:'smtp.naver.com',port:465},{secureTransport:'on',allowHalfOpen:false});socket.closed.catch(()=>{});
 const timer=setTimeout(()=>{void socket.close().catch(()=>{})},25000);
 try{await socket.opened;const reader=socket.readable.getReader(),writer=socket.writable.getWriter();let buffer='';
 const line=async()=>{for(;;){const pos=buffer.indexOf('\r\n');if(pos>=0){const l=buffer.slice(0,pos);buffer=buffer.slice(pos+2);return l}const v=await reader.read();if(v.done)throw Error('closed');buffer+=new TextDecoder().decode(v.value);if(buffer.length>65536)throw Error('response limit')}};
 const reply=async(expected:number)=>{for(let i=0;i<100;i++){const l=await line();if(!/^\d{3}[- ]/.test(l))throw Error('protocol');if(l[3]===' '){const code=Number(l.slice(0,3));if(code!==expected){if(code>=400&&code<=599)submitted=false;throw Error('rejected')}return}}throw Error('reply limit')};
 const command=async(s:string,code:number)=>{await writer.write(new TextEncoder().encode(s+'\r\n'));await reply(code)};
 await reply(220);await command('EHLO autoflow.local',250);await command('AUTH LOGIN',334);await command(utf64(email),334);await command(utf64(password),235);if(message===undefined)return {accepted:false};await command('MAIL FROM:<'+email+'>',250);await command('RCPT TO:<'+to+'>',250);await command('DATA',354);
 submitted=true;await writer.write(new TextEncoder().encode(message.replace(/(^|\r\n)\./g,'$1..')+'\r\n.\r\n'));await reply(250);
 // Acknowledged DATA is success even if QUIT/close later fails.
 return {accepted:true};
 }finally{clearTimeout(timer)}
 }catch{throw new SmtpFailure(submitted)}finally{if(socket)await socket.close().catch(()=>{})}
}

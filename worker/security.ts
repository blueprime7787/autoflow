export const uid=()=>crypto.randomUUID();
export function check(ok:unknown,msg='입력값을 확인하세요'):asserts ok{if(!ok)throw Error(msg)}
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
export async function hash(s:string){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))}
export async function password(p:string,s:string){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(s),iterations:100000,hash:'SHA-256'},k,256))}
export function validPassword(p:unknown):asserts p is string{check(typeof p==='string'&&p.length>=12&&p.length<=128,'비밀번호는 12~128자로 입력하세요')}
export async function limit(db:D1Database,key:string,max:number){const now=Date.now();const r:any=await db.prepare('INSERT INTO login_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING count').bind(await hash(key),now+900000,now,now).first();return r.count<=max}

export class ImapRejected extends Error {constructor(public response:string){super('IMAP request rejected')}}
// Minimal read-only IMAP client. Literal sizes are bytes, never decoded character lengths.
export class Imap {
  reader:ReadableStreamDefaultReader<Uint8Array>; writer:WritableStreamDefaultWriter<Uint8Array>;
  buffer=new Uint8Array(0); seq=0;
  constructor(readable:ReadableStream<Uint8Array>,writable:WritableStream<Uint8Array>){this.reader=readable.getReader();this.writer=writable.getWriter()}
  async more(){const r=await this.reader.read();if(r.done)throw Error('IMAP 연결이 종료되었습니다');const b=new Uint8Array(this.buffer.length+r.value.length);b.set(this.buffer);b.set(r.value,this.buffer.length);this.buffer=b;if(b.length>6*1024*1024)throw Error('메일 응답 크기 초과')}
  async line(){for(;;){const i=this.buffer.findIndex((v,i)=>v===13&&this.buffer[i+1]===10);if(i>=0){const s=new TextDecoder().decode(this.buffer.slice(0,i));this.buffer=this.buffer.slice(i+2);return s}if(this.buffer.length>65536)throw Error('IMAP 응답 줄 크기 초과');await this.more()}}
  async bytes(n:number){if(n>5*1024*1024)throw Error('메일은 5MB 이하만 지원합니다');while(this.buffer.length<n)await this.more();const b=this.buffer.slice(0,n);this.buffer=this.buffer.slice(n);return b}
  async command(command:string){const tag='A'+(++this.seq);await this.writer.write(new TextEncoder().encode(tag+' '+command+'\r\n'));const lines:string[]=[],literals:Uint8Array[]=[];for(let i=0;i<20000;i++){const line=await this.line();if(line.startsWith(tag+' ')){if(!line.startsWith(tag+' OK'))throw new ImapRejected(line.slice(tag.length+1,tag.length+501));return{lines,literals}}if(line.startsWith('* BYE'))throw Error('네이버가 연결을 종료했습니다');lines.push(line);const m=line.match(/\{(\d+)\}$/);if(m)literals.push(await this.bytes(Number(m[1])))}throw Error('IMAP 응답 수 초과')}
}
export function quoted(s:string){if(/[\r\n\0]/.test(s))throw Error('인증 설정을 확인하세요');return '"'+s.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"'}

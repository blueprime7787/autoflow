import{lineAmount}from'./domain.mjs';
import{PDFDocument,rgb}from'pdf-lib';import fontkit from'@pdf-lib/fontkit';
export async function quotePdf(q:any,fontBytes:ArrayBuffer|Uint8Array,images:{logo?:{bytes:ArrayBuffer;mime:string};seal?:{bytes:ArrayBuffer;mime:string}}={}){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);const font=await pdf.embedFont(fontBytes,{subset:false});
 const navy=rgb(.10,.18,.29),blue=rgb(.16,.45,.85),ink=rgb(.22,.29,.38),pale=rgb(.91,.94,.98),cream=rgb(1,.98,.92),white=rgb(1,1,1),line=rgb(.85,.89,.94);let page=pdf.addPage([595.28,841.89]),y=0;
 const clean=(v:any)=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'');
 const wrap=(v:any,w:number,size=9)=>{const out:string[]=[];for(const para of clean(v).split(/\r?\n/)){let part='';for(const ch of para){if(font.widthOfTextAtSize(part+ch,size)>w&&part){out.push(part);part=''}part+=ch}out.push(part)}return out};
 const text=(v:any,x:number,top:number,size=9,color=ink)=>page.drawText(clean(v),{x,y:842-top-size,size,font,color});
 const block=(v:any,x:number,top:number,w:number,size=9,color=ink)=>{const lines=wrap(v,w,size);lines.forEach((l,i)=>text(l,x,top+i*(size+5),size,color));return lines.length*(size+5)};
 const box=(x:number,top:number,w:number,h:number,color:any)=>page.drawRectangle({x,y:842-top-h,width:w,height:h,color});
 const rule=(top:number)=>box(36,top,523,1,line);
 const money=(n:number)=>Number(n||0).toLocaleString('ko-KR');
 function header(){text('AUTOFLOW  /  QUOTATION',36,28,9,blue);text('MEDICAL SALES WORKSPACE',385,28,8);text('견 적 서',36,48,27,navy);rule(92);y=110}
 function footer(){rule(795);text((q.number||'견적 초안')+'  ·  v'+(q.revision||1),36,808,8);text(String(pdf.getPageCount()),545,808,8)}
 function next(){footer();page=pdf.addPage([595.28,841.89]);text('견적서 · '+(q.number||''),36,30,12,navy);rule(55);y=70}
 function need(h:number){if(y+h>775)next()}
 header();
 const left=[['수신처',q.customer+' 귀중'],['이메일',q.email||'—'],['견적일자',q.date||'—'],['견적번호',q.number||'저장 전 초안'],['유효기간',q.validUntil||'별도 협의']];
 const right=[['상호',q.company?.company||'미등록'],['사업자번호',q.company?.businessNo||'—'],['대표자',q.company?.representative||'—'],['연락처',q.company?.phone||'—'],['주소',q.company?.address||'—']];
 const heights=left.map((l,i)=>Math.max(wrap(l[1],177).length,wrap(right[i][1],177).length)*14+6);const infoH=35+heights.reduce((a,b)=>a+b,0);
 box(36,y,261.5,infoH,cream);box(297.5,y,261.5,infoH,pale);text('수신 정보',46,y+10,11,blue);text('공급자 정보',307.5,y+10,11,blue);let iy=y+33;
 for(let i=0;i<left.length;i++){text(left[i][0],46,iy,8);block(left[i][1],112,iy,175);text(right[i][0],307.5,iy,8);block(right[i][1],374,iy,175);iy+=heights[i]}
 for(const [key,x,top]of [['logo',486,48],['seal',515,y+8]]as const){const a=images[key];if(a){const img=a.mime==='image/png'?await pdf.embedPng(a.bytes):await pdf.embedJpg(a.bytes);const ratio=Math.min(38/img.width,30/img.height);page.drawImage(img,{x,y:842-top-30,width:img.width*ratio,height:img.height*ratio})}}
 y+=infoH+20;box(36,y,523,43,navy);text('최종 견적금액',48,y+14,12,white);const total=money(q.total)+' 원';text(total,548-font.widthOfTextAtSize(total,21),y+8,21,white);y+=49;text('부가세 포함 · 단가 및 공급금액은 VAT 별도',36,y,8);y+=25;
 const cols=[36,58,200,230,256,328,408,478,559];
 const tableHead=()=>{box(36,y,523,25,navy);['No.','품목 / 모델 · 규격','수량','단위','단가','공급금액','부가세','합계'].forEach((s,i)=>text(s,cols[i]+3,y+8,7,white));y+=25};tableHead();
 for(let index=0;index<q.items.length;index++){const i=q.items[index];const desc=wrap(i.name+(i.model?' / '+i.model:'')+(i.description?'\n'+i.description:''),130,9);let offset=0;do{if(y+48>775){next();tableHead()}const capacity=Math.max(1,Math.floor((775-y-14)/14));const part=desc.slice(offset,offset+capacity);const h=Math.max(48,part.length*14+14);box(58,y,198,h,cream);if(offset===0){text(index+1,39,y+10,8);text(i.qty,203,y+10,8);block(i.unit||'개',233,y+10,20,7);const values=[i.price,lineAmount(i).supply,lineAmount(i).tax,lineAmount(i).total];values.forEach((v,n)=>{const value=money(v),width=cols[n+5]-cols[n+4]-6,size=Math.min(8,width/font.widthOfTextAtSize(value,8)*8);text(value,cols[n+5]-3-font.widthOfTextAtSize(value,size),y+10,size)});if(i.taxable===false)text('면세',440,y+24,7)}part.forEach((l,k)=>text(l,62,y+8+k*14));rule(y+h);y+=h;offset+=part.length;}while(offset<desc.length)}
 y+=20;need(95);text('견적 금액',36,y,12,blue);for(const [label,value]of [['공급가액',q.supply],['부가세',q.tax],['VAT 포함 합계',q.total]]){box(320,y,239,26,label==='VAT 포함 합계'?navy:pale);text(label,330,y+8,9,label==='VAT 포함 합계'?white:ink);const v=money(Number(value))+' 원';text(v,548-font.widthOfTextAtSize(v,10),y+7,10,label==='VAT 포함 합계'?white:ink);y+=28}
 for(const [label,value]of [['견적 조건',q.terms],['추가 안내 / 특이사항',q.notes]]){if(!value)continue;y+=18;need(50);text(label,36,y,12,blue);y+=25;for(const l of wrap(value,503,10)){need(24);box(36,y,523,20,cream);text(l,46,y+3,10);y+=20}}
 footer();return pdf.save();
}

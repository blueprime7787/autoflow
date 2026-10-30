import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';
const host=process.env.TEST_URL||'http://127.0.0.1:8788';const base=host+'/api/';let checks=0;const pass=n=>{checks++;console.log('PASS '+n)};async function call(path,body,cookie=''){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});const b=await r.json();return {r,b}};
const pw=randomBytes(18).toString('hex');let result=await call('setup',{password:pw});assert.equal(result.r.status,200,JSON.stringify(result.b));pass('local setup');
async function login(email){const {r}=await call('login',{email,password:pw});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]}
const admin=await login('admin@demo.local'),staff=await login('staff@demo.local'),other=await login('other@demo.local');pass('three role/tenant sessions');
assert.equal((await call('records?kind=customer')).r.status,401);pass('anonymous blocked');
async function create(kind,b,c=admin){const x=await call('records?kind='+kind,b,c);assert.equal(x.r.status,200,JSON.stringify(x.b));return x.b.id}
async function list(kind,c=admin){return (await call('records?kind='+kind,undefined,c)).b}
async function act(id,action,c=admin){const all=await Promise.all(['quote','order','receipt'].map(k=>list(k,c)));const r=all.flat().find(x=>x.id===id);return call('records/'+id+'/action',{action,version:r.version},c)}
const customer=await create('customer',{name:'가상 이안병원',email:'test@example.invalid',contact:'테스트 담당자'});const product=await create('product',{name:'전자 혈압계',model:'BP-100',code:'BP-100',price:50000});await create('price',{customerId:customer,productId:product,price:45000});assert.equal((await list('customer',other)).length,0);pass('tenant list isolation');
assert.equal((await call('records?kind=quote',{customerId:customer,items:[{productId:product,qty:1}]},other)).r.status,400);pass('foreign references rejected');
const quote=await create('quote',{customerId:customer,items:[{productId:product,qty:5}]});let q=(await list('quote'))[0];assert.equal(q.data.total,247500);pass('customer price and VAT snapshot');
await act(quote,'submit');assert.equal((await act(quote,'approve',staff)).r.status,400);pass('staff approval blocked');await act(quote,'approve');
const sent=await Promise.all([act(quote,'send'),act(quote,'send')]);assert.equal(sent.filter(x=>x.r.ok).length,1);assert.equal((await list('mail')).length,1);pass('concurrent duplicate send blocked');
await act(quote,'order');assert.equal((await act(quote,'order')).r.status,400);const order=(await list('order'))[0];assert.equal((await list('order')).length,1);pass('single order conversion');
await act(order.id,'deliver');pass('delivery transition');
const rec=await create('receipt',{orderId:order.id,amount:100000,payer:'이안병원',text:'테스트 입금 A'});await act(rec,'approve');const rec2=await create('receipt',{orderId:order.id,amount:200000,payer:'이안병원',text:'테스트 입금 B'});assert.equal((await act(rec2,'approve')).r.status,400);pass('receipt approval and overpayment blocked');
const pdf=await call('records/'+quote+'/pdf',{},admin);assert.equal(pdf.r.status,200,JSON.stringify(pdf.b));const file=await fetch(host+pdf.b.url,{headers:{Cookie:admin}});const bytes=await file.arrayBuffer();assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');const denied=await fetch(host+pdf.b.url,{headers:{Cookie:other}});assert.equal(denied.status,404);pass('server PDF stored in R2, other tenant denied');
await call('integrations/collect',{},admin);await call('integrations/collect',{},admin);assert.equal((await list('mail')).filter(r=>r.id.startsWith('mock')).length,1);pass('mock collection idempotency');
const analysis=await call('integrations/analyze',{text:'BP-100 5대 견적 요청'},admin);assert.equal(analysis.b.quantity,5);assert.equal(analysis.b.candidates.length,1);pass('rule parser uses product database');
const csrf=await fetch(base+'logout',{method:'POST',headers:{Cookie:admin,Origin:'https://evil.example'}});assert.equal(csrf.status,403);pass('cross origin mutation blocked');
await call('logout',{},staff);assert.equal((await call('me',undefined,staff)).r.status,401);pass('session revocation');
await import('node:fs/promises').then(fs=>fs.writeFile('test-results.json',JSON.stringify({checks,passed:checks,date:new Date().toISOString(),environment:'local Wrangler D1/R2',pdfBytes:bytes.byteLength},null,2)));console.log(checks+' integration checks passed');

export {call,list,create,act,admin,staff,other,pw,host};

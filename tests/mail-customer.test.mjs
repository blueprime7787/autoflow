import{test}from'node:test';import assert from'node:assert/strict';import{build}from'esbuild';import{DatabaseSync}from'node:sqlite';
const b=await build({entryPoints:['worker/mail-customer.ts'],bundle:true,write:false,format:'esm',platform:'node'});const{ensureMailCustomer,customerSuggestion}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE records(id TEXT,tenant_id TEXT,kind TEXT,data TEXT,version INTEGER DEFAULT 1,PRIMARY KEY(tenant_id,id));CREATE TABLE audit(tenant_id TEXT,user_id TEXT,action TEXT,target TEXT)');
 const DB={prepare(sql){return {bind(...args){return {
  async first(){return db.prepare(sql).get(...args)},
  async all(){return {results:db.prepare(sql).all(...args)}},
  async run(){return {meta:{changes:db.prepare(sql).run(...args).changes}}}
 }}}}};
 return {db,e:{DB}};
}

test('company from greeting, sender fallback and email fallback',()=>{assert.equal(customerSuggestion({body:'안녕하세요. 블루프라임 입니다.&nbsp; 견적 요청',senderName:'김담당',from:'a@b.com'}).name,'블루프라임');assert.equal(customerSuggestion({senderName:'홍길동',from:'a@b.com'}).name,'홍길동');assert.equal(customerSuggestion({from:'a@b.com'}).name,'a')});
test('first sender auto-registers, repeats/concurrent calls reuse, tenants isolated and manual edits preserved',async()=>{const{db,e}=fixture(),u={id:'u',tenant_id:'a'},mail={id:'m',data:{body:'블루프라임 입니다.',from:'BUYER@example.com'}};const first=await ensureMailCustomer(e,u,mail);assert(first.created);assert.equal(first.customer.data.name,'블루프라임');await Promise.all([ensureMailCustomer(e,u,mail),ensureMailCustomer(e,u,mail)]);assert.equal(db.prepare('SELECT count(*) n FROM records').get().n,1);const edited={...first.customer.data,name:'수정 업체'};db.prepare('UPDATE records SET data=? WHERE id=?').run(JSON.stringify(edited),first.customer.id);assert.equal((await ensureMailCustomer(e,u,mail)).customer.data.name,'수정 업체');const other=await ensureMailCustomer(e,{...u,tenant_id:'b'},mail);assert.notEqual(first.customer.id,other.customer.id);assert.equal(db.prepare('SELECT count(*) n FROM records').get().n,2);});
test('existing match reused, ambiguous or archived matches require review',async()=>{const{db,e}=fixture(),u={id:'u',tenant_id:'a'},mail={id:'m',data:{from:'a@b.com'}};db.prepare("INSERT INTO records VALUES('existing','a','customer',?,1)").run(JSON.stringify({name:'기존',email:'a@b.com'}));assert.equal((await ensureMailCustomer(e,u,mail)).customer.id,'existing');db.prepare("INSERT INTO records VALUES('duplicate','a','customer',?,1)").run(JSON.stringify({name:'중복',email:'a@b.com'}));assert.equal((await ensureMailCustomer(e,u,mail)).customer,null);db.prepare("UPDATE records SET data=json_set(data,'$.archived',json('true'))").run();assert.equal((await ensureMailCustomer(e,u,mail)).customer,null);assert.equal(db.prepare('SELECT count(*) n FROM records').get().n,2)});

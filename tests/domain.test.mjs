import{test}from'node:test';import assert from'node:assert/strict';import{amount,transition}from'../worker/domain.mjs';
test('과세·면세 합계',()=>assert.deepEqual(amount([{qty:2,price:1000},{qty:1,price:1500,taxable:false}]),{supply:3500,tax:200,total:3700}));
test('잘못된 수량·단가 차단',()=>{for(const item of [{qty:0,price:1},{qty:1,price:-1},{qty:1.5,price:10}])assert.throws(()=>amount([item]))});
test('권한 및 상태 전이 차단',()=>{assert.throws(()=>transition('quote','pending','approve','staff'));assert.throws(()=>transition('quote','draft','send','admin'));assert.equal(transition('quote','pending','approve','admin'),'approved')});

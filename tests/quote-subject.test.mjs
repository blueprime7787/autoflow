import {test} from 'node:test';
import assert from 'node:assert/strict';
import {quoteSubject} from '../worker/quote-subject.mjs';
test('quotation subject names supplier, unique products and quote number',()=>{
 assert.equal(quoteSubject({company:{company:'블루프라임'},items:[{name:'로봇치료기'}],number:'Q-123'}),'[블루프라임] 로봇치료기 견적서 보내드립니다 (Q-123)');
 assert.match(quoteSubject({items:[{name:'로봇치료기'},{name:'로봇치료기'},{name:'혈압계'}]}),/로봇치료기 외 1종 견적서/);
 assert.match(quoteSubject({}),/요청하신 제품 견적서/);
 const long=quoteSubject({company:{company:'가'.repeat(100)+'\r\n'},items:[{name:'나'.repeat(300)+'\n'}],number:'Q'.repeat(200)});
 assert(long.length<=180);assert(!/[\r\n]/.test(long));
});

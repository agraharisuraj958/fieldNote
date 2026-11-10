import test from 'node:test'; import assert from 'node:assert/strict'; import {allocateFefo,computeTotals} from '../src/rules.js';
test('FEFO allocates earliest unexpired batch first, then next batch',()=>{const rows=[{id:'later',expiry_date:'2027-12-01',quantity:8},{id:'old',expiry_date:'2026-12-01',quantity:3},{id:'expired',expiry_date:'2025-01-01',quantity:50}]; assert.deepEqual(allocateFefo(rows,5,'2026-01-01'),[{batchId:'old',quantity:3},{batchId:'later',quantity:2}]);});
test('FEFO rejects expired-only or insufficient stock',()=>assert.throws(()=>allocateFefo([{id:'x',expiry_date:'2025-01-01',quantity:8}],1,'2026-01-01'),/Insufficient/));
test('FEFO accepts PostgreSQL date values parsed as JavaScript Date objects',()=>assert.deepEqual(allocateFefo([{id:'today',expiry_date:new Date('2026-05-01T00:00:00.000Z'),quantity:2}],1,'2026-05-01'),[{batchId:'today',quantity:1}]));
test('invalid quantities fail before allocation',()=>assert.throws(()=>allocateFefo([],0),/positive whole number/));
test('tax totals are calculated per line and rounded to cents',()=>assert.deepEqual(computeTotals([{quantity:2,unitPrice:12.5,taxRate:5}]),{subtotal:25,tax:1.25,total:26.25}));

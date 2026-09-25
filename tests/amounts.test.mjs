import test from 'node:test';
import assert from 'node:assert/strict';
import {atomic,toAtoms,fromAtoms,portion,minOut} from '../src/amounts.mjs';

test('amount above Number.MAX_SAFE_INTEGER round-trips exactly',()=>{
  const value='9007199254740993.123456789';
  assert.equal(toAtoms(value,9),'9007199254740993123456789');
  assert.equal(fromAtoms(toAtoms(value,9),9),value);
});
test('percentage floors fractional atoms and never over-allocates',()=>{
  assert.equal(portion('101',5000),'50');
  assert.equal(portion('1',2500),'0');
  assert.equal(portion('18446744073709551615',10000),'18446744073709551615');
});
test('min received applies basis-point slippage with floor rounding',()=>{
  assert.equal(minOut('1234567',100),'1222221');
});
test('zero-decimal assets retain integer units',()=>{
  assert.equal(toAtoms('42',0),'42');
  assert.equal(fromAtoms('42',0),'42');
});
test('unsupported precision, negative values and exponential notation are rejected',()=>{
  for(const value of ['1.0000001','-1','1e6','NaN',''])assert.throws(()=>toAtoms(value,6));
  for(const decimals of [-1,19,1.5])assert.throws(()=>toAtoms('1',decimals));
  assert.throws(()=>atomic('-1'));
});
test('percentage boundaries reject invalid allocations',()=>{
  for(const bps of [-1,10001,2.5,NaN])assert.throws(()=>portion('100',bps));
  assert.equal(portion('100',0),'0');
});

import test from 'node:test'
import assert from 'node:assert/strict'
import {rotateToArea} from '../src/components/atlasRotation.js'

test('every option including AI research is reachable',()=>{
 for(let i=0;i<4;i++){
  const next=rotateToArea({index:0,turns:0},i)
  assert.equal(next.index,i)
  assert.ok(Number.isInteger(next.turns))
 }
})
test('rotation follows shortest route between any two faces',()=>{
 for(let from=0;from<4;from++)for(let to=0;to<4;to++){
  const next=rotateToArea({index:from,turns:from},to)
  assert.equal(next.index,to)
  assert.ok(Math.abs(next.turns-from)<=2)
  assert.equal(((next.turns%4)+4)%4,to)
 }
})
test('reselecting an active option is stable and invalid indices are ignored',()=>{
 const state={index:1,turns:5}
 assert.strictEqual(rotateToArea(state,1),state)
 assert.strictEqual(rotateToArea(state,-1),state)
 assert.strictEqual(rotateToArea(state,4),state)
})

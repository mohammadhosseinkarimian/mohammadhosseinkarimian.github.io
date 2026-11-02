import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const css = readFileSync(new URL('../src/motion-v5.css',import.meta.url),'utf8')
const app = readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8')
const atlas = readFileSync(new URL('../src/components/ExpertiseAtlas.jsx',import.meta.url),'utf8')
test('cube faces use responsive greater-than-square height and cap recentering',()=>{
  assert.match(css,/--cube-height:\s*calc\(var\(--cube-size\) \+ 100px\)/)
  assert.match(css,/height:\s*var\(--cube-height\)/)
  assert.match(css,/top:\s*calc\(\(var\(--cube-height\) - var\(--cube-size\)\) \/ 2\)/)
  for(const bp of [900,640,390,340]) assert.match(css,new RegExp(`max-width: ${bp}px`))
})
test('all four icons are centered without interfering with the trailing arrow',()=>{
  assert.match(css,/\.atlas-choice\.atlas-node \.atlas-node-icon\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*center/s)
  assert.match(css,/\.atlas-choice\.atlas-node:hover \.atlas-node-icon > svg:last-child/)
  assert.match(css,/\.atlas-choice\.atlas-node > svg:last-child\s*\{\s*margin-left:\s*auto/s)
  assert.match(atlas,/expertiseAreas\.map\(\(area,index\)=><button/)
  assert.match(app,/import '\.\/motion-v5\.css'/)
})

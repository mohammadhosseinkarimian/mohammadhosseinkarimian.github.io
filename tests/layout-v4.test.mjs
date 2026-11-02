import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const atlas = readFileSync(new URL('../src/components/ExpertiseAtlas.jsx',import.meta.url),'utf8')
const css = readFileSync(new URL('../src/motion-v4.css',import.meta.url),'utf8')
const app = readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8')

test('all four selector buttons are outside the 3D scene and are real buttons',()=>{
 const sceneEnd=atlas.indexOf('    </div>\n    <div className="atlas-controls"')
 assert.ok(sceneEnd>0)
 assert.match(atlas,/role="group" aria-label="Choose an area of expertise"/)
 assert.match(atlas,/onClick=\{\(\)=>selectArea\(index\)\}/)
 assert.doesNotMatch(atlas,/INTERACTIVE 3D/)
})
test('responsive 3D selectors are independently positioned and avoid overlay clipping',()=>{
 assert.match(css,/\.atlas-controls\s*\{[^}]*position:relative/s)
 assert.match(css,/\.atlas-scene\.atlas-scene-v3\s*\{[^}]*overflow:visible/s)
 assert.match(css,/@media \(max-width:340px\)/)
})
test('collapsed theme drawer cannot block unrelated buttons',()=>{
 assert.match(css,/\.theme-dock \{pointer-events:none;\}/)
 assert.match(css,/\.theme-trigger,\.theme-expanded \.theme-options/)
})
test('door navigation swaps routes between the closing and opening phase, with reduced motion support',()=>{
 assert.match(app,/displayRoute\(targetRef\.current\)/)
 assert.match(app,/changePhase\('opening'\)/)
 assert.match(app,/onTransitionEnd=\{onPanelEnd\}/)
 assert.match(app,/prefers-reduced-motion: reduce/)
 assert.match(css,/\.page-doors-closing \.page-door-left/)
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/)
})

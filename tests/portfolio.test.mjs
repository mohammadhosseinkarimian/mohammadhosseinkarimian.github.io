import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { experiences, projects, publications, person } from '../src/data/portfolio.js'

const root=join(dirname(fileURLToPath(import.meta.url)),'..')
const read=path=>readFileSync(join(root,path),'utf8')

test('professional contact profiles are root profiles, not activity sections',()=>{
 assert.equal(person.github, 'https://github.com/mohammadhosseinkarimian')
 assert.equal(person.linkedin, 'https://www.linkedin.com/in/mohammadhossein-karimian/')
})
test('professional experience has descriptive career evidence',()=>{
 assert.ok(experiences.length>=9)
 for(const e of experiences){
  assert.ok(e.role && e.org && e.date)
  assert.ok(e.highlights.length>=4,`Too few detailed contributions for ${e.role}`)
  assert.ok(e.highlights.every(s=>s.length>50),`Too brief a contribution for ${e.role}`)
 }
})
test('featured projects and academic citations remain intact',()=>{
 assert.ok(projects.filter(p=>p.featured).length>=3)
 assert.ok(projects.every(p=>p.challenge && p.approach && p.outcome))
 assert.ok(publications.length>=2 && publications.every(p=>p.url.startsWith('https://doi.org/')))
})
test('five complete theme palettes are defined, with a light default',()=>{
 const css=read('src/refinements.css')
 for(const t of ['pearl','violet','blue','coral','lime']){
  assert.ok(css.includes(`data-theme='${t}'`),`Missing theme ${t}`)
 }
 assert.ok(read('src/components/UI.jsx').includes("?choice:'pearl'"))
})
test('the hero is interactive and eliminates the continuous canvas',()=>{
 assert.ok(existsSync(join(root,'src/components/ExpertiseAtlas.jsx')))
 assert.ok(read('src/pages/Home.jsx').includes('<ExpertiseAtlas/>'))
 assert.ok(!read('src/pages/Home.jsx').includes('NetworkField'))
})
test('contact has no form or subject input',()=>{
 const source=read('src/pages/Contact.jsx')
 assert.ok(!source.includes('<form'))
 assert.ok(!source.includes('SUBJECT'))
 assert.ok(source.includes('mailto:'))
})
test('scroll indicator avoids React state on every scroll',()=>{
 const source=read('src/components/UI.jsx')
 const section=source.slice(source.indexOf('export function ScrollProgress'),source.indexOf('export function Footer'))
 assert.ok(!section.includes('setProgress'))
 assert.ok(section.includes('scaleX('))
})
test('screen reader labels and reduced motion support exist',()=>{
 assert.ok(read('src/components/ExpertiseAtlas.jsx').includes('aria-pressed'))
 assert.ok(read('src/refinements.css').includes('prefers-reduced-motion'))
})
test('no em dash appears in visible text content',()=>{
 for(const file of ['src/pages/Home.jsx','src/pages/Work.jsx','src/pages/About.jsx','src/pages/Contact.jsx','src/pages/Experience.jsx','src/data/portfolio.js']){
  assert.ok(!read(file).includes('—'),`Em dash in ${file}`)
 }
})

test('the 3D expertise model has four accessible selectable faces',()=>{
 const atlas=read('src/components/ExpertiseAtlas.jsx')
 const css=read('src/motion-v3.css')
 for(const id of ['ml','research','software','web']){
  assert.ok(atlas.includes(`id: '${id}'`),`Missing model face ${id}`)
  assert.ok(css.includes(`.atlas-choice-${id}`) || id==='ml' && css.includes('.atlas-choice-ml'))
 }
 assert.ok(atlas.includes('onClick={()=>selectArea(index)}'))
 assert.ok(atlas.includes('aria-pressed={view.index===index}'))
 assert.ok(atlas.includes('aria-hidden={view.index!==index}'))
 assert.ok(css.includes('transform-style:preserve-3d'))
 for(const deg of ['0deg','90deg','180deg','270deg'])assert.ok(css.includes(`rotateY(${deg})`))
})
test('inactive labels are gone, while interactive research concepts are present',()=>{
 const home=read('src/pages/Home.jsx')
 const atlas=read('src/components/ExpertiseAtlas.jsx')
 const research=read('src/components/ResearchExplorer.jsx')
 assert.ok(!home.includes('SELECTED WORK & EXPERIENCE'))
 assert.ok(!atlas.includes('SELECT AN AREA'))
 assert.ok(home.includes('<ResearchExplorer/>'))
 assert.ok(research.includes('aria-pressed={active===index}'))
 assert.ok(research.includes('CAUSALITY') && research.includes('STRATEGY') && research.includes('RESPONSIBILITY'))
})
test('3D interaction adapts to narrow screens and respects reduced motion',()=>{
 const css=read('src/motion-v3.css')
 for(const n of ['900','640','390','320'])assert.ok(css.includes(`max-width:${n}px`))
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'))
 assert.ok(css.includes('prefers-reduced-motion:reduce'))
 assert.ok(!css.includes('backdrop-filter:blur'))
})

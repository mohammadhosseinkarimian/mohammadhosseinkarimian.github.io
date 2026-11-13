import {test} from 'node:test'
import assert from 'node:assert/strict'
import {dateCandidates,queryMatch,trackReads} from '../src/components/find-products/text.js'
import {rank,validBarcode} from '../src/components/find-products/catalog.js'

test('date search handles missing spaces and French month names without inventing a date',()=>{
  assert.deepEqual(dateCandidates('2027FÉV06'),['2027-02-06'])
  assert.deepEqual(dateCandidates('16JUN2027'),['2027-06-16'])
  assert.deepEqual(dateCandidates('EXP 2027-02-30'),[])
  assert.deepEqual(dateCandidates('03/05/2027'),['2027-03-05','2027-05-03'])
  assert.equal(queryMatch('2027 JUN16','2027-06-16'),true)
  assert.equal(queryMatch('MEILLEUR AVANT','expiration date'),true)
  assert.equal(queryMatch('NONAME','Find No Name'),true)
  assert.equal(queryMatch('600 g','600g'),true)
})
test('repeated reads favor agreement while staying at the newest location',()=>{
  const line={text:'Nutella',box:[.1,.2,.3,.2],quad:[],confidence:.84}
  let tracks=trackReads([], [line],1000)
  tracks=trackReads(tracks,[line],2900)
  assert.equal(tracks[0].stable,true)
  tracks=trackReads(tracks,[{...line,text:'Nutellal',box:[.11,.2,.3,.2],confidence:.9}],4800)
  assert.equal(tracks[0].text,'Nutella')
  assert.equal(tracks[0].box[0],.11)
})
test('catalog matches respect printed size and check the GTIN checksum',()=>{
  assert.equal(validBarcode('3017620422003'),true)
  assert.equal(validBarcode('3017620422004'),false)
  const size540={item:{name:'Hamburger buns',quantity:'540 g'},title:['hamburger','buns'],
    brandWords:['no','name'],quantities:['540g'],terms:['hamburger','buns','no','name','540g']}
  const size600={...size540,item:{...size540.item,quantity:'600 g'},quantities:['600g'],
    terms:['hamburger','buns','no','name','600g']}
  const index=new Map(['hamburger','buns','no','name'].map(word=>[word,[0,1]]))
  index.set('600g',[1]);index.set('540g',[0])
  const results=rank({index,items:[size540,size600]},'No Name hamburger buns 600 g',{strict:true})
  assert.deepEqual(results.map(result=>result.item.quantity),['600 g'])
})

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { asset, catalog, lookupBarcode, priceFor, rank, searchOnline, validBarcode } from './catalog.js'
import { readFrame, scanner } from './scanner.js'
import { dateCandidates, normalize, packageQueries, queryMatch, spatialGroups, trackReads } from './text.js'
import './find-products.css'

const examples = ['No Name', 'Nutella', 'Best before']
const compact = value => String(value || '').replace(/\s+/g,' ').trim()
const cleanQuery = value => compact(value).replace(/^(?:find|search(?: for)?|look for|show me|cherche(?:r)?|trouve(?:r)?)\s+/i,'')
function Mic({ listening }) {
  return listening ? 'Listening…' : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/>
    <path d="M5 11v1a7 7 0 0 0 14 0v-1m-7 8v3m-3 0h6"/></svg> Voice</>
}
const matchesFor = (lines, query) => {
  const matches = new Set(lines.filter(line => queryMatch(line.text,query)).map(line=>line.id))
  if (normalize(query).includes(' ')) {
    const wanted = normalize(query).replace(/^(?:find|search for|look for|show me) /,'').split(' ')
    for (const group of spatialGroups(lines)) {
      if (queryMatch(group.text,query)) {
        const matching = group.members.filter(line=>normalize(line.text).split(' ').some(word=>wanted.includes(word)))
        if (matching.length > 1) matching.forEach(line=>matches.add(line.id))
      }
    }
  }
  return matches
}
const merge = (previous, incoming) => {
  const entries = new Map(previous.map(row => [row.item.code.padStart(14,'0'),row]))
  for (const entry of incoming) {
    const key=entry.item.code.padStart(14,'0'), old=entries.get(key)
    if (!old || entry.kind==='barcode' || old.kind!=='barcode' && entry.strength>=old.strength) entries.set(key,entry)
  }
  return [...entries.values()].sort((a,b)=>Number(b.kind==='barcode')-Number(a.kind==='barcode') || b.strength-a.strength).slice(0,24)
}

function ProductCard({ entry }) {
  const {item,kind}=entry
  const [price,setPrice]=useState(undefined)
  const [pricing,setPricing]=useState(false)
  const [imageFailed,setImageFailed]=useState(false)
  const pending=useRef(null)
  useEffect(()=>()=>pending.current?.abort(),[])
  async function checkPrice() {
    if (pricing) return
    setPricing(true)
    const controller=new AbortController()
    pending.current=controller
    try {
      const result=await priceFor(item.code,controller.signal)
      if (!controller.signal.aborted) setPrice(result)
    } catch {
      if (!controller.signal.aborted) setPrice('unavailable')
    } finally { if (!controller.signal.aborted) setPricing(false) }
  }
  const url='https://world.openfoodfacts.org/product/'+item.code
  return <article className="fp-card">
    <a className="fp-card-image" href={url} target="_blank" rel="noreferrer" aria-label={'Open '+item.name}>
      {item.image && !imageFailed ? <img src={item.image} alt={item.name} loading="lazy" referrerPolicy="no-referrer" onError={()=>setImageFailed(true)}/> : <span>Image unavailable</span>}
    </a>
    <div className="fp-card-copy">
      <span className="fp-tag">{kind==='barcode'?'Barcode match':kind==='scan'?'Possible match':'Catalog result'}</span>
      <h3><a href={url} target="_blank" rel="noreferrer">{item.name} <span aria-hidden="true">↗</span></a></h3>
      <p>{[item.brand,item.quantity].filter(Boolean).join(' · ') || 'Pack details unavailable'}</p>
      {item.grade && <span className="fp-nutri">Nutri-Score {item.grade}</span>}
      <div className="fp-price">
        {price && price!=='unavailable' ? <a href={price.url} target="_blank" rel="noreferrer">
          {new Intl.NumberFormat('en-CA',{style:'currency',currency:price.currency}).format(price.value)}{price.per==='KILOGRAM'?' / kg':''} · {price.date}{price.store?' · '+price.store:''}
        </a> : price===null ? 'No Canadian price reported' : <button type="button" onClick={checkPrice} disabled={pricing}>
          {pricing?'Checking…':price==='unavailable'?'Retry price check':'Check reported price'}
        </button>}
      </div>
    </div>
  </article>
}

export default function FindProducts() {
  const [tab,setTab]=useState('scan')
  const [query,setQuery]=useState('')
  const [catalogQuery,setCatalogQuery]=useState('')
  const [results,setResults]=useState(null)
  const [searching,setSearching]=useState(false)
  const [catalogNote,setCatalogNote]=useState('')
  const [found,setFound]=useState([])
  const [mode,setMode]=useState('demo')
  const [picture,setPicture]=useState(asset('sample.jpg'))
  const [status,setStatus]=useState('Opening sample…')
  const [error,setError]=useState('')
  const [voice,setVoice]=useState(false)
  const [language,setLanguage]=useState('en-CA')
  const [shape,setShape]=useState([1280,720])
  const [lines,setLines]=useState([])
  const [all,setAll]=useState(false)
  const [drag,setDrag]=useState(false)
  const [starting,setStarting]=useState(false)
  const [barcode,setBarcode]=useState('')
  const video=useRef(null), input=useRef(null)
  const current=useRef(null), speech=useRef(null), searchController=useRef(null)
  const autoAllowed=useRef(true)
  const [auto,setAuto]=useState(true)
  const matches=useMemo(()=>matchesFor(lines,query),[lines,query])
  const dates=useMemo(()=>[...new Map(lines.flatMap(line=>{
    const readings=dateCandidates(line.text)
    return readings.length ? [[normalize(line.text),{text:line.text,readings}]] : []
  })).values()].slice(0,8),[lines])
  const showAll=all || !query.trim()

  function end() {
    current.current?.stop()
    current.current=null
    if (video.current) video.current.srcObject=null
  }
  function begin(next) {
    end()
    setMode(next)
    setLines([])
    setFound([])
    setBarcode('')
    setError('')
    setStarting(true)
    const controller=new AbortController(), cleanups=[]
    const task={signal:controller.signal,
      keep: fn=>controller.signal.aborted?fn():cleanups.push(fn),
      stop:()=>{controller.abort();cleanups.splice(0).reverse().forEach(fn=>fn())},
      searched:new Map(), upgraded:new Set(), refresh:new Map(), tracks:[], lastLookup:0}
    current.current=task
    return task
  }
  function fail(task,problem) {
    if (task.signal.aborted) return
    setStarting(false)
    setError(problem.message || 'Could not read the image.')
    setStatus('Scanner needs attention')
  }
  function active(task) { return !task.signal.aborted && current.current===task }

  async function identify(task,readings,code,photo) {
    if (!autoAllowed.current || !active(task)) return
    const hasCode=validBarcode(code)
    if (hasCode) setBarcode(code)
    const now=Date.now()
    const phrases=packageQueries(readings).filter(phrase=>!task.searched.has(normalize(phrase)) ||
      now-task.searched.get(normalize(phrase))>20000)
    if (!hasCode && !phrases.length && !task.refresh.size) return
    let snapshot
    try { snapshot=await catalog() } catch { /* Barcode lookup can still use the online catalog. */ }
    if (!autoAllowed.current || !active(task)) return
    if(snapshot){
      if (task.searched.size>180) {
        for (const [phrase,time] of task.searched) if (now-time>20000) task.searched.delete(phrase)
      }
      const ranked=phrases.flatMap(phrase=>{
        task.searched.set(normalize(phrase),now)
        const hits=rank(snapshot,phrase,{strict:true,limit:2})
        if (!hits.length) return []
        const [top,next]=hits
        if (next && top.strength-next.strength<1.3 && !top.brandMatch && !top.quantityMatch) return []
        return [{...top,kind:'scan',evidence:phrase}]
      })
      const unique=merge([],ranked).slice(0,photo?6:4)
      if(unique.length) setFound(prev=>merge(prev,unique))
      const localCode=hasCode && rank(snapshot,code,{limit:1})[0]
      if(localCode) setFound(prev=>merge(prev,[{...localCode,kind:'barcode'}]))
      // Refresh a few strong candidates in the background, using the barcode
      // endpoint instead of issuing one full-text search per camera frame.
      for (const entry of unique) {
        if (task.refresh.size<12 && !task.upgraded.has(entry.item.code)) task.refresh.set(entry.item.code,entry)
      }
      const fresh=task.refresh.values().next().value
      const target=hasCode&&!task.upgraded.has(code)?{code,kind:'barcode'}:
        fresh?{code:fresh.item.code,kind:'scan',entry:fresh}:null
      if(target && Date.now()-task.lastLookup>2000 && task.upgraded.size<32){
        task.lastLookup=Date.now()
        task.upgraded.add(target.code)
        task.refresh.delete(target.code)
        lookupBarcode(target.code,task.signal).then(item=>{
          if(item && active(task) && autoAllowed.current) setFound(prev=>merge(prev,[{
            ...target.entry, item, kind:target.kind, strength:target.entry?.strength??100,
          }]))
        }).catch(()=>{})
      }
    } else if(hasCode && !task.upgraded.has(code)){
      task.upgraded.add(code)
      try {
        const item=await lookupBarcode(code,task.signal)
        if(item && active(task) && autoAllowed.current) setFound(prev=>merge(prev,[{item,kind:'barcode',strength:100}]))
      } catch { /* Leave the scanned code visible for a manual retry. */ }
    }
  }

  async function loadDemo() {
    const task=begin('demo')
    setPicture(asset('sample.jpg'))
    setShape([1280,720])
    setStatus('Loading sample…')
    try {
      const response=await fetch(asset('sample.json'),{signal:task.signal})
      if (!response.ok) throw new Error('The sample is unavailable. Try your own photo.')
      const sample=await response.json()
      if(!active(task)) return
      const readings=sample.lines.map((line,i)=>({...line,id:'demo-'+i,stable:true}))
      setLines(readings)
      setStarting(false)
      setStatus('Sample photo · OCR results')
      void identify(task,readings,sample.barcode,true)
    } catch(problem) { fail(task,problem) }
  }
  useEffect(()=>{
    const handle=requestAnimationFrame(()=>{void loadDemo()})
    return ()=>{cancelAnimationFrame(handle);end();speech.current?.abort();searchController.current?.abort()}
  },[]) // eslint-disable-line react-hooks/exhaustive-deps

  async function photo(file) {
    if(!file) return
    if(!file.type.startsWith('image/') || file.size>16*1024*1024){
      setError('Choose an image up to 16 MB.'); return
    }
    const task=begin('photo')
    const url=URL.createObjectURL(file)
    task.keep(()=>URL.revokeObjectURL(url))
    setPicture(url)
    setStatus('Loading OCR models…')
    const engine=scanner()
    task.keep(engine.close)
    try {
      const decoded=new Image()
      decoded.src=url
      await decoded.decode()
      if(!active(task)) return
      setShape([decoded.naturalWidth,decoded.naturalHeight])
      const frame=readFrame(document.createElement('canvas'),decoded,1280)
      const result=await engine.read(frame,{barcode:true})
      if(!active(task)) return
      const readings=result.lines.map((line,i)=>({...line,id:'photo-'+i,stable:true}))
      setLines(readings)
      setStarting(false)
      setStatus(readings.length || result.barcode?'Photo scanned':'No clear text found. Try a closer photo.')
      void identify(task,readings,result.barcode,true)
    } catch(problem) { fail(task,problem) }
    finally { engine.close() }
  }

  function stopCamera() {
    end()
    setMode('off')
    setStarting(false)
    setLines([])
    setStatus('Camera stopped.')
  }

  async function startCamera() {
    if(!navigator.mediaDevices?.getUserMedia){
      setError('Camera access requires HTTPS or localhost. You can still upload a photo.');return
    }
    const task=begin('camera')
    setStatus('Waiting for camera permission…')
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{
        facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720},
      }})
      task.keep(()=>stream.getTracks().forEach(track=>track.stop()))
      if(!active(task)) return
      const element=video.current
      if(!element) throw new Error('Camera preview could not start.')
      element.srcObject=stream
      await element.play()
      if(!active(task)) return
      stream.getVideoTracks()[0]?.addEventListener('ended',()=>{
        if(active(task)){end();setMode('off');setStarting(false);setLines([]);setStatus('Camera disconnected.')}
      },{once:true})
      setShape([element.videoWidth,element.videoHeight])
      const engine=scanner(), canvas=document.createElement('canvas')
      task.keep(engine.close)
      setStatus('Loading OCR models…')
      await engine.read()
      if(!active(task)) return
      setStarting(false)
      setStatus('Camera scanning')
      let frameNumber=0
      async function cycle() {
        if(!active(task)) return
        try {
          if(!document.hidden && element.readyState>=2){
            const frame=readFrame(canvas,element,960)
            if(frame){
              const result=await engine.read(frame,{barcode:frameNumber++%2===0})
              if(!active(task)) return
              task.tracks=trackReads(task.tracks,result.lines,Date.now())
              setLines(task.tracks)
              const stable=task.tracks.filter(line=>line.confidence>=.58 && (line.stable || line.confidence>=.97))
              void identify(task,stable,result.barcode,false)
            }
          }
          if(active(task)) task.timer=setTimeout(cycle,440)
        } catch(problem) {
          fail(task,problem)
          if(active(task)) end()
        }
      }
      task.keep(()=>clearTimeout(task.timer))
      void cycle()
    } catch(problem) {
      const detail={NotAllowedError:'Camera permission was denied. Allow it in your browser or upload a photo.',
        NotFoundError:'No camera found. You can upload a photo instead.',
        NotReadableError:'The camera may be in use by another app.'}
      fail(task,new Error(detail[problem.name] || problem.message))
      if(active(task)) end()
    }
  }

  function dictate(update) {
    if(speech.current){speech.current.stop();return}
    const Speech=window.SpeechRecognition || window.webkitSpeechRecognition
    if(!Speech){setError('Voice search is unavailable in this browser. You can type or use keyboard dictation.');return}
    const recognizer=new Speech()
    speech.current=recognizer
    recognizer.lang=language
    recognizer.interimResults=false
    recognizer.onresult=event=>update(compact(event.results[event.resultIndex][0].transcript))
    recognizer.onerror=event=>{
      if(event.error!=='aborted') setError('Voice search could not hear you. Check microphone access or type your search.')
    }
    recognizer.onend=()=>{if(speech.current===recognizer){speech.current=null;setVoice(false)}}
    setError('')
    try{recognizer.start();setVoice(true)}catch{speech.current=null;setVoice(false);setError('Microphone could not start.')}
  }

  async function findCatalog(value) {
    const text=cleanQuery(value).slice(0,115)
    if(!text) {searchController.current?.abort();setResults(null);setSearching(false);setCatalogNote('');return}
    searchController.current?.abort()
    const controller=new AbortController()
    searchController.current=controller
    setSearching(true)
    setCatalogNote('')
    setResults([])
    try {
      const local=catalog().then(index=>rank(index,text,{limit:16}).map(hit=>({...hit,kind:'search'}))).catch(()=>[])
      const isCode=validBarcode(text)
      const online=isCode
        ? lookupBarcode(text,controller.signal).then(item=>item?[{item,strength:100,kind:'barcode'}]:[])
        : searchOnline(text,controller.signal).then(items=>items.map((item,i)=>({item,strength:12-i/2,kind:'search'})))
      const on=online.catch(()=>null)
      const cached=await local
      if(controller.signal.aborted) return
      setResults(cached)
      const fresh=await on
      if(controller.signal.aborted) return
      setResults(merge(cached,fresh||[]))
      if(!fresh?.length) setCatalogNote('Showing matches from the Canadian catalog snapshot.')
    } finally {
      if(!controller.signal.aborted) setSearching(false)
    }
  }

  const submit=event=>{event.preventDefault();void findCatalog(catalogQuery)}
  const filtered=results===null?found:results
  const canVoice=Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  return <section className="fp" aria-label="Find Products studio">
    <div className="fp-tabs" role="group" aria-label="Product finder views">
      <button type="button" aria-pressed={tab==='scan'} onClick={()=>setTab('scan')}>Scan & find</button>
      <button type="button" aria-pressed={tab==='products'} onClick={()=>setTab('products')}>Products {found.length>0 && <span>{found.length}</span>}</button>
    </div>
    {error && <p className="fp-error" role="alert">{error}<button type="button" aria-label="Dismiss message" onClick={()=>setError('')}>×</button></p>}
    <div className={`fp-layout ${tab!=='scan' ? 'fp-background-scan' : ''}`} aria-hidden={tab!=='scan'} inert={tab!=='scan'}>
      <div className="fp-panel fp-main">
        <div className="fp-search">
          <label htmlFor="fp-query">Find text in view</label>
          <div className="fp-field"><input id="fp-query" type="search" value={query} maxLength={115}
            onChange={event=>setQuery(event.target.value)} placeholder="Brand, product or printed date…"/>
            <button className="fp-voice" type="button" disabled={!canVoice} onClick={()=>dictate(setQuery)} aria-label="Dictate camera search" aria-pressed={voice}><Mic listening={voice}/></button></div>
        </div>
        <div className="fp-stage" style={{'--fp-aspect':shape[0]+' / '+shape[1]}} data-drag={drag}
          onDragOver={event=>{event.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
          onDrop={event=>{event.preventDefault();setDrag(false);void photo(event.dataTransfer.files[0])}}>
          <div className="fp-image-plane" style={{'--fp-ratio':shape[0]/shape[1]}}>
            <video ref={video} hidden={mode!=='camera'} muted autoPlay playsInline
              onResize={()=>{const element=video.current;if(mode==='camera'&&element.videoWidth)setShape([element.videoWidth,element.videoHeight])}} aria-label="Live product camera"/>
            {mode!=='camera' && mode!=='off' && <img src={picture} alt={mode==='demo'?'Sample grocery packages':'Uploaded product photo'}
              onLoad={event=>setShape([event.currentTarget.naturalWidth,event.currentTarget.naturalHeight])}/>}
            <svg className="fp-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Detected text outlines">
              {lines.filter(line=>showAll || matches.has(line.id)).map(line=><polygon key={line.id}
                points={line.quad.map(([x,y])=>[x*1000,y*1000].join(',')).join(' ')}
                data-match={matches.has(line.id)} vectorEffect="non-scaling-stroke"><title>{line.text}</title></polygon>)}
            </svg>
          </div>
          {mode==='off' && <div className="fp-stage-center">Start the camera or choose a photo.</div>}
          <div className="fp-stage-label"><i data-live={mode==='camera'&&!starting}/>{starting?'Preparing':mode==='camera'?'Camera':mode==='demo'?'Sample photo':mode==='photo'?'Photo':'Camera off'}</div>
          {!!query.trim() && <span className="fp-match-count">{matches.size} {matches.size===1?'match':'matches'}</span>}
        </div>
        <div className="fp-controls">
          <button className="fp-primary" type="button" onClick={()=>{
            if(mode==='camera') stopCamera()
            else void startCamera()
          }}>{mode==='camera'?'Stop camera':'Connect camera'}</button>
          <button type="button" onClick={()=>input.current.click()}>Choose photo</button>
          <button type="button" onClick={()=>void loadDemo()}>Try sample</button>
          <input ref={input} type="file" accept="image/*" hidden onChange={event=>{void photo(event.target.files[0]);event.target.value=''}}/>
        </div>
        <div className="fp-status" role="status">{status}{barcode&&<span>Barcode {barcode}</span>}</div>
      </div>
      <aside className="fp-aside">
        <div className="fp-panel fp-side">
          <h2>Search examples</h2>
          <div className="fp-chips">{examples.map(example=><button type="button" key={example} aria-pressed={query===example} onClick={()=>setQuery(example)}>{example}</button>)}</div>
          <div className="fp-settings">
            <label><input type="checkbox" checked={all} onChange={event=>setAll(event.target.checked)}/> Show other text outlines</label>
            <label><input type="checkbox" checked={auto} onChange={event=>{autoAllowed.current=event.target.checked;setAuto(event.target.checked)
              if(event.target.checked && current.current) void identify(current.current,lines.filter(line=>line.stable),barcode,true)}}/> Look up products in the background</label>
            <label>Voice language <select value={language} onChange={event=>setLanguage(event.target.value)}><option value="en-CA">English</option><option value="fr-CA">Français</option></select></label>
          </div>
        </div>
        <div className="fp-panel fp-side fp-readings">
          <h2>{query.trim()?'Matching text':'Text in view'}</h2>
          {dates.length>0 && <div className="fp-dates"><h3>Printed dates</h3>{dates.map(({text,readings})=><div key={text}>
            <strong>{text}</strong><small>{readings.length===1?readings[0]:'Possible dates: '+readings.join(' / ')}</small>
          </div>)}<small>Check the printed label for the date type and format.</small></div>}
          <ul>{lines.filter(line=>!query.trim() || matches.has(line.id)).slice(0,16).map(line=>
            <li key={line.id}><button type="button" onClick={()=>setQuery(line.text)}>{line.text}</button></li>)}</ul>
          {!lines.some(line=>!query.trim() || matches.has(line.id)) && <p>{query.trim()?'No matching text in view.':'Bring a readable label into view.'}</p>}
        </div>
      </aside>
    </div>
    {tab==='products' && <div className="fp-panel fp-products">
      <form className="fp-search" onSubmit={submit}>
        <label htmlFor="fp-catalog-query">Search the product catalog</label>
        <div className="fp-field"><input type="search" id="fp-catalog-query" value={catalogQuery} maxLength={115}
          onChange={event=>setCatalogQuery(event.target.value)} placeholder="Try hamburger buns, a brand, or a barcode…"/>
          <button className="fp-voice" type="button" aria-label="Dictate product search" aria-pressed={voice} disabled={!canVoice} onClick={()=>dictate(value=>{setCatalogQuery(value);void findCatalog(value)})}><Mic listening={voice}/></button>
          <button type="submit" className="fp-primary">Search</button></div>
      </form>
      <div className="fp-product-head"><div><h2>{results===null?'Products from your scan':'Catalog results'}</h2>
        <p>{catalogNote || (results===null?'Text matches are suggestions. A readable barcode can confirm the item.':'Results show available names, pack sizes and photos.')}</p></div>
        {results!==null && <button type="button" onClick={()=>{searchController.current?.abort();setResults(null);setSearching(false);setCatalogNote('');setCatalogQuery('')}}>Back to scanned items</button>}</div>
      {mode==='camera' && <div className="fp-camera-notice"><span>{starting?'Connecting camera…':'Camera scanning in the background'}</span><button type="button" onClick={stopCamera}>Stop camera</button></div>}
      {searching && <p role="status" className="fp-quiet">Searching catalog…</p>}
      <div className="fp-product-grid">{filtered.map(entry=><ProductCard key={entry.kind+entry.item.code} entry={entry}/>)}</div>
      {!filtered.length && !searching && <div className="fp-empty">{results===null?'No product matches yet. Scan a readable front label or barcode.':'No catalog matches. Try a shorter product name or scan its barcode.'}</div>}
    </div>}
    <p className="fp-quiet">Camera frames stay on this device. Product lookup uses text or barcodes. Voice search uses your browser’s speech service.</p>
    <p className="fp-quiet">Catalog and photos by <a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">Open Food Facts</a>. <a href={asset('canada.json')}>Canadian catalog snapshot</a> under <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL</a>. Prices are dated reports from <a href="https://prices.openfoodfacts.org/" target="_blank" rel="noreferrer">Open Prices</a>. Nutri-Score is a nutrition grade.</p>
  </section>
}

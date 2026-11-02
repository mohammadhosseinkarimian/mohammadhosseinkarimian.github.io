import React, { useEffect, useRef, useState } from 'react'
import { Header, ThemeDock, ScrollProgress, Footer } from './components/UI'
import Home from './pages/Home'
import Work from './pages/Work'
import ProjectDetail from './pages/ProjectDetail'
import Experience from './pages/Experience'
import About from './pages/About'
import Contact from './pages/Contact'
import './index.css'
import './refinements.css'
import './motion-v3.css'
import './motion-v4.css'
import './motion-v5.css'

const readRoute = () => {
  const hash = window.location.hash.replace(/^#/, '')
  return hash.startsWith('/') ? hash : '/'
}

const titles = {
  '/': 'Home', '/work': 'Selected Work', '/experience': 'Experience',
  '/about': 'About', '/contact': 'Contact',
}

function DoorTransition({phase, onPanelEnd}) {
  return <div className={`page-doors page-doors-${phase}`} aria-hidden="true" data-phase={phase}>
    <div className="page-door page-door-left" onTransitionEnd={onPanelEnd}>
      <span className="door-line door-line-a"/><span className="door-line door-line-b"/>
    </div>
    <div className="page-door page-door-right">
      <span className="door-line door-line-c"/><span className="door-line door-line-d"/>
    </div>
    <span className="page-door-seam"/>
  </div>
}

export default function App() {
  const [path, setPath] = useState(readRoute)
  const [phase, setPhase] = useState('idle')
  const pathRef = useRef(path)
  const phaseRef = useRef('idle')
  const targetRef = useRef(path)

  function changePhase(next) { phaseRef.current = next; setPhase(next) }
  function displayRoute(next) {
    pathRef.current = next
    setPath(next)
    window.scrollTo({top:0, behavior:'instant'})
    requestAnimationFrame(() => document.getElementById('main')?.focus({preventScroll:true}))
  }
  function advanceDoor() {
    if (phaseRef.current === 'closing') {
      displayRoute(targetRef.current)
      changePhase('opening')
    } else if (phaseRef.current === 'opening') {
      changePhase('idle')
      // A new hash change arriving during the opening animation gets its own transition.
      if (targetRef.current !== pathRef.current) changePhase('closing')
    }
  }
  // CSS transitions own the timing. This fallback also completes transitions if
  // the tab is backgrounded and a transitionend event is not dispatched.
  useEffect(() => {
    if (phase === 'idle') return undefined
    const fallback = window.setTimeout(advanceDoor, 750)
    return () => window.clearTimeout(fallback)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onRoute() {
      const next = readRoute()
      targetRef.current = next
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) {
        displayRoute(next)
        changePhase('idle')
        return
      }
      if (next === pathRef.current && phaseRef.current === 'idle') {
        window.scrollTo({top:0, behavior:'smooth'})
      } else if (phaseRef.current === 'idle' || phaseRef.current === 'opening') {
        changePhase('closing')
      }
    }
    window.addEventListener('hashchange', onRoute)
    return () => window.removeEventListener('hashchange', onRoute)
  }, [])

  useEffect(() => {
    document.title = `${titles[path] || (path.startsWith('/work/') ? 'Project' : 'Portfolio')} | MohammadHossein Karimian`
  }, [path])

  // Prevent background scrolling while the doors are in motion.
  useEffect(() => {
    if (phase === 'idle') return undefined
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [phase])

  let page
  if (path === '/') page = <Home/>
  else if (path === '/work') page = <Work/>
  else if (path.startsWith('/work/')) page = <ProjectDetail slug={decodeURIComponent(path.slice(6))}/>
  else if (path === '/experience') page = <Experience/>
  else if (path === '/about') page = <About/>
  else if (path === '/contact') page = <Contact/>
  else page = <div className="notfound shell"><p>404 / PAGE NOT FOUND</p><h1>This page wandered off.</h1><a href="#/">Return home</a></div>

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <ScrollProgress/>
    <Header path={path}/>
    <main id="main" key={path} className="page-enter" tabIndex="-1">{page}</main>
    <Footer/>
    <ThemeDock/>
    <DoorTransition phase={phase} onPanelEnd={event => {
      if (event.target === event.currentTarget && event.propertyName === 'transform') advanceDoor()
    }}/>
  </>
}

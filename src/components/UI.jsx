import React, { useEffect, useRef, useState } from 'react'
import Icon from './Icons'
import { person } from '../data/portfolio'

export const routes = [
  {name:'Home',path:'/'}, {name:'Work',path:'/work'}, {name:'Experience',path:'/experience'}, {name:'About',path:'/about'}, {name:'Contact',path:'/contact'},
]

export function Link({to='/',children,className='',onClick, ...props}) {
  return <a href={`#${to}`} className={className} onClick={(e)=>{onClick?.(e);if(!e.defaultPrevented && window.location.hash===`#${to}`)window.scrollTo({top:0,behavior:'smooth'})}} {...props}>{children}</a>
}
export function External({href,children,className='',...props}) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>{children}</a>
}
export function Reveal({children,className='',delay=0,as:Element='div'}) {
  const ref=useRef(null)
  useEffect(()=>{
    const el=ref.current
    if(!el)return
    const obs=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){el.classList.add('is-visible');obs.unobserve(el)}},{threshold:0,rootMargin:'160px 0px 160px 0px'})
    obs.observe(el)
    return ()=>obs.disconnect()
  },[])
  return <Element ref={ref} className={`reveal ${className}`} style={{'--reveal-delay':`${delay}ms`}}>{children}</Element>
}
export function Eyebrow({index,children}) {return <p className="eyebrow"><span className="eyebrow-icon" aria-hidden="true"><Icon name="layers" size={15}/></span>{index && <span className="eyebrow-index">{index} /</span>}{children}</p>}
export function SectionTop({index,tag,title,description,action}) {
  return <Reveal className="section-heading"><div><Eyebrow index={index}>{tag}</Eyebrow><h2 className="section-title">{title}</h2>{description&&<p className="section-intro">{description}</p>}</div>{action&&<div className="heading-action">{action}</div>}</Reveal>
}
export function ButtonLink({to,href,children,variant='primary',icon='upRight',className=''}){
  const classes=`button button-${variant} ${className}`
  const content=<>{children}<span className="button-icon"><Icon name={icon} size={18}/></span></>
  return href?<External href={href} className={classes}>{content}</External>:<Link to={to} className={classes}>{content}</Link>
}

export function Header({path}){
  const [open,setOpen]=useState(false)
  useEffect(()=>setOpen(false),[path])
  useEffect(()=>{
    const esc=e=>{if(e.key==='Escape')setOpen(false)}
    window.addEventListener('keydown',esc)
    return ()=>window.removeEventListener('keydown',esc)
  },[])
  useEffect(()=>{document.body.classList.toggle('menu-is-open',open);return ()=>document.body.classList.remove('menu-is-open')},[open])
  const active=path.startsWith('/work/')?'/work':path
  return <>
    <header className="site-header">
      <div className="site-header-inner shell">
        <Link to="/" className="brand" aria-label="MohammadHossein Karimian, home">
          <span className="brand-mark">M<span className="brand-mark-dot">.</span>K</span>
          <span className="brand-text">MOHAMMADHOSSEIN<br/>KARIMIAN</span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {routes.map(r=><Link key={r.path} to={r.path} className={`nav-link ${active===r.path?'active':''}`} aria-current={active===r.path?'page':undefined}>{r.name}</Link>)}
        </nav>
        <div className="header-right"><span className="availability"><span className="status-dot"/> LET'S CONNECT</span><Link to="/contact" className="header-cta" aria-label="Get in touch"><Icon name="upRight" size={18}/></Link>
          <button className="menu-toggle" onClick={()=>setOpen(!open)} aria-label={open?'Close menu':'Open menu'} aria-controls="mobile-nav" aria-expanded={open}><Icon name={open?'close':'menu'} size={23}/></button>
        </div>
      </div>
    </header>
    <div className={`mobile-menu ${open?'mobile-menu-open':''}`} id="mobile-nav" aria-hidden={!open}>
      <nav aria-label="Mobile navigation">{routes.map((r,i)=><Link key={r.path} to={r.path} tabIndex={open?0:-1} className={active===r.path?'active':''} onClick={()=>setOpen(false)}><span>0{i+1}</span>{r.name}<Icon name="upRight" size={20}/></Link>)}</nav>
      <div className="mobile-menu-bottom"><External href={person.github}>GITHUB <Icon name="upRight" size={14}/></External><External href={person.linkedin}>LINKEDIN <Icon name="upRight" size={14}/></External></div>
    </div>
  </>
}

const themePresets = [
  {id:'pearl',color:'#5b61d6',name:'Pearl | light',mode:'light'},
  {id:'violet',color:'#ad99ff',name:'Iris | midnight',mode:'dark'},
  {id:'blue',color:'#89cfff',name:'Cobalt | deep blue',mode:'dark'},
  {id:'coral',color:'#bd5a43',name:'Apricot | warm light',mode:'light'},
  {id:'lime',color:'#c7ef8e',name:'Forest | deep green',mode:'dark'},
]
export function ThemeDock(){
  const [theme,setTheme]=useState(()=>{
    try { const choice=localStorage.getItem('mk-theme');return themePresets.some(t=>t.id===choice)?choice:'pearl' }
    catch {return 'pearl'}
  })
  const [expanded,setExpanded]=useState(false)
  const selected=themePresets.find(t=>t.id===theme)||themePresets[0]
  useEffect(()=>{
    document.documentElement.dataset.theme=theme
    document.documentElement.style.colorScheme=selected.mode
    const meta=document.querySelector('meta[name="theme-color"]')
    if(meta)meta.content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    try{localStorage.setItem('mk-theme',theme)}catch{/* storage blocked */}
  },[theme,selected.mode])
  return <aside className={`theme-dock ${expanded?'theme-expanded':''}`} aria-label="Website themes">
    {expanded&&<div className="theme-backdrop" onClick={()=>setExpanded(false)} aria-hidden="true"/>}
    <button className="theme-trigger" onClick={()=>setExpanded(v=>!v)} aria-label={expanded?'Close theme options':'Change website theme'} aria-expanded={expanded} aria-controls="theme-options" title="Change website theme"><span className="color-wheel"/><span className="theme-trigger-label">THEME</span></button>
    <div className="theme-options" id="theme-options" aria-hidden={!expanded}>
      <span className="theme-options-label">COLOR SYSTEM</span>
      {themePresets.map(p=><button key={p.id} disabled={!expanded} onClick={()=>{setTheme(p.id);setExpanded(false)}} className={`theme-swatch ${theme===p.id?'selected':''}`} aria-label={`Use ${p.name} theme`} aria-pressed={theme===p.id} title={p.name}><span style={{background:p.color}}/><small>{p.name.split(' | ')[0]}</small></button>)}
    </div>
  </aside>
}

// Keep scroll updates outside React's rendering cycle. One passive listener and one
// composited transform prevent the rest of the page from re-rendering on scroll.
export function ScrollProgress(){
  const bar=useRef(null)
  useEffect(()=>{
    let frame=0
    const paint=()=>{frame=0;const max=document.documentElement.scrollHeight-window.innerHeight;const value=max>0?window.scrollY/max:0;if(bar.current)bar.current.style.transform=`scaleX(${Math.min(1,Math.max(0,value))})`}
    const update=()=>{if(!frame)frame=requestAnimationFrame(paint)}
    update()
    window.addEventListener('scroll',update,{passive:true})
    window.addEventListener('resize',update,{passive:true})
    return ()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update);window.removeEventListener('resize',update)}
  },[])
  return <div ref={bar} className="scroll-progress" aria-hidden="true"/>
}

export function Footer(){return <footer className="footer"><div className="shell"><div className="footer-top"><div><Eyebrow>THE NEXT CONVERSATION</Eyebrow><h2>Let’s build <em>what matters.</em></h2><ButtonLink to="/contact" variant="light" icon="arrow">Let's talk</ButtonLink></div><div className="footer-right"><p>I work across applied AI, research and software engineering. Reach out to discuss the work.</p><External href={person.github}><Icon name="github" size={18}/> GITHUB <Icon name="upRight" size={14}/></External><External href={person.linkedin}><Icon name="linkedin" size={18}/> LINKEDIN <Icon name="upRight" size={14}/></External><a href={`mailto:${person.email}`}><Icon name="mail" size={18}/> EMAIL <Icon name="upRight" size={14}/></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} MOHAMMADHOSSEIN KARIMIAN</span><span>RESEARCH / MACHINE LEARNING / SOFTWARE</span><Link to="/" aria-label="Back to home">BACK TO TOP ↑</Link></div></div></footer>}

export function PageIntro({index,tag,title,description}){
  return <section className="page-intro shell"><div className="page-intro-top"><Eyebrow index={index}>{tag}</Eyebrow><span className="page-intro-counter">MOHAMMADHOSSEIN KARIMIAN</span></div><h1>{title}</h1><p>{description}</p><div className="intro-underline"/></section>
}

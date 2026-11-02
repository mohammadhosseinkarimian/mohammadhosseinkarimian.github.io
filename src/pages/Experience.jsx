import React, { useState } from 'react'
import { experiences } from '../data/portfolio'
import Icon from '../components/Icons'
import { PageIntro, Reveal, Eyebrow, ButtonLink } from '../components/UI'

export default function Experience(){
  const [open,setOpen]=useState([0,1,2])
  const toggle=i=>setOpen(p=>p.includes(i)?p.filter(n=>n!==i):[...p,i])
  return <>
    <PageIntro index="02" tag="CAREER / JOURNEY" title={<>Professional <em>experience.</em></>} description="Research, software engineering and technical instruction across universities, independent projects and client-facing product development."/>
    <section className="experience-body shell"><div className="experience-layout"><aside className="timeline-aside"><Eyebrow>THE JOURNEY SO FAR</Eyebrow><h2>What I built.<br/><em>What I contributed.</em></h2><p>Detailed responsibilities, technical contributions and methods, based on my professional work. Select any role to expand its highlights.</p><div className="aside-graphic"><span>R</span><i/><span>E</span><i/><span>B</span></div><span className="timeline-legend">RESEARCH / ENGINEERING / BUILDING</span></aside><div className="timeline"><div className="timeline-head"><span>PROFESSIONAL EXPERIENCE</span><span>{experiences.length} ROLES</span></div>{experiences.map((e,i)=><Reveal key={`${e.org}-${e.role}`} className="timeline-item"><div className="timeline-track"><span className="timeline-dot"/><span className="timeline-number">0{i+1}</span></div><div className="timeline-content"><button className="timeline-toggle" type="button" onClick={()=>toggle(i)} aria-expanded={open.includes(i)} aria-controls={`timeline-panel-${i}`}><span><small>{e.date} <b>·</b> {e.type}</small><strong>{e.role}</strong><em>{e.org} <span>•</span> {e.where}</em></span><span className="timeline-toggle-icon"><Icon name={open.includes(i)?'minus':'plus'} size={20}/></span></button><div className="timeline-panel" id={`timeline-panel-${i}`} hidden={!open.includes(i)}><p className="timeline-summary">{e.description}</p><ul className="timeline-highlights">{e.highlights.map(point=><li key={point}>{point}</li>)}</ul><div className="timeline-tags">{e.bullets.map(b=><span key={b}>{b}</span>)}</div></div></div></Reveal>)}</div></div></section>
    <section className="section education-banner"><div className="shell education-banner-inner"><div><Eyebrow>EARLY FOUNDATIONS</Eyebrow><h2>Education and <em>research.</em></h2></div><div className="education-stat"><span>2018</span><span className="edu-line"/><span>2026</span><p>EXPERIMENTING, LEARNING AND GROWING</p></div><ButtonLink to="/about" variant="outline" icon="arrow">Education & research</ButtonLink></div></section>
  </>
}

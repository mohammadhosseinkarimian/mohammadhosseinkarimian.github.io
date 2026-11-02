import React, { useState } from 'react'
import { PageIntro, Reveal } from '../components/UI'
import ProjectCard from '../components/ProjectCard'
import Icon from '../components/Icons'
import { categories, projects } from '../data/portfolio'

export default function Work(){
  const [filter,setFilter]=useState('All work')
  const shown=filter==='All work'?projects:projects.filter(p=>p.category===filter)
  return <>
    <PageIntro index="01" tag="SELECTED WORK / ARCHIVE" title={<>Projects & <em>case studies.</em></>} description="Explore selected work in AI research, machine learning, software engineering and interactive applications. Open a project to see the challenge, implementation and outcomes."/>
    <section className="work-content shell"><div className="filter-line"><div className="filter-left"><Icon name="filter" size={17}/><span>FILTER BY DISCIPLINE</span></div><span>{String(shown.length).padStart(2,'0')} PROJECTS</span></div>
      <div className="filter-bar" role="group" aria-label="Filter projects">{categories.map(c=><button key={c} type="button" onClick={()=>setFilter(c)} className={`filter-pill ${filter===c?'active':''}`} aria-pressed={filter===c}>{c}</button>)}</div>
      <div className="work-grid" key={filter}>{shown.map((project,i)=><Reveal key={project.id} delay={Math.min(i%3*70,210)}><ProjectCard project={project}/></Reveal>)}</div>
      <div className="archive-bottom"><span>END OF PROJECT ARCHIVE</span><span>RESEARCH / ENGINEERING / SOFTWARE</span></div>
    </section>
  </>
}

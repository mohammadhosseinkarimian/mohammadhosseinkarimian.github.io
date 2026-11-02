import React from 'react'
import Icon from '../components/Icons'
import ProjectArt from '../components/ProjectArt'
import { ButtonLink, External, Link, Reveal, Eyebrow } from '../components/UI'
import { projects } from '../data/portfolio'

export default function ProjectDetail({slug}){
  const index=projects.findIndex(p=>p.id===slug)
  if(index<0)return <section className="notfound shell"><p>404 / PROJECT NOT FOUND</p><h1>We couldn't find that project.</h1><Link to="/work">BACK TO WORK <Icon name="arrow" size={18}/></Link></section>
  const project=projects[index],next=projects[(index+1)%projects.length]
  return <>
    <section className="project-detail-hero shell"><div className="detail-breadcrumb"><Link to="/work"><Icon name="arrowLeft" size={16}/> ALL PROJECTS</Link><span>/</span><span>{project.number} / {project.category.toUpperCase()}</span></div><div className="detail-heading"><div><Eyebrow>{project.category} / {project.year}</Eyebrow><h1>{project.title}<span>.</span></h1><p>{project.subtitle}</p></div><div className="detail-count">{project.number} <span>/ {String(projects.length).padStart(2,'0')}</span></div></div><div className="detail-cover"><ProjectArt type={project.art} large/></div></section>
    <section className="detail-body shell"><Reveal className="detail-lead"><div><Eyebrow>THE OVERVIEW</Eyebrow><p>THE IDEA IN A SENTENCE</p></div><h2>{project.short}</h2></Reveal><div className="detail-columns"><Reveal className="detail-story"><Eyebrow index="01">THE CHALLENGE</Eyebrow><h3>What needed solving?</h3><p>{project.challenge}</p><Eyebrow index="02">THE APPROACH</Eyebrow><h3>What I built</h3><p>{project.approach}</p><Eyebrow index="03">THE RESULT</Eyebrow><h3>The takeaway</h3><p>{project.outcome}</p></Reveal><Reveal delay={120} className="detail-facts"><div><span>PROJECT</span><strong>{project.subtitle}</strong></div><div><span>CONTEXT</span><strong>{project.context}</strong></div><div><span>PERIOD</span><strong>{project.year}</strong></div><div><span>DISCIPLINE</span><strong>{project.category}</strong></div><div><span>TOOLS & IDEAS</span><div className="detail-skills">{project.tags.map(t=><span key={t}>{t}</span>)}</div></div>{project.links.length>0&&<div><span>LEARN MORE</span>{project.links.map(l=><External key={l.url} href={l.url} className="detail-external">{l.label}<Icon name="upRight" size={17}/></External>)}</div>}{project.note&&<p className="detail-note">{project.note}</p>}</Reveal></div></section>
    <section className="project-next shell"><div><p>NEXT CASE STUDY</p><Link to={`/work/${next.id}`}><h2>{next.title}</h2><span>{next.subtitle}</span></Link></div><Link to={`/work/${next.id}`} className="next-circle" aria-label={`View ${next.subtitle}`}><Icon name="arrow" size={28}/></Link></section>
  </>
}

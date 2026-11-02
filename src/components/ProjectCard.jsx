import React from 'react'
import { Link } from './UI'
import Icon from './Icons'
import ProjectArt from './ProjectArt'

export default function ProjectCard({project,wide=false}) {
  return <Link to={`/work/${project.id}`} className={`project-card ${wide?'project-card-wide':''}`} aria-label={`Explore ${project.subtitle}`}>
    <div className="project-image"><ProjectArt type={project.art}/><span className="project-image-arrow"><Icon name="upRight" size={20}/></span></div>
    <div className="project-card-info"><div className="project-card-meta"><span>{project.number} / {project.category}</span><span>{project.year}</span></div><h3>{project.title}</h3><p className="project-card-subtitle">{project.subtitle}</p><p className="project-card-description">{project.short}</p><div className="project-card-foot"><div className="tag-list">{project.tags.slice(0,3).map(t=><span key={t}>{t}</span>)}</div><span className="view-case">CASE STUDY <Icon name="arrow" size={15}/></span></div></div>
  </Link>
}

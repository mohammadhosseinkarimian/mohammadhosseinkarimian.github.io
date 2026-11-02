import React, { useState } from 'react'
import Icon from './Icons'
import {rotateToArea} from './atlasRotation'

// Each card is a real face of a CSS 3D solid. Only a selection rotates the
// model, so there is no WebGL setup or continuously running render loop.
export const expertiseAreas = [
  {
    id: 'ml', label: 'Machine learning', short: 'ML ENGINEERING', icon: 'cpu', number: '01',
    lead: 'Model, evaluate, improve.',
    detail: 'Applied deep learning, computer vision, NLP, forecasting and reproducible ML pipelines.',
    tools: ['PyTorch', 'Computer vision', 'Forecasting'],
  },
  {
    id: 'research', label: 'AI research', short: 'AI RESEARCH', icon: 'layers', number: '02',
    lead: 'Understand AI decisions.',
    detail: 'Formal reasoning about causality, responsibility and the behavior of multi-agent systems.',
    tools: ['Causality', 'Multi-agent AI', 'Formal methods'],
  },
  {
    id: 'software', label: 'Software engineering', short: 'SOFTWARE ENGINEERING', icon: 'terminal', number: '03',
    lead: 'Engineer reliable systems.',
    detail: 'Software architecture, automation, APIs, databases and production-minded implementation.',
    tools: ['Python', 'Java', 'REST APIs'],
  },
  {
    id: 'web', label: 'Web & UI/UX', short: 'FULL-STACK + DESIGN', icon: 'globe', number: '04',
    lead: 'Make complex tools usable.',
    detail: 'Responsive React experiences, interactive 3D interfaces and accessible full-stack products.',
    tools: ['React', '3D interfaces', 'UI/UX'],
  },
]

function FacetDiagram({kind}) {
  const shared = {fill:'none',stroke:'currentColor',strokeWidth:1.65,strokeLinecap:'round',strokeLinejoin:'round'}
  return <svg className="atlas-facet-diagram" viewBox="0 0 190 106" aria-hidden="true" focusable="false" {...shared}>
    {kind==='ml'&&<>
      <path d="M28 69 60 29 94 59 131 24 165 52M60 29 51 80 94 59 135 79 165 52M94 59 131 24M51 80 135 79" opacity=".65"/>
      {[[28,69],[60,29],[94,59],[131,24],[165,52],[51,80],[135,79]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===2?8:5.5} fill="var(--surface)"/>)}
      <circle cx="94" cy="59" r="20" opacity=".24" strokeDasharray="3 5"/>
    </>}
    {kind==='research'&&<>
      <circle cx="95" cy="52" r="32" opacity=".52"/>
      <circle cx="95" cy="52" r="19" opacity=".76" strokeDasharray="2 5"/>
      <path d="M26 52h36m66 0h36M95 14v19m0 38v20M38 37l22 11m70 8 23 12"/>
      <circle cx="26" cy="52" r="6" fill="var(--surface)"/><circle cx="164" cy="52" r="6" fill="var(--surface)"/><circle cx="95" cy="14" r="5" fill="var(--surface)"/><circle cx="95" cy="91" r="5" fill="var(--surface)"/>
      <path d="M89 51l5 6 10-14" strokeWidth="2.5"/>
    </>}
    {kind==='software'&&<>
      <rect x="24" y="13" width="142" height="81" rx="10" opacity=".58"/>
      <path d="M24 31h142M43 49l-10 10 10 10M145 49l10 10-10 10m-44-21-18 43"/>
      <circle cx="37" cy="22" r="2" fill="currentColor"/><circle cx="46" cy="22" r="2" fill="currentColor"/><circle cx="55" cy="22" r="2" fill="currentColor"/>
      <path d="M73 78h43" opacity=".3"/>
    </>}
    {kind==='web'&&<>
      <rect x="18" y="13" width="154" height="80" rx="9" opacity=".57"/>
      <path d="M18 31h154M44 42h47v39H44zM102 44h47m-47 10h47m-47 10h33m-33 10h42"/>
      <circle cx="31" cy="22" r="2.5" fill="currentColor"/><circle cx="41" cy="22" r="2.5" fill="currentColor"/><circle cx="51" cy="22" r="2.5" fill="currentColor"/>
      <path d="m61 60 10 9 12-16" strokeWidth="2.5"/>
    </>}
  </svg>
}

export default function ExpertiseAtlas() {
  const [view, setView] = useState({index:0, turns:0})
  function selectArea(index) { setView(current => rotateToArea(current,index,expertiseAreas.length)) }
  const selected = expertiseAreas[view.index]
  return <section className="expertise-atlas expertise-atlas-v3" aria-label="Interactive technical expertise">
    <div className="atlas-topline"><span><span className="atlas-top-dot"/> FOUR AREAS OF EXPERTISE</span></div>
    <div className="atlas-scene atlas-scene-v3">
      <div className="atlas-ambient atlas-ambient-one" aria-hidden="true"/>
      <div className="atlas-ambient atlas-ambient-two" aria-hidden="true"/>
      <div className="atlas-orbit-label orbit-a" aria-hidden="true">RESEARCH</div>
      <div className="atlas-orbit-label orbit-b" aria-hidden="true">BUILD</div>
      <div className="atlas-viewport">
        <div className="atlas-cube" style={{'--atlas-turn':`${view.turns * -90}deg`}}>
          {expertiseAreas.map((area,index)=><article
            id={`atlas-face-${area.id}`}
            key={area.id}
            className={`atlas-cube-face atlas-cube-face-${index} ${view.index===index?'is-front':''}`}
            aria-hidden={view.index!==index}
          >
            <div className="atlas-face-header"><span>MK / {area.number}</span><Icon name={area.icon} size={17}/></div>
            <div className="atlas-face-diagram-wrap"><FacetDiagram kind={area.id}/></div>
            <div className="atlas-face-copy">
              <span className="atlas-center-kicker">{area.short}</span>
              <h2>{area.lead}</h2>
              <p>{area.detail}</p>
            </div>
            <div className="atlas-face-tech">{area.tools.map(tool=><span key={tool}>{tool}</span>)}</div>
            <span className="atlas-face-edge" aria-hidden="true"/>
          </article>)}
          <span className="atlas-cube-cap atlas-cube-cap-top" aria-hidden="true"/>
          <span className="atlas-cube-cap atlas-cube-cap-bottom" aria-hidden="true"/>
        </div>
      </div>
    </div>
    <div className="atlas-controls" role="group" aria-label="Choose an area of expertise">
        {expertiseAreas.map((area,index)=><button
          type="button"
          key={area.id}
          onClick={()=>selectArea(index)}
          className={`atlas-node atlas-choice atlas-choice-${area.id} ${view.index===index?'is-active':''}`}
          aria-pressed={view.index===index}
          aria-controls={`atlas-face-${area.id}`}
          title={`Explore ${area.label}`}
        >
          <span className="atlas-node-icon"><Icon name={area.icon} size={19}/></span>
          <span className="atlas-node-label"><small>{area.number} / FOCUS</small><strong>{area.label}</strong></span>
          <Icon name="arrow" size={15}/>
        </button>)}
    </div>
    <div className="atlas-bottom"><span><Icon name="layers" size={16}/> RESEARCH + ENGINEERING + PRODUCT</span><span className="atlas-active-index" aria-live="polite" aria-atomic="true">{selected.number} / 04</span></div>
  </section>
}

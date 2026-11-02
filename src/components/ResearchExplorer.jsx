import React, {useState} from 'react'
import Icon from './Icons'

const concepts = [
  {id:'causality',name:'CAUSALITY',symbol:'C',lead:'Which actions contributed to an outcome?',detail:'Formal causal analysis makes it possible to trace how decisions in a multi-agent system contribute to what happens.'},
  {id:'strategy',name:'STRATEGY',symbol:'S',lead:'What choices were available to an agent?',detail:'Strategic responsibility examines available actions and alternative courses of behavior in concurrent multi-agent interactions.'},
  {id:'agency',name:'RESPONSIBILITY',symbol:'R',lead:'How can responsibility be attributed?',detail:'Combining causal and strategic perspectives supports a more rigorous account of responsibility in systems where several agents act together.'},
]

export default function ResearchExplorer(){
  const [active,setActive]=useState(0)
  const concept=concepts[active]
  return <div className="research-art research-explorer" aria-label="Explore research concepts">
    <div className="research-art-ring r1" aria-hidden="true"/><div className="research-art-ring r2" aria-hidden="true"/><div className="research-art-ring r3" aria-hidden="true"/>
    <div className="research-art-core research-art-core-v3" aria-hidden="true" key={concept.id}>{concept.symbol}<span>→</span>AI</div>
    <div className="research-explorer-options" role="group" aria-label="Research themes">
      {concepts.map((entry,index)=><button
        type="button" key={entry.id}
        onClick={()=>setActive(index)}
        className={`research-explorer-tab n${index+1} ${active===index?'is-active':''}`}
        aria-pressed={active===index}
      ><span className="research-explorer-dot"/>{entry.name}<Icon name="arrow" size={12}/></button>)}
    </div>
    <div className="research-explorer-detail" aria-live="polite" aria-atomic="true" key={`detail-${concept.id}`}>
      <small>0{active+1} / 03 · RESEARCH FOCUS</small>
      <h3>{concept.lead}</h3>
      <p>{concept.detail}</p>
    </div>
    <span className="research-art-caption">INTERACTIVE / MULTI-AGENT REASONING</span>
  </div>
}

import React from 'react'

export default function ProjectArt({ type = 'agents', large = false }) {
  const root = React.useId().replaceAll(':', '')
  return <div className={`project-art project-art-${type} ${large ? 'project-art-large' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 540 335" preserveAspectRatio="xMidYMid meet" className="art-svg">
      <defs>
        <linearGradient id={`${root}-fill`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--accent)"/><stop offset="1" stopColor="var(--mint)"/></linearGradient>
        <radialGradient id={`${root}-glow`}><stop stopColor="var(--accent)" stopOpacity=".25"/><stop offset="1" stopColor="var(--accent)" stopOpacity="0"/></radialGradient>
      </defs>
      
      {Array.from({length:11},(_,i)=><line key={`h${i}`} x1="0" y1={i*34} x2="540" y2={i*34} stroke="currentColor" strokeOpacity=".07" />)}
      {Array.from({length:17},(_,i)=><line key={`v${i}`} y1="0" x1={i*34} y2="335" x2={i*34} stroke="currentColor" strokeOpacity=".07" />)}
      {(type === 'forecast') && <>
        <path d="M38 274C95 240 125 259 167 207S253 204 297 147 383 170 420 83 476 114 515 30" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="5 8" opacity=".5"/>
        <path d="M38 285 C100 243 133 274 173 209 S245 220 295 167 381 174 416 115 475 115 510 57 L510 320 38 320Z" fill={`url(#${root}-glow)`}/>
        <path d="M38 285 C100 243 133 274 173 209 S245 220 295 167 381 174 416 115 475 115 510 57" stroke={`url(#${root}-fill)`} strokeWidth="4.3" fill="none" strokeLinecap="round"/>
        {[{x:173,y:209},{x:295,y:167},{x:416,y:115},{x:510,y:57}].map((p,i)=><g key={i}><circle {...p} r="10" stroke="var(--mint)" fill="#11151f"/><circle {...p} r="3" fill="var(--mint)"/></g>)}
        <g transform="translate(46 48)"><rect width="154" height="47" rx="10" fill="#1b2130" stroke="#536179" strokeOpacity=".6"/><text x="13" y="17" fill="#abb4c8" fontSize="10" fontFamily="monospace">MODEL OUTPUT</text><text x="13" y="36" fontSize="19" fill="white" fontWeight="700">91% <tspan fontSize="10" fill="#b5c0c9">1 - MAPE</tspan></text></g>
      </>}
      {(type === 'agents' || type === 'workflow') && <>
        {[[95,93],[268,52],[435,120],[151,243],[361,261],[271,162]].map(([x,y],i)=> <g key={i}>
          {i>0&&<path d={`M${x} ${y} L${[[95,93],[268,52],[435,120],[151,243],[361,261]][(i+1)%5][0]} ${[[95,93],[268,52],[435,120],[151,243],[361,261]][(i+1)%5][1]}`} fill="none" stroke="var(--accent)" strokeOpacity=".42" strokeWidth="1.3" strokeDasharray="4 7"/>}
          <circle cx={x} cy={y} r={i===5?43:30} stroke="var(--accent)" strokeWidth="1.3" strokeOpacity=".7" fill="#191b2b"/>
          <circle cx={x} cy={y} r="14" fill={i===5?'var(--accent)':'#282c41'} stroke="var(--mint)" strokeWidth="1.6"/><circle cx={x} cy={y} r="4" fill={i===5?'#10121b':'var(--mint)'}/>
          <text x={x} y={y+51} textAnchor="middle" fill="#c4c2dd" fontSize="10" fontFamily="monospace">{['PERCEIVE','PLAN','ACT','VERIFY','RESPOND','COORDINATE'][i]}</text>
        </g>)}
      </>}
      {type === 'bouquet' && <>
        <ellipse cx="285" cy="288" rx="125" ry="24" fill="var(--accent)" opacity=".18"/>
        <path d="M209 179 246 294h86l39-115Z" fill="#241f32" stroke="var(--accent)" strokeWidth="2"/><path d="M217 187q68 30 146 0" fill="none" stroke="var(--mint)" opacity=".6"/>
        {Array.from({length:9},(_,i)=>{ const x=190+i*23; const y=142+(i%3)*-27;return <g key={i}><path d={`M${x} ${y+8} Q${270+(i%3)*12} 205 285 279`} stroke="#8fc58b" strokeWidth="3" fill="none"/><circle cx={x} cy={y} r="24" fill={['#d4a1ff','#a2adff','#d9e7ac','#f4b0cb'][i%4]} opacity=".9"/><circle cx={x} cy={y} r="10" fill="#6d5caa"/><path d={`M${x-14} ${y}h28M${x} ${y-14}v28`} stroke="#fff" strokeOpacity=".32"/></g>})}
        <g transform="translate(370 54)"><rect width="111" height="55" rx="12" fill="#232838" stroke="#77829c"/><circle cx="19" cy="22" r="5" fill="var(--mint)"/><text x="32" y="25" fill="white" fontSize="11">3D STUDIO</text><text x="15" y="44" fill="#b7c0d3" fontSize="10">DRAG TO ROTATE</text></g>
      </>}
      {type === 'sustain' && <>
        <circle cx="265" cy="159" r="110" stroke="var(--accent)" strokeWidth="2" fill={`url(#${root}-glow)`}/>
        <path d="M265 78c48 26 70 61 47 116-28 51-83 46-90 9-7-41 24-57 43-125Z" stroke="var(--mint)" strokeWidth="4" fill="#21362f"/><path d="M239 225Q265 145 291 99" stroke="var(--mint)" strokeWidth="2" fill="none"/>
        {[40,90,140,190,240,290].map((a,i)=><g key={i}><circle cx={265+148*Math.cos(a*Math.PI/180)} cy={159+133*Math.sin(a*Math.PI/180)} r="7" fill="var(--mint)"/><circle cx={265+148*Math.cos(a*Math.PI/180)} cy={159+133*Math.sin(a*Math.PI/180)} r="15" stroke="var(--mint)" opacity=".3" fill="none"/></g>)}
      </>}
      {type === 'personality' && <>
        {Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=><g key={`${i}-${j}`} transform={`translate(${104+j*91} ${43+i*67})`}><rect width="60" height="47" rx="10" fill={i===j?'var(--accent)':'#20283b'} stroke={i===j?'var(--mint)':'#39445b'} /><text x="30" y="29" textAnchor="middle" fontSize="13" fontFamily="monospace" fill={i===j?'#10131d':'#bbc6db'}>{['INTJ','ENFP','ISTP','ESFJ','ENTJ','INFP','ESTP','ISFJ','INFJ','ENTP','ISTJ','ESFP','ENFJ','INTP','ISFP','ESTJ'][i*4+j]}</text></g>))}
      </>}
      {type === 'tour' && <>
        <path d="M45 262Q124 220 171 237T302 188 495 100" fill="none" stroke="var(--accent)" strokeWidth="4" strokeDasharray="8 11" />
        {[[90,243],[218,213],[350,165],[464,112]].map(([x,y],i)=><g key={i}><path d={`M${x} ${y-22}c-32 0-32 42 0 66 32-24 32-66 0-66z`} fill="#20263a" stroke="var(--mint)" strokeWidth="2" transform={`translate(0 -30)`}/><circle cx={x} cy={y-32} r="9" fill="var(--accent)"/><text x={x+24} y={y-34} fontSize="11" fill="#e9ecf9" fontFamily="monospace">STOP 0{i+1}</text></g>)}
        <path d="M0 280q160-130 290-20t250-5v80H0Z" fill="var(--accent)" opacity=".1" />
      </>}
      {type === 'nlp' && <>
        {Array.from({length:7},(_,i)=><g key={i} transform={`translate(${80+i*58}, ${110+25*Math.sin(i)})`}><rect x="-18" y="-57" width="43" height="114" rx="16" fill={i%3===0?'var(--accent)':'#2c3045'} stroke={i%2===0?'var(--mint)':'#656d89'} strokeWidth="1.4"/><path d="M0-35V35" stroke="#d3d3f2" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 11"/></g>)}
        <path d="M38 251q105-45 201 0t263 0" stroke="var(--mint)" strokeWidth="3" fill="none" opacity=".65" />
      </>}
      <path d="M17 17h35M17 17v35M523 318h-35M523 318v-35" stroke="var(--accent)" opacity=".65" strokeWidth="1.3" fill="none"/>
    </svg>
    <div className="art-overlay-tag"><span className="art-tag-dot"/> {type === 'bouquet' ? 'INTERACTIVE / 3D' : type === 'forecast' ? 'PREDICTION ENGINE' : type === 'agents' ? 'DECISION NETWORK' : type === 'sustain' ? 'VISION + SENSORS' : type === 'workflow' ? 'CONNECTED SYSTEMS' : 'EXPERIMENT / BUILD'}</div>
  </div>
}

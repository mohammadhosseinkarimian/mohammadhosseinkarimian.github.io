import React, { useEffect, useId, useState } from 'react'
import { actionText, branchRoute, buildRoute, mapLayout, phaseNames, unitLabel, unitName } from './strategy'
import './rescue-studio.css'

const base = `${import.meta.env.BASE_URL}rescue-studio/`
const missionNames = [
  { id: 'bridge', title: 'The bridge rescue', detail: 'One crossing. Three responders.' },
  { id: 'parallel', title: 'Two rescue fronts', detail: 'Two civilians. Six responders.' },
  { id: 'tight', title: 'A deadline too short', detail: 'When five turns cannot be enough.' },
]

function Glyph({ name, size = 20 }) {
  const paths = {
    play: <path d="m9 5 11 7-11 7Z" />,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    previous: <><path d="m15 6-6 6 6 6M5 5v14" /></>,
    next: <><path d="m9 6 6 6-6 6M19 5v14" /></>,
    reset: <><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6" /></>,
    shield: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function District({ mission, node, selected, onSelect, compact }) {
  const coords = mapLayout(mission, compact)
  const scenario = mission.scenario
  const state = node.state
  const uid = useId().replaceAll(':', '')
  const roadActive = (a, b) => node.actions.some(([kind, target], i) => kind === 'move'
    && ((state.positions[i] === a && target === b) || (state.positions[i] === b && target === a)))
  return <svg className={`rs-district ${compact ? 'rs-narrow' : 'rs-wide'}`} viewBox={compact ? '0 0 360 610' : '0 0 760 440'} role="group" aria-label="Interactive rescue district">
    <title>{mission.title}. Select a location to inspect its teams and civilians.</title>
    <defs><pattern id={`rs-grid-${uid}`} width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="currentColor" opacity=".13" /></pattern></defs>
    <rect width="100%" height="100%" fill={`url(#rs-grid-${uid})`} />
    {scenario.edges.map(([a, b]) => {
      const barrier = scenario.barriers.findIndex(([u, v]) => (a === u && b === v) || (a === v && b === u))
      const blocked = barrier >= 0 && Boolean(state.blocked & (1 << barrier))
      const active = roadActive(a, b)
      const x = (coords[a].x + coords[b].x) / 2, y = (coords[a].y + coords[b].y) / 2
      return <g key={`${a}-${b}`}><line className="rs-road-bed" x1={coords[a].x} y1={coords[a].y} x2={coords[b].x} y2={coords[b].y} />
        <line className={`rs-road ${blocked ? 'is-blocked' : ''} ${active ? 'is-active' : ''}`} x1={coords[a].x} y1={coords[a].y} x2={coords[b].x} y2={coords[b].y} />
        {blocked && <g transform={`translate(${x} ${y})`} className="rs-blockade"><rect x="-30" y="-12" width="60" height="24" rx="6" /><text textAnchor="middle" y="5">CLOSED</text></g>}
      </g>
    })}
    {coords.map(({ x, y }, i) => {
      const occupants = scenario.units.map((_, index) => index).filter(index => state.positions[index] === i)
      const civilians = scenario.civilians.map((_, index) => index).filter(index => state.civilian_positions[index] === i)
      const refuge = scenario.refuges.includes(i)
      return <g key={i} transform={`translate(${x} ${y})`}>
        {refuge && <circle r="35" className="rs-refuge-ring" />}
        <g role="button" tabIndex={0} aria-label={`Inspect location ${i}${refuge ? ', refuge' : ''}`} aria-pressed={selected === i} onClick={() => onSelect(i)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(i) } }} className={`rs-location ${selected === i ? 'is-selected' : ''} ${refuge ? 'is-refuge' : ''}`}>
          <circle r="26" /><text textAnchor="middle" y="6">{i}</text>
        </g>
        <text className="rs-location-caption" textAnchor="middle" y="-40">{refuge ? 'REFUGE' : `AREA ${i}`}</text>
        {occupants.map((unit, offset) => <g key={unit} className={`rs-unit rs-${scenario.units[unit].role}`} transform={`translate(${(offset - (occupants.length - 1) / 2) * 29} -65)`}><title>{unitName(scenario, unit)}</title><rect x="-12" y="-11" width="24" height="22" rx="6" /><text textAnchor="middle" y="4">{unitLabel(scenario, unit)}</text></g>)}
        {civilians.map((civilian, offset) => <g key={civilian} className={`rs-civilian ${state.phases[civilian] === 3 ? 'is-delivered' : ''}`} transform={`translate(${(offset - (civilians.length - 1) / 2) * 77} 47)`}><rect x="-36" y="-10" width="72" height="39" rx="8" /><text textAnchor="middle" y="4">C{civilian + 1} · {state.health[civilian]} HP</text><text className="rs-phase" textAnchor="middle" y="20">{phaseNames[state.phases[civilian]]}</text></g>)}
      </g>
    })}
  </svg>
}

function Proof({ mission }) {
  const won = mission.status === 'winning'
  const check = mission.verification
  return <div className="rs-proof">
    <div className="rs-proof-intro"><Glyph name="shield" size={30} /><div><h3>{won ? 'A strategy checked on every branch.' : 'An impossible deadline, independently confirmed.'}</h3><p>{won ? 'The full controller was checked against every allowed environmental response. The explorer follows that saved controller.' : `The objective needs at least ${mission.optimization.lower_bound} turns; this scenario allows ${mission.scenario.deadline}. MCMAS returned FALSE for the rescue objective.`}</p></div></div>
    <dl className="rs-proof-grid"><div><dt>Python policy traversal</dt><dd>{won ? `${check.reachable_states} reachable states · ${check.transitions} transitions` : 'No guaranteed delivery within the deadline'}</dd></div><div><dt>MCMAS · scenario</dt><dd>{mission.mcmas.scenario.properties?.['1']}<small>ATL objective on the full game</small></dd></div><div><dt>MCMAS · controller</dt><dd>{won ? mission.mcmas.controller.properties?.['1'] : 'Not applicable'}<small>{won ? 'ATL objective under the saved policy' : 'No winning controller to certify'}</small></dd></div><div><dt>Completion-time bound</dt><dd>{won ? `${mission.optimization.lower_bound} turns, proved minimum` : `At least ${mission.optimization.lower_bound} turns required`}<small>Established by the Python horizon analysis</small></dd></div></dl>
    <div className="rs-method-note"><strong>Learning suggests. Exact reasoning checks.</strong><p>A query-conditioned graph neural network scores truth and legal actions to guide search. Its predictions are kept separate from the formal result. The multi-team solver uses single-civilian projections for action ordering. {mission.neuralCalls ? `This search made ${mission.neuralCalls} neural guidance calls.` : 'This example was resolved without neural guidance calls.'}</p></div>
    <div className="rs-downloads">{mission.artifacts.filter(item => ['strategy.json', 'verification.json', 'baseline.ispl', 'restricted_policy.ispl'].includes(item.name)).map(item => <a href={`${base}${item.file}`} download key={item.name}><Glyph name="download" size={16} />{({ 'strategy.json': 'Full controller', 'verification.json': 'Verification report', 'baseline.ispl': 'Scenario ISPL', 'restricted_policy.ispl': 'Controller ISPL' })[item.name]}</a>)}</div>
  </div>
}

function Explorer({ mission }) {
  const [route, setRoute] = useState(() => buildRoute(mission))
  const [frame, setFrame] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [mode, setMode] = useState('early')
  const [speed, setSpeed] = useState(1000)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('playback')
  const tabId = useId()
  const node = mission.graph[route[frame].node]
  const state = node.state
  const won = mission.status === 'winning'
  const steps = route.length - 1
  const finished = !node.outcomes.length
  const turn = mission.scenario.deadline - state.clock
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setFrame(previous => { if (previous >= route.length - 1) return previous; return previous + 1 })
    }, speed)
    return () => window.clearInterval(timer)
  }, [playing, route.length, speed])
  useEffect(() => { if (frame >= route.length - 1) setPlaying(false) }, [frame, route.length])
  useEffect(() => {
    const stop = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', stop)
    return () => document.removeEventListener('visibilitychange', stop)
  }, [])
  function jump(value) { setPlaying(false); setFrame(Number(value)) }
  function changeMode(value) { setPlaying(false); setMode(value); setRoute(buildRoute(mission, value)); setFrame(0) }
  function takeOutcome(outcome) { setPlaying(false); setMode('manual'); setRoute(branchRoute(route, frame, outcome)); setFrame(frame + 1) }
  function togglePlayback() {
    if (playing) return setPlaying(false)
    if (mode === 'manual') { setMode('early'); setRoute(buildRoute(mission)); setFrame(0) }
    else if (frame >= steps) setFrame(0)
    setPlaying(true)
  }
  const currentActions = node.actions.length ? node.actions : (frame > 0 ? mission.graph[route[frame - 1].node].actions : [])
  const actionState = node.actions.length || frame === 0 ? state : mission.graph[route[frame - 1].node].state
  return <>
    <div className="rs-mission-summary"><div><p className="rs-label">SELECTED MISSION</p><h3>{mission.title}</h3><p>{mission.description}</p></div><span className={`rs-verdict ${won ? '' : 'rs-verdict-impossible'}`}><Glyph name="shield" size={17} />{won ? 'Fastest proved' : 'Proved impossible'}</span></div>
    <div className="rs-metrics"><div><strong>{won ? mission.optimization.upper_bound : mission.scenario.deadline}<span> turns</span></strong><small>{won ? 'Guaranteed completion' : 'Available deadline'}</small></div><div><strong>{mission.scenario.units.length}<span> responders</span></strong><small>Concurrent team actions</small></div><div><strong>{mission.scenario.civilians.length}<span> {mission.scenario.civilians.length === 1 ? 'civilian' : 'civilians'}</span></strong><small>Deliver every civilian alive</small></div><div><strong>{won ? mission.graph.length : mission.optimization.lower_bound}<span> {won ? 'states' : 'turns'}</span></strong><small>{won ? 'Every hazard branch checked' : 'Minimum required'}</small></div></div>
    <div className="rs-workspace"><div className="rs-map-panel"><div className="rs-map-top"><span className="rs-label">DISTRICT / {mission.scenario.nodes} LOCATIONS</span><span className="rs-turn">Turn {turn} · {state.clock} remaining</span></div><div className="rs-map"><District {...{ mission, node, selected, onSelect: setSelected }} /><District {...{ mission, node, selected, onSelect: setSelected }} compact /></div><div className="rs-map-legend"><span><i className="rs-fire" />Fire brigade</span><span><i className="rs-ambulance" />Ambulance</span><span><i className="rs-police" />Police</span><span>HP = civilian health</span></div><p className="rs-map-inspect">{selected === null ? 'Select a location to inspect the district. Each road takes one turn.' : `Area ${selected}${mission.scenario.refuges.includes(selected) ? ' · Refuge' : ''} · ${mission.scenario.units.map((_, i) => i).filter(i => state.positions[i] === selected).map(i => unitLabel(mission.scenario, i)).join(', ') || 'No responders'} · ${state.civilian_positions.filter(location => location === selected).length} civilians`}</p></div>
      <aside className="rs-mission-live"><p className="rs-label">MISSION STATUS</p><h4>{node.achieved ? 'Everyone home.' : won ? 'One coordinated turn at a time.' : 'This mission needs more time.'}</h4><div className="rs-civilian-list">{mission.scenario.civilians.map((_, i) => <div key={i}><span className={`rs-civilian-number ${state.phases[i] === 3 ? 'is-safe' : ''}`}>C{i + 1}</span><div><strong>{phaseNames[state.phases[i]]}</strong><small>Area {state.civilian_positions[i]} · {state.health[i]} health points</small></div></div>)}</div><div className="rs-hazard-meter"><span>Environmental harm remaining</span><strong>{state.hazard} / {mission.scenario.hazards}</strong><div>{Array.from({ length: mission.scenario.hazards }, (_, i) => <i key={i} className={i < state.hazard ? 'is-available' : ''} />)}</div></div><p className="rs-live-caption">{won ? 'A hit removes one civilian health point. The saved controller guarantees delivery under every permitted sequence of hits.' : `The five-turn deadline is below the ${mission.optimization.lower_bound}-turn lower bound. Select the bridge mission to explore the feasible version.`}</p></aside></div>
    <div className="rs-tabs" role="tablist" aria-label="Explore the rescue strategy">{[['playback', 'Strategy playback'], ['plan', 'Agent plan'], ['proof', 'Verification']].map(([id, label]) => <button key={id} type="button" role="tab" id={`${tabId}-${id}`} aria-controls={`${tabId}-panel`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const ids = ['playback', 'plan', 'proof']; const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (ids.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3; setTab(ids[next]); event.currentTarget.parentElement.children[next].focus() } }} onClick={() => setTab(id)}>{label}</button>)}</div>
    <div className="rs-tab-panel" id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${tab}`}>
      {tab === 'proof' ? <Proof mission={mission} /> : !won ? <div className="rs-impossible"><Glyph name="shield" size={32} /><h3>A useful result can also be a proof of impossibility.</h3><p>Five turns are available, while guaranteed delivery requires at least eight. The exact analysis and MCMAS agree. Open Verification for the model and proof report.</p><button type="button" onClick={() => setTab('proof')}>Inspect the verification</button></div> : <>
        <div className="rs-playback-head"><div><h3>{tab === 'plan' ? 'The agents act together.' : 'Follow the strategy. Challenge the conditions.'}</h3><p>All responder actions within a turn happen simultaneously.</p></div><label className="rs-select">Replay conditions<select aria-label="Replay conditions" value={mode} onChange={event => changeMode(event.target.value)}><option value="early">Early harmful events</option><option value="calm">Calm environment</option>{mode === 'manual' && <option value="manual">Your chosen outcomes</option>}</select></label></div>
        <div className="rs-player"><div className="rs-player-buttons"><button type="button" onClick={() => jump(0)} disabled={frame === 0} aria-label="Restart strategy"><Glyph name="reset" /></button><button type="button" onClick={() => jump(frame - 1)} disabled={frame === 0} aria-label="Previous turn"><Glyph name="previous" /></button><button type="button" className="rs-play-button" onClick={togglePlayback} aria-label={playing ? 'Pause strategy' : 'Play strategy'}><Glyph name={playing ? 'pause' : 'play'} /></button><button type="button" onClick={() => jump(frame + 1)} disabled={frame === steps} aria-label="Next turn"><Glyph name="next" /></button></div><label className="rs-scrubber"><span className="rs-label">Turn {turn}{mode !== 'manual' && ` / ${steps}`}</span><input type="range" min="0" max={steps} step="1" value={frame} disabled={steps === 0} onChange={event => jump(event.target.value)} aria-label="Playback turn" /></label><label className="rs-select rs-speed">Speed<select aria-label="Playback speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={1600}>Slow</option><option value={1000}>Normal</option><option value={500}>Fast</option></select></label></div>
        <div className="rs-event" role="status">{node.achieved ? `All civilians delivered alive in ${turn} turns.` : frame === 0 ? 'Initial state. The next coordinated actions are shown below.' : route[frame].harm >= 0 ? `Turn ${turn}: civilian ${route[frame].harm + 1} took one hit. The controller adapts to the resulting state.` : `Turn ${turn}: no environmental hit.`}</div>
        {tab === 'plan' ? <div className="rs-table-scroll"><table className="rs-plan-table"><caption>Actions along the selected environment replay</caption><thead><tr><th>Turn</th>{mission.scenario.units.map((_, i) => <th key={i}>{unitLabel(mission.scenario, i)}</th>)}<th>Environment</th></tr></thead><tbody>{route.slice(1).map((entry, i) => { const previous = mission.graph[route[i].node]; return <tr key={i} className={frame === i + 1 ? 'is-current' : ''}><th><button type="button" onClick={() => jump(i + 1)} aria-label={`Show turn ${i + 1}`}>{i + 1}</button></th>{previous.actions.map((action, index) => <td key={index}>{actionText(action, previous.state, index, mission.scenario)}</td>)}<td>{entry.harm < 0 ? 'No hit' : `Hit C${entry.harm + 1}`}</td></tr> })}</tbody></table></div> : <div className="rs-action-grid">{mission.scenario.units.map((unit, i) => <div className="rs-action-card" key={unit.id}><span className={`rs-unit-chip rs-${unit.role}`}>{unitLabel(mission.scenario, i)}</span><div><strong>{unitName(mission.scenario, i)}</strong><p>{finished ? 'Mission complete' : actionText(currentActions[i], actionState, i, mission.scenario)}</p><small>{finished ? `At refuge / area ${state.positions[i]}` : `Next action · turn ${turn + 1}`}</small></div></div>)}</div>}
        <div className="rs-branch-controls"><div><strong>Choose the next environment response</strong><p>{finished ? 'The objective is achieved. Restart or try another mission.' : 'Step through any allowed branch of the verified controller.'}</p></div><div>{node.outcomes.map(outcome => <button type="button" key={outcome.harm} onClick={() => takeOutcome(outcome)}>{outcome.harm < 0 ? 'No hit · next turn' : `Hit civilian ${outcome.harm + 1}`}</button>)}{finished && <button type="button" onClick={() => changeMode('early')}>Restart mission</button>}</div></div>
      </>}
    </div>
  </>
}

export default function RescueStudio() {
  const [missions, setMissions] = useState(null)
  const [choice, setChoice] = useState('bridge')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    Promise.all(missionNames.map(async ({ id }) => {
      const response = await fetch(`${base}${id}.json`, { signal: controller.signal })
      if (!response.ok) throw new Error('The saved missions could not be loaded.')
      return response.json()
    })).then(data => setMissions(Object.fromEntries(data.map(mission => [mission.id, mission]))))
      .catch(reason => { if (reason.name !== 'AbortError') setError('The saved missions could not be loaded. Please try again.') })
    return () => controller.abort()
  }, [retry])
  return <section className="rescue-studio" aria-label="Rescue Studio interactive demo"><div className="rs-heading"><div><p className="rs-label">LEARNING-GUIDED / FORMALLY CHECKED</p><h2>Every team.<br /><em>One objective.</em></h2></div><p>Choose a mission. Watch the responders coordinate, change the hazard outcomes and inspect the verified strategy.</p></div><div className="rs-scenario-picker" role="group" aria-label="Choose a rescue scenario">{missionNames.map(mission => <button type="button" key={mission.id} aria-pressed={choice === mission.id} onClick={() => setChoice(mission.id)}><span className="rs-choice-symbol" aria-hidden="true">{mission.id === 'parallel' ? '⊞' : mission.id === 'tight' ? '◷' : '⌁'}</span><span><strong>{mission.title}</strong><small>{mission.detail}</small></span></button>)}</div><div className="rs-explorer">{error ? <div className="rs-loading" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(retry + 1)}>Try again</button></div> : !missions ? <p className="rs-loading" role="status">Loading the verified missions…</p> : <Explorer mission={missions[choice]} key={choice} />}</div><p className="rs-demo-note">Interactive playback of saved strategies from the full planning app. Every available hazard branch is included. New scenario synthesis and MCMAS run in the local application.</p><details className="rs-original"><summary>Inside the full planning app<span>Scenario editing, synthesis and independent verification</span></summary><figure><a href={`${base}original-studio.jpg`} target="_blank" rel="noopener noreferrer"><img src={`${base}original-studio.jpg`} alt="The local Rescue Studio application with its editable district, team settings and an eight-turn verified bridge strategy" width="1264" height="1767" loading="lazy" /></a><figcaption>The original application includes a district editor, seeded scenario generation, strategy synthesis, turn-by-turn playback and downloadable ISPL controllers.</figcaption></figure></details><div className="rs-research"><div><span className="rs-label">GRAPH NEURAL NETWORK</span><strong>99.47% <small>test truth accuracy</small></strong><p>14,599 held-out state-query records across 180 scenarios.</p></div><div><span className="rs-label">OUT-OF-DISTRIBUTION</span><strong>99.56% <small>record truth accuracy</small></strong><p>4,542 records across 49 additional scenarios.</p></div><div><span className="rs-label">WHAT IS MEASURED</span><strong>Prediction ≠ proof</strong><p>Initial-state accuracy is 98.11% on test and 98.37% OOD. Complete strategies are checked separately.</p></div></div></section>
}

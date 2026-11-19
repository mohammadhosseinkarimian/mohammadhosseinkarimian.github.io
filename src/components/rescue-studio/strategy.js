export const phaseNames = ['Buried', 'Rescued', 'On board', 'Delivered']

export function unitLabel(scenario, index) {
  const role = scenario.units[index].role
  const number = scenario.units.slice(0, index + 1).filter(unit => unit.role === role).length
  return `${{ fire: 'F', ambulance: 'A', police: 'P' }[role]}${number}`
}

export function unitName(scenario, index) {
  const role = scenario.units[index].role
  return `${{ fire: 'Fire brigade', ambulance: 'Ambulance', police: 'Police' }[role]} ${unitLabel(scenario, index).slice(1)}`
}

export function actionText(action, state, index, scenario) {
  if (!action) return 'Mission complete'
  const [kind, target] = action
  if (kind === 'move') return `Move from ${state.positions[index]} to ${target}`
  if (kind === 'clear') return `Clear road ${scenario.barriers[target].join(' to ')}`
  if (kind === 'rescue') return `Free civilian ${target + 1}`
  if (kind === 'load') return `Collect civilian ${target + 1}`
  if (kind === 'unload') return `Deliver civilian ${target + 1}`
  return 'Hold position'
}

export function chooseOutcome(node, mode = 'early') {
  if (!node.outcomes.length) return null
  if (mode === 'calm') return node.outcomes.find(outcome => outcome.harm === -1)
  return node.outcomes.filter(outcome => outcome.harm >= 0)
    .sort((a, b) => node.state.health[a.harm] - node.state.health[b.harm] || a.harm - b.harm)[0]
    || node.outcomes.find(outcome => outcome.harm === -1)
}

export function buildRoute(mission, mode = 'early') {
  const route = [{ node: mission.initial, harm: null }]
  let node = mission.graph[mission.initial]
  for (let turn = 0; turn < mission.scenario.deadline && node.outcomes.length; turn += 1) {
    const outcome = chooseOutcome(node, mode)
    if (!outcome || !mission.graph[outcome.node]) throw new Error('Incomplete saved strategy')
    route.push(outcome)
    node = mission.graph[outcome.node]
  }
  return route
}

export function branchRoute(route, frame, outcome) {
  return [...route.slice(0, frame + 1), outcome]
}

export function mapLayout(mission, compact = false) {
  const count = mission.scenario.nodes
  if (mission.id === 'parallel') {
    return Array.from({ length: count }, (_, i) => compact
      ? { x: i < 4 ? 88 : 272, y: 92 + (i % 4) * 142 }
      : { x: 88 + (i % 4) * 194, y: i < 4 ? 125 : 315 })
  }
  const wide = [[90, 125], [380, 125], [670, 125], [670, 315], [380, 315], [90, 315]]
  const narrow = [[88, 92], [272, 92], [272, 290], [88, 290], [88, 488], [272, 488]]
  return (compact ? narrow : wide).slice(0, count).map(([x, y]) => ({ x, y }))
}

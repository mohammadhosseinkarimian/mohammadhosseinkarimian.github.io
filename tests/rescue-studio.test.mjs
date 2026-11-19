import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { actionText, branchRoute, buildRoute, chooseOutcome, unitLabel } from '../src/components/rescue-studio/strategy.js'
import { projects } from '../src/data/portfolio.js'

const base = new URL('../public/rescue-studio/', import.meta.url)
const read = name => JSON.parse(readFileSync(new URL(name, base), 'utf8'))
const missions = ['bridge', 'parallel', 'tight'].map(id => read(`${id}.json`))

test('Rescue Studio follows the existing BDI case study in both project lists', () => {
  const index = projects.findIndex(project => project.id === 'multi-agent-rescue')
  assert.equal(projects[index + 1].id, 'rescue-studio')
  assert.ok(projects[index].featured && projects[index + 1].featured)
})

test('saved controller graphs preserve every legal hazard response and state update', () => {
  for (const mission of missions.filter(mission => mission.status === 'winning')) {
    const { scenario, graph } = mission
    assert.equal(graph.length, mission.verification.reachable_states)
    assert.equal(graph.reduce((sum, node) => sum + node.outcomes.length, 0), mission.verification.transitions)
    const visited = new Set()
    const visit = id => {
      if (visited.has(id)) return
      visited.add(id)
      const { state, actions, outcomes, achieved } = graph[id]
      if (achieved) {
        assert.ok(state.phases.every(phase => phase === 3))
        assert.ok(state.health.every(health => health > 0))
        assert.equal(outcomes.length, 0)
        return
      }
      assert.equal(actions.length, scenario.units.length)
      const expectedHarms = [-1, ...(state.hazard > 0 ? state.phases.flatMap((phase, i) => phase < 3 && state.health[i] > 0 ? [i] : []) : [])]
      assert.deepEqual(outcomes.map(outcome => outcome.harm), expectedHarms)
      actions.forEach(([kind, target], i) => {
        const role = scenario.units[i].role, position = state.positions[i]
        if (kind === 'move') {
          assert.ok(scenario.edges.some(([a, b]) => (a === position && b === target) || (b === position && a === target)))
          scenario.barriers.forEach(([a, b], j) => {
            if ((a === position && b === target) || (b === position && a === target)) assert.equal(state.blocked & (1 << j), 0)
          })
        } else if (kind === 'clear') {
          assert.equal(role, 'police')
          assert.ok(scenario.barriers[target].includes(position))
          assert.ok(state.blocked & (1 << target))
        } else if (kind === 'rescue' || kind === 'load') {
          assert.equal(role, kind === 'rescue' ? 'fire' : 'ambulance')
          assert.equal(state.civilian_positions[target], position)
          assert.equal(state.phases[target], kind === 'rescue' ? 0 : 1)
        } else if (kind === 'unload') {
          assert.equal(role, 'ambulance')
          assert.equal(state.carriers[target], i)
          assert.ok(scenario.refuges.includes(position))
        } else assert.equal(kind, 'stay')
      })
      for (const outcome of outcomes) {
        assert.ok(graph[outcome.node])
        const next = graph[outcome.node].state
        assert.equal(next.clock, state.clock - 1)
        assert.equal(next.hazard, state.hazard - Number(outcome.harm >= 0))
        assert.deepEqual(next.health, state.health.map((health, i) => health - Number(outcome.harm === i)))
        assert.deepEqual(next.positions, actions.map(([kind, target], i) => kind === 'move' ? target : state.positions[i]))
        assert.ok(next.phases.every((phase, i) => phase >= state.phases[i]))
        visit(outcome.node)
      }
    }
    visit(mission.initial)
    assert.equal(visited.size, graph.length)
  }
})

test('every path wins within the recorded proved minimum', () => {
  for (const mission of missions.filter(mission => mission.status === 'winning')) {
    const maxSteps = (id, elapsed = 0) => {
      const node = mission.graph[id]
      if (!node.outcomes.length) { assert.ok(node.achieved); return elapsed }
      assert.ok(elapsed < mission.scenario.deadline)
      return Math.max(...node.outcomes.map(outcome => maxSteps(outcome.node, elapsed + 1)))
    }
    assert.equal(maxSteps(mission.initial), mission.optimization.upper_bound)
    assert.equal(mission.optimization.lower_bound, mission.optimization.upper_bound)
    for (const mode of ['early', 'calm']) {
      const route = buildRoute(mission, mode)
      assert.ok(mission.graph[route.at(-1).node].achieved)
      assert.ok(route.length - 1 <= mission.optimization.upper_bound)
      if (mode === 'calm') assert.ok(route.slice(1).every(outcome => outcome.harm === -1))
    }
  }
})

test('manual choices replace the future while preserving earlier decisions', () => {
  const mission = missions[0], route = buildRoute(mission)
  const outcome = chooseOutcome(mission.graph[route[1].node], 'calm')
  const branched = branchRoute(route, 1, outcome)
  assert.deepEqual(branched.slice(0, 2), route.slice(0, 2))
  assert.equal(branched.at(-1).harm, -1)
  assert.equal(branched.length, 3)
  assert.equal(route.length, 9)
})

test('impossible mission is presented without a fictional winning controller', () => {
  const mission = missions[2]
  assert.equal(mission.status, 'losing')
  assert.equal(mission.certification, 'mcmas_confirmed_losing')
  assert.equal(mission.mcmas.scenario.properties['1'], 'FALSE')
  assert.ok(mission.optimization.lower_bound > mission.scenario.deadline)
  assert.equal(buildRoute(mission).length, 1)
  assert.equal(mission.graph[0].achieved, false)
  assert.ok(!mission.artifacts.some(artifact => artifact.name === 'strategy.json'))
})

test('all published proof artifacts match the exported source hashes', () => {
  for (const mission of missions) {
    const report = read(`${mission.id}-verification.json`)
    for (const artifact of mission.artifacts) {
      const bytes = readFileSync(new URL(artifact.file, base))
      if (artifact.name !== 'verification.json') {
        assert.equal(createHash('sha256').update(bytes).digest('hex'), report.artifact_sha256[artifact.name])
      }
    }
  }
})

test('team labels and action descriptions retain role and target meaning', () => {
  const mission = missions[1], scenario = mission.scenario, state = mission.graph[0].state
  assert.deepEqual(scenario.units.map((_, i) => unitLabel(scenario, i)), ['F1', 'F2', 'A1', 'A2', 'P1', 'P2'])
  assert.equal(actionText(['clear', 1], state, 5, scenario), 'Clear road 5 to 6')
  assert.equal(actionText(['rescue', 1], state, 1, scenario), 'Free civilian 2')
})

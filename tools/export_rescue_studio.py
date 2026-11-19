"""Export checked Rescue Studio controllers for browser-only exploration.

Usage: python tools/export_rescue_studio.py SOURCE_PROJECT public/rescue-studio
Run with the source project's Python environment available on PYTHONPATH.
"""
import argparse
from collections import deque
import hashlib
import json
from pathlib import Path
import sys


MISSIONS = [
    ("bridge", "studio_bridge_rescue", "The bridge rescue",
     "Clear a blocked crossing, free a buried civilian and coordinate the journey to refuge."),
    ("parallel", "studio_parallel_rescue", "Two rescue fronts",
     "Six responders work concurrently to deliver two civilians on opposite sides of a district."),
    ("tight", "studio_impossible_deadline", "A deadline too short",
     "The bridge mission with five turns available. Inspect why a guaranteed rescue needs more time."),
]


def write_json(path, data):
    path.write_text(json.dumps(data, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8")


def export(source, output):
    sys.path.insert(0, str(source / "src"))
    from rescueml.team_game import TeamGame, TeamState
    from rescueml.team_solver import verify

    output.mkdir(parents=True, exist_ok=True)
    index = []
    for key, folder, title, description in MISSIONS:
        directory = source / "results" / "benchmarks" / folder
        report_bytes = (directory / "report.json").read_bytes()
        report = json.loads(report_bytes)
        game = TeamGame(report["scenario"])
        winning = report["synthesis"]["status"] == "winning"
        policy = {}
        if winning:
            strategy = json.loads((directory / "strategy.json").read_bytes())
            policy = {TeamState.from_json(row["state"]): tuple(tuple(a) for a in row["actions"])
                      for row in strategy["policy"]}
            check = verify(game, policy, report["goal"])
            assert check["status"] == "winning", f"Controller failed recheck: {key}"
            assert check["worst_case_turns"] == report["synthesis"]["explicit_check"]["worst_case_turns"]
            assert check["reachable_states"] == report["synthesis"]["explicit_check"]["reachable_states"]
            assert report["certification"] == "mcmas_certified_winning"
            assert report["mcmas_baseline"]["properties"]["1"] == "TRUE"
            assert report["mcmas_policy"]["properties"]["1"] == "TRUE"
        else:
            assert report["certification"] == "mcmas_confirmed_losing"
            assert report["mcmas_baseline"]["properties"]["1"] == "FALSE"

        states, todo, graph = {game.initial: 0}, deque([game.initial]), []
        while todo:
            state = todo.popleft()
            reached = game.goal(state, report["goal"])
            row = dict(state=state.json(), achieved=reached, actions=[], outcomes=[])
            if winning and not reached:
                actions = policy[state]
                row["actions"] = [list(a) for a in actions]
                for successor, harm in game.nexts(state, actions):
                    if successor not in states:
                        states[successor] = len(states)
                        todo.append(successor)
                    row["outcomes"].append(dict(harm=harm, node=states[successor]))
            graph.append(row)

        # Export proof inputs and outputs without local paths or job metadata.
        artifact_names = ["scenario.json", "baseline.ispl", "baseline.mcmas.log"]
        if winning:
            artifact_names += ["strategy.json", "restricted_policy.ispl", "restricted_policy.mcmas.log"]
        artifacts = []
        hashes = {}
        for name in artifact_names:
            original = directory / name
            if original.is_file():
                content = original.read_bytes()
                target = f"{key}-{name.replace('.log', '.txt')}"
                (output / target).write_bytes(content)
                artifacts.append(dict(name=name, file=target))
                hashes[name] = hashlib.sha256(content).hexdigest()
        proof = {k: report[k] for k in ("goal", "synthesis", "certification", "mcmas_baseline", "mcmas_policy", "policy_states")}
        proof["source_report_sha256"] = hashlib.sha256(report_bytes).hexdigest()
        proof["artifact_sha256"] = hashes
        write_json(output / f"{key}-verification.json", proof)
        artifacts.append(dict(name="verification.json", file=f"{key}-verification.json"))
        data = dict(id=key, title=title, description=description, scenario=game.raw,
                    goal=report["goal"], status=report["synthesis"]["status"],
                    optimization=report["synthesis"]["optimization"],
                    verification=report["synthesis"]["explicit_check"],
                    certification=report["certification"],
                    mcmas=dict(scenario=report["mcmas_baseline"], controller=report["mcmas_policy"]),
                    policyStates=report["policy_states"],
                    neuralCalls=report["synthesis"]["neural_calls"],
                    initial=0, graph=graph, artifacts=artifacts)
        write_json(output / f"{key}.json", data)
        index.append(dict(id=key, title=title, description=description))
        print(f"{key}: {len(graph)} states, {sum(len(n['outcomes']) for n in graph)} transitions; {data['certification']}")
    write_json(output / "missions.json", index)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    export(args.source.resolve(), args.output.resolve())

// Rotate the cube through the shortest quarter-turn route to the chosen face.
// Keeping this pure makes every selection straightforward to test.
export function rotateToArea(current, index, total=4) {
  if (!Number.isInteger(index) || index < 0 || index >= total) return current
  if (current.index === index) return current
  let steps = (index - current.index + total) % total
  if (steps > total / 2) steps -= total
  return {index, turns:current.turns+steps}
}

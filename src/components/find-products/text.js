const dateLabel = /\b(?:exp(?:iry|iration|ires)?|best before|best by|use by|meilleur avant|peremption|bb|bbe)\b/i
export const normalize = text => String(text || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/(\d)\s+(?=(?:g|kg|ml|l|oz)\b)/g, '$1').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const months = Object.fromEntries([
  'jan january janv janvier', 'fe feb fev february fevr fevrier', 'mr mar march mars', 'al apr avr april avril',
  'ma may mai', 'jn jun june juin', 'jl jul july juil juillet', 'au aug august aou aout',
  'se sep sept september septembre', 'oc oct october octobre', 'no nov november novembre', 'de dec december decembre',
].flatMap((names, i) => names.split(' ').map(name => [name, i + 1])))

export function dateCandidates(value) {
  const input = String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  const dates = new Set()
  const add = (year, month, day) => {
    year = Number(year); day = Number(day)
    if (year < 100) year += 2000
    if (year < 2000 || year > 2099 || !month || day < 1 || day > 31) return
    const parsed = new Date(Date.UTC(year, month - 1, day))
    if (parsed.getUTCMonth() + 1 === month) dates.add(parsed.toISOString().slice(0, 10))
  }
  const addNamed = (a, month, b) => {
    if (!months[month]) return
    if (a.length === 4) add(a, months[month], b)
    else if (b.length === 4) add(b, months[month], a)
    else { add(a, months[month], b); add(b, months[month], a) }
  }
  for (const m of input.matchAll(/(?<!\d)(\d{2,4})\s*[-/.]?\s*([a-z]{2,9})\s*[-/.]?\s*(\d{1,4})(?!\d)/g)) addNamed(m[1], m[2], m[3])
  for (const m of input.matchAll(/\b([a-z]{3,9})\s*(\d{1,2}),?\s*(\d{4})(?!\d)/g)) add(m[3], months[m[1]], m[2])
  for (const m of input.matchAll(/(?<!\d)(\d{1,4})\s*[-/.,]\s*(\d{1,2})\s*[-/.,]\s*(\d{1,4})(?!\d)/g)) {
    const [, a, b, c] = m
    if (a.length === 4) add(a, Number(b), c)
    else {
      add(c, Number(b), a)
      add(c, Number(a), b)
      if (a.length === 2 && c.length <= 2) add(a, Number(b), c)
    }
  }
  return [...dates].sort()
}

const prefix = /^(?:find|search(?: for)?|look for|show me|cherche(?:r)?|trouve(?:r)?)(?:\s+|$)/i
export function queryMatch(text, query) {
  const wanted = normalize(query).replace(prefix, '')
  if (!wanted) return false
  const clean = normalize(text)
  if (/^(?:dates?|expiry|expiration|peremption|best before|meilleur avant|(?:expiry|expiration) date|date d expiration|use by)$/.test(wanted)) {
    return dateLabel.test(clean) || dateCandidates(text).length > 0
  }
  const dates = dateCandidates(query)
  if (dates.length) return dateCandidates(text).some(value => dates.includes(value))
  if (clean.includes(wanted)) return true
  if (wanted.includes(' ') && clean.replace(/ /g,'').includes(wanted.replace(/ /g,''))) return true
  return wanted.split(' ').every(token => clean.split(' ').includes(token))
}

export function spatialGroups(lines) {
  const groups = []
  for (const seed of lines) {
    if (seed.text.length < 3) continue
    const [x, y, w, h] = seed.box
    const center = x + w / 2
    const near = lines.filter(line => {
      const [lx, ly, lw, lh] = line.box
      const overlap = Math.min(x + w, lx + lw) - Math.max(x, lx)
      const verticallyClose = Math.abs(y + h / 2 - ly - lh / 2) < Math.min(.20, Math.max(.052, h * 3.6))
      return line !== seed && verticallyClose &&
        ((overlap > Math.min(w, lw) * .32) || Math.abs(center - lx - lw / 2) < .04)
    }).sort((a, b) => Math.abs(a.box[1] - y) - Math.abs(b.box[1] - y)).slice(0, 4)
    const members = [seed, ...near].sort((a, b) => a.box[1] - b.box[1] || a.box[0] - b.box[0])
    groups.push({ text: members.map(line => line.text).join(' '), members })
  }
  return groups
}

const knownNoise = /^(?:nutrition facts|valeur nutritive|ingredients|calories|lot|best before|meilleur avant|scan this|serving size|sample date stamp)\b/i
export const searchableText = value => String(value || '').split(/\s+/).slice(0, 14).join(' ').slice(0, 115)
export function packageQueries(lines) {
  const useful = lines.filter(line => !knownNoise.test(normalize(line.text)) && !dateCandidates(line.text).length)
  const groups = spatialGroups(useful)
  const values = new Set()
  // A product logo and pack size can be separated by the product art.
  for (const seed of useful.slice(0, 20)) {
    const [x,y,w,h] = seed.box
    const nearby = useful.filter(line => {
      const [lx,ly,lw,lh] = line.box
      const overlap = Math.min(x+w,lx+lw)-Math.max(x,lx)
      return line !== seed && overlap >= Math.min(w,lw)*.45 &&
        Math.abs(y+h/2-ly-lh/2) < .40
    }).sort((a,b) => b.confidence-a.confidence).slice(0,6)
    if (nearby.length) values.add(searchableText([...new Set([seed,...nearby].map(line=>normalize(line.text)))].join(' ')))
  }
  for (const {text, members} of groups) {
    if (members.length > 1) values.add(searchableText(text))
  }
  for (const {text} of useful) if (normalize(text).length >= 4 && /[a-z]{3}/i.test(text)) values.add(searchableText(text))
  return [...values].filter(value => normalize(value).length >= 4).slice(0, 42)
}

function overlap(a, b) {
  const [x, y, w, h] = a, [i, j, k, l] = b
  const intersection = Math.max(0, Math.min(x+w, i+k)-Math.max(x,i)) * Math.max(0,Math.min(y+h,j+l)-Math.max(y,j))
  return intersection / (w*h+k*l-intersection)
}

export function trackReads(previous, readings, now) {
  const used = new Set()
  const tracks = readings.map((line, i) => {
    let best = null, score = .32
    for (const track of previous) {
      if (used.has(track.id) || now - track.seen > 5500) continue
      const closeness = overlap(line.box, track.box)
      if (closeness > score) { best = track; score = closeness }
    }
    if (best) used.add(best.id)
    const votes = [...(best?.votes || []).slice(-2), line]
    const candidates = votes.map(vote => ({
      vote, weight: votes.filter(item => normalize(item.text) === normalize(vote.text))
        .reduce((sum, item) => sum + item.confidence, 0),
    })).sort((a,b) => b.weight - a.weight)
    return { ...candidates[0].vote, box: line.box, quad: line.quad, seen: now,
      id: best?.id ?? now + ':' + i, stable: votes.length >= 2 &&
      votes.filter(item => normalize(item.text) === normalize(candidates[0].vote.text)).length >= 2, votes }
  })
  return tracks
}

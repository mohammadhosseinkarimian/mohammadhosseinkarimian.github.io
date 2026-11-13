import { normalize } from './text.js'

const fields = 'code,product_name,product_name_en,product_name_fr,brands,quantity,image_front_small_url,image_front_url,nutriscore_grade'
export const asset = name => new URL(import.meta.env.BASE_URL + 'find-products/' + name, document.baseURI).href
const data = new Map(), priceCache = new Map()
const STOP = new Set('the de des du au aux la le les et and with avec a un une of net'.split(' '))
const token = word => word.length > 4 ? word.replace(/s$/, '') : word
function words(text) {
  return [...new Set(normalize(text).split(' ').filter(w => w.length >= 2 && !STOP.has(w)).map(token))]
}
const safeImage = value => typeof value === 'string' && /^https:\/\/images\.openfoodfacts\.org\//.test(value) ? value : ''
const gtin = value => String(value || '').replace(/\D/g,'')
export function validBarcode(input) {
  const value = String(input || '').trim()
  if (!/^\d{8}$|^\d{12,14}$/.test(value)) return false
  const sum = [...value.slice(0,-1)].reverse().reduce((acc,n,i)=>acc + Number(n) * (i % 2 ? 1 : 3),0)
  return (10 - sum % 10) % 10 === Number(value.at(-1))
}

function product(raw) {
  return { code:gtin(raw.code), name:raw.product_name_en || raw.product_name || raw.product_name_fr,
    alternate:raw.product_name_fr || '', brand:(Array.isArray(raw.brands)?raw.brands.join(', '):raw.brands) || '',
    quantity:raw.quantity || '', image:safeImage(raw.image_front_small_url || raw.image_front_url),
    grade: /^[a-e]$/i.test(raw.nutriscore_grade) ? raw.nutriscore_grade.toUpperCase() : '' }
}

async function request(url, signal) {
  const response = await fetch(url,{signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(8500)]) : AbortSignal.timeout(8500)})
  if (response.status === 404) return {}
  if (!response.ok) throw new Error('Catalog request returned ' + response.status)
  return response.json()
}

let localPromise
export function catalog() {
  localPromise ??= request(asset('canada.json')).then(rows => {
    const index = new Map(), codes = new Map(), items = []
    rows.forEach(([code,name,brand,quantity,image,grade,alternate]) => {
      const item = {code,name,brand,quantity,image:safeImage(image),grade,alternate}
      const title = words(name + ' ' + alternate), brandWords = words(brand), quantities = words(quantity)
      const terms = [...new Set([...title, ...brandWords, ...quantities])]
      const id = items.push({ item, title, brandWords, quantities, terms }) - 1
      codes.set(code.padStart(14,'0'),item)
      for (const key of terms) {
        if (!index.has(key)) index.set(key, [])
        index.get(key).push(id)
      }
    })
    return {index,items,codes}
  }).catch(error => { localPromise = undefined; throw error })
  return localPromise
}

export function rank(snapshot, query, {strict=false, limit=10}={}) {
  const q = words(query)
  if (!q.length) return []
  if (validBarcode(query)) {
    const hit = snapshot.codes.get(query.trim().padStart(14,'0'))
    return hit ? [{item:hit, strength:100}] : []
  }
  const { index, items } = snapshot
  const ids = new Set()
  const matching = q.filter(term => index.has(term)).sort((a,b)=>index.get(a).length-index.get(b).length)
  for (const term of matching.slice(0,4)) {
    for (const id of index.get(term)) {
      ids.add(id)
      if (ids.size >= 12000) break
    }
    if (ids.size >= 12000) break
  }
  const out = []
  for (const id of ids) {
    const {item,title,brandWords,quantities,terms} = items[id]
    const hits = q.filter(t=>terms.includes(t))
    const hitsTitle = hits.filter(t=>title.includes(t)).length
    const hitsBrand = hits.filter(t=>brandWords.includes(t)).length
    const hitsQuantity = hits.filter(t=>quantities.includes(t)).length
    const qSize = q.filter(t=>/^\d+(?:g|kg|ml|l|oz)$/.test(t))
    if (qSize.length && !qSize.every(t=>quantities.includes(t))) continue
    const distinctiveTitle = hits.filter(t=>title.includes(t) && !brandWords.includes(t)).length
    const titleIsSpecific = title.length >= 3 && title.every(t=>q.includes(t)) && hits.length / q.length >= .8
    if (strict && (hitsTitle < 1 || hits.length < 2 || hits.length / q.length < .52 ||
          (!hitsQuantity && !(hitsBrand && distinctiveTitle) && !titleIsSpecific))) continue
    if (!strict && hits.length < (q.length > 1 ? 2 : 1)) continue
    const phrase = normalize(item.name).includes(normalize(query))
    const strength = hits.length * 4 + hitsBrand * 3 + hitsQuantity * 5 + Number(phrase) * 5
      + hitsTitle / Math.max(1, title.length) * 3 - (q.length-hits.length)*1.4 + (item.image ? .5 : 0)
    out.push({item,strength,brandMatch:hitsBrand>0,quantityMatch:hitsQuantity>0})
  }
  return out.sort((a,b)=>b.strength-a.strength).slice(0,limit)
}

export async function lookupBarcode(code, signal) {
  if (!validBarcode(code)) return null
  const key=code.padStart(14,'0')
  if (data.has(key)) return data.get(key)
  const url='https://world.openfoodfacts.org/api/v2/product/'+code+'.json?fields='+fields
  const result = await request(url,signal)
  const entry = result.product ? product(result.product) : null
  const value = entry?.name ? entry : null
  data.set(key,value)
  return value
}

export async function searchOnline(query, signal) {
  const terms = normalize(query)
  // The live full-text host does not permit cross-origin reads from Pages.
  // A brand-tag search is available on the public API for brand-only queries.
  if (!terms || terms.split(' ').length > 2 || /\d/.test(terms)) return []
  const params = new URLSearchParams({brands_tags:terms.replace(/ /g,'-'),page_size:'12',fields})
  const result = await request('https://world.openfoodfacts.org/api/v2/search?'+params,signal)
  return (result.products || []).map(product).filter(item=>item.code && item.name)
}

export async function priceFor(code, signal) {
  if (priceCache.has(code)) return priceCache.get(code)
  const result = await request('https://prices.openfoodfacts.org/api/v1/prices?'+new URLSearchParams({
    product_code:code, currency:'CAD', size:'6', order_by:'-date',
  }),signal)
  const item = (result.items || []).find(item=>item.currency==='CAD' && Number.isFinite(item.price) && item.date)
  const value = item ? { value:item.price, currency:item.currency, date:item.date, store:item.location?.osm_name,
    per:item.price_per, url:'https://prices.openfoodfacts.org/prices/'+item.id } : null
  priceCache.set(code,value)
  return value
}

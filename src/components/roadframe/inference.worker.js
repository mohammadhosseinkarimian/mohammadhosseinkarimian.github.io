import * as ort from 'onnxruntime-web/wasm'
import wasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import wasmModule from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'

ort.env.wasm.numThreads = 1
ort.env.wasm.wasmPaths = { wasm: new URL(wasm, self.location.href).href, mjs: new URL(wasmModule, self.location.href).href }

let sessions, sceneSession, roadIndices
const load = url => ort.InferenceSession.create(url, { executionProviders: ['wasm'] })
const tensor = (pixels, size) => new ort.Tensor('uint8', pixels, [1, size, size, 3])

self.onmessage = async ({data: { id, kind, base, pixels, history }}) => {
  try {
    let value
    if (kind === 'scene') {
      sceneSession ??= await load(base + 'scene.onnx')
      if (!roadIndices) {
        const response = await fetch(base + 'scene-labels.json')
        if (!response.ok) throw new Error('Scene labels failed to load.')
        const labels = await response.json()
        roadIndices = labels.flatMap((label, i) => /^(highway|road|street|driveway|parking_lot|crosswalk|viaduct|bridge|tunnel\/road|desert_road|dirt_road|field_road|forest_road)(\/|$)/.test(label) ? [i] : [])
      }
      const { probabilities } = await sceneSession.run({ rgb: tensor(pixels, 224) })
      value = roadIndices.reduce((sum, i) => sum + probabilities.data[i], 0) >= 0.25
    } else {
      sessions ??= await Promise.all([load(base + 'encoder.onnx'), load(base + 'temporal.onnx')])
      if (kind === 'init') value = true
      if (kind === 'encode') {
        const { features } = await sessions[0].run({ rgb: tensor(pixels, 112) })
        value = features.data
      }
      if (kind === 'score') {
        const { score } = await sessions[1].run({ history: new ort.Tensor('float32', history, [1, 12, 512]) })
        value = score.data[0]
      }
    }
    self.postMessage({ id, value })
  } catch (error) {
    self.postMessage({ id, error: error.message || 'Browser model failed to load.' })
  }
}

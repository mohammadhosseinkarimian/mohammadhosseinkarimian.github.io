import VisionWorker from './inference.worker.js?worker'

export const asset = name => new URL(import.meta.env.BASE_URL + 'roadframe/' + name, document.baseURI).href

export function browserVision() {
  const worker = new VisionWorker()
  const pending = new Map()
  let serial = 0
  worker.onmessage = ({data}) => {
    const task = pending.get(data.id)
    if (!task) return
    pending.delete(data.id)
    if (data.error) task.reject(new Error(data.error))
    else task.resolve(data.value)
  }
  const rejectAll = message => {
    for (const task of pending.values()) task.reject(new Error(message))
    pending.clear()
  }
  worker.onerror = () => rejectAll('Could not start browser inference.')
  worker.onmessageerror = () => rejectAll('Could not read the browser model output.')
  const request = (kind, payload = {}) => new Promise((resolve, reject) => {
    const id = ++serial
    pending.set(id, {resolve, reject})
    worker.postMessage({ id, kind, base: asset(''), ...payload })
  })
  return {
    init: () => request('init'),
    encode: pixels => request('encode', {pixels}),
    road: pixels => request('scene', {pixels}),
    score: frames => {
      const history = new Float32Array(12 * 512)
      frames.forEach((frame, i) => history.set(frame, i * 512))
      return request('score', {history})
    },
    close: () => { worker.terminate(); rejectAll('Analysis stopped.') },
  }
}

export async function createFaceDetector() {
  const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
  const simd = await FilesetResolver.isSimdSupported()
  return FaceDetector.createFromOptions({
    wasmLoaderPath: asset(simd ? 'vision_wasm_internal.js' : 'vision_wasm_nosimd_internal.js'),
    wasmBinaryPath: asset(simd ? 'vision_wasm_internal.wasm' : 'vision_wasm_nosimd_internal.wasm'),
  }, {
    baseOptions: { modelAssetPath: asset('face.tflite'), delegate: 'CPU' },
    runningMode: 'IMAGE', minDetectionConfidence: 0.65,
  })
}

export function rgbReader() {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', {willReadFrequently: true})
  return (video, size) => {
    canvas.width = canvas.height = size
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(video, 0, 0, size, size)
    const rgba = context.getImageData(0, 0, size, size).data
    const rgb = new Uint8Array(size * size * 3)
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      rgb[j] = rgba[i]; rgb[j + 1] = rgba[i + 1]; rgb[j + 2] = rgba[i + 2]
    }
    return rgb
  }
}

export function sampleFrame(video, time, signal) {
  return new Promise((resolve, reject) => {
    const events = ['loadeddata', 'seeked', 'error']
    const abort = () => finish(new DOMException('Stopped', 'AbortError'))
    const timeout = setTimeout(() => finish(new Error('Timed out reading the video.')), 10000)
    function finish(error) {
      clearTimeout(timeout)
      events.forEach(event => video.removeEventListener(event, check))
      signal.removeEventListener('abort', abort)
      if (error) reject(error)
      else resolve()
    }
    function check() {
      if (video.error) return finish(new Error('Try an MP4 encoded with H.264 or a browser-compatible WebM.'))
      if (video.readyState < 2 || video.seeking) return
      if (Math.abs(video.currentTime - time) > 0.002) video.currentTime = time
      else finish()
    }
    events.forEach(event => video.addEventListener(event, check))
    signal.addEventListener('abort', abort, {once: true})
    if (signal.aborted) abort()
    else check()
  })
}

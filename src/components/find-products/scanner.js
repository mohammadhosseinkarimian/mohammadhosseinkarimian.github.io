import Worker from './ocr.worker.js?worker'
import { asset } from './catalog.js'

export function scanner() {
  const worker = new Worker(), pending = new Map()
  let id = 0
  const fail = message => {
    for (const task of pending.values()) task.reject(new Error(message))
    pending.clear()
  }
  worker.onerror = () => fail('The OCR worker could not start in this browser.')
  worker.onmessage = ({data}) => {
    const task = pending.get(data.id)
    if (!task) return
    pending.delete(data.id)
    if (data.error) task.reject(new Error(data.error))
    else task.resolve(data.value)
  }
  return {
    read(frame,options={}) {
      return new Promise((resolve,reject)=>{
        const key=++id
        pending.set(key,{resolve,reject})
        worker.postMessage({id:key,base:asset(''),frame,...options},frame?[frame.rgba.buffer]:[])
      })
    },
    close() { worker.terminate(); fail('Scanner closed.') },
  }
}

export function readFrame(canvas, image, limit) {
  const w=image.videoWidth || image.naturalWidth
  const h=image.videoHeight || image.naturalHeight
  if (!w || !h) return null
  const scale=Math.min(1,limit/Math.max(w,h))
  canvas.width=Math.max(1,Math.round(w*scale))
  canvas.height=Math.max(1,Math.round(h*scale))
  const ctx=canvas.getContext('2d',{willReadFrequently:true})
  ctx.drawImage(image,0,0,canvas.width,canvas.height)
  return {width:canvas.width,height:canvas.height,rgba:ctx.getImageData(0,0,canvas.width,canvas.height).data}
}

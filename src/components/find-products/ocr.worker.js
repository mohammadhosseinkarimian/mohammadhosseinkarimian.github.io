import * as ort from 'onnxruntime-web/wasm'
import wasm from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import module from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url'
import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } from '@zxing/library'

ort.env.wasm.numThreads = 1
ort.env.wasm.wasmPaths = { wasm: new URL(wasm,self.location.href).href, mjs:new URL(module,self.location.href).href }
ort.env.logLevel = 'error'
const opts = {executionProviders:['wasm']}
let models
const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS,[BarcodeFormat.EAN_13,BarcodeFormat.EAN_8,BarcodeFormat.UPC_A,BarcodeFormat.UPC_E]],
  [DecodeHintType.TRY_HARDER,true]])
const barcodeReader = new MultiFormatReader()
barcodeReader.setHints(hints)
const clamp = (x,min,max) => Math.min(max,Math.max(min,x))

async function json(path) {
  const response = await fetch(path)
  if (!response.ok) throw new Error('Could not load the OCR alphabet.')
  return response.json()
}
async function setup(base) {
  const [detector, trained, alternate, spec, letters] = await Promise.all([
    ort.InferenceSession.create(base+'detector.onnx',opts),
    ort.InferenceSession.create(base+'recognizer.onnx',opts),
    ort.InferenceSession.create(base+'paddle-latin.onnx',opts).catch(()=>null),
    json(base+'recognizer.json'),json(base+'paddle-latin.json').catch(()=>null),
  ])
  return {detector, trained, alternate: letters ? alternate : null, alpha:[...spec.alphabet], letters:letters ? [...letters,' '] : []}
}

function detectorInput(frame) {
  const {width,height,rgba} = frame, w=Math.ceil(width/32)*32, h=Math.ceil(height/32)*32
  const plane=w*h, out=new Float32Array(3*plane)
  const mean=[.485,.456,.406], std=[.229,.224,.225]
  for (let c=0;c<3;c++) {
    out.fill(-mean[c]/std[c],c*plane,(c+1)*plane)
    for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
      out[c*plane+y*w+x]=(rgba[(y*width+x)*4+2-c]/255-mean[c])/std[c]
    }
  }
  return new ort.Tensor('float32',out,[1,3,h,w])
}

function regions(map, width, height, frame) {
  const seen = new Uint8Array(map.length), queue = new Int32Array(map.length), boxes=[]
  for (let start=0;start<map.length;start++) {
    if (seen[start] || map[start]<.29) continue
    let tail=1, count=0, sum=0, sx=0, sy=0, xx=0, yy=0, xy=0
    queue[0]=start
    seen[start]=1
    for (let head=0;head<tail;head++) {
      const pos=queue[head], x=pos%width, y=Math.floor(pos/width)
      count++;sum+=map[pos];sx+=x;sy+=y;xx+=x*x;yy+=y*y;xy+=x*y
      for (let j=-1;j<=1;j++) for(let i=-1;i<=1;i++) {
        if(x+i<0 || x+i>=width || y+j<0 || y+j>=height) continue
        const next=pos+j*width+i
        if(!seen[next] && map[next]>=.29) {seen[next]=1;queue[tail++]=next}
      }
    }
    if(count<13 || sum/count<.47) continue
    const vx=xx-sx*sx/count, vy=yy-sy*sy/count, cov=xy-sx*sy/count
    let angle=.5*Math.atan2(2*cov,vx-vy)
    if (Math.hypot(vx-vy,2*cov)<.44*(vx+vy)) angle=0
    const cos=Math.cos(angle), sin=Math.sin(angle)
    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity
    for(let i=0;i<tail;i++){
      const x=queue[i]%width, y=Math.floor(queue[i]/width), a=x*cos+y*sin, b=y*cos-x*sin
      minX=Math.min(minX,a);maxX=Math.max(maxX,a);minY=Math.min(minY,b);maxY=Math.max(maxY,b)
    }
    const w=maxX-minX+1,h=maxY-minY+1
    if(w<9 || h<4 || w/h>42 || w*h>frame.width*frame.height*.52) continue
    const padding=clamp(w*h/(w+h)*.52,2,12)
    minX-=padding;maxX+=padding;minY-=padding;maxY+=padding
    const toPoint=([a,b])=>[a*cos-b*sin,a*sin+b*cos]
    const quad=[[minX,minY],[maxX,minY],[maxX,maxY],[minX,maxY]].map(toPoint)
    const xs=quad.map(point=>point[0]),ys=quad.map(point=>point[1])
    if (Math.min(...xs)>=frame.width || Math.min(...ys)>=frame.height) continue
    boxes.push({quad, size:[maxX-minX,maxY-minY], quality:sum/count*Math.sqrt(count)})
  }
  return boxes.sort((a,b)=>b.quality-a.quality).slice(0,34)
}

function sample(frame, x, y, channel) {
  x=clamp(x,0,frame.width-1);y=clamp(y,0,frame.height-1)
  const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(frame.width-1,x0+1),y1=Math.min(frame.height-1,y0+1)
  const dx=x-x0,dy=y-y0,r=frame.rgba,w=frame.width
  return (1-dy)*((1-dx)*r[(y0*w+x0)*4+channel]+dx*r[(y0*w+x1)*4+channel])+
    dy*((1-dx)*r[(y1*w+x0)*4+channel]+dx*r[(y1*w+x1)*4+channel])
}
function pixels(frame, boxes, kind) {
  const height=kind==='trained'?64:48, width=kind==='trained'?256:320, channels=kind==='trained'?1:3
  const data=kind==='trained'?new Uint8Array(boxes.length*height*width):new Float32Array(boxes.length*3*height*width)
  boxes.forEach(({quad,size},i)=>{
    const [a,b,,d]=quad
    const w=clamp(Math.ceil(height*size[0]/size[1]),1,width)
    for(let y=0;y<height;y++) for(let x=0;x<(kind==='trained'?width:w);x++){
      const u=(Math.min(x,w-1)+.5)/w,v=(y+.5)/height
      const px=a[0]+(b[0]-a[0])*u+(d[0]-a[0])*v,py=a[1]+(b[1]-a[1])*u+(d[1]-a[1])*v
      const r=sample(frame,px,py,0),g=sample(frame,px,py,1),bl=sample(frame,px,py,2)
      if(channels===1) data[(i*height+y)*width+x]=Math.round(.299*r+.587*g+.114*bl)
      else {
        const offset=i*3*height*width+y*width+x
        data[offset]=bl/127.5-1;data[offset+height*width]=g/127.5-1;data[offset+2*height*width]=r/127.5-1
      }
    }
  })
  return new ort.Tensor(channels===1?'uint8':'float32',data,[boxes.length,channels,height,width])
}

function decode(output, alphabet, probability) {
  const [batch,steps,classes]=output.dims, raw=output.data
  return Array.from({length:batch},(_,index)=>{
    let text='', confidence=0, previous=0
    for(let t=0;t<steps;t++) {
      const base=(index*steps+t)*classes
      let best=0
      for(let c=1;c<classes;c++) if(raw[base+c]>raw[base+best]) best=c
      if(best!==previous && best && alphabet[best-1]) {
        text+=alphabet[best-1]
        if(probability) confidence+=raw[base+best]
        else {
          let denom=0
          for(let c=0;c<classes;c++) denom+=Math.exp(raw[base+c]-raw[base+best])
          confidence+=1/denom
        }
      }
      previous=best
    }
    return {text:text.trim(),confidence:confidence/Math.max(1,text.length)}
  })
}

function readBarcode(frame) {
  const gray=Uint8ClampedArray.from({length:frame.width*frame.height},(_,i)=>
    Math.round(frame.rgba[i*4]*.299+frame.rgba[i*4+1]*.587+frame.rgba[i*4+2]*.114))
  const attempt=(values,w,h)=>barcodeReader.decodeWithState(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(values,w,h)))).getText()
  try { return attempt(gray,frame.width,frame.height) } catch { /* Try portrait barcodes. */ }
  const rotated=new Uint8ClampedArray(gray.length)
  for(let y=0;y<frame.height;y++) for(let x=0;x<frame.width;x++) rotated[x*frame.height+frame.height-y-1]=gray[y*frame.width+x]
  try {return attempt(rotated,frame.height,frame.width)} catch {return ''}
}

async function scan(frame,{detector, trained, alternate, alpha, letters}, compare, barcode) {
  const input=detectorInput(frame)
  const maps=await detector.run({[detector.inputNames[0]]:input})
  const map=maps[detector.outputNames[0]]
  const boxes=regions(map.data,map.dims[3],map.dims[2],frame)
  const lines=[]
  const diagnostic=[]
  for(let offset=0;offset<boxes.length;offset+=8) {
    const group=boxes.slice(offset,offset+8)
    const main=decode((await trained.run({pixels:pixels(frame,group,'trained')})).logits,alpha,false)
    const fallbackIndices=main.flatMap((item,i)=>compare || item.confidence<.94 ||
      item.text.length>=6 || /\d/.test(item.text) ? [i] : [])
    const extras={}
    if(alternate && fallbackIndices.length){
      const outputs=await alternate.run({[alternate.inputNames[0]]:pixels(frame,fallbackIndices.map(i=>group[i]),'alternate')})
      decode(outputs[alternate.outputNames[0]],letters,true).forEach((item,i)=>{extras[fallbackIndices[i]]=item})
    }
    group.forEach(({quad},i)=>{
      const a=main[i], b=extras[i]
      const agrees=b?.text.toLowerCase().replace(/\s+/g,'')===a.text.toLowerCase().replace(/\s+/g,'')
      const chosen=b?.text && (!a.text || b.confidence>a.confidence+.02 ||
        (agrees && b.text.includes(' ') && !a.text.includes(' '))) ? b : a
      if(compare) diagnostic.push({trained:a,alternate:b,selected:chosen})
      if(chosen.text.length<2 || chosen.confidence<.45) return
      const normalized=quad.map(([x,y])=>[clamp(x/frame.width,0,1),clamp(y/frame.height,0,1)])
      const xs=normalized.map(p=>p[0]),ys=normalized.map(p=>p[1])
      const x=Math.min(...xs),y=Math.min(...ys)
      lines.push({...chosen,quad:normalized,box:[x,y,Math.max(...xs)-x,Math.max(...ys)-y]})
    })
  }
  return {lines,diagnostic,barcode:barcode?readBarcode(frame):''}
}

self.onmessage=async ({data:{id,base,frame,compare,barcode}})=>{
  try {
    models ??= setup(base).catch(error=>{models=undefined;throw error})
    const ready=await models
    self.postMessage({id,value:frame?await scan(frame,ready,compare,barcode):true})
  } catch(error) {
    self.postMessage({id,error:error.message || 'Text recognition failed.'})
  }
}

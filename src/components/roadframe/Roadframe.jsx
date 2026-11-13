import React, { useEffect, useRef, useState } from 'react'
import { asset, browserVision, createFaceDetector, rgbReader, sampleFrame } from './browserVision'
import './roadframe.css'

const samples = [
  { id: 'traffic', title: 'Traffic buildup', description: 'The original demo' },
  { id: 'quiet', title: 'Quiet road', description: 'Uneventful drive' },
  { id: 'crash', title: 'Highway collision', description: 'Contains crash footage', impact: 9.2 },
]
const STEP = 1 / 6
const SCORE_HOLD = STEP + .055
const palette = ['#77e4a2', '#f6db75', '#ffad69', '#ff817b']
const labels = ['Low', 'Mild', 'Elevated', 'High']
const stamp = (value = 0) => {
  const time = Number.isFinite(value) ? Math.max(0, value) : 0
  const tenths = Math.floor(time * 10 + 1e-6)
  return String(Math.floor(tenths / 600)).padStart(2, '0') + ':' + (tenths % 600 / 10).toFixed(1).padStart(4, '0')
}
const display = score => (score * 100).toFixed(1)
const band = score => Math.min(3, Math.floor(score * 4))
const validScore = score => {
  if (!Number.isFinite(score)) throw new Error('The browser model returned an invalid score.')
  return Math.max(0, Math.min(1, score))
}
const cameraText = {
  face: 'You are pretty, but this is used for dash cams:) please connect it to one.',
  other: 'Please use as a dash cam',
  loading: 'Checking camera view…',
  road: 'Gathering road context…',
}

function Timeline({ rows, time, duration, live, seek, impact }) {
  const ref = useRef(null)
  const [hover, setHover] = useState(null)
  const start = live ? Math.max(0, (rows.at(-1)?.time ?? 0) - 30) : 0
  const end = Math.max(start + 1, live ? start + 30 : duration, rows.at(-1)?.time ?? 0)
  const shown = rows.filter(row => row.time >= start)
  const width = 700, height = 164, left = 39, right = 685, top = 13, bottom = 132
  const x = t => left + (t - start) / (end - start) * (right - left)
  const y = s => bottom - (bottom - top) * s
  const line = shown.map(({ time: t, score }, index) => {
    const gap = index && t - shown[index - 1].time > 1.25
    return (index && !gap ? 'L' : 'M') + x(t) + ',' + y(score)
  }).join(' ')
  const head = hover ?? time
  const point = shown.findLast(row => row.time <= head + 0.001 && head - row.time <= (live ? 2 : SCORE_HOLD))
  function pointer(event) {
    const box = ref.current.getBoundingClientRect()
    const svgX = (event.clientX - box.left) / box.width * width
    return start + Math.max(0, Math.min(1, (svgX - left) / (right - left))) * (end - start)
  }
  return <div className="rf-chart">
    <svg ref={ref} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Model score over video time"
      onPointerMove={event => setHover(pointer(event))} onPointerLeave={() => setHover(null)}
      onClick={event => { if (!live) seek(pointer(event)) }}>
      <defs><linearGradient id="roadframe-line" x1="0" x2="0" y1="1" y2="0">
        {palette.map((color, index) => <stop key={color} offset={index / 3} stopColor={color}/>)}
      </linearGradient></defs>
      {[0, .25, .5, .75, 1].map(level => <g key={level}>
        <line x1={left} x2={right} y1={y(level)} y2={y(level)}/>
        <text x={left - 7} y={y(level) + 4} textAnchor="end">{level * 100}</text>
      </g>)}
      {[0, 1, 2, 3, 4].map(tick => <text key={tick} x={left + tick * (right - left) / 4} y={height - 7}
        textAnchor={tick === 0 ? 'start' : tick === 4 ? 'end' : 'middle'}>{stamp(start + tick * (end - start) / 4)}</text>)}
      <path d={line} fill="none" stroke="url(#roadframe-line)" strokeWidth="2.4" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
      {impact && <g><line className="rf-impact" x1={x(impact)} x2={x(impact)} y1={top} y2={bottom}/>
        <text x={x(impact) - 5} y={top + 11} textAnchor="end">Impact ≈ {stamp(impact)}</text></g>}
      {head >= start && head <= end && <line className="rf-playhead" x1={x(head)} x2={x(head)} y1={top} y2={bottom}/>}
      {point && <circle cx={x(point.time)} cy={y(point.score)} r="4" fill={palette[band(point.score)]}/>}
    </svg>
    <div className="rf-chart-note"><span>Model score / 100</span><span>{hover !== null && point ? `${stamp(point.time)} · ${display(point.score)}` : live ? 'Last 30 seconds' : 'Select the timeline to seek'}</span></div>
  </div>
}

export default function Roadframe() {
  const video = useRef(null), input = useRef(null), player = useRef(null)
  const job = useRef(null), pendingSeek = useRef(null)
  const [source, setSource] = useState({ kind: 'sample', name: samples[0].title, id: samples[0].id })
  const [rows, setRows] = useState([])
  const [time, setTime] = useState(0), [duration, setDuration] = useState(0)
  const [status, setStatus] = useState(''), [failure, setFailure] = useState(false)
  const [scene, setScene] = useState('loading'), [lens, setLens] = useState('environment')
  const [cameras, setCameras] = useState([]), [deviceId, setDeviceId] = useState('')
  const [busy, setBusy] = useState(false), [drag, setDrag] = useState(false)
  const [fullscreen, setFullscreen] = useState(false), [theater, setTheater] = useState(false)
  const [playing, setPlaying] = useState(false), [muted, setMuted] = useState(true)
  const live = source.kind === 'camera'

  function stop() {
    job.current?.stop()
    job.current = null
  }

  function start(next, message) {
    stop()
    const controller = new AbortController()
    const cleanups = []
    const current = {
      signal: controller.signal,
      add: fn => controller.signal.aborted ? fn() : cleanups.push(fn),
      stop: () => { controller.abort(); cleanups.splice(0).reverse().forEach(fn => fn()) },
    }
    job.current = current
    const element = video.current
    pendingSeek.current = null
    element.pause()
    element.srcObject = null
    element.removeAttribute('src')
    element.load()
    setSource(next)
    setRows([])
    setTime(0)
    setDuration(0)
    setScene('loading')
    setFailure(false)
    setBusy(true)
    setStatus(message)
    return current
  }

  function fail(current, error) {
    if (current.signal.aborted) return
    setFailure(true)
    setBusy(false)
    setStatus(error.message || 'Could not analyze this source.')
  }

  async function loadSample(sample) {
    const current = start({ kind: 'sample', name: sample.title, id: sample.id }, 'Loading sample scores…')
    video.current.src = asset(sample.id + '.mp4')
    try {
      const response = await fetch(asset(sample.id + '.json'), { signal: current.signal })
      if (!response.ok) throw new Error('The sample could not load.')
      const scores = await response.json()
      if (current.signal.aborted) return
      setRows(scores)
      setBusy(false)
      setStatus('Sample replay')
    } catch (error) { fail(current, error) }
  }

  useEffect(() => {
    const initial = requestAnimationFrame(() => loadSample(samples[0]))
    return () => { cancelAnimationFrame(initial); stop() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === player.current)
    document.addEventListener('fullscreenchange', changed)
    return () => document.removeEventListener('fullscreenchange', changed)
  }, [])

  useEffect(() => {
    if (!theater) return undefined
    const element = player.current
    const popover = typeof element.showPopover === 'function'
    if (popover) {
      element.setAttribute('popover', 'manual')
      element.showPopover()
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const escape = event => { if (event.key === 'Escape') setTheater(false) }
    document.addEventListener('keydown', escape)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', escape)
      if (popover) {
        element.hidePopover()
        element.removeAttribute('popover')
      }
    }
  }, [theater])

  useEffect(() => {
    if (!playing || live) return undefined
    const element = video.current
    const videoFrames = typeof element.requestVideoFrameCallback === 'function'
    let callback
    const frame = (_now, metadata) => {
      if (!element.seeking) setTime(metadata?.mediaTime ?? element.currentTime)
      callback = schedule()
    }
    const schedule = () => videoFrames
      ? element.requestVideoFrameCallback(frame) : requestAnimationFrame(frame)
    callback = schedule()
    return () => {
      if (videoFrames) element.cancelVideoFrameCallback(callback)
      else cancelAnimationFrame(callback)
    }
  }, [playing, live])

  async function toggleFullscreen() {
    if (theater) { setTheater(false); return }
    if (fullscreen) { await document.exitFullscreen(); return }
    if (player.current.requestFullscreen) {
      try { await player.current.requestFullscreen(); return } catch { /* Use the in-page player. */ }
    }
    setTheater(true)
  }

  async function togglePlayback() {
    const element = video.current
    if (element.paused) {
      try { await element.play() } catch {
        setFailure(true)
        setStatus('This video could not play. Try an H.264 MP4.')
      }
    } else element.pause()
  }

  async function upload(file) {
    if (!file) return
    if (!/\.(mp4|webm|mov)$/i.test(file.name) || file.size > 50 * 1024 ** 2 || !file.size) {
      setFailure(true); setStatus('Choose an MP4, WebM, or MOV under 50 MB.'); return
    }
    const current = start({kind: 'upload', name: file.name}, 'Loading the scoring model…')
    const url = URL.createObjectURL(file)
    const decoder = document.createElement('video')
    decoder.muted = true
    decoder.playsInline = true
    decoder.preload = 'auto'
    decoder.src = url
    video.current.src = url
    current.add(() => { decoder.removeAttribute('src'); decoder.load(); URL.revokeObjectURL(url) })
    const vision = browserVision(), read = rgbReader()
    current.add(vision.close)
    try {
      await sampleFrame(decoder, 0, current.signal)
      if (!Number.isFinite(decoder.duration) || decoder.duration < 12 * STEP) {
        throw new Error('Choose a readable clip with at least two seconds of video.')
      }
      await vision.init()
      if (current.signal.aborted) return
      setStatus('Analyzing on this device…')
      const frames = []
      const end = Math.min(90, decoder.duration)
      for (let tick = 0; tick * STEP < end; tick++) {
        const timestamp = tick * STEP
        await sampleFrame(decoder, timestamp, current.signal)
        frames.push(await vision.encode(read(decoder, 112)))
        if (current.signal.aborted) return
        if (frames.length > 12) frames.shift()
        if (frames.length === 12) {
          const score = validScore(await vision.score(frames))
          if (current.signal.aborted) return
          setRows(previous => [...previous, { time: timestamp, score }])
        }
      }
      setStatus(decoder.duration > 90 ? 'First 90 seconds analyzed' : 'Analysis complete')
      setBusy(false)
    } catch (error) { fail(current, error) }
    finally { vision.close(); decoder.removeAttribute('src'); decoder.load() }
  }

  async function connectCamera(facingMode = lens, preferredId = '') {
    if (!navigator.mediaDevices?.getUserMedia) {
      setFailure(true); setStatus('Camera access requires HTTPS or localhost.'); return
    }
    const current = start({kind:'camera', name:'Camera feed'}, 'Waiting for camera permission…')
    const element = video.current
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false, video: {
          ...(preferredId ? { deviceId: { exact: preferredId } } : { facingMode: { ideal: facingMode } }),
          width: { ideal: 960 }, height: { ideal: 540 },
        },
      })
      current.add(() => stream.getTracks().forEach(track => track.stop()))
      if (current.signal.aborted) return
      setLens(facingMode)
      element.srcObject = stream
      element.muted = true
      await element.play()
      if (current.signal.aborted) return
      const track = stream.getVideoTracks()[0]
      setDeviceId(track.getSettings().deviceId || '')
      navigator.mediaDevices.enumerateDevices?.().then(devices => {
        if (!current.signal.aborted) setCameras(devices.filter(device => device.kind === 'videoinput' && device.deviceId))
      }).catch(() => {})
      track.addEventListener('ended', () => {
        if (job.current === current) {
          stop()
          element.srcObject = null
          setBusy(false)
          setScene('loading')
          setStatus('Camera disconnected.')
        }
      }, {once: true})
      const vision = browserVision(), read = rgbReader()
      current.add(vision.close)
      setStatus('Loading camera vision models…')
      const detector = await createFaceDetector()
      current.add(() => detector.close())
      if (current.signal.aborted) return
      setBusy(false)
      setStatus('Camera frames stay on this device')
      const frames = []
      const origin = element.currentTime
      let lastSample = -1, lastCheck = -Infinity, lastScore = -Infinity, kind = 'loading'
      let lastFrame
      while (!current.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, 65))
        if (current.signal.aborted) break
        const now = element.currentTime - origin
        setTime(now)
        if (element.readyState < 2 || now - lastSample < STEP - 0.01) continue
        if (now - lastCheck >= 1) {
          lastCheck = now
          const result = detector.detect(element)
          const hasFace = result.detections.some(detection =>
            (detection.boundingBox?.width ?? 0) >= element.videoWidth * 0.12)
          const next = hasFace ? 'face' : await vision.road(read(element, 224)) ? 'road' : 'other'
          if (current.signal.aborted) break
          if (next !== kind) { frames.length = 0; lastFrame = undefined }
          kind = next
          setScene(next)
        }
        if (kind !== 'road') continue
        if (now - lastSample > 1 || !frames.length) {
          frames.length = 0
          lastSample = now - STEP
        }
        const features = await vision.encode(read(element, 112))
        if (current.signal.aborted) break
        // Preserve the training cadence if the device misses a camera frame.
        while (now - lastSample >= STEP - .01) {
          lastSample += STEP
          frames.push(now - lastSample > .01 && lastFrame ? lastFrame : features)
          if (frames.length > 12) frames.shift()
        }
        lastFrame = features
        if (frames.length === 12 && now - lastScore >= STEP - .01) {
          const score = validScore(await vision.score(frames))
          if (current.signal.aborted) break
          lastScore = now
          setRows(previous => [...previous.slice(-180), {time:now, score}])
        }
      }
    } catch (error) {
      if (current.signal.aborted) return
      const messages = {
        NotAllowedError: 'Camera permission was denied. Allow it in your browser and try again.',
        NotFoundError: 'No camera was found on this device.',
        NotReadableError: 'The camera is busy. Close other apps using it and try again.',
      }
      fail(current, new Error(messages[error.name] || error.message))
      stop()
      element.srcObject = null
      setScene('loading')
    }
  }

  function seek(timestamp) {
    if (live) return
    const element = video.current
    if (!Number.isFinite(element.duration)) {
      pendingSeek.current = timestamp
      return
    }
    element.currentTime = Math.min(element.duration, Math.max(0, timestamp))
    setTime(element.currentTime)
  }

  function download() {
    const csv = ['seconds,risk_score', ...rows.map(row => `${row.time.toFixed(4)},${row.score.toFixed(6)}`)].join('\n')
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv'}))
    const link = document.createElement('a')
    link.href = url
    link.download = 'roadframe-scores.csv'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const current = (live && scene !== 'road') ? undefined :
    rows.findLast(row => row.time <= time + .001 && time - row.time < (live ? 1.5 : SCORE_HOLD))
  const level = current ? band(current.score) : -1
  const peak = rows.reduce((best, row) => !best || row.score > best.score ? row : best, null)
  const summary = live ? 'Live camera' : source.kind === 'sample' ? 'Sample replay' : 'Local file'
  const note = live ? (failure ? 'Camera unavailable' : cameraText[scene]) : time < 1.84 ? 'Gathering context' : busy ? 'Analyzing…' : 'Outside scored range'

  return <section className="roadframe" aria-label="Roadframe dashcam studio">
    <div className="rf-studio">
      <div className="rf-main">
        <div className={`rf-panel rf-player ${theater ? 'rf-theater' : ''}`} ref={player}>
          <div className="rf-bar"><h2>{source.name}</h2><span>{summary}</span></div>
          <div className="rf-video">
            <video ref={video} playsInline muted={live || muted} preload="metadata"
              poster={source.id ? asset(source.id + '.jpg') : undefined}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onLoadedMetadata={event => {
                setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)
                if (pendingSeek.current !== null) {
                  seek(pendingSeek.current)
                  pendingSeek.current = null
                }
              }}
              onTimeUpdate={event => { if (!live && event.currentTarget.paused) setTime(event.currentTarget.currentTime) }}
              onSeeked={event => { if (!live) setTime(event.currentTarget.currentTime) }}
              onError={() => { if (!live && video.current?.hasAttribute('src')) { setFailure(true); setStatus('This video could not play. Try an H.264 MP4.') } }}/>
            <div className={`rf-score ${level === 3 ? 'rf-pulse' : ''}`} style={level >= 0 ? {'--score-color':palette[level], '--score-scale':1 + level * .07} : {}}>
              <span>{current || !live ? 'MODEL RISK SCORE' : 'CAMERA VIEW'}</span>
              {current ? <><div><strong>{display(current.score)}</strong><b>{labels[level]}</b></div>
                <i><i style={{width:display(current.score) + '%'}}/></i></> : <p>{note}</p>}
            </div>
          </div>
          <div className="rf-bar rf-controls">
            {!live && <button type="button" aria-label={playing ? 'Pause video' : 'Play video'} onClick={togglePlayback}>{playing ? '❚❚' : '▶'}</button>}
            <span>{stamp(time)}{!live && ' / ' + stamp(duration)}</span>
            {!live && <input type="range" aria-label="Video position" min="0" max={duration || 0} step=".01" value={Math.min(time, duration)} onChange={event => seek(Number(event.target.value))}/>}
            {!live && <button type="button" aria-label={muted ? 'Unmute video' : 'Mute video'} onClick={() => setMuted(value => !value)}>{muted ? 'Sound off' : 'Sound on'}</button>}
            <button type="button" onClick={toggleFullscreen}>{fullscreen || theater ? 'Exit fullscreen' : 'Fullscreen'}</button>
          </div>
        </div>
        <div className="rf-panel"><div className="rf-bar"><h2>Risk timeline</h2><button type="button" disabled={!rows.length} onClick={download}>Download CSV ↓</button></div>
          <Timeline rows={rows} time={time} duration={Math.min(90, duration)} live={live} seek={seek}
            impact={samples.find(sample => sample.id === source.id)?.impact}/>
        </div>
      </div>
      <aside className="rf-side">
        <div className="rf-panel rf-input">
          <h2>Footage</h2>
          <div className="rf-drop" data-drag={drag}
            onDragOver={event => { event.preventDefault(); setDrag(true) }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDrag(false) }}
            onDrop={event => { event.preventDefault(); setDrag(false); upload(event.dataTransfer.files[0]) }}>
            <strong>Drop a dashcam clip</strong><small>MP4, WebM or MOV · Up to 50 MB</small>
            <input ref={input} hidden type="file" accept=".mp4,.webm,.mov,video/*"
              onChange={event => { upload(event.target.files[0]); event.target.value = '' }}/>
            <div className="rf-actions"><button className="rf-primary" type="button" onClick={() => input.current.click()}>Choose video ↗</button>
              <button type="button" onClick={() => live ? loadSample(samples[0]) : connectCamera()}>{live ? 'Disconnect' : 'Connect camera'}</button></div>
            {live && <button type="button" onClick={() => connectCamera(lens === 'environment' ? 'user' : 'environment')}>Switch camera</button>}
            {live && cameras.length > 1 && <select aria-label="Camera device" value={deviceId}
              onChange={event => connectCamera(lens, event.target.value)}>
              {cameras.map((device, i) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'Camera ' + (i + 1)}</option>)}
            </select>}
            {busy && source.kind === 'upload' && <button type="button" onClick={() => { stop(); setBusy(false); setStatus('Analysis canceled.') }}>Cancel analysis</button>}
          </div>
          <p className={`rf-status ${failure ? 'rf-error' : ''}`} role="status">{status}</p>
        </div>
        <div className="rf-panel rf-input"><h2>Sample drives</h2><div className="rf-samples">
          {samples.map(sample => <button key={sample.id} type="button" aria-pressed={source.id === sample.id} onClick={() => loadSample(sample)}>
            <img src={asset(sample.id + '.jpg')} alt="" loading="lazy"/><span><strong>{sample.title}</strong><small>{sample.description}</small></span><span aria-hidden="true">▶</span>
          </button>)}
        </div></div>
        {peak && <div className="rf-panel rf-input"><h2>Review highlight</h2>
          <div className="rf-peak"><div><small>Peak model score</small><strong>{display(peak.score)}</strong></div>
            {!live && <button type="button" onClick={() => seek(peak.time)}>Jump to {stamp(peak.time)} ↗</button>}</div>
        </div>}
      </aside>
    </div>
    <p className="rf-note">Scores show model intensity on a 0–100 scale. A high score can occur during ordinary traffic. Use Roadframe for research and footage review.</p>
    <details className="rf-credits"><summary>Sample and model credits</summary>
      <p>Traffic buildup: <a href="https://commons.wikimedia.org/wiki/File:Driving_from_Broad_Creek_to_Jennifer_Road_in_Annapolis,_Maryland_(1_June_2026).webm">Illegitimate Barrister</a>. Quiet road: <a href="https://commons.wikimedia.org/wiki/File:ROAD_VIEW.webm">Niyati Sharma 1505</a>. Both excerpts are trimmed, resized and distributed under <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>.</p>
      <p>Highway collision: <a href="https://commons.wikimedia.org/wiki/File:The_speeding_car_rear-ended_into_the_truck_in_front,_and_the_front_hood_was_blown_open.webm">Wikimedia Commons dashcam footage</a>, trimmed and resized.</p>
      <p>Models: <a href="https://huggingface.co/datasets/nexar-ai/nexar_collision_prediction">Nexar Collision Dataset</a>, <a href="https://github.com/CSAILVision/places365">MIT Places365</a>, and <a href="https://developers.google.com/edge/mediapipe/solutions/vision/face_detector">MediaPipe BlazeFace</a>.</p>
    </details>
  </section>
}

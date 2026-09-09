/**
 * Motor de sonido de WorkSpace OS.
 * - Pomodoro: lluvia/tren sintetizados (bucle) durante el foco, relámpago + pad
 *   relajante al terminar y durante el descanso.
 * - Sonidos de UI configurables: checkbox (marcar/desmarcar) y navegación
 *   (abrir/cerrar página). Se cargan desde archivo o URL y persisten en localStorage.
 */

export type SoundKind = 'checkOn' | 'checkOff' | 'open' | 'close'

export interface SoundConfig {
  checkOn?: string
  checkOff?: string
  open?: string
  close?: string
}

const CONFIG_KEY = 'workspace-os-sounds-v1'

export function getSoundConfig(): SoundConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? (JSON.parse(raw) as SoundConfig) : {}
  } catch {
    return {}
  }
}

export function saveSoundConfig(cfg: SoundConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

let _ctx: AudioContext | null = null
function ctx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {})
  return _ctx
}

function noiseBuffer(ac: AudioContext, duracion: number): AudioBuffer {
  const len = Math.floor(ac.sampleRate * duracion)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return buf
}

/* ===================== Sonido de archivo (config) ===================== */

let _cache = new Map<string, AudioBuffer>()

async function playBuffer(url: string): Promise<void> {
  try {
    const ac = ctx()
    let buffer = _cache.get(url)
    if (!buffer) {
      const res = await fetch(url)
      const arr = await res.arrayBuffer()
      buffer = await ac.decodeAudioData(arr)
      _cache.set(url, buffer)
    }
    const src = ac.createBufferSource()
    src.buffer = buffer
    const gain = ac.createGain()
    gain.gain.value = 0.7
    src.connect(gain).connect(ac.destination)
    src.start()
  } catch {
    /* sonido por defecto si falla */
    playToneDefault()
  }
}

function playToneDefault(): void {
  try {
    const ac = ctx()
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = 'triangle'
    o.frequency.value = 880
    g.gain.setValueAtTime(0.001, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18)
    o.connect(g).connect(ac.destination)
    o.start()
    o.stop(ac.currentTime + 0.2)
  } catch { /* sin audio */ }
}

/** Reproduce un sonido de la configuración (o un tono por defecto). */
export async function playSound(kind: SoundKind): Promise<void> {
  const cfg = getSoundConfig()
  const url = cfg[kind]
  if (url) {
    await playBuffer(url)
  } else {
    playToneDefault()
  }
}

/* ===================== Pomodoro sintetizado ===================== */

let _loopNodes: AudioNode[] | null = null

export function detenerLoopAmbiente(): void {
  if (_loopNodes) {
    _loopNodes.forEach((n) => {
      try { (n as AudioScheduledSourceNode).stop?.() } catch { /* noop */ }
      try { n.disconnect() } catch { /* noop */ }
    })
    _loopNodes = null
  }
}

/** Lluvia sintetizada en bucle (ruido blanco + lowpass). */
export function iniciarLluvia(): void {
  detenerLoopAmbiente()
  try {
    const ac = ctx()
    const src = ac.createBufferSource()
    src.buffer = noiseBuffer(ac, 4)
    src.loop = true
    const filtro = ac.createBiquadFilter()
    filtro.type = 'lowpass'
    filtro.frequency.value = 900
    filtro.Q.value = 0.3
    const gain = ac.createGain()
    gain.gain.value = 0.18
    src.connect(filtro).connect(gain).connect(ac.destination)
    src.start()
    _loopNodes = [src, filtro, gain]
  } catch { /* no audio */ }
}

/** Tren sintetizado (ruido marrón + LFO de amplitud). */
export function iniciarTren(): void {
  detenerLoopAmbiente()
  try {
    const ac = ctx()
    const src = ac.createBufferSource()
    src.buffer = noiseBuffer(ac, 6)
    src.loop = true
    const filtro = ac.createBiquadFilter()
    filtro.type = 'bandpass'
    filtro.frequency.value = 220
    filtro.Q.value = 0.6
    const gain = ac.createGain()
    gain.gain.value = 0.22
    // LFO para el rítmico del tren
    const lfo = ac.createOscillator()
    lfo.frequency.value = 1.1
    const lfoGain = ac.createGain()
    lfoGain.gain.value = 0.08
    lfo.connect(lfoGain).connect(gain.gain)
    src.connect(filtro).connect(gain).connect(ac.destination)
    src.start()
    lfo.start()
    _loopNodes = [src, filtro, gain, lfo, lfoGain]
  } catch { /* no audio */ }
}

/** Relámpago: estallido de ruido blanco con sweep de filtro + trueno grave. */
export function sonidoRelampago(): void {
  try {
    const ac = ctx()
    const src = ac.createBufferSource()
    src.buffer = noiseBuffer(ac, 1.2)
    const filtro = ac.createBiquadFilter()
    filtro.type = 'lowpass'
    filtro.frequency.setValueAtTime(3000, ac.currentTime)
    filtro.frequency.exponentialRampToValueAtTime(120, ac.currentTime + 1.1)
    filtro.Q.value = 0.7
    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.9, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.2)
    src.connect(filtro).connect(gain).connect(ac.destination)
    src.start()
  } catch { /* no audio */ }
}

/** Pad relajante en bucle (acordes). */
export function iniciarMusicaRelajante(): void {
  detenerLoopAmbiente()
  try {
    const ac = ctx()
    const notas = [261.63, 329.63, 392.0, 523.25] // C E G C
    const nodes: AudioNode[] = []
    const master = ac.createGain()
    master.gain.value = 0.07
    master.connect(ac.destination)
    const lfo = ac.createOscillator()
    lfo.frequency.value = 0.08
    const lfoGain = ac.createGain()
    lfoGain.gain.value = 0.02
    lfo.connect(lfoGain).connect(master.gain)
    lfo.start()
    nodes.push(master, lfo, lfoGain)
    notas.forEach((f, i) => {
      const o = ac.createOscillator()
      o.type = i === 3 ? 'sine' : 'triangle'
      o.frequency.value = f
      o.detune.value = (i - 1.5) * 4
      const g = ac.createGain()
      g.gain.value = 0.4
      o.connect(g).connect(master)
      o.start()
      nodes.push(o, g)
    })
    _loopNodes = nodes
  } catch { /* no audio */ }
}

/** Detiene loops y suelta el contexto. */
export function detenerPomodoroAudio(): void {
  detenerLoopAmbiente()
}
"use client"

import { createFaceLandmarker, createPoseLandmarker, createHandLandmarker } from "@/lib/tracking/mediapipe"

export type FaceResult = {
  landmarks: any[] | null
  solved?: any
}

export type FacePipeline = {
  video: HTMLVideoElement
  next: (ts?: number) => Promise<FaceResult>
  onFrame: (cb: (r: FaceResult) => void) => { stop: () => void }
  destroy: () => void
}

function smoothPoints(prev: number[][] | null, cur: number[][], alpha: number) {
  if (!prev) return cur
  return cur.map((pt, i) => {
    const p = prev[i] || pt
    return [
      p[0] + (pt[0] - p[0]) * alpha,
      p[1] + (pt[1] - p[1]) * alpha,
      (p[2] ?? 0) + ((pt[2] ?? 0) - (p[2] ?? 0)) * alpha,
    ]
  })
}

export async function createFacePipeline(opts: {
  stream: MediaStream
  smoothing?: number
  withKalidokit?: boolean
  mirror?: boolean
  maxFps?: number
}): Promise<FacePipeline> {
  const smoothing = opts.smoothing ?? 0.6
  const mirror = !!opts.mirror

  // Hidden video that consumes the stream (do not display:none)
  const video = document.createElement("video")
  video.muted = true
  ;(video as any).playsInline = true
  ;(video as any).autoplay = true
  video.srcObject = opts.stream

  // Start playback with events + timeout fallback
  await new Promise<void>((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      video.removeEventListener("playing", onOk)
      video.removeEventListener("canplay", onOk)
      clearTimeout(timer)
      resolve()
    }
    const onOk = () => done()
    const timer = setTimeout(done, 1500)
    video.addEventListener("playing", onOk)
    video.addEventListener("canplay", onOk)
    const p = video.play()
    if (p && typeof (p as any).catch === "function") {
      ;(p as Promise<void>).catch(() => {})
    }
  })

  const detector = await createFaceLandmarker()
  let prev: number[][] | null = null

  async function next(ts = performance.now()): Promise<FaceResult> {
    if (!(video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0)) {
      return { landmarks: null }
    }
    try {
      const res: any = detector.detectForVideo(video, ts)
      const face = res?.faceLandmarks?.[0]
      if (!face) return { landmarks: null }
      // normalize to [[x*w, y*h, z], ...]
      const w = video.videoWidth
      const h = video.videoHeight
      const pts: number[][] = face.map((p: any) => [p.x * w, p.y * h, p.z])
      const smoothed = smoothPoints(prev, pts, smoothing)
      prev = smoothed

      let solved: any | undefined
      if (opts.withKalidokit) {
        try {
          const Kali: any = (await import("kalidokit")).default || (await import("kalidokit"))
          // 使用完整的 Kalidokit Face.solve 参数，像示例项目
          solved = Kali.Face?.solve?.(face, {
            runtime: "mediapipe",
            video,
            smoothBlink: true,
            enableWink: true,
            maxRotationDegrees: 30
          })
          if (mirror && solved) {
            // 常见镜像：水平翻转一些角度与位移（按需可扩展）
            if (solved.head?.degrees) {
              solved.head.degrees.y *= -1
            }
            if (solved.pupil) {
              solved.pupil.x *= -1
            }
            if (solved.eye) {
              solved.eye.l = solved.eye.l
              solved.eye.r = solved.eye.r
            }
          }
        } catch {}
      }
      return { landmarks: smoothed, solved }
    } catch {
      return { landmarks: null }
    }
  }

  function onFrame(cb: (r: FaceResult) => void) {
    let raf = 0
    const maxFps = opts.maxFps ?? 30
    const minInterval = 1000 / Math.max(1, maxFps)
    let last = 0
    const loop = async (t: number) => {
      if (t - last >= minInterval) {
        last = t
        const r = await next(t)
        try { cb(r) } catch {}
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return { stop: () => { if (raf) cancelAnimationFrame(raf); raf = 0 } }
  }

  function destroy() {
    try {
      // 不主动停止外部传入的流，只释放 video
      ;(video as any).srcObject = null
      video.remove()
    } catch {}
  }

  return { video, next, onFrame, destroy }
}



export type PoseResult = {
  landmarks: any[] | null
  solved?: any
}
export type PosePipeline = {
  video: HTMLVideoElement
  next: (ts?: number) => Promise<PoseResult>
  onFrame: (cb: (r: PoseResult) => void) => { stop: () => void }
  destroy: () => void
}

export async function createPosePipeline(opts: {
  stream: MediaStream
  smoothing?: number
  withKalidokit?: boolean
  mirror?: boolean
  maxFps?: number
}): Promise<PosePipeline> {
  const smoothing = opts.smoothing ?? 0.5
  const video = document.createElement("video")
  video.muted = true; (video as any).playsInline = true; (video as any).autoplay = true
  video.srcObject = opts.stream
  await video.play().catch(() => {})

  const detector = await createPoseLandmarker()
  let prev: number[][] | null = null
  const smooth = (cur: number[][]) => smoothPoints(prev, cur, smoothing)

  async function next(ts = performance.now()): Promise<PoseResult> {
    if (!(video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0)) return { landmarks: null }
    try {
      const res: any = detector.detectForVideo(video, ts)
      const pose = res?.landmarks?.[0]
      if (!pose) return { landmarks: null }
      const w = video.videoWidth, h = video.videoHeight
      const pts: number[][] = pose.map((p: any) => [p.x * w, p.y * h, p.z])
      const smoothed = smooth(pts); prev = smoothed

      let solved: any | undefined
      if (opts.withKalidokit) {
        try {
          const Kali: any = (await import("kalidokit")).default || (await import("kalidokit"))
          // 使用完整的 Pose.solve，需要 3D 和 2D 数据
          const pose3D = res?.worldLandmarks?.[0] || pose
          solved = Kali.Pose?.solve?.(pose3D, pose, { runtime: "mediapipe", video })
        } catch {}
      }
      return { landmarks: smoothed, solved }
    } catch { return { landmarks: null } }
  }

  function onFrame(cb: (r: PoseResult) => void) {
    let raf = 0
    const maxFps = opts.maxFps ?? 20
    const minInterval = 1000 / Math.max(1, maxFps)
    let last = 0
    const loop = async (t: number) => {
      if (t - last >= minInterval) { last = t; const r = await next(t); try { cb(r) } catch {} }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return { stop: () => { if (raf) cancelAnimationFrame(raf); raf = 0 } }
  }

  function destroy() { try { (video as any).srcObject = null; video.remove() } catch {} }
  return { video, next, onFrame, destroy }
}

export type HandResult = {
  landmarks: any[][] | null // per-hand 21 pts
  handedness?: any[]
  solved?: any[] // per-hand
}
export type HandPipeline = {
  video: HTMLVideoElement
  next: (ts?: number) => Promise<HandResult>
  onFrame: (cb: (r: HandResult) => void) => { stop: () => void }
  destroy: () => void
}

export async function createHandPipeline(opts: {
  stream: MediaStream
  smoothing?: number
  withKalidokit?: boolean
  mirror?: boolean
}): Promise<HandPipeline> {
  const smoothing = opts.smoothing ?? 0.5
  const video = document.createElement("video")
  video.muted = true; (video as any).playsInline = true; (video as any).autoplay = true
  video.srcObject = opts.stream
  await video.play().catch(() => {})

  const detector = await createHandLandmarker()
  let prevL: number[][] | null = null
  let prevR: number[][] | null = null

  async function next(ts = performance.now()): Promise<HandResult> {
    if (!(video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0)) return { landmarks: null }
    try {
      const res: any = detector.detectForVideo(video, ts)
      const hands = res?.landmarks || []
      const handedness = res?.handedness || []
      if (!hands.length) return { landmarks: null }
      const w = video.videoWidth, h = video.videoHeight
      const out: number[][][] = []
      const solved: any[] = []
      for (let i = 0; i < hands.length; i++) {
        const pts: number[][] = hands[i].map((p: any) => [p.x * w, p.y * h, p.z])
        const isRight = handedness?.[i]?.[0]?.categoryName === 'Right'
        const smoothed = smoothPoints(isRight ? prevR : prevL, pts, smoothing)
        if (isRight) prevR = smoothed; else prevL = smoothed
        out.push(smoothed)
        if (opts.withKalidokit) {
          try {
            const Kali: any = (await import("kalidokit")).default || (await import("kalidokit"))
            const solvedHand = Kali.Hand?.solve?.(hands[i], handedness?.[i]?.[0]?.categoryName || 'Right', { runtime: 'mediapipe', video })
            solved.push(solvedHand)
          } catch { solved.push(undefined) }
        }
      }
      return { landmarks: out, handedness, solved: solved.length ? solved : undefined }
    } catch { return { landmarks: null } }
  }

  function onFrame(cb: (r: HandResult) => void) {
    let raf = 0
    const loop = async () => { const r = await next(); try { cb(r) } catch {}; raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return { stop: () => { if (raf) cancelAnimationFrame(raf); raf = 0 } }
  }

  function destroy() { try { (video as any).srcObject = null; video.remove() } catch {} }
  return { video, next, onFrame, destroy }
}

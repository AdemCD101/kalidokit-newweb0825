"use client"

import { useEffect, useRef } from "react"
import { createHandLandmarker, createPoseLandmarker } from "@/lib/tracking/mediapipe"

// Simple EMA smoothing for landmarks
function smoothLandmarks(prev: number[][] | null, cur: number[][], alpha: number) {
  if (!prev) return cur
  return cur.map((pt, i) => {
    const p = prev[i] || pt
    return [p[0] + (pt[0] - p[0]) * alpha, p[1] + (pt[1] - p[1]) * alpha, (p[2] ?? 0) + ((pt[2] ?? 0) - (p[2] ?? 0)) * alpha]
  })
}

function drawPoints(ctx: CanvasRenderingContext2D, points: number[][], color = "rgba(0,255,180,0.9)", size = 2) {
  ctx.save()
  ctx.fillStyle = color
  for (const p of points) {
    ctx.beginPath()
    ctx.arc(p[0], p[1], size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export default function HolisticOverlay({
  active,
  getStream,
  mirror = true,
  poseEnabled,
  handsEnabled,
  poseSmoothing = 0.5,
  handsSmoothing = 0.5,
}: {
  active: boolean
  getStream: () => MediaStream | null
  mirror?: boolean
  poseEnabled: boolean
  handsEnabled: boolean
  poseSmoothing?: number
  handsSmoothing?: number
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const poseRef = useRef<any | null>(null)
  const handRef = useRef<any | null>(null)
  const prevPoseRef = useRef<number[][] | null>(null)
  const prevLeftRef = useRef<number[][] | null>(null)
  const prevRightRef = useRef<number[][] | null>(null)

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      ;(videoRef.current as HTMLVideoElement | null)?.pause()
    }
  }, [])

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      const ctx = canvasRef.current?.getContext("2d")
      const c = canvasRef.current
      if (ctx && c) ctx.clearRect(0, 0, c.width, c.height)
      return
    }

    let stopped = false

    const ensureVideo = async () => {
      const video = videoRef.current!
      const stream = getStream()
      if (!stream) return
      if (video.srcObject !== stream) {
        video.srcObject = stream
        await video.play()
      }
    }

    const ensureModels = async () => {
      if (poseEnabled && !poseRef.current) {
        poseRef.current = await createPoseLandmarker()
      }
      if (handsEnabled && !handRef.current) {
        handRef.current = await createHandLandmarker()
      }
    }

    const loop = async () => {
      if (stopped) return
      await ensureVideo()
      await ensureModels()
      const c = canvasRef.current
      const video = videoRef.current
      if (!c || !video) {
        rafRef.current = requestAnimationFrame(loop)
        return
      }
      // Resize canvas to video size
      const vw = video.videoWidth || 1280
      const vh = video.videoHeight || 720
      if (c.width !== vw || c.height !== vh) {
        c.width = vw
        c.height = vh
      }
      const ctx = c.getContext("2d")!
      ctx.save()
      ctx.clearRect(0, 0, vw, vh)

      if (mirror) {
        ctx.translate(vw, 0)
        ctx.scale(-1, 1)
      }

      const ts = performance.now()

      // Pose
      if (poseEnabled && poseRef.current) {
        const res = poseRef.current.detectForVideo(video, ts)
        const lm = res?.poseLandmarks?.[0]
        if (lm && lm.length) {
          const points = lm.map((p: any) => [p.x * vw, p.y * vh, p.z])
          const smoothed = smoothLandmarks(prevPoseRef.current, points, poseSmoothing)
          prevPoseRef.current = smoothed
          // Minimal skeleton: just points to avoid clutter
          drawPoints(ctx, smoothed, "rgba(255,200,0,0.9)", 2)
          // Optional: Kalidokit mapping (safe import)
          try {
            const Kalidokit = (await import("kalidokit")).default || (await import("kalidokit"))
            // @ts-ignore
            Kalidokit.Pose?.solve?.(res.poseWorldLandmarks?.[0] ?? lm, lm, { runtime: "mediapipe", video })
          } catch {}
        }
      }

      // Hands
      if (handsEnabled && handRef.current) {
        const res = handRef.current.detectForVideo(video, ts)
        const hands = res?.landmarks || []
        const handedness = res?.handedness || []
        hands.forEach(async (h: any, idx: number) => {
          const pts = h.map((p: any) => [p.x * vw, p.y * vh, p.z])
          const isRight = handedness?.[idx]?.[0]?.categoryName === "Right"
          const prevRef = isRight ? prevRightRef : prevLeftRef
          const sm = smoothLandmarks(prevRef.current, pts, handsSmoothing)
          prevRef.current = sm
          drawPoints(ctx, sm, isRight ? "rgba(0,190,255,0.9)" : "rgba(160,120,255,0.9)", 2)
          try {
            const Kalidokit = (await import("kalidokit")).default || (await import("kalidokit"))
            // @ts-ignore
            Kalidokit.Hand?.solve?.(h, isRight ? "Right" : "Left")
          } catch {}
        })
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(loop)
    }

    loop()

    return () => {
      stopped = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, poseEnabled, handsEnabled, mirror, poseSmoothing, handsSmoothing])

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 z-20 pointer-events-none" aria-label="Pose/Hands Overlay" />
      <video ref={videoRef} className="hidden" playsInline muted />
    </>
  )
}

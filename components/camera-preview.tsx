"use client"

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

export type CameraPreviewHandle = {
  start: () => Promise<void>
  stop: () => void
}

export default forwardRef(function CameraPreview(
  {
    mirror = true,
    showLandmarks = false,
    onFps,
  }: {
    mirror?: boolean
    showLandmarks?: boolean
    onFps?: (fps: number) => void
  },
  ref: React.Ref<CameraPreviewHandle>
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number>(0)

  async function start() {
    if (streamRef.current) return
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false,
    })
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      resizeCanvas()
      loop()
    }
  }

  function stop() {
    rafRef.current && cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    lastTsRef.current = 0
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.pause()
      ;(videoRef.current as any).srcObject = null
    }
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  function resizeCanvas() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth || 1280
    const h = video.videoHeight || 720
    canvas.width = w
    canvas.height = h
  }

  function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Grid overlay as placeholder for landmarks
    ctx.save()
    ctx.strokeStyle = "rgba(255,255,255,0.15)"
    ctx.lineWidth = 1
    const step = 80
    for (let x = 0; x < w; x += step) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(w, y + 0.5)
      ctx.stroke()
    }
    ctx.restore()
  }

  function loop(ts = 0) {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    resizeCanvas()

    const w = canvas.width
    const h = canvas.height

    ctx.save()
    ctx.clearRect(0, 0, w, h)

    if (mirror) {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, w, h)

    if (showLandmarks) {
      // Placeholder: grid overlay. Replace with real landmarks drawing later.
      drawOverlay(ctx, w, h)
    }

    ctx.restore()

    if (lastTsRef.current && onFps) {
      const delta = ts - lastTsRef.current
      if (delta > 0) onFps(1000 / delta)
    }
    lastTsRef.current = ts
    rafRef.current = requestAnimationFrame(loop)
  }

  useEffect(() => {
    // cleanup on unmount
    return () => stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({ start, stop }), [])

  return (
    <div className="relative w-full bg-black">
      <canvas ref={canvasRef} className="block w-full h-auto" aria-label="摄像头预览画布" />
      <video ref={videoRef} className="hidden" playsInline muted />
    </div>
  )
})

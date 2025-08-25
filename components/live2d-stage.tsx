"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { createFaceLandmarker } from "@/lib/tracking/mediapipe"

// Attempt to load Live2D Cubism Core at runtime (required by pixi-live2d-display/cubism4)
async function ensureCubismCore(): Promise<void> {
  const g = globalThis as any
  if (g.Live2DCubismCore) return
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Live2D Cubism Core"))
    document.head.appendChild(script)
  })
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function clamp(v: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v))
}

export default function Live2DStage({
  active,
  className,
  mirror = true,
}: {
  active: boolean
  className?: string
  mirror?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const appRef = useRef<any | null>(null)
  const modelRef = useRef<any | null>(null)
  const detectorRef = useRef<any | null>(null)
  const rafRef = useRef<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize Pixi + Live2D model once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Ensure Cubism Core is loaded BEFORE importing cubism4 adapter
        await ensureCubismCore()
        if (cancelled) return
        const { Application, Ticker } = await import("pixi.js")
        const { Live2DModel } = await import("pixi-live2d-display/cubism4")

        // Create Pixi application (Pixi v6 API)
        const app = new Application({ backgroundAlpha: 0, resizeTo: containerRef.current ?? window } as any)
        appRef.current = app

        // mount canvas
        const el = containerRef.current
        if (!el) return
        el.innerHTML = ""
        el.appendChild((app as any).view)

        // Register ticker for pixi-live2d-display (Pixi v6 uses shared ticker instance)
        ;(Live2DModel as any).registerTicker?.(Ticker.shared)

        // load model from public directory
        const model = await Live2DModel.from("/Hiyori/Hiyori.model3.json")
        modelRef.current = model

        // place and scale model reasonably
        model.scale.set(0.35)
        ;(model as any).anchor?.set?.(0.5, 0.5)
        ;(model as any).position?.set?.(app.renderer.width / 2, app.renderer.height * 0.62)
        if (mirror) {
          model.scale.x *= -1
        }
        app.stage.addChild(model)

        // handle resize
        const onResize = () => {
          model.x = app.renderer.width / 2
          model.y = app.renderer.height * 0.62
        }
        window.addEventListener("resize", onResize)
        ;(model as any)._onResize = onResize
      } catch (e: any) {
        console.warn("[Live2DStage] init failed:", e)
        setError(e?.message || String(e))
      }
    })()
    return () => {
      cancelled = true
      try {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      } catch {}
      const app = appRef.current as any
      if (app) {
        try { app.destroy?.(true, { children: true }) } catch {}
        appRef.current = null
      }
      const el = containerRef.current
      if (el) el.innerHTML = ""
      // stop stream if any
      stopCamera()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start/stop camera + detection loop according to `active`
  useEffect(() => {
    if (!active) {
      stopLoop()
      stopCamera()
      return
    }
    let stopped = false
    ;(async () => {
      try {
        await startCamera()
        await ensureDetector()
        if (!stopped) loop()
      } catch (e: any) {
        console.warn("[Live2DStage] start failed:", e)
        setError(e?.message || String(e))
      }
    })()
    return () => { stopped = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  async function startCamera() {
    if (streamRef.current) return
    const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: false }
    const stream = await navigator.mediaDevices.getUserMedia(constraints as any)
    streamRef.current = stream
    const v = videoRef.current!
    v.srcObject = stream
    await v.play()
  }
  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    const v = videoRef.current
    if (v) {
      try { v.pause() } catch {}
      ;(v as any).srcObject = null
    }
  }

  async function ensureDetector() {
    if (!detectorRef.current) {
      detectorRef.current = await createFaceLandmarker()
    }
  }

  function stopLoop() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  async function loop() {
    const v = videoRef.current
    const model = modelRef.current
    const detector = detectorRef.current
    if (!v || !model || !detector) {
      rafRef.current = requestAnimationFrame(loop)
      return
    }
    const ts = performance.now()
    try {
      const res = detector.detectForVideo(v, ts)
      const face = res?.faceLandmarks?.[0]
      if (face && face.length) {
        // dynamic import to keep bundle lean
        const KaliMod: any = (await import("kalidokit")).default || (await import("kalidokit"))
        const solved = KaliMod.Face?.solve?.(face, { runtime: "mediapipe", video: v })
        if (solved) rigLive2D(model, solved, { mirror })
      }
    } catch (e) {
      // swallow to keep loop alive
    }
    rafRef.current = requestAnimationFrame(loop)
  }

  function rigLive2D(model: any, solved: any, opts: { mirror: boolean }) {
    const core = model?.internalModel?.coreModel
    if (!core) return

    const damp = 0.35 // smoothing factor

    // Head rotation
    const rx = (solved.head?.degrees?.x ?? 0)
    const ry = (solved.head?.degrees?.y ?? 0)
    const rz = (solved.head?.degrees?.z ?? 0)
    // Live2D params are typically: X=Yaw, Y=Pitch, Z=Roll
    const angleX = opts.mirror ? -ry : ry
    const angleY = rx
    const angleZ = opts.mirror ? -rz : rz

    blendParam(core, "ParamAngleX", angleX, damp)
    blendParam(core, "ParamAngleY", angleY, damp)
    blendParam(core, "ParamAngleZ", angleZ, damp)

    // Eyes
    const eyeL = clamp(solved.eye?.l ?? 1)
    const eyeR = clamp(solved.eye?.r ?? 1)
    blendParam(core, "ParamEyeLOpen", eyeL, 0.3)
    blendParam(core, "ParamEyeROpen", eyeR, 0.3)

    const pupilX = clamp((solved.pupil?.x ?? 0) * 1.5, -1, 1) * (opts.mirror ? -1 : 1)
    const pupilY = clamp((solved.pupil?.y ?? 0) * 1.5, -1, 1)
    blendParam(core, "ParamEyeBallX", pupilX, 0.25)
    blendParam(core, "ParamEyeBallY", pupilY, 0.25)

    // Brows (optional, mild influence)
    const browL = clamp((solved.brow?.l?.y ?? 0) * 0.8, -1, 1)
    const browR = clamp((solved.brow?.r?.y ?? 0) * 0.8, -1, 1)
    blendParam(core, "ParamBrowLY", browL, 0.2)
    blendParam(core, "ParamBrowRY", browR, 0.2)

    // Mouth
    const mouthOpen = clamp(solved.mouth?.y ?? 0, 0, 1)
    const mouthI = clamp(solved.mouth?.shape?.I ?? 0, 0, 1)
    const mouthU = clamp(solved.mouth?.shape?.U ?? 0, 0, 1)
    const mouthForm = clamp(mouthI - mouthU, -1, 1) // I: smile-like wide, U: narrow
    blendParam(core, "ParamMouthOpenY", mouthOpen, 0.35)
    blendParam(core, "ParamMouthForm", mouthForm, 0.35)
  }

  function blendParam(core: any, id: string, target: number, damp = 0.3) {
    try {
      const cur = core.getParameterValueById(id) as number
      const next = lerp(cur, target, clamp(damp, 0.01, 1))
      core.setParameterValueById(id, next)
    } catch {
      // ignore missing params
    }
  }

  return (
    <div className={cn("absolute inset-0 -z-15 flex items-center justify-center", className)}>
      {/* Pixi canvas container */}
      <div ref={containerRef} className="w-full h-full" />
      {/* Hidden video for detection */}
      <video ref={videoRef} className="hidden" playsInline muted />
      {error ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded bg-black/60 text-white/80">
          Live2D 初始化失败：{error}
        </div>
      ) : null}
    </div>
  )
}


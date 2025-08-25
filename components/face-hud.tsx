"use client"

import type React from "react"
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { createFaceLandmarker, hasMediapipeSupport } from "@/lib/tracking/mediapipe"

export type FaceHUDHandle = {
  start: () => Promise<void>
  stop: () => void
  getCanvas: () => HTMLCanvasElement | null
  getStream: () => MediaStream | null
}

type Resolution = "auto" | "360p" | "720p" | "1080p"

// Simple EMA smoothing
function smoothLandmarks(prev: number[][] | null, cur: number[][], alpha: number) {
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

// Compute 2D convex hull (Graham scan) for mask fill
function convexHull(points: number[][]) {
  const pts = points.map((p) => ({ x: p[0], y: p[1] })).sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
  if (pts.length <= 1) return pts
  const lower: any[] = []
  for (const p of pts) {
    while (lower.length >= 2) {
      const q = lower[lower.length - 1]
      const r = lower[lower.length - 2]
      if ((q.x - r.x) * (p.y - r.y) - (q.y - r.y) * (p.x - r.x) <= 0) lower.pop()
      else break
    }
    lower.push(p)
  }
  const upper: any[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2) {
      const q = upper[upper.length - 1]
      const r = upper[upper.length - 2]
      if ((q.x - r.x) * (p.y - r.y) - (q.y - r.y) * (p.x - r.x) <= 0) upper.pop()
      else break
    }
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return lower.concat(upper)
}

export default forwardRef(function FaceHUD(
  {
    active = false,
    size = 160,
    width,
    height,
    mode = "points",
    mirror = true,
    position = "bottom-right",
    draggable = false,
    deviceId = null,
    resolution = "auto",
    smoothing = 0.6,
    maxFps = 30,
    className,
    onStreamChange,
  }: {
    active?: boolean
    size?: number
    width?: number
    height?: number
    mode?: "points" | "mask" | "wireframe"
    mirror?: boolean
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom"
    draggable?: boolean
    deviceId?: string | null
    resolution?: Resolution
    smoothing?: number
    maxFps?: number
    className?: string
    onStreamChange?: (stream: MediaStream | null) => void
  },
  ref: React.Ref<FaceHUDHandle>,
) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const modeRef = useRef<typeof mode>(mode)
  const mirrorRef = useRef<boolean>(mirror)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const faceRef = useRef<any | null>(null)
  const prevFaceRef = useRef<number[][] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState<boolean | null>(null)

  const origConsoleErrorRef = useRef<((...args: any[]) => void) | null>(null)
  const kalidokitRef = useRef<any | null>(null)
  const startedRef = useRef<boolean>(false)
  const [isClient, setIsClient] = useState(false)
  // 客户端检查，防止 SSR 水合问题
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 防止 Mediapipe 的 INFO 打印被 Next 的 intercept-console-error 当成 Error
  useEffect(() => {
    if (!isClient) return

    const orig = console.error
    origConsoleErrorRef.current = orig
    console.error = (...args: any[]) => {
      const first = String(args?.[0] ?? "")
      if (first.includes("Created TensorFlow Lite XNNPACK delegate for CPU")) {
        // 降级成普通日志
        if (typeof console.log === "function") console.log("[mediapipe:info]", ...args)
        return
      }
      orig(...args)
    }
    return () => {
      if (origConsoleErrorRef.current) console.error = origConsoleErrorRef.current
    }
  }, [isClient])

  // 预加载 Kalidokit，避免每帧动态 import
  useEffect(() => {
    if (!isClient || kalidokitRef.current) return

    import("kalidokit").then(mod => {
      kalidokitRef.current = mod.default || mod
    }).catch(() => {})
  }, [isClient])


  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  useEffect(() => {
    mirrorRef.current = !!mirror
  }, [mirror])

  const start = useCallback(async () => {
    // 防止重复初始化（即使热更/双执行也只启动一次）
    if (startedRef.current) {
      console.log("[FaceHUD] Already started, skipping duplicate start")
      return
    }
    startedRef.current = true

    // 不抛异常，内部兜底，避免未捕获 Promise 拒绝
    console.log("[FaceHUD] start() called")
    try {
      if (runningRef.current) {
        console.log("[FaceHUD] Already running, skipping start")
        return
      }

      // 等待 DOM 元素准备就绪，最多重试 5 次
      let retries = 5
      while ((!videoRef.current || !canvasRef.current) && retries > 0) {
        console.log(`[FaceHUD] DOM elements not ready, waiting... (${retries} retries left)`)
        await new Promise(resolve => setTimeout(resolve, 200))
        retries--
      }

      if (!videoRef.current || !canvasRef.current) {
        throw new Error("DOM elements not available after multiple retries")
      }

      // 快速探测支持性（仅用于 UI 提示）
      if (supported === null) {
        hasMediapipeSupport()
          .then(setSupported)
          .catch(() => setSupported(false))
      }

      const constraints: MediaStreamConstraints["video"] =
        resolution === "1080p"
          ? { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" }
          : resolution === "720p"
            ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
            : resolution === "360p"
              ? { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: "user" }
              : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }

      async function openStream(): Promise<MediaStream> {
        const primary: MediaStreamConstraints = {
          video: deviceId ? { ...constraints, deviceId: { exact: deviceId } } : constraints,
          audio: false,
        }
        try {
          return await navigator.mediaDevices.getUserMedia(primary)
        } catch (e) {
          console.warn("[FaceHUD] getUserMedia primary failed, retrying with minimal constraints", e)
          // 极简回退，尽量拿到流
          return await navigator.mediaDevices.getUserMedia({ video: true, audio: false } as MediaStreamConstraints)
        }
      }

      const stream = await openStream()
      streamRef.current = stream
      try { onStreamChange?.(stream) } catch {}
      const video = videoRef.current
      if (!video) {
        console.error("[FaceHUD] Video element not found!")
        throw new Error("Video element not available")
      }
      console.log("[FaceHUD] Setting video stream")
      video.srcObject = stream
      // Safari/iOS 兼容：确保属性齐全并避免 display:none
      video.muted = true
      ;(video as any).playsInline = true
      ;(video as any).autoplay = true
      // 等待视频进入可播放状态（多重兜底，防止 play() 卡住不 resolve）
      await new Promise<void>((resolve) => {
        let settled = false
        const done = () => {
          if (settled) return
          settled = true
          video.removeEventListener("playing", onPlaying)
          video.removeEventListener("canplay", onPlaying)
          clearTimeout(timer)
          resolve()
        }
        const onPlaying = () => done()
        const timer = setTimeout(() => done(), 1500)
        video.addEventListener("playing", onPlaying)
        video.addEventListener("canplay", onPlaying)
        const p = video.play()
        if (p && typeof p.then === "function") {
          p.then(() => {}).catch((err: any) => {
            console.warn("[FaceHUD] video.play() rejected, will rely on events/timeout:", err)
          })
        }
      })
      // 记录轨道状态，便于排查 capture failure
      const tracks = stream.getVideoTracks()
      if (tracks[0]) {
        console.log("[FaceHUD] Track state after play:", tracks[0].readyState)
      }
      console.log("[FaceHUD] Video playing successfully")

      if (!faceRef.current) {
        // 即使加载失败，createFaceLandmarker 会返回 Mock，保证不抛错
        faceRef.current = await createFaceLandmarker()
      }

      runningRef.current = true
      setError(null)
      console.log("[FaceHUD] Starting render loop")


      loop()
    } catch (err: any) {
      console.warn("[FaceHUD] start() failed, entering mock mode:", err)
      setError("当前预览环境不支持面部捕捉，已使用占位模式。")
      runningRef.current = true // 仍然进入绘制循环，展示 HUD 外观与提示
      loop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, resolution, onStreamChange])

  const stop = useCallback(() => {
    console.log("[FaceHUD] stop() called")
    startedRef.current = false // 重置启动标志
    runningRef.current = false
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    try { onStreamChange?.(null as any) } catch {}
    if (videoRef.current) {
      videoRef.current.pause()
      ;(videoRef.current as any).srcObject = null
    }
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    prevFaceRef.current = null
  }, [onStreamChange])

  // Restart when device/res changes (remove start/stop from deps to prevent infinite loop)
  useEffect(() => {
    if (!runningRef.current) return
    ;(async () => {
      stop()
      await start()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, resolution])

  // MediaPipe Face Mesh 官方连接定义
  const FACEMESH_CONTOURS = {
    // 面部轮廓
    faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],

    // 左眼轮廓
    leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    leftEyebrow: [46, 53, 52, 51, 48],

    // 右眼轮廓
    rightEye: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
    rightEyebrow: [276, 283, 282, 281, 278],

    // 嘴唇轮廓
    lipsOuter: [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318],
    lipsInner: [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 324],

    // 鼻子轮廓
    noseBottom: [20, 94, 125, 141, 235, 31, 228, 229, 230, 231, 232, 233, 244, 245, 122, 6, 202, 214, 234],
    noseTip: [1, 2]
  }

  // 设置画布的高DPI支持
  function setupCanvasTransform(ctx: CanvasRenderingContext2D, w: number, h: number, mirrored: boolean) {
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.scale(dpr, dpr)
    if (mirrored) {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    return dpr
  }

  // 1. 点阵模式 (dots) - 显示全部468个关键点
  function drawDots(ctx: CanvasRenderingContext2D, landmarks: number[][], w: number, h: number, mirrored: boolean) {
    const dpr = setupCanvasTransform(ctx, w, h, mirrored)

    // 绘制所有关键点
    ctx.fillStyle = '#ffffff'
    for (const point of landmarks) {
      if (point && point[0] !== undefined && point[1] !== undefined) {
        ctx.beginPath()
        ctx.arc(point[0], point[1], 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 用不同颜色区分五官
    const drawFeaturePoints = (indices: number[], color: string, radius = 2) => {
      ctx.fillStyle = color
      for (const idx of indices) {
        if (landmarks[idx]) {
          ctx.beginPath()
          ctx.arc(landmarks[idx][0], landmarks[idx][1], radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // 眼睛 - 蓝色
    drawFeaturePoints(FACEMESH_CONTOURS.leftEye, '#00aaff', 2)
    drawFeaturePoints(FACEMESH_CONTOURS.rightEye, '#00aaff', 2)

    // 嘴巴 - 红色
    drawFeaturePoints(FACEMESH_CONTOURS.lipsOuter, '#ff4444', 2)

    // 鼻梁 - 绿色
    drawFeaturePoints(FACEMESH_CONTOURS.noseTip, '#44ff44', 2.5)

    // 脸轮廓 - 黄色
    drawFeaturePoints(FACEMESH_CONTOURS.faceOval, '#ffaa00', 1.8)
  }

  function drawFace(ctx: CanvasRenderingContext2D, points: number[][]) {
    const m = modeRef.current
    const w = ctx.canvas.width / (window.devicePixelRatio || 1)
    const h = ctx.canvas.height / (window.devicePixelRatio || 1)
    const mirrored = mirrorRef.current

    if (m === "points") {
      drawDots(ctx, points, w, h, mirrored)
      return
    }

    if (m === "wireframe") {
      drawWireframe(ctx, points, w, h, mirrored)
      return
    }

    if (m === "mask") {
      drawMask(ctx, points, w, h, mirrored)
      return
    }
  }

  // 2. 线框模式 (wireframe) - 使用官方连接索引
  function drawWireframe(ctx: CanvasRenderingContext2D, landmarks: number[][], w: number, h: number, mirrored: boolean) {
    const dpr = setupCanvasTransform(ctx, w, h, mirrored)

    // 绘制连接线的辅助函数
    const drawConnectors = (indices: number[], color: string, lineWidth = 1) => {
      if (indices.length < 2) return

      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctx.beginPath()
      let started = false
      for (const idx of indices) {
        if (landmarks[idx]) {
          if (!started) {
            ctx.moveTo(landmarks[idx][0], landmarks[idx][1])
            started = true
          } else {
            ctx.lineTo(landmarks[idx][0], landmarks[idx][1])
          }
        }
      }
      ctx.stroke()
    }

    // 面部外框 - 白色
    drawConnectors([...FACEMESH_CONTOURS.faceOval, FACEMESH_CONTOURS.faceOval[0]], '#ffffff', 1.5)

    // 眼睛轮廓 - 亮蓝色
    drawConnectors([...FACEMESH_CONTOURS.leftEye, FACEMESH_CONTOURS.leftEye[0]], '#00ddff', 1.2)
    drawConnectors([...FACEMESH_CONTOURS.rightEye, FACEMESH_CONTOURS.rightEye[0]], '#00ddff', 1.2)

    // 眉毛 - 亮绿色
    drawConnectors(FACEMESH_CONTOURS.leftEyebrow, '#44ff88', 1.5)
    drawConnectors(FACEMESH_CONTOURS.rightEyebrow, '#44ff88', 1.5)

    // 嘴巴轮廓 - 亮红色
    drawConnectors([...FACEMESH_CONTOURS.lipsOuter, FACEMESH_CONTOURS.lipsOuter[0]], '#ff4466', 1.3)
    drawConnectors([...FACEMESH_CONTOURS.lipsInner, FACEMESH_CONTOURS.lipsInner[0]], '#ff6688', 1)

    // 鼻子轮廓 - 亮黄色
    drawConnectors(FACEMESH_CONTOURS.noseBottom, '#ffdd44', 1.2)

    // 鼻尖点
    for (const idx of FACEMESH_CONTOURS.noseTip) {
      if (landmarks[idx]) {
        ctx.fillStyle = '#ffdd44'
        ctx.beginPath()
        ctx.arc(landmarks[idx][0], landmarks[idx][1], 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // 3. 灰色面具模式 (mask) - 使用 Path2D 和 evenodd 填充
  function drawMask(ctx: CanvasRenderingContext2D, landmarks: number[][], w: number, h: number, mirrored: boolean) {
    const dpr = setupCanvasTransform(ctx, w, h, mirrored)

    // 创建面部外轮廓路径
    const facePath = new Path2D()
    let started = false
    for (const idx of FACEMESH_CONTOURS.faceOval) {
      if (landmarks[idx]) {
        if (!started) {
          facePath.moveTo(landmarks[idx][0], landmarks[idx][1])
          started = true
        } else {
          facePath.lineTo(landmarks[idx][0], landmarks[idx][1])
        }
      }
    }
    facePath.closePath()

    // 创建眼睛洞路径
    const createEyeHole = (eyeIndices: number[]) => {
      const eyePath = new Path2D()
      let eyeStarted = false
      for (const idx of eyeIndices) {
        if (landmarks[idx]) {
          if (!eyeStarted) {
            eyePath.moveTo(landmarks[idx][0], landmarks[idx][1])
            eyeStarted = true
          } else {
            eyePath.lineTo(landmarks[idx][0], landmarks[idx][1])
          }
        }
      }
      eyePath.closePath()
      return eyePath
    }

    // 创建嘴巴洞路径
    const mouthPath = new Path2D()
    let mouthStarted = false
    for (const idx of FACEMESH_CONTOURS.lipsOuter) {
      if (landmarks[idx]) {
        if (!mouthStarted) {
          mouthPath.moveTo(landmarks[idx][0], landmarks[idx][1])
          mouthStarted = true
        } else {
          mouthPath.lineTo(landmarks[idx][0], landmarks[idx][1])
        }
      }
    }
    mouthPath.closePath()

    // 合并所有路径
    const combinedPath = new Path2D()
    combinedPath.addPath(facePath)
    combinedPath.addPath(createEyeHole(FACEMESH_CONTOURS.leftEye))
    combinedPath.addPath(createEyeHole(FACEMESH_CONTOURS.rightEye))
    combinedPath.addPath(mouthPath)

    // 填充面具（使用 evenodd 规则让五官镂空）
    ctx.fillStyle = 'rgba(200,200,200,0.45)'
    ctx.fill(combinedPath, 'evenodd')

    // 描边
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 0.8
    ctx.stroke(facePath)
  }

  async function loop() {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) {
      // 延迟重试，等待 DOM 挂载
      if (runningRef.current) {
        rafRef.current = requestAnimationFrame(loop)
      }
      return
    }
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      if (runningRef.current) {
        rafRef.current = requestAnimationFrame(loop)
      }
      return
    }

    const w = canvas.width
    const h = canvas.height

    // 检查画布是否可见，如果不可见则跳过绘制
    if (w === 0 || h === 0) {
      if (runningRef.current) {
        rafRef.current = requestAnimationFrame(loop)
      }
      return
    }

    // 采用 Kalidokit 模式：只在检测时清空和重绘
    try {
      if (
        faceRef.current &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        // 移除 FPS 节流，让 MediaPipe 自然控制频率
        const now = performance.now()

        try {
          // 直接同步检测，像 Kalidokit 示例
          const res = faceRef.current.detectForVideo(video, now)
          const face = res?.faceLandmarks?.[0]
          if (face && face.length) {
            // 只在有检测结果时才清空和重绘
            ctx.clearRect(0, 0, w, h)
            ctx.save()
            if (mirrorRef.current) {
              ctx.translate(w, 0)
              ctx.scale(-1, 1)
            }

            // HUD 背景
            ctx.fillStyle = "rgba(16,16,16,0.9)"
            ctx.fillRect(0, 0, w, h)

            // 使用视频实际尺寸进行计算
            const vw = video.videoWidth
            const vh = video.videoHeight
            const pts = face.map((p: any) => [p.x * vw, p.y * vh, p.z])
            const sm = smoothLandmarks(prevFaceRef.current, pts, smoothing)
            prevFaceRef.current = sm

            // 转换到画布坐标系进行绘制
            const canvasPts = sm.map((p: any) => [p[0] * w / vw, p[1] * h / vh, p[2]])
            drawFace(ctx, canvasPts)

            ctx.restore()

            // 完整的 Kalidokit 解算，像示例项目
            if (kalidokitRef.current) {
              try {
                // @ts-ignore - 使用完整的 Kalidokit 参数
                const solved = kalidokitRef.current.Face?.solve?.(face, {
                  runtime: "mediapipe",
                  video,
                  smoothBlink: true,        // 启用内置眨眼平滑
                  enableWink: true,         // 启用眨眼检测
                  maxRotationDegrees: 30,   // 限制头部旋转角度
                })
                if (solved) {
                  // 直接发布，不用 await import
                  try {
                    const { publishFaceSolved } = await import("@/lib/tracking/result-bus")
                    publishFaceSolved(solved)
                  } catch {}
                }
              } catch {}
            }
          }
        } catch (err) {
          console.warn("[FaceHUD] detect error:", err)
        }
      }
    } catch (err) {
      // 保守兜底，防止任何异常中断帧循环
      console.warn("[FaceHUD] loop detect error:", err)
      setError("检测模块不可用，已展示占位 HUD。")
    }

    // 错误提示徽标
    if (error || supported === false) {
      ctx.save()
      ctx.fillStyle = "rgba(0,0,0,0.6)"
      ctx.fillRect(8, h - 26, w - 16, 18)
      ctx.fillStyle = "rgba(255,255,255,0.9)"
      ctx.font = "12px ui-sans-serif, system-ui, -apple-system"
      ctx.fillText("当前预览环境不支持面捕推理，显示为占位 HUD（可在部署后或本地启用）", 12, h - 13)
      ctx.restore()
    }

    if (runningRef.current) {
      rafRef.current = requestAnimationFrame(loop)
    }
  }

  // Dragging (custom position)
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggable) return
    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const start = { x: e.clientX, y: e.clientY }
    const startStyle = pos ?? { top: rect.top, left: rect.left }
    target.setPointerCapture(e.pointerId)
    function onMove(ev: PointerEvent) {
      const nx = startStyle.left + (ev.clientX - start.x)
      const ny = startStyle.top + (ev.clientY - start.y)
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height
      setPos({ left: Math.max(0, Math.min(maxX, nx)), top: Math.max(0, Math.min(maxY, ny)) })
    }
    function onUp() {
      target.releasePointerCapture(e.pointerId)
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  // 计算实际画布尺寸
  const canvasWidth = width || size
  const canvasHeight = height || size

  useEffect(() => {
    // Resize canvas when size changes (throttled to prevent excessive redraws)
    const c = canvasRef.current
    if (!c) return

    // Only resize if dimensions actually changed
    if (c.width === canvasWidth && c.height === canvasHeight) return

    console.log("[FaceHUD] Setting canvas size:", canvasWidth, "x", canvasHeight)
    c.width = canvasWidth
    c.height = canvasHeight
  }, [canvasWidth, canvasHeight])



  // 声明式控制：active 改变时启动/停止 (只在客户端执行)
  useEffect(() => {
    if (!isClient) return

    let cancelled = false
    ;(async () => {
      if (active) {
        await start()
        if (cancelled) return
      } else {
        stop()
      }
    })()
    return () => {
      cancelled = true
      if (!active) stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isClient])

  useImperativeHandle(
    ref,
    () => ({
      // 仍保留给旧代码的兼容（不推荐）：
      start,
      stop,
      getCanvas: () => canvasRef.current,
      getStream: () => streamRef.current,
    }),
    [start, stop],
  )

  const anchorClass =
    position === "top-left"
      ? "top-4 left-4"
      : position === "top-right"
        ? "top-4 right-4"
        : position === "bottom-left"
          ? "bottom-4 left-4"
          : position === "custom"
            ? ""
            : "bottom-4 right-4"

  const customStyle = position === "custom" && pos ? { top: pos.top, left: pos.left } : undefined

  // 在客户端渲染前显示占位符
  if (!isClient) {
    return (
      <div className={cn("absolute bg-gray-800 rounded flex items-center justify-center", anchorClass, className)}
           style={{ width: canvasWidth, height: canvasHeight, ...customStyle }}>
        <div className="text-xs text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div
      className={cn("absolute", anchorClass, className, draggable && "cursor-move")}
      style={customStyle}
      onPointerDown={onPointerDown}
    >
      <div
        className="relative rounded-md border border-white/15 shadow-lg overflow-hidden"
        style={{ width: canvasWidth, height: canvasHeight }}
        aria-label="面捕头像"
      >
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          className="block"
          style={{ width: canvasWidth, height: canvasHeight }}
        />
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute pointer-events-none -z-10"
          style={{ width: 1, height: 1, opacity: 0, left: -9999 }}
        />
        <div className="absolute left-0 top-0 px-2 py-1 text-[10px] bg-black/50 text-white/80">
          {error ? "Face (Mock)" : "Face"}
        </div>
      </div>
    </div>
  )
})

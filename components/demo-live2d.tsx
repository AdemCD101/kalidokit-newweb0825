"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { createFacePipeline, createPosePipeline } from "@/lib/tracking/pipeline"

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Avoid duplicate loads
    const existed = Array.from(document.scripts).some((s) => s.src === src)
    if (existed) return resolve()
    const el = document.createElement("script")
    el.src = src
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(el)
  })
}

type Tuning = {
  enablePose?: boolean
  withKalidokitFace?: boolean
  withKalidokitPose?: boolean
  faceMaxFps?: number
  poseMaxFps?: number
}

export default function DemoLive2D({ active, className, stream, tuning }: { active: boolean; className?: string; stream?: MediaStream; tuning?: Tuning }) {
  const cfg: Required<Tuning> = {
    enablePose: tuning?.enablePose ?? true,
    withKalidokitFace: tuning?.withKalidokitFace ?? true,
    withKalidokitPose: tuning?.withKalidokitPose ?? true,
    faceMaxFps: tuning?.faceMaxFps ?? 24,
    poseMaxFps: tuning?.poseMaxFps ?? 15,
  }
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const guidesRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<any | null>(null)
  const modelRef = useRef<any | null>(null)
  const cameraRef = useRef<any | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const facemeshRef = useRef<any | null>(null)
  const pipelineRef = useRef<Awaited<ReturnType<typeof createFacePipeline>> | null>(null)
  const pipelineHandleRef = useRef<{ stop: () => void } | null>(null)
  const posePipelineRef = useRef<Awaited<ReturnType<typeof createPosePipeline>> | null>(null)
  const poseHandleRef = useRef<{ stop: () => void } | null>(null)
  const latestFaceRef = useRef<any | null>(null)
  const latestPoseRef = useRef<any | null>(null)
  const latestHandsRef = useRef<any | null>(null)
  const faceUnsubRef = useRef<(() => void) | null>(null)
  const faceOptsKeyRef = useRef<string>("")
  const poseOptsKeyRef = useRef<string>("")
  const handsPipelineRef = useRef<any | null>(null)
  const handsHandleRef = useRef<{ stop: () => void } | null>(null)
  const handsOptsKeyRef = useRef<string>("")
  const kalidokitRef = useRef<any | null>(null)
  const motionManagerSetupRef = useRef<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // 保存历史值用于平滑，像 Kalidokit 示例
  const oldLookTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const prevEyeStateRef = useRef<{ l: number; r: number }>({ l: 1, r: 1 })

  // 性能优化：缓存参数值，减少重复查询
  const paramCacheRef = useRef<{ [key: string]: number }>({})

  // 性能监控
  const perfStatsRef = useRef<{
    frameCount: number;
    lastLogTime: number;
    avgFrameTime: number;
    lastFrameTime: number;
  }>({ frameCount: 0, lastLogTime: 0, avgFrameTime: 0, lastFrameTime: 0 })

  // Initialize once
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Load exact versions used by Kalidokit demo
        // Core -> Pixi -> Live2D plugin (cubism4-only build to avoid cubism2 runtime requirement)
        await loadScript("/vendor/live2d/live2dcubismcore.min.js")
        await loadScript("/vendor/pixi/pixi-5.1.3.min.js")
        await loadScript("/vendor/pixi-live2d/pixi-live2d-display-0.3.1-cubism4.min.js")
        await loadScript("/vendor/kalidokit/kalidokit-1.1.umd.js")
        if (cancelled) return

        // Create pipelines with initial tuning — Face now subscribes to FaceHUD bus instead of own pipeline
        if (stream) {
          try {
            const { subscribeFaceSolved } = await import("@/lib/tracking/result-bus")
            faceUnsubRef.current = subscribeFaceSolved((r) => { latestFaceRef.current = r })
          } catch {}
          if (cfg.enablePose) {
            posePipelineRef.current = await createPosePipeline({
              stream,
              withKalidokit: cfg.withKalidokitPose,
              smoothing: 0.5,
              maxFps: cfg.poseMaxFps
            })
            poseOptsKeyRef.current = JSON.stringify({ ep: cfg.enablePose, kp: cfg.withKalidokitPose, max: cfg.poseMaxFps })

            // 订阅 Pose 数据，像 Kalidokit 示例
            if (posePipelineRef.current) {
              poseHandleRef.current = posePipelineRef.current.onFrame((r) => {
                if (r.solved) {
                  latestPoseRef.current = r.solved
                }
              })
            }
          }

          // 添加 Hands 支持，像 Kalidokit 示例
          if (cfg.enableHands) {
            const { createHandPipeline } = await import("@/lib/tracking/pipeline")
            handsPipelineRef.current = await createHandPipeline({
              stream,
              withKalidokit: true,
              smoothing: 0.5
            })
            handsOptsKeyRef.current = JSON.stringify({ eh: cfg.enableHands })

            // 订阅 Hands 数据
            if (handsPipelineRef.current) {
              handsHandleRef.current = handsPipelineRef.current.onFrame((r) => {
                if (r.solved && r.solved.length > 0) {
                  latestHandsRef.current = r.solved
                }
              })
            }
          }
        }

        const PIXI: any = (window as any).PIXI
        const Live2DModel = PIXI?.live2d?.Live2DModel
        if (!PIXI || !Live2DModel) throw new Error("PIXI or Live2DModel unavailable")

        // Create Pixi app bound to our canvas
        const container = containerRef.current!
        const app = new PIXI.Application({
          view: canvasRef.current,
          autoStart: true,
          backgroundAlpha: 0,
          backgroundColor: 0x000000,
          // Do not rely on window; we will manage resize to container explicitly
        })
        appRef.current = app
        // Ensure canvas fills container
        function fit() {
          const w = container.clientWidth || window.innerWidth
          const h = container.clientHeight || window.innerHeight
          app.renderer.resize(w, h)
        }
        fit()
        window.addEventListener("resize", fit)

        // Load Live2D model from public path (copied from Kalidokit demo)
        const modelUrl = "/demo-models/hiyori/hiyori_pro_t10.model3.json"
        const model = await Live2DModel.from(modelUrl, { autoInteract: false })
        modelRef.current = model

        model.scale.set(0.45)
        model.interactive = true
        model.anchor.set(0.5, 0.5)
        model.position.set(app.renderer.width * 0.5, app.renderer.height * 0.8)

        // Drag
        model.on("pointerdown", (e: any) => {
          ;(model as any).offsetX = e.data.global.x - model.position.x
          ;(model as any).offsetY = e.data.global.y - model.position.y
          ;(model as any).dragging = true
        })
        model.on("pointerup", () => {
          ;(model as any).dragging = false
        })
        model.on("pointermove", (e: any) => {
          if ((model as any).dragging) {
            model.position.set(e.data.global.x - (model as any).offsetX, e.data.global.y - (model as any).offsetY)
          }
        })

        // Wheel scale
        canvasRef.current?.addEventListener("wheel", (ev) => {
          ev.preventDefault()
          const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
          model.scale.set(clamp(model.scale.x + (ev as WheelEvent).deltaY * -0.001, -0.5, 10))
        })

        app.stage.addChild(model)

        // 预加载 Kalidokit，避免每帧查找 window.Kalidokit
        try {
          const mod = await import("kalidokit")
          kalidokitRef.current = mod.default || mod
        } catch {}

        // 一次性设置 motionManager.update（避免每帧重新绑定）
        if (!motionManagerSetupRef.current) {
          try {
            const mm = model.internalModel.motionManager
            const originalUpdate = mm.update.bind(mm)
            model.internalModel.eyeBlink = undefined

            mm.update = (...args: any[]) => {
              const frameStart = performance.now()

              // 先执行原始更新（保持物理和动作）
              try { originalUpdate(...args) } catch {}

              // 简化：直接应用最新的面部数据，像 Kalidokit 示例
              const face = latestFaceRef.current
              if (!face) return

              // 调试：每 10 秒输出一次 Kalidokit 数据结构，包含微笑信息
              if (Math.random() < 0.001) { // 大约每 1000 帧输出一次
                const mouthI = face.mouth?.shape?.I || 0
                const mouthX = face.mouth?.x || 0
                const mouthY = face.mouth?.y || 0
                const smileStrength = Math.max(0, mouthI * 0.8 + Math.max(0, mouthX) * 0.2)

                console.log("[DemoLive2D] Kalidokit Face data structure:", {
                  eye: face.eye,
                  mouth: face.mouth,
                  head: face.head,
                  brow: face.brow,
                  pupil: face.pupil,
                  // 微笑相关调试信息
                  smile: {
                    mouthI: mouthI,
                    mouthX: mouthX,
                    mouthY: mouthY,
                    calculatedSmileStrength: smileStrength,
                    // 移除 getParam 调用，避免作用域错误
                    rawMouthShape: face.mouth?.shape
                  },
                  pose: latestPoseRef.current ? Object.keys(latestPoseRef.current) : null,
                  hands: latestHandsRef.current ? latestHandsRef.current.map((h: any) => h ? Object.keys(h) : null) : null
                })
              }

              try {
                const Kalidokit = kalidokitRef.current
                if (!Kalidokit?.Vector?.lerp) return

                // 获取完整的 Kalidokit Utils，像示例项目
                const { lerp } = Kalidokit.Vector
                const { remap, clamp } = Kalidokit.Utils
                const core = model.internalModel.coreModel

                // 表情强度控制（从配置获取，默认 1.0）
                const expressionIntensity = 1.0 // TODO: 从配置中获取

                // 性能优化：参数缓存辅助函数
                const getParam = (id: string) => {
                  if (!(id in paramCacheRef.current)) {
                    paramCacheRef.current[id] = core.getParameterValueById(id) || 0
                  }
                  return paramCacheRef.current[id]
                }
                const setParam = (id: string, value: number) => {
                  paramCacheRef.current[id] = value
                  core.setParameterValueById(id, value)
                }

                // 面部参数应用 - 完整版本，像 Kalidokit 示例
                // 瞳孔平滑 - 采用 live2d-stage.tsx 的方式
                if (face.pupil) {
                  const pupilX = clamp((face.pupil.x ?? 0) * 1.5, -1, 1)
                  const pupilY = clamp((face.pupil.y ?? 0) * 1.5, -1, 1)

                  const currentX = getParam("ParamEyeBallX")
                  const currentY = getParam("ParamEyeBallY")

                  setParam("ParamEyeBallX", lerp(currentX, pupilX, 0.25))
                  setParam("ParamEyeBallY", lerp(currentY, pupilY, 0.25))
                }

                // 头部处理 - 按照 Kalidokit 文档的完整结构
                if (face.head) {
                  // 头部旋转 - 支持多种格式
                  let rx = 0, ry = 0, rz = 0

                  if (face.head.degrees) {
                    // degrees 格式（我们之前用的）
                    rx = (face.head.degrees.x ?? 0) * expressionIntensity
                    ry = (face.head.degrees.y ?? 0) * expressionIntensity
                    rz = (face.head.degrees.z ?? 0) * expressionIntensity
                  } else {
                    // 直接的 x, y, z 格式（Kalidokit 文档格式）
                    rx = (face.head.x ?? 0) * expressionIntensity
                    ry = (face.head.y ?? 0) * expressionIntensity
                    rz = (face.head.z ?? 0) * expressionIntensity
                  }

                  const currentX = getParam("ParamAngleX")
                  const currentY = getParam("ParamAngleY")
                  const currentZ = getParam("ParamAngleZ")

                  setParam("ParamAngleX", lerp(currentX, ry, 0.35))  // X=Yaw
                  setParam("ParamAngleY", lerp(currentY, rx, 0.35))  // Y=Pitch
                  setParam("ParamAngleZ", lerp(currentZ, rz, 0.35))  // Z=Roll

                  // 头部位置 - 如果模型支持
                  if (face.head.position) {
                    try {
                      const posX = (face.head.position.x ?? 0.5) - 0.5 // 转换为 -0.5 到 0.5
                      const posY = (face.head.position.y ?? 0.5) - 0.5

                      const currentPosX = getParam("ParamBodyX")
                      const currentPosY = getParam("ParamBodyY")

                      setParam("ParamBodyX", lerp(currentPosX, posX * 2, 0.2)) // 放大范围
                      setParam("ParamBodyY", lerp(currentPosY, -posY * 2, 0.2)) // Y轴反转
                    } catch {
                      // 模型可能没有身体位置参数
                    }
                  }
                }

                // 眨眼处理 - 完全按照 live2d-stage.tsx 的 blendParam 方式
                if (face.eye) {
                  // 使用与 live2d-stage.tsx 相同的逻辑
                  const eyeL = clamp(face.eye.l ?? 1, 0, 1)
                  const eyeR = clamp(face.eye.r ?? 1, 0, 1)

                  // 实现 blendParam 的逻辑：lerp(current, target, damp)
                  const currentL = getParam("ParamEyeLOpen")
                  const currentR = getParam("ParamEyeROpen")

                  // 正确的插值顺序：从当前值向目标值插值
                  setParam("ParamEyeLOpen", lerp(currentL, eyeL, 0.3))
                  setParam("ParamEyeROpen", lerp(currentR, eyeR, 0.3))

                  // 眼部微笑处理 - 与嘴部微笑联动
                  let smileStrength = 0
                  if (face.mouth) {
                    // 使用多种指标检测微笑
                    const mouthX = face.mouth.x || 0
                    const mouthY = face.mouth.y || 0
                    const mouthI = face.mouth.shape?.I || 0

                    // 方法1：直接的嘴部 x 值（最直接的指标）
                    const directSmile = Math.max(0, mouthX)

                    // 方法2：I 音素指标
                    const iSmile = mouthI

                    // 方法3：微笑的典型特征：轻微张口 + 嘴角上扬
                    const typicalSmile = (mouthY > 0.05 && mouthY < 0.4 && mouthX > 0.1) ? 0.3 : 0

                    // 综合计算，优先使用最敏感的指标
                    smileStrength = Math.max(
                      directSmile * 0.8,      // 直接指标权重最高
                      iSmile * 0.6,           // I 音素次之
                      typicalSmile            // 特征检测作为补充
                    )

                    // 大幅放大微笑强度，让眼部反应更明显
                    smileStrength = Math.min(1, smileStrength * 2.2) // 从1.5倍增加到2.2倍
                  }

                  // 应用眼部微笑参数 - 更敏感的阈值
                  if (smileStrength > 0.03) { // 进一步降低阈值
                    const eyeSmile = clamp(smileStrength, 0, 1)
                    const currentSmileL = getParam("ParamEyeLSmile")
                    const currentSmileR = getParam("ParamEyeRSmile")

                    setParam("ParamEyeLSmile", lerp(currentSmileL, eyeSmile, 0.7)) // 从0.5提高到0.7，更快响应
                    setParam("ParamEyeRSmile", lerp(currentSmileR, eyeSmile, 0.7))
                  } else {
                    // 没有微笑时，逐渐恢复到0
                    const currentSmileL = getParam("ParamEyeLSmile")
                    const currentSmileR = getParam("ParamEyeRSmile")

                    setParam("ParamEyeLSmile", lerp(currentSmileL, 0, 0.15)) // 稍慢的恢复
                    setParam("ParamEyeRSmile", lerp(currentSmileR, 0, 0.15))
                  }
                }

                // 嘴部处理 - 改进的微笑检测
                if (face.mouth) {
                  // 基础张口 - 使用 live2d-stage.tsx 的逻辑
                  const mouthOpen = clamp(face.mouth.y || 0, 0, 1)
                  const currentOpen = getParam("ParamMouthOpenY")
                  setParam("ParamMouthOpenY", lerp(currentOpen, mouthOpen, 0.35))

                  // 改进的嘴形变化 - 更敏感的微笑检测
                  let mouthForm = 0

                  if (face.mouth.shape) {
                    // 方法1：使用 I - U（原有方式）- 增强权重
                    const mouthI = clamp(face.mouth.shape.I || 0, 0, 1)
                    const mouthU = clamp(face.mouth.shape.U || 0, 0, 1)
                    const shapeForm = mouthI - mouthU

                    // 方法2：直接使用 mouth.x（更直接）- 大幅增强
                    const directForm = face.mouth.x || 0

                    // 方法3：检测微笑特征（I 音素高 + 轻微张口）- 增强
                    const smileIndicator = mouthI > 0.2 && mouthOpen > 0.03 && mouthOpen < 0.5 ? 0.5 : 0 // 降低阈值，增加强度

                    // 方法4：新增 - 任何正值都视为微笑
                    const anyPositive = Math.max(0, directForm, mouthI, shapeForm) * 0.6

                    // 综合计算，使用最大值而不是加权平均
                    mouthForm = Math.max(
                      shapeForm * 1.0,           // 提高权重
                      directForm * 1.2,          // 大幅提高权重
                      smileIndicator,            // 微笑特征检测
                      anyPositive                // 新增：任何正值检测
                    )

                    // 适度放大微笑效果
                    if (mouthForm > 0) {
                      mouthForm = Math.min(1, mouthForm * 3.2) // 从4.0倍降到3.2倍
                    }
                  } else {
                    // 如果没有 shape 数据，使用基础的 x 值并适度放大
                    mouthForm = (face.mouth.x || 0) * 2.8 // 从3.5倍降到2.8倍
                  }

                  // 适度微笑增强器：温和的多级放大
                  if (mouthForm > 0.1) {
                    mouthForm = Math.min(1, mouthForm * 1.3) // 从1.5降到1.3，轻微微笑时放大30%
                  }
                  if (mouthForm > 0.3) {
                    mouthForm = Math.min(1, mouthForm * 1.2) // 从1.4降到1.2，明显微笑时再放大20%
                  }
                  if (mouthForm > 0.5) {
                    mouthForm = Math.min(1, mouthForm * 1.1) // 从1.3降到1.1，大笑时再放大10%
                  }

                  // 温和的微笑检测：如果仍然很小，但有微笑迹象，适度放大
                  if (mouthForm > 0.01 && mouthForm < 0.2) {
                    mouthForm = Math.min(1, mouthForm * 5.0) // 从8倍降到5倍，对微小信号适度放大
                  }

                  mouthForm = clamp(mouthForm, -1, 1)
                  const currentForm = getParam("ParamMouthForm")
                  setParam("ParamMouthForm", lerp(currentForm, mouthForm, 0.7)) // 从0.8降到0.7，稍微温和的响应

                  // 增强的微笑调试输出
                  if (Math.random() < 0.02) { // 2% 概率输出，更频繁
                    console.log("[DemoLive2D] 🙂 ENHANCED Smile debug:", {
                      rawMouthX: face.mouth.x,
                      rawMouthY: face.mouth.y,
                      rawMouthI: face.mouth.shape?.I,
                      rawMouthU: face.mouth.shape?.U,
                      "🔥 FINAL_mouthForm": mouthForm,
                      "📊 currentParam": currentForm,
                      "⚡ amplification": mouthForm / Math.max(0.001, face.mouth.x || 0.001),
                      "🎯 isSmiling": mouthForm > 0.1 ? "YES!" : "no"
                    })
                  }
                }

                // 眉毛处理 - 按照 Kalidokit 文档的正确结构
                if (typeof face.brow === 'number') {
                  // Kalidokit 返回的是单个数值，不是对象
                  try {
                    const browValue = clamp(face.brow * 0.8, -1, 1)

                    const currentBrowL = getParam("ParamBrowLY")
                    const currentBrowR = getParam("ParamBrowRY")

                    setParam("ParamBrowLY", lerp(currentBrowL, browValue, 0.2))
                    setParam("ParamBrowRY", lerp(currentBrowR, browValue, 0.2))
                  } catch {
                    // 模型可能没有眉毛参数
                  }
                } else if (face.brow?.l || face.brow?.r) {
                  // 备用：如果是对象结构（可能是其他版本）
                  try {
                    const browL = clamp((face.brow.l?.y ?? 0) * 0.8, -1, 1)
                    const browR = clamp((face.brow.r?.y ?? 0) * 0.8, -1, 1)

                    const currentBrowL = getParam("ParamBrowLY")
                    const currentBrowR = getParam("ParamBrowRY")

                    setParam("ParamBrowLY", lerp(currentBrowL, browL, 0.2))
                    setParam("ParamBrowRY", lerp(currentBrowR, browR, 0.2))
                  } catch {
                    // 模型可能没有眉毛参数
                  }
                }

                // 脸颊红晕 - 与改进的微笑检测联动
                try {
                  let cheekBlush = 0
                  if (face.mouth) {
                    // 使用与眼部微笑相同的检测逻辑
                    const mouthX = Math.max(0, face.mouth.x || 0)
                    const mouthI = face.mouth.shape?.I || 0

                    // 综合计算脸颊红晕强度
                    cheekBlush = Math.max(
                      mouthX * 0.4,      // 直接的嘴部指标
                      mouthI * 0.3       // I 音素指标
                    ) * expressionIntensity

                    // 大幅放大效果，让脸红更明显
                    cheekBlush = Math.min(1, cheekBlush * 3.0) // 从2倍增加到3倍
                  }

                  if (cheekBlush > 0.02) { // 非常低的阈值
                    const currentCheek = getParam("ParamCheek")
                    setParam("ParamCheek", lerp(currentCheek, cheekBlush, 0.6)) // 从0.4提高到0.6，更快响应
                  } else {
                    // 没有微笑时逐渐消失
                    const currentCheek = getParam("ParamCheek")
                    setParam("ParamCheek", lerp(currentCheek, 0, 0.1)) // 慢速消失
                  }
                } catch {
                  // 模型可能没有脸颊参数
                }

                // Pose 处理 - 按照 Kalidokit 文档的完整结构
                const pose = latestPoseRef.current
                if (pose && cfg.enablePose) {
                  try {
                    // 身体旋转 - 按照 Kalidokit 文档，支持多个关节
                    const bodyRotation = pose.Hips?.rotation || pose.Spine?.rotation
                    if (bodyRotation) {
                      const bodyScale = 0.4 // 比头部动作更温和

                      // 转换弧度到度数，并应用到 Live2D 身体参数
                      const degX = (bodyRotation.x || 0) * (180 / Math.PI) * bodyScale
                      const degY = (bodyRotation.y || 0) * (180 / Math.PI) * bodyScale
                      const degZ = (bodyRotation.z || 0) * (180 / Math.PI) * bodyScale

                      // 使用正确的插值顺序和缓存系统
                      try {
                        const currentBodyX = getParam("ParamBodyAngleX")
                        const currentBodyY = getParam("ParamBodyAngleY")
                        const currentBodyZ = getParam("ParamBodyAngleZ")

                        setParam("ParamBodyAngleX", lerp(currentBodyX, degY, 0.4))
                        setParam("ParamBodyAngleY", lerp(currentBodyY, degX, 0.4))
                        setParam("ParamBodyAngleZ", lerp(currentBodyZ, degZ, 0.4))
                      } catch {
                        // 模型可能没有身体参数
                      }
                    }

                    // 手臂处理 - 按照 Kalidokit 文档
                    if (pose.RightUpperArm || pose.LeftUpperArm) {
                      try {
                        const rightArm = pose.RightUpperArm
                        const leftArm = pose.LeftUpperArm

                        if (rightArm) {
                          const armScale = 0.3
                          const armX = (rightArm.x || 0) * (180 / Math.PI) * armScale
                          const armY = (rightArm.y || 0) * (180 / Math.PI) * armScale
                          const armZ = (rightArm.z || 0) * (180 / Math.PI) * armScale

                          const currentArmX = getParam("ParamArmRX")
                          const currentArmY = getParam("ParamArmRY")
                          const currentArmZ = getParam("ParamArmRZ")

                          setParam("ParamArmRX", lerp(currentArmX, armX, 0.3))
                          setParam("ParamArmRY", lerp(currentArmY, armY, 0.3))
                          setParam("ParamArmRZ", lerp(currentArmZ, armZ, 0.3))
                        }

                        if (leftArm) {
                          const armScale = 0.3
                          const armX = (leftArm.x || 0) * (180 / Math.PI) * armScale
                          const armY = (leftArm.y || 0) * (180 / Math.PI) * armScale
                          const armZ = (leftArm.z || 0) * (180 / Math.PI) * armScale

                          const currentArmX = getParam("ParamArmLX")
                          const currentArmY = getParam("ParamArmLY")
                          const currentArmZ = getParam("ParamArmLZ")

                          setParam("ParamArmLX", lerp(currentArmX, armX, 0.3))
                          setParam("ParamArmLY", lerp(currentArmY, armY, 0.3))
                          setParam("ParamArmLZ", lerp(currentArmZ, armZ, 0.3))
                        }
                      } catch {
                        // 模型可能没有手臂参数
                      }
                    }

                    // 呼吸效果 - 更自然的实现
                    if (pose.Spine) {
                      try {
                        const breathScale = Math.sin(Date.now() * 0.001) * 0.02 + 1 // 简单的呼吸动画
                        const currentBreath = getParam("ParamBreath")
                        setParam("ParamBreath", lerp(currentBreath, breathScale, 0.1))
                      } catch {
                        // 模型可能没有呼吸参数
                      }
                    }
                  } catch (err) {
                    console.warn("[DemoLive2D] pose apply error:", err)
                  }
                }

                // Hands 处理 - 按照 Kalidokit 文档的完整结构
                const hands = latestHandsRef.current
                if (hands && hands.length > 0 && cfg.enableHands) {
                  try {
                    hands.forEach((hand: any, index: number) => {
                      if (!hand) return

                      // 按照 Kalidokit 文档，手部数据结构是 RightWrist, RightIndexProximal 等
                      // 手腕旋转 - 按照文档结构
                      if (hand.RightWrist) {
                        const wrist = hand.RightWrist
                        try {
                          // 手腕有 3 个自由度
                          const wristX = (wrist.x || 0) * (180 / Math.PI) * 0.5
                          const wristY = (wrist.y || 0) * (180 / Math.PI) * 0.5
                          const wristZ = (wrist.z || 0) * (180 / Math.PI) * 0.5

                          const currentWristX = getParam("ParamHandRX")
                          const currentWristY = getParam("ParamHandRY")
                          const currentWristZ = getParam("ParamHandRZ")

                          setParam("ParamHandRX", lerp(currentWristX, wristX, 0.3))
                          setParam("ParamHandRY", lerp(currentWristY, wristY, 0.3))
                          setParam("ParamHandRZ", lerp(currentWristZ, wristZ, 0.3))
                        } catch {
                          // 模型可能没有手腕参数
                        }
                      }

                      if (hand.LeftWrist) {
                        const wrist = hand.LeftWrist
                        try {
                          const wristX = (wrist.x || 0) * (180 / Math.PI) * 0.5
                          const wristY = (wrist.y || 0) * (180 / Math.PI) * 0.5
                          const wristZ = (wrist.z || 0) * (180 / Math.PI) * 0.5

                          const currentWristX = getParam("ParamHandLX")
                          const currentWristY = getParam("ParamHandLY")
                          const currentWristZ = getParam("ParamHandLZ")

                          setParam("ParamHandLX", lerp(currentWristX, wristX, 0.3))
                          setParam("ParamHandLY", lerp(currentWristY, wristY, 0.3))
                          setParam("ParamHandLZ", lerp(currentWristZ, wristZ, 0.3))
                        } catch {
                          // 模型可能没有手腕参数
                        }
                      }

                      // 手指动作 - 按照 Kalidokit 文档，所有手指关节都只在 Z 轴移动
                      try {
                        // 右手握拳检测
                        if (hand.RightIndexProximal && hand.RightThumbProximal) {
                          const indexCurl = Math.abs(hand.RightIndexProximal.z || 0)
                          const thumbCurl = Math.abs(hand.RightThumbProximal.z || 0)
                          const fistStrength = (indexCurl + thumbCurl) * 0.5

                          const currentFist = getParam("ParamHandR")
                          setParam("ParamHandR", lerp(currentFist, fistStrength, 0.4))
                        }

                        // 左手握拳检测
                        if (hand.LeftIndexProximal && hand.LeftThumbProximal) {
                          const indexCurl = Math.abs(hand.LeftIndexProximal.z || 0)
                          const thumbCurl = Math.abs(hand.LeftThumbProximal.z || 0)
                          const fistStrength = (indexCurl + thumbCurl) * 0.5

                          const currentFist = getParam("ParamHandL")
                          setParam("ParamHandL", lerp(currentFist, fistStrength, 0.4))
                        }
                      } catch {
                        // 模型可能没有手指参数
                      }
                    })
                  } catch (err) {
                    console.warn("[DemoLive2D] hands apply error:", err)
                  }
                }
              } catch (err) {
                console.warn("[DemoLive2D] face apply error:", err)
              }

              // 性能监控
              const frameEnd = performance.now()
              const frameTime = frameEnd - frameStart
              const stats = perfStatsRef.current
              stats.frameCount++
              stats.avgFrameTime = (stats.avgFrameTime * 0.9) + (frameTime * 0.1)
              stats.lastFrameTime = frameTime

              // 每 5 秒输出一次性能统计
              if (frameEnd - stats.lastLogTime > 5000) {
                console.log(`[DemoLive2D] Performance: ${stats.frameCount} frames, avg: ${stats.avgFrameTime.toFixed(2)}ms, last: ${frameTime.toFixed(2)}ms`)
                stats.lastLogTime = frameEnd
                stats.frameCount = 0
              }
            }

            motionManagerSetupRef.current = true
            console.log("[DemoLive2D] Complete Kalidokit integration setup finished")
          } catch {}
        }


        // Debug: Force render and check canvas
        app.render()
        console.log("[DemoLive2D] Canvas debug:", {
          canvas: canvasRef.current,
          canvasStyle: canvasRef.current?.style.cssText,
          canvasSize: { w: canvasRef.current?.width, h: canvasRef.current?.height },
          stageChildren: app.stage.children.length,
          modelInStage: app.stage.children.includes(model)
        })

        // Setup MediaPipe Tasks face landmarker loop
        // If we have a pipeline, start polling frames to drive Live2D
        if (pipelineRef.current) {
          pipelineHandleRef.current = pipelineRef.current.onFrame((r) => {
            try {
              // debug: per-frame log removed to avoid FPS drops
              if (r.solved) {
                const model = modelRef.current
                if (!model) return
                // 只记录最新结果，渲染时再应用
                latestFaceRef.current = r.solved
              }
        // Pose pipeline: map upper-body rotations to Live2D body params
        if (posePipelineRef.current) {
          poseHandleRef.current = posePipelineRef.current.onFrame((r) => {
            try {
              if (!r.solved) return
              const model = modelRef.current
              if (!model) return
              const Kalidokit: any = (window as any).Kalidokit
              const lerp = Kalidokit?.Vector?.lerp
              const core = model.internalModel.coreModel
              const head = r.solved?.RightUpperChest || r.solved?.Spine || r.solved?.Hips || r.solved
              // 从 Kalidokit Pose 中选择上身的旋转，常用字段：.rotation 或 .rotationEuler
              const rot = head?.rotation || head?.rotationEuler || { x: 0, y: 0, z: 0 }
              const degX = (rot.x || 0) * (180 / Math.PI)
              const degY = (rot.y || 0) * (180 / Math.PI)
              const degZ = (rot.z || 0) * (180 / Math.PI)
              const bodyScale = 0.6 // 可调比例
              core.setParameterValueById("ParamBodyAngleX", lerp(degY * bodyScale, core.getParameterValueById("ParamBodyAngleX"), 0.4))
              core.setParameterValueById("ParamBodyAngleY", lerp(degX * bodyScale, core.getParameterValueById("ParamBodyAngleY"), 0.4))
              core.setParameterValueById("ParamBodyAngleZ", lerp(degZ * bodyScale, core.getParameterValueById("ParamBodyAngleZ"), 0.4))
            } catch {}
          })
        }

            } catch {}
          })
        }

        // Debug: log model state
        console.log("[DemoLive2D] Model loaded:", {
          model: !!model,
          position: model.position,
          scale: model.scale,
          visible: model.visible,
          alpha: model.alpha,
          appSize: { w: app.renderer.width, h: app.renderer.height },
          containerSize: { w: container.clientWidth, h: container.clientHeight }
        })

        // Auto start if active
        if (active) await startCamera()
      } catch (e: any) {
        console.warn("[DemoLive2D] init failed:", e)
        setError(e?.message || String(e))
      }
    })()
    return () => {
      cancelled = true
      try { stopCamera() } catch {}

      // 清理所有 pipeline 和订阅
      try { pipelineHandleRef.current?.stop?.() } catch {}
      try { poseHandleRef.current?.stop?.() } catch {}
      try { handsHandleRef.current?.stop?.() } catch {}
      try { faceUnsubRef.current?.() } catch {}

      try { pipelineRef.current?.destroy?.() } catch {}
      try { posePipelineRef.current?.destroy?.() } catch {}
      try { handsPipelineRef.current?.destroy?.() } catch {}

      try { appRef.current?.destroy?.(true, { children: true }) } catch {}

      // 清理所有引用和缓存
      appRef.current = null
      modelRef.current = null
      facemeshRef.current = null
      paramCacheRef.current = {}
      latestFaceRef.current = null
      latestPoseRef.current = null
      latestHandsRef.current = null

      console.log("[DemoLive2D] Complete cleanup with Kalidokit integration finished")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // React to active/stream/tuning change: (re)create/start pipelines lazily
  useEffect(() => {
    (async () => {
      if (!active) {
        try { stopCamera() } catch {}
        try { pipelineHandleRef.current?.stop?.() } catch {}
        if (faceUnsubRef.current) { try { faceUnsubRef.current() } catch {} ; faceUnsubRef.current = null }
        try { poseHandleRef.current?.stop?.() } catch {}
        return
      }
      if (!stream) {
        // 在 Studio 下没有外部流则不做本地 GUM，避免与 HUD 冲突
        return
      }

      // Face: subscribe to FaceHUD result bus (no local face pipeline)
      if (!faceOptsKeyRef.current) {
        try {
          const { subscribeFaceSolved } = await import("@/lib/tracking/result-bus")
          subscribeFaceSolved((r) => { latestFaceRef.current = r })
          faceOptsKeyRef.current = "subscribed"
          console.log('[DemoLive2D] subscribed to FaceHUD result bus')
        } catch {}
      }

      // Pose pipeline
      const poseKey = JSON.stringify({ ep: cfg.enablePose, kp: cfg.withKalidokitPose, max: cfg.poseMaxFps })
      if (!cfg.enablePose) {
        // turn off if exists
        if (poseHandleRef.current) { try { poseHandleRef.current.stop() } catch {} poseHandleRef.current = null }
        if (posePipelineRef.current) { try { posePipelineRef.current.destroy?.() } catch {} posePipelineRef.current = null }
        poseOptsKeyRef.current = poseKey
      } else {
        if (!posePipelineRef.current || poseOptsKeyRef.current !== poseKey) {
          try { poseHandleRef.current?.stop?.() } catch {}
          try { posePipelineRef.current?.destroy?.() } catch {}
          console.log('[DemoLive2D] (re)creating pose pipeline', poseKey)
          posePipelineRef.current = await createPosePipeline({ stream, withKalidokit: cfg.withKalidokitPose, smoothing: 0.5, maxFps: cfg.poseMaxFps })
          poseOptsKeyRef.current = poseKey
          poseHandleRef.current = null
        }
        if (!poseHandleRef.current && posePipelineRef.current) {
          poseHandleRef.current = posePipelineRef.current.onFrame((r) => {
            try {
              if (!r.solved) return
              // 只记录最新 pose 结果，渲染时应用
              latestPoseRef.current = r.solved
              // 早退，不在回调里写模型
              return
              const bodyScale = 0.6
              core.setParameterValueById("ParamBodyAngleX", lerp(degY * bodyScale, core.getParameterValueById("ParamBodyAngleX"), 0.4))
              core.setParameterValueById("ParamBodyAngleY", lerp(degX * bodyScale, core.getParameterValueById("ParamBodyAngleY"), 0.4))
              core.setParameterValueById("ParamBodyAngleZ", lerp(degZ * bodyScale, core.getParameterValueById("ParamBodyAngleZ"), 0.4))
            } catch {}
          })
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stream, cfg.enablePose, cfg.withKalidokitFace, cfg.withKalidokitPose, cfg.faceMaxFps, cfg.poseMaxFps])

  function drawResults(points: any[]) {
    const guides = guidesRef.current
    const video = videoRef.current
    if (!guides || !video || !points) return
    guides.width = video.videoWidth
    guides.height = video.videoHeight
    const ctx = guides.getContext("2d")!
    ctx.save()
    ctx.clearRect(0, 0, guides.width, guides.height)
    // Minimal dots instead of old drawing_utils
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    for (const p of points) {
      ctx.beginPath()
      ctx.arc(p.x * guides.width, p.y * guides.height, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  async function animateLive2D(points: any[]) {
    // 已弃用：旧的同步驱动方法，保留函数签名以防外部调用
    if (!points) return
    try {
      const Kalidokit: any = (window as any).Kalidokit
      const video = videoRef.current!
      const result = Kalidokit?.Face?.solve?.(points, { runtime: "mediapipe", video })
      if (result) {
        latestFaceRef.current = result
      }
    } catch {}
  }

  async function startCamera() {
    if (cameraRef.current || streamRef.current) return
    try {
      const video = videoRef.current!
      const faceDetector = facemeshRef.current
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false })
      streamRef.current = stream
      video.srcObject = stream
      await video.play()

      const onFrame = async () => {
        try {
          const res = faceDetector.detectForVideo(video, performance.now())
          const pts = res?.faceLandmarks?.[0]
          if (pts) {
            drawResults(pts)
            animateLive2D(pts)
          }
        } catch {}
        cameraRef.current = requestAnimationFrame(onFrame)
      }
      cameraRef.current = requestAnimationFrame(onFrame)
    } catch (e: any) {
      console.warn("[DemoLive2D] camera start failed:", e)
      setError(e?.message || String(e))
    }
  }

  function stopCamera() {
    try {
      if (cameraRef.current) cancelAnimationFrame(cameraRef.current)
      cameraRef.current = null
      const video = videoRef.current
      if (video && (video as any).srcObject) {
        const st = (video as any).srcObject as MediaStream
        st.getTracks().forEach((t) => t.stop())
        ;(video as any).srcObject = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    } catch {}
  }

  return (
    <div className={cn("absolute inset-0 z-30", className)}>
      <div ref={containerRef} className="absolute inset-0">
        <video ref={videoRef} className="hidden input_video" playsInline muted />
        <canvas ref={guidesRef} className="guides absolute inset-0 pointer-events-none" />
        <canvas ref={canvasRef} id="live2d" className="absolute inset-0 z-20" />
      </div>
      {error ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs px-2 py-1 rounded bg-black/60 text-white/80">
          Demo 初始化失败：{error}
        </div>
      ) : null}
    </div>
  )
}


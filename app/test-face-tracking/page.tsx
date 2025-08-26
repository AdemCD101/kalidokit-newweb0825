"use client"

import { useEffect, useRef, useState } from 'react'

export default function TestFaceTrackingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [modelLoaded, setModelLoaded] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const initTest = async () => {
      try {
        addLog('🚀 开始面部追踪集成测试...')

        if (!canvasRef.current) {
          addLog('❌ Canvas 引用为空')
          return
        }

        // 1. 加载 Cubism Core
        addLog('📦 加载 Cubism Core...')
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = '/vendor/live2d/live2dcubismcore.min.js'
          script.onload = () => {
            addLog('✅ Cubism Core 加载成功')
            resolve()
          }
          script.onerror = () => {
            addLog('❌ Cubism Core 加载失败')
            reject(new Error('Failed to load Cubism Core'))
          }
          document.head.appendChild(script)
        })

        // 2. 加载 PIXI 和 Live2D
        addLog('📦 加载 PIXI 和 Live2D 模块...')
        const PIXI = await import('pixi.js')
        const { Live2DModel } = await import('pixi-live2d-display-advanced/cubism4')

        addLog(`✅ PIXI.js ${PIXI.VERSION} 加载成功`)
        addLog('✅ pixi-live2d-display-advanced 加载成功')

        // 3. 创建 PIXI 应用
        addLog('🎨 创建 PIXI 应用...')
        const app = new PIXI.Application({
          view: canvasRef.current,
          width: 800,
          height: 600,
          backgroundColor: 0x1099bb,
          resolution: 1,
          autoDensity: false,
        })

        // 设置 PIXI 全局变量
        ;(window as any).PIXI = PIXI
        addLog('✅ PIXI 应用创建成功')

        // 4. 加载 Live2D 模型
        addLog('🎭 加载 Live2D 模型...')
        const model = await Live2DModel.from('/demo-models/hiyori/hiyori_pro_t10.model3.json', {
          ticker: app.ticker
        })

        model.x = app.screen.width / 2
        model.y = app.screen.height / 2
        model.anchor.set(0.5, 0.5)
        model.scale.set(0.3)

        app.stage.addChild(model)
        addLog('✅ Live2D 模型加载成功')
        setModelLoaded(true)

        // 5. 加载面部追踪模块
        addLog('📦 加载面部追踪模块...')
        try {
          const { createFacePipeline } = await import('@/lib/tracking/pipeline')
          addLog('✅ 面部追踪模块加载成功')

          // 6. 初始化摄像头和面部追踪
          addLog('📹 初始化摄像头...')
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: 640,
              height: 480,
              facingMode: 'user'
            }
          })

          addLog('✅ 摄像头启动成功')
          setCameraActive(true)

          // 7. 创建面部追踪管道
          addLog('🔍 初始化面部追踪管道...')
          const facePipeline = await createFacePipeline({
            stream,
            smoothing: 0.7,
            withKalidokit: true,
            mirror: true
          })

          addLog('✅ 面部追踪管道创建成功')

          // 8. 开始面部追踪
          addLog('🎯 开始面部追踪...')
          facePipeline.onFrame((result) => {
            if (result.landmarks && result.solved) {
              if (!faceDetected) {
                setFaceDetected(true)
                addLog('👤 检测到面部！')
              }

              const riggedFace = result.solved

              // 应用到 Live2D 模型
              if (riggedFace && model.internalModel) {
                try {
                  // 头部旋转
                  if (riggedFace.head && riggedFace.head.degrees) {
                    model.internalModel.coreModel.setParameterValueByIndex(0, riggedFace.head.degrees.x) // ParamAngleX
                    model.internalModel.coreModel.setParameterValueByIndex(1, riggedFace.head.degrees.y) // ParamAngleY
                    model.internalModel.coreModel.setParameterValueByIndex(2, riggedFace.head.degrees.z) // ParamAngleZ
                  }

                  // 眼部动作
                  if (riggedFace.eye) {
                    model.internalModel.coreModel.setParameterValueByIndex(3, riggedFace.eye.l) // ParamEyeLOpen
                    model.internalModel.coreModel.setParameterValueByIndex(4, riggedFace.eye.r) // ParamEyeROpen
                  }

                  // 嘴部动作
                  if (riggedFace.mouth) {
                    model.internalModel.coreModel.setParameterValueByIndex(5, riggedFace.mouth.x) // ParamMouthForm
                    model.internalModel.coreModel.setParameterValueByIndex(6, riggedFace.mouth.y) // ParamMouthOpenY
                  }
                } catch (paramError) {
                  // 参数设置错误，但不中断追踪
                  console.warn('参数设置错误:', paramError)
                }
              }
            } else {
              if (faceDetected) {
                setFaceDetected(false)
                addLog('👤 面部丢失')
              }
            }
          })

          addLog('🎉 面部追踪集成测试完成！')

        } catch (trackingError) {
          addLog(`❌ 面部追踪初始化失败: ${trackingError}`)
          console.error('面部追踪错误:', trackingError)
        }

        // 7. 初始化摄像头
        addLog('📹 初始化摄像头...')
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: 640, 
              height: 480,
              facingMode: 'user'
            } 
          })
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          addLog('✅ 摄像头启动成功')
          setCameraActive(true)
        } catch (cameraError) {
          addLog(`❌ 摄像头启动失败: ${cameraError}`)
          return
        }

        // 8. 初始化 MediaPipe Face Mesh
        addLog('🔍 初始化 MediaPipe Face Mesh...')
        const faceMesh = new (window as any).FaceMesh({
          locateFile: (file: string) => `/vendor/mediapipe/${file}`
        })

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        })

        faceMesh.onResults((results: any) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            if (!faceDetected) {
              setFaceDetected(true)
              addLog('👤 检测到面部！')
            }
            
            // 使用 Kalidokit 转换面部数据
            const landmarks = results.multiFaceLandmarks[0]
            const riggedFace = (window as any).Kalidokit.Face.solve(landmarks, {
              runtime: 'mediapipe',
              video: videoRef.current
            })

            // 应用到 Live2D 模型
            if (riggedFace && model.internalModel) {
              // 头部旋转
              if (riggedFace.head) {
                model.internalModel.coreModel.setParameterValueByIndex(0, riggedFace.head.x * 30) // ParamAngleX
                model.internalModel.coreModel.setParameterValueByIndex(1, riggedFace.head.y * 30) // ParamAngleY
                model.internalModel.coreModel.setParameterValueByIndex(2, riggedFace.head.z * 30) // ParamAngleZ
              }

              // 眼部动作
              if (riggedFace.eye) {
                model.internalModel.coreModel.setParameterValueByIndex(3, riggedFace.eye.l) // ParamEyeLOpen
                model.internalModel.coreModel.setParameterValueByIndex(4, riggedFace.eye.r) // ParamEyeROpen
              }

              // 嘴部动作
              if (riggedFace.mouth) {
                model.internalModel.coreModel.setParameterValueByIndex(5, riggedFace.mouth.x) // ParamMouthForm
                model.internalModel.coreModel.setParameterValueByIndex(6, riggedFace.mouth.y) // ParamMouthOpenY
              }
            }
          } else {
            if (faceDetected) {
              setFaceDetected(false)
              addLog('👤 面部丢失')
            }
          }
        })

        addLog('✅ MediaPipe Face Mesh 初始化成功')

        // 9. 开始面部追踪
        addLog('🎯 开始面部追踪...')
        const camera = new (window as any).Camera(videoRef.current, {
          onFrame: async () => {
            await faceMesh.send({ image: videoRef.current })
          },
          width: 640,
          height: 480
        })
        camera.start()

        addLog('🎉 面部追踪集成测试完成！')

      } catch (error) {
        addLog(`❌ 初始化错误: ${error}`)
        console.error('详细错误:', error)
      }
    }

    if (canvasRef.current && videoRef.current) {
      initTest()
    }
  }, [faceDetected])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            面部追踪集成测试
          </h1>
          <p className="text-gray-600">
            测试 MediaPipe + Kalidokit + Live2D 的完整面部追踪功能
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live2D 渲染区域 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Live2D 面部追踪</h2>
              <div className="flex space-x-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  modelLoaded 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {modelLoaded ? '✅ 模型已加载' : '⏳ 加载中'}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  cameraActive 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {cameraActive ? '📹 摄像头活跃' : '📹 摄像头未启动'}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  faceDetected 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {faceDetected ? '👤 面部检测中' : '👤 未检测到面部'}
                </div>
              </div>
            </div>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <canvas 
                ref={canvasRef}
                className="block w-full"
                style={{ 
                  maxWidth: '800px',
                  height: 'auto'
                }}
              />
            </div>
            
            {/* 摄像头预览 */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">摄像头预览</h3>
              <video 
                ref={videoRef}
                className="w-32 h-24 bg-black rounded border"
                muted
                playsInline
              />
            </div>
          </div>

          {/* 日志区域 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">实时日志</h2>
            <div className="bg-gray-100 rounded p-4 h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">等待日志...</div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`text-xs font-mono ${
                        log.includes('❌') ? 'text-red-600' : 
                        log.includes('✅') ? 'text-green-600' : 
                        log.includes('⚠️') ? 'text-yellow-600' :
                        log.includes('🎉') ? 'text-blue-600 font-bold' :
                        log.includes('🚀') ? 'text-purple-600 font-bold' :
                        log.includes('👤') ? 'text-indigo-600' :
                        'text-gray-700'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

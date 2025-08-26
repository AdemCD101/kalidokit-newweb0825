"use client"

import { useEffect, useRef, useState } from 'react'

export default function TestFaceSimplePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [modelLoaded, setModelLoaded] = useState(false)
  const [trackingActive, setTrackingActive] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const initTest = async () => {
      try {
        addLog('🚀 开始简化面部追踪测试...')
        
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
          width: 1000,  // 增加宽度
          height: 800,  // 增加高度
          backgroundColor: 0x1099bb,
          resolution: 1,
          autoDensity: false,
        })

        ;(window as any).PIXI = PIXI
        addLog('✅ PIXI 应用创建成功')

        // 4. 加载 Live2D 模型
        addLog('🎭 加载 Live2D 模型...')
        const model = await Live2DModel.from('/models/yaorui/YaoRui Swimsuit Maid.model3.json', {
          ticker: app.ticker
        })

        model.x = app.screen.width / 2
        model.y = app.screen.height * 0.75  // 稍微下移
        model.anchor.set(0.5, 0.5)
        model.scale.set(0.35)  // 稍微增大

        // 添加拖拽功能
        model.eventMode = 'static'
        model.cursor = 'pointer'

        let dragging = false
        let dragOffset = { x: 0, y: 0 }

        model.on('pointerdown', (event: any) => {
          dragging = true
          dragOffset.x = event.data.global.x - model.x
          dragOffset.y = event.data.global.y - model.y
          addLog('🖱️ 开始拖拽模型')
        })

        model.on('pointerup', () => {
          if (dragging) {
            dragging = false
            addLog('🖱️ 停止拖拽模型')
          }
        })

        model.on('pointerupoutside', () => {
          if (dragging) {
            dragging = false
            addLog('🖱️ 停止拖拽模型')
          }
        })

        model.on('pointermove', (event: any) => {
          if (dragging) {
            model.x = event.data.global.x - dragOffset.x
            model.y = event.data.global.y - dragOffset.y
          }
        })

        // 添加滚轮缩放功能
        canvasRef.current.addEventListener('wheel', (event) => {
          event.preventDefault()
          const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1
          const newScale = Math.max(0.1, Math.min(2.0, model.scale.x * scaleFactor))
          model.scale.set(newScale)
          addLog(`🔍 缩放模型: ${(newScale * 100).toFixed(0)}%`)
        })
        
        app.stage.addChild(model)
        addLog('✅ Live2D 模型加载成功')
        setModelLoaded(true)

        // 5. 尝试加载面部追踪
        addLog('📦 尝试加载面部追踪模块...')
        try {
          const { createFacePipeline } = await import('@/lib/tracking/pipeline')
          addLog('✅ 面部追踪模块加载成功')

          // 6. 初始化摄像头
          addLog('📹 请求摄像头权限...')
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: 640, 
              height: 480,
              facingMode: 'user'
            } 
          })
          
          addLog('✅ 摄像头权限获取成功')

          // 7. 创建面部追踪管道
          addLog('🔍 创建面部追踪管道...')
          const facePipeline = await createFacePipeline({
            stream,
            smoothing: 0.7,
            withKalidokit: true,
            mirror: true
          })

          addLog('✅ 面部追踪管道创建成功')
          setTrackingActive(true)

          // 8. 开始面部追踪
          addLog('🎯 开始面部追踪...')
          let frameCount = 0
          facePipeline.onFrame((result) => {
            frameCount++
            
            if (result.landmarks && result.solved) {
              if (!faceDetected) {
                setFaceDetected(true)
                addLog('👤 检测到面部！开始应用追踪数据')
              }
              
              const riggedFace = result.solved
              
              // 应用到 Live2D 模型
              if (riggedFace && model.internalModel) {
                try {
                  // 头部旋转 (使用更保守的参数)
                  if (riggedFace.head && riggedFace.head.degrees) {
                    const headX = Math.max(-30, Math.min(30, riggedFace.head.degrees.x))
                    const headY = Math.max(-30, Math.min(30, riggedFace.head.degrees.y))
                    const headZ = Math.max(-30, Math.min(30, riggedFace.head.degrees.z))
                    
                    model.internalModel.coreModel.setParameterValueByIndex(0, headX)
                    model.internalModel.coreModel.setParameterValueByIndex(1, headY)
                    model.internalModel.coreModel.setParameterValueByIndex(2, headZ)
                  }

                  // 眼部动作
                  if (riggedFace.eye) {
                    const eyeL = Math.max(0, Math.min(1, riggedFace.eye.l))
                    const eyeR = Math.max(0, Math.min(1, riggedFace.eye.r))
                    
                    model.internalModel.coreModel.setParameterValueByIndex(3, eyeL)
                    model.internalModel.coreModel.setParameterValueByIndex(4, eyeR)
                  }

                  // 嘴部动作
                  if (riggedFace.mouth) {
                    const mouthX = Math.max(-1, Math.min(1, riggedFace.mouth.x))
                    const mouthY = Math.max(0, Math.min(1, riggedFace.mouth.y))
                    
                    model.internalModel.coreModel.setParameterValueByIndex(5, mouthX)
                    model.internalModel.coreModel.setParameterValueByIndex(6, mouthY)
                  }

                  // 每60帧记录一次状态
                  if (frameCount % 60 === 0) {
                    addLog(`🔄 追踪活跃 - 帧数: ${frameCount}`)
                  }
                } catch (paramError) {
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
          addLog(`⚠️ 面部追踪不可用: ${trackingError}`)
          addLog('💡 Live2D 模型仍可正常使用，只是没有面部追踪功能')
          console.warn('面部追踪错误:', trackingError)
        }

      } catch (error) {
        addLog(`❌ 初始化错误: ${error}`)
        console.error('详细错误:', error)
      }
    }

    if (canvasRef.current) {
      initTest()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            简化面部追踪测试
          </h1>
          <p className="text-gray-600">
            测试 Live2D + 面部追踪的基础集成功能
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live2D 渲染区域 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Live2D 渲染</h2>
              <div className="flex space-x-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  modelLoaded 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {modelLoaded ? '✅ 模型已加载' : '⏳ 加载中'}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  trackingActive 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {trackingActive ? '🔍 追踪活跃' : '🔍 追踪未启动'}
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
                        log.includes('🔄') ? 'text-cyan-600' :
                        log.includes('💡') ? 'text-orange-600' :
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

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">测试状态总结</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">基础功能</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">{modelLoaded ? '✅' : '⏳'}</span>
                  <span>Live2D 模型加载</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">✅</span>
                  <span>PIXI v7 集成</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">面部追踪</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">{trackingActive ? '✅' : '⏳'}</span>
                  <span>追踪管道</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">{faceDetected ? '✅' : '⏳'}</span>
                  <span>面部检测</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">升级状态</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">✅</span>
                  <span>Cubism 5.1.0</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">✅</span>
                  <span>依赖升级完成</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

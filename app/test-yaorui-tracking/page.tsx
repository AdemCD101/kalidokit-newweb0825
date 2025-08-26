"use client"

import { useEffect, useRef, useState } from 'react'

export default function TestYaoRuiTrackingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [modelLoaded, setModelLoaded] = useState(false)
  const [trackingActive, setTrackingActive] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [parameterValues, setParameterValues] = useState<Record<string, number>>({})

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const initTest = async () => {
      try {
        addLog('🚀 开始 YaoRui 面部追踪测试...')
        
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

        // 3. 创建 PIXI 应用 (增加画框尺寸)
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

        // 4. 加载 YaoRui 模型
        addLog('🎭 加载 YaoRui 模型...')
        const model = await Live2DModel.from('/models/yaorui/YaoRui Swimsuit Maid.model3.json', {
          ticker: app.ticker
        })

        // 设置模型位置和缩放
        model.x = app.screen.width / 2
        model.y = app.screen.height * 0.75  // 稍微下移，确保头部可见
        model.anchor.set(0.5, 0.5)
        model.scale.set(0.3)  // 稍微增大缩放

        // 添加拖拽功能
        model.eventMode = 'static'  // PIXI v7 新语法
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
        addLog('✅ YaoRui 模型加载成功 (支持拖拽和缩放)')
        addLog('💡 提示: 拖拽模型调整位置，滚轮缩放大小')
        setModelLoaded(true)

        // 5. 加载面部追踪
        addLog('📦 加载面部追踪模块...')
        try {
          const { createFacePipeline } = await import('@/lib/tracking/pipeline')
          addLog('✅ 面部追踪模块加载成功')

          // 6. 初始化摄像头
          addLog('📹 初始化摄像头...')
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: 640, 
              height: 480,
              facingMode: 'user'
            } 
          })
          
          addLog('✅ 摄像头启动成功')

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
                  const core = model.internalModel.coreModel
                  const currentParams: Record<string, number> = {}

                  // 头部旋转
                  if (riggedFace.head && riggedFace.head.degrees) {
                    const headX = Math.max(-30, Math.min(30, riggedFace.head.degrees.x))
                    const headY = Math.max(-30, Math.min(30, riggedFace.head.degrees.y))
                    const headZ = Math.max(-30, Math.min(30, riggedFace.head.degrees.z))
                    
                    core.setParameterValueById('ParamAngleX', headY) // X=Yaw
                    core.setParameterValueById('ParamAngleY', headX) // Y=Pitch
                    core.setParameterValueById('ParamAngleZ', headZ) // Z=Roll
                    
                    currentParams['ParamAngleX'] = headY
                    currentParams['ParamAngleY'] = headX
                    currentParams['ParamAngleZ'] = headZ

                    // 身体旋转 (更小的幅度)
                    const bodyIntensity = 0.3
                    core.setParameterValueById('ParamBodyAngleX', headY * bodyIntensity)
                    core.setParameterValueById('ParamBodyAngleY', headX * bodyIntensity)
                    core.setParameterValueById('ParamBodyAngleZ', headZ * bodyIntensity)
                    
                    currentParams['ParamBodyAngleX'] = headY * bodyIntensity
                    currentParams['ParamBodyAngleY'] = headX * bodyIntensity
                    currentParams['ParamBodyAngleZ'] = headZ * bodyIntensity
                  }

                  // 眼部动作
                  if (riggedFace.eye) {
                    const eyeL = Math.max(0, Math.min(1, riggedFace.eye.l))
                    const eyeR = Math.max(0, Math.min(1, riggedFace.eye.r))
                    
                    core.setParameterValueById('ParamEyeLOpen', eyeL)
                    core.setParameterValueById('ParamEyeROpen', eyeR)
                    
                    currentParams['ParamEyeLOpen'] = eyeL
                    currentParams['ParamEyeROpen'] = eyeR
                  }

                  // 嘴部动作
                  if (riggedFace.mouth) {
                    const mouthX = Math.max(-1, Math.min(1, riggedFace.mouth.x))
                    const mouthY = Math.max(0, Math.min(1, riggedFace.mouth.y))
                    
                    core.setParameterValueById('ParamMouthForm', mouthX)
                    core.setParameterValueById('ParamMouthOpenY', mouthY)
                    
                    currentParams['ParamMouthForm'] = mouthX
                    currentParams['ParamMouthOpenY'] = mouthY
                  }

                  // 眼球移动
                  if (riggedFace.pupil) {
                    const pupilX = Math.max(-1, Math.min(1, riggedFace.pupil.x))
                    const pupilY = Math.max(-1, Math.min(1, riggedFace.pupil.y))
                    
                    core.setParameterValueById('ParamEyeBallX', pupilX)
                    core.setParameterValueById('ParamEyeBallY', pupilY)
                    
                    currentParams['ParamEyeBallX'] = pupilX
                    currentParams['ParamEyeBallY'] = pupilY
                  }

                  // 更新参数显示 (每30帧更新一次)
                  if (frameCount % 30 === 0) {
                    setParameterValues(currentParams)
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

          addLog('🎉 YaoRui 面部追踪测试完成！')
          
        } catch (trackingError) {
          addLog(`⚠️ 面部追踪不可用: ${trackingError}`)
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            YaoRui 面部追踪测试
          </h1>
          <p className="text-gray-600">
            测试 YaoRui 模型的完整面部追踪功能，包括头部、身体、眼部、嘴部动作
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Live2D 渲染区域 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">YaoRui 面部追踪</h2>
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

          {/* 参数监控 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">实时参数</h2>
            <div className="space-y-2 text-xs font-mono">
              {Object.entries(parameterValues).map(([param, value]) => (
                <div key={param} className="flex justify-between">
                  <span className="text-gray-600">{param}:</span>
                  <span className="text-blue-600">{value.toFixed(2)}</span>
                </div>
              ))}
              {Object.keys(parameterValues).length === 0 && (
                <div className="text-gray-500">等待参数数据...</div>
              )}
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
          <h2 className="text-xl font-semibold mb-4">功能验证清单</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">头部动作</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">🔄</span>
                  <span>ParamAngleX/Y/Z</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">👤</span>
                  <span>头部旋转追踪</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">身体动作</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">🔄</span>
                  <span>ParamBodyAngleX/Y/Z</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">💃</span>
                  <span>身体跟随头部</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">眼部动作</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">👁️</span>
                  <span>ParamEyeL/ROpen</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">👀</span>
                  <span>ParamEyeBallX/Y</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">嘴部动作</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">👄</span>
                  <span>ParamMouthForm</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">🗣️</span>
                  <span>ParamMouthOpenY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

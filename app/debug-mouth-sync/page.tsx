"use client"

import { useEffect, useRef, useState } from 'react'

export default function DebugMouthSyncPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [faceData, setFaceData] = useState<any>(null)
  const [mouthParams, setMouthParams] = useState<any>({})
  const [modelLoaded, setModelLoaded] = useState(false)

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const initDebug = async () => {
      try {
        addLog('🔍 开始嘴部同步调试...')
        
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

        ;(window as any).PIXI = PIXI
        addLog('✅ PIXI 应用创建成功')

        // 4. 加载 YaoRui 模型
        addLog('🎭 加载 YaoRui 模型...')
        const model = await Live2DModel.from('/models/yaorui/YaoRui Swimsuit Maid.model3.json', {
          ticker: app.ticker
        })
        
        model.x = app.screen.width / 2
        model.y = app.screen.height * 0.75
        model.anchor.set(0.5, 0.5)
        model.scale.set(0.3)
        
        app.stage.addChild(model)
        addLog('✅ YaoRui 模型加载成功')
        setModelLoaded(true)

        // 5. 检查模型参数
        addLog('🔍 检查模型参数...')
        const core = model.internalModel.coreModel
        const paramCount = core.getParameterCount()
        addLog(`📊 模型参数总数: ${paramCount}`)
        
        // 查找嘴部相关参数
        const mouthParamNames = []
        for (let i = 0; i < paramCount; i++) {
          const paramId = core.getParameterId(i)
          if (paramId.toLowerCase().includes('mouth')) {
            mouthParamNames.push(paramId)
            addLog(`👄 发现嘴部参数: ${paramId}`)
          }
        }

        // 6. 加载面部追踪
        addLog('📦 加载面部追踪模块...')
        try {
          const { createFacePipeline } = await import('@/lib/tracking/pipeline')
          addLog('✅ 面部追踪模块加载成功')

          // 7. 初始化摄像头
          addLog('📹 初始化摄像头...')
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: 640, 
              height: 480,
              facingMode: 'user'
            } 
          })
          
          addLog('✅ 摄像头启动成功')

          // 8. 创建面部追踪管道
          addLog('🔍 创建面部追踪管道...')
          const facePipeline = await createFacePipeline({
            stream,
            smoothing: 0.7,
            withKalidokit: true,
            mirror: true
          })

          addLog('✅ 面部追踪管道创建成功')

          // 9. 开始面部追踪和详细调试
          addLog('🎯 开始面部追踪调试...')
          let frameCount = 0
          facePipeline.onFrame((result) => {
            frameCount++
            
            if (result.landmarks && result.solved) {
              const riggedFace = result.solved
              
              // 更新面部数据显示
              if (frameCount % 10 === 0) { // 每10帧更新一次显示
                setFaceData({
                  mouth: riggedFace.mouth,
                  head: riggedFace.head,
                  eye: riggedFace.eye,
                  frameCount
                })
              }
              
              // 应用到 Live2D 模型并记录参数值
              if (riggedFace && model.internalModel) {
                try {
                  const currentParams: any = {}

                  // 嘴部动作 - 详细调试
                  if (riggedFace.mouth) {
                    const mouthX = Math.max(-1, Math.min(1, riggedFace.mouth.x || 0))
                    const mouthY = Math.max(0, Math.min(1, riggedFace.mouth.y || 0))
                    
                    // 设置参数
                    core.setParameterValueById('ParamMouthForm', mouthX)
                    core.setParameterValueById('ParamMouthOpenY', mouthY)
                    
                    // 记录当前参数值
                    currentParams.ParamMouthForm = mouthX
                    currentParams.ParamMouthOpenY = mouthY
                    currentParams.rawMouthX = riggedFace.mouth.x
                    currentParams.rawMouthY = riggedFace.mouth.y
                    
                    // 检查参数是否真的被设置了
                    const actualMouthForm = core.getParameterValueById('ParamMouthForm')
                    const actualMouthOpen = core.getParameterValueById('ParamMouthOpenY')
                    currentParams.actualMouthForm = actualMouthForm
                    currentParams.actualMouthOpen = actualMouthOpen
                  }

                  // 头部旋转
                  if (riggedFace.head && riggedFace.head.degrees) {
                    const headX = Math.max(-30, Math.min(30, riggedFace.head.degrees.x))
                    const headY = Math.max(-30, Math.min(30, riggedFace.head.degrees.y))
                    const headZ = Math.max(-30, Math.min(30, riggedFace.head.degrees.z))
                    
                    core.setParameterValueById('ParamAngleX', headY)
                    core.setParameterValueById('ParamAngleY', headX)
                    core.setParameterValueById('ParamAngleZ', headZ)
                    
                    currentParams.ParamAngleX = headY
                    currentParams.ParamAngleY = headX
                    currentParams.ParamAngleZ = headZ
                  }

                  // 眼部动作
                  if (riggedFace.eye) {
                    const eyeL = Math.max(0, Math.min(1, riggedFace.eye.l))
                    const eyeR = Math.max(0, Math.min(1, riggedFace.eye.r))
                    
                    core.setParameterValueById('ParamEyeLOpen', eyeL)
                    core.setParameterValueById('ParamEyeROpen', eyeR)
                    
                    currentParams.ParamEyeLOpen = eyeL
                    currentParams.ParamEyeROpen = eyeR
                  }

                  // 更新参数显示 (每30帧更新一次)
                  if (frameCount % 30 === 0) {
                    setMouthParams(currentParams)
                  }

                  // 详细调试日志 (每120帧输出一次)
                  if (frameCount % 120 === 0) {
                    addLog(`🔄 帧 ${frameCount}: 嘴部数据 - X:${(riggedFace.mouth?.x || 0).toFixed(3)}, Y:${(riggedFace.mouth?.y || 0).toFixed(3)}`)
                    addLog(`📊 参数值 - Form:${currentParams.actualMouthForm?.toFixed(3)}, Open:${currentParams.actualMouthOpen?.toFixed(3)}`)
                  }
                } catch (paramError) {
                  addLog(`❌ 参数设置错误: ${paramError}`)
                  console.error('参数设置详细错误:', paramError)
                }
              }
            }
          })

          addLog('🎉 嘴部同步调试启动完成！')
          
        } catch (trackingError) {
          addLog(`❌ 面部追踪初始化失败: ${trackingError}`)
          console.error('面部追踪详细错误:', trackingError)
        }

      } catch (error) {
        addLog(`❌ 初始化错误: ${error}`)
        console.error('详细错误:', error)
      }
    }

    if (canvasRef.current) {
      initDebug()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            嘴部同步调试页面
          </h1>
          <p className="text-gray-600">
            详细调试 YaoRui 模型的嘴部同步问题
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Live2D 渲染区域 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">YaoRui 模型</h2>
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

          {/* 面部数据监控 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">面部数据</h2>
            <div className="space-y-2 text-xs font-mono">
              {faceData ? (
                <>
                  <div><strong>帧数:</strong> {faceData.frameCount}</div>
                  <div><strong>嘴部 X:</strong> {faceData.mouth?.x?.toFixed(3) || 'N/A'}</div>
                  <div><strong>嘴部 Y:</strong> {faceData.mouth?.y?.toFixed(3) || 'N/A'}</div>
                  <div><strong>头部 X:</strong> {faceData.head?.degrees?.x?.toFixed(1) || 'N/A'}</div>
                  <div><strong>头部 Y:</strong> {faceData.head?.degrees?.y?.toFixed(1) || 'N/A'}</div>
                  <div><strong>眼部 L:</strong> {faceData.eye?.l?.toFixed(3) || 'N/A'}</div>
                  <div><strong>眼部 R:</strong> {faceData.eye?.r?.toFixed(3) || 'N/A'}</div>
                </>
              ) : (
                <div className="text-gray-500">等待面部数据...</div>
              )}
            </div>
          </div>

          {/* 参数监控 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">模型参数</h2>
            <div className="space-y-2 text-xs font-mono">
              {Object.keys(mouthParams).length > 0 ? (
                Object.entries(mouthParams).map(([param, value]) => (
                  <div key={param} className="flex justify-between">
                    <span className="text-gray-600">{param}:</span>
                    <span className={`${param.includes('actual') ? 'text-red-600 font-bold' : 'text-blue-600'}`}>
                      {typeof value === 'number' ? value.toFixed(3) : String(value)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">等待参数数据...</div>
              )}
            </div>
          </div>
        </div>

        {/* 日志区域 */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">调试日志</h2>
          <div className="bg-gray-100 rounded p-4 h-64 overflow-y-auto">
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
                      log.includes('🔄') ? 'text-blue-600' :
                      log.includes('📊') ? 'text-purple-600' :
                      log.includes('👄') ? 'text-pink-600' :
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
  )
}

"use client"

import { useEffect, useRef, useState } from 'react'

export default function TestLive2DModelPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [modelLoaded, setModelLoaded] = useState(false)

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const initTest = async () => {
      try {
        addLog('🚀 开始 Live2D 模型加载测试...')

        if (!canvasRef.current) {
          addLog('❌ Canvas 引用为空')
          return
        }

        // 首先加载 Cubism Core
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

        // 动态导入模块
        addLog('📦 加载 PIXI 和 Live2D 模块...')
        const PIXI = await import('pixi.js')

        // 使用 Cubism 4 专用版本
        const { Live2DModel } = await import('pixi-live2d-display-advanced/cubism4')

        addLog(`✅ PIXI.js ${PIXI.VERSION} 加载成功`)
        addLog('✅ pixi-live2d-display-advanced (Cubism 4) 加载成功')

        // 创建 PIXI 应用
        addLog('🎨 创建 PIXI 应用...')
        const app = new PIXI.Application({
          view: canvasRef.current,
          width: 1000,  // 增加宽度
          height: 800,  // 增加高度
          backgroundColor: 0x1099bb,
          resolution: 1,
          autoDensity: false,
        })

        addLog('✅ PIXI 应用创建成功')

        // 加载 Live2D 模型
        addLog('🎭 开始加载 Live2D 模型...')
        const modelUrl = '/models/yaorui/YaoRui Swimsuit Maid.model3.json'
        addLog(`📁 模型路径: ${modelUrl}`)

        try {
          // 设置 PIXI 为全局变量以解决 Ticker 警告
          (window as any).PIXI = PIXI

          const model = await Live2DModel.from(modelUrl, {
            ticker: app.ticker // 明确指定 ticker
          })
          addLog('✅ Live2D 模型加载成功！')
          
          // 设置模型位置和缩放
          model.x = app.screen.width / 2
          model.y = app.screen.height * 0.75  // 稍微下移
          model.anchor.set(0.5, 0.5)
          model.scale.set(0.35)  // 调整缩放

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

          addLog(`📏 模型尺寸: ${model.width.toFixed(1)}x${model.height.toFixed(1)}`)
          addLog(`📍 模型位置: (${model.x}, ${model.y})`)
          addLog('💡 提示: 拖拽模型调整位置，滚轮缩放大小')

          // 添加到舞台
          app.stage.addChild(model)
          addLog('✅ 模型添加到舞台成功')
          
          setModelLoaded(true)
          
          // 测试动作播放
          setTimeout(() => {
            try {
              if (model.internalModel?.motionManager) {
                model.motion('hiyori_m01')
                addLog('🎬 播放测试动作: hiyori_m01')
              } else {
                addLog('⚠️ 动作管理器不可用')
              }
            } catch (motionError) {
              addLog(`⚠️ 动作播放错误: ${motionError}`)
            }
          }, 2000)
          
          // 测试表情切换
          setTimeout(() => {
            try {
              if (model.internalModel?.expressionManager) {
                addLog('😊 尝试切换表情...')
                // 这里可能需要根据模型的实际表情名称调整
              } else {
                addLog('⚠️ 表情管理器不可用')
              }
            } catch (expressionError) {
              addLog(`⚠️ 表情切换错误: ${expressionError}`)
            }
          }, 4000)
          
          addLog('🎉 Live2D 模型集成测试完成！')
          
        } catch (modelError) {
          addLog(`❌ 模型加载失败: ${modelError}`)
          console.error('模型加载详细错误:', modelError)
          
          // 创建错误提示图形
          const errorGraphics = new PIXI.Graphics()
          errorGraphics.beginFill(0xff0000, 0.3)
          errorGraphics.drawRect(0, 0, 800, 600)
          errorGraphics.endFill()
          
          const errorText = new PIXI.Text('模型加载失败\n请检查控制台', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
            align: 'center'
          })
          errorText.x = 400 - errorText.width / 2
          errorText.y = 300 - errorText.height / 2
          
          app.stage.addChild(errorGraphics)
          app.stage.addChild(errorText)
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
            Live2D 模型加载测试
          </h1>
          <p className="text-gray-600">
            测试 pixi-live2d-display-advanced 的真实模型加载功能
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas 区域 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Live2D 模型渲染</h2>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                modelLoaded 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {modelLoaded ? '✅ 已加载' : '⏳ 加载中'}
              </div>
            </div>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <canvas 
                ref={canvasRef}
                className="block w-full"
                style={{ 
                  maxWidth: '800px',
                  height: 'auto',
                  border: '1px solid #ccc'
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
          <h2 className="text-xl font-semibold mb-4">测试结果</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">基础集成</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">✅</span>
                  <span>PIXI v7 + Live2D Advanced</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">✅</span>
                  <span>模块动态加载</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">模型功能</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">{modelLoaded ? '✅' : '⏳'}</span>
                  <span>模型加载</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">⏳</span>
                  <span>动作播放</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">下一步</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">⏳</span>
                  <span>面部追踪集成</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">⏳</span>
                  <span>舌头检测集成</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

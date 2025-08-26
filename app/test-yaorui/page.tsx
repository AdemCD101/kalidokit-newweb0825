"use client"

import { useEffect, useRef, useState } from 'react'

export default function TestYaoRuiPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [modelLoaded, setModelLoaded] = useState(false)
  const [currentExpression, setCurrentExpression] = useState<string>('默认')
  const [availableExpressions, setAvailableExpressions] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const initTest = async () => {
      try {
        addLog('🚀 开始 YaoRui 模型测试...')
        
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

        // 4. 加载 YaoRui 模型
        addLog('🎭 加载 YaoRui Swimsuit Maid 模型...')
        const model = await Live2DModel.from('/models/yaorui/YaoRui Swimsuit Maid.model3.json', {
          ticker: app.ticker
        })

        model.x = app.screen.width / 2
        model.y = app.screen.height * 0.75  // 稍微下移
        model.anchor.set(0.5, 0.5)
        model.scale.set(0.3) // 稍微增大缩放

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
        addLog('✅ YaoRui 模型加载成功')
        addLog(`📏 模型尺寸: ${model.width.toFixed(1)}x${model.height.toFixed(1)}`)
        setModelLoaded(true)

        // 5. 获取可用表情列表
        try {
          if (model.internalModel && model.internalModel.settings) {
            const expressions = model.internalModel.settings.expressions || []
            const expressionNames = expressions.map((exp: any) => exp.name || exp.Name || '未知表情')
            setAvailableExpressions(expressionNames)
            addLog(`😊 发现 ${expressionNames.length} 个表情: ${expressionNames.join(', ')}`)
          } else {
            addLog('⚠️ 无法获取表情列表')
          }
        } catch (expError) {
          addLog(`⚠️ 表情列表获取错误: ${expError}`)
        }

        // 6. 测试动作播放
        setTimeout(() => {
          try {
            if (model.internalModel?.motionManager) {
              // 尝试播放一个随机动作
              const motions = model.internalModel.settings?.motions
              if (motions && Object.keys(motions).length > 0) {
                const motionGroup = Object.keys(motions)[0]
                model.motion(motionGroup)
                addLog(`🎬 播放动作组: ${motionGroup}`)
              } else {
                addLog('⚠️ 未找到可用动作')
              }
            } else {
              addLog('⚠️ 动作管理器不可用')
            }
          } catch (motionError) {
            addLog(`⚠️ 动作播放错误: ${motionError}`)
          }
        }, 2000)

        // 7. 设置表情切换功能
        ;(window as any).changeExpression = (expressionName: string) => {
          try {
            if (model.internalModel?.expressionManager) {
              model.expression(expressionName)
              setCurrentExpression(expressionName)
              addLog(`😊 切换表情: ${expressionName}`)
            } else {
              addLog('⚠️ 表情管理器不可用')
            }
          } catch (expError) {
            addLog(`⚠️ 表情切换错误: ${expError}`)
          }
        }

        addLog('🎉 YaoRui 模型测试完成！')

      } catch (error) {
        addLog(`❌ 初始化错误: ${error}`)
        console.error('详细错误:', error)
      }
    }

    if (canvasRef.current) {
      initTest()
    }
  }, [])

  const handleExpressionChange = (expressionName: string) => {
    ;(window as any).changeExpression?.(expressionName)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            YaoRui Swimsuit Maid 模型测试
          </h1>
          <p className="text-gray-600">
            测试新的默认模型 - YaoRui Swimsuit Maid
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live2D 渲染区域 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">YaoRui 模型渲染</h2>
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
                  height: 'auto'
                }}
              />
            </div>

            {/* 表情控制 */}
            {availableExpressions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">表情控制</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleExpressionChange('')}
                    className={`px-3 py-1 text-xs rounded ${
                      currentExpression === '默认' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    默认
                  </button>
                  {availableExpressions.map((exp, index) => (
                    <button
                      key={index}
                      onClick={() => handleExpressionChange(exp)}
                      className={`px-3 py-1 text-xs rounded ${
                        currentExpression === exp 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  当前表情: {currentExpression}
                </p>
              </div>
            )}
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
                        log.includes('😊') ? 'text-pink-600' :
                        log.includes('🎬') ? 'text-indigo-600' :
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
          <h2 className="text-xl font-semibold mb-4">模型信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">基础信息</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">🎭</span>
                  <span>YaoRui Swimsuit Maid</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">📁</span>
                  <span>Cubism 4 格式</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">🖼️</span>
                  <span>4096x4096 高清纹理</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">功能特性</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">😊</span>
                  <span>{availableExpressions.length} 个表情</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">🎬</span>
                  <span>动作支持</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">⚡</span>
                  <span>物理效果</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">技术规格</h3>
              <div className="space-y-1">
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">✅</span>
                  <span>PIXI v7 兼容</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">✅</span>
                  <span>Cubism 5.1.0</span>
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">✅</span>
                  <span>面部追踪就绪</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

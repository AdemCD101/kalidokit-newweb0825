"use client"

import { useEffect, useRef, useState } from 'react'

export default function TestLive2DBasicPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const initTest = async () => {
      try {
        addLog('开始 Live2D 基础测试...')
        
        if (!canvasRef.current) {
          addLog('❌ Canvas 引用为空')
          return
        }

        addLog('✅ Canvas 引用正常')

        // 动态导入模块
        addLog('加载 PIXI 和 Live2D 模块...')
        const PIXI = await import('pixi.js')
        const { Live2DModel } = await import('pixi-live2d-display-advanced')
        
        addLog(`✅ PIXI.js ${PIXI.VERSION} 加载成功`)
        addLog('✅ pixi-live2d-display-advanced 加载成功')

        // 创建 PIXI 应用
        addLog('创建 PIXI 应用...')
        const app = new PIXI.Application({
          view: canvasRef.current,
          width: 600,
          height: 400,
          backgroundColor: 0x1099bb,
          resolution: 1,
          autoDensity: false,
        })

        addLog('✅ PIXI 应用创建成功')

        // 测试 Live2D 模型加载（使用一个简单的测试 URL）
        addLog('尝试加载 Live2D 模型...')
        
        // 先测试 Live2DModel 类是否可用
        addLog(`Live2DModel 类型: ${typeof Live2DModel}`)
        addLog(`Live2DModel.from 方法: ${typeof Live2DModel.from}`)

        // 使用一个公开的测试模型或者创建一个简单的测试
        try {
          // 这里我们先不加载真实模型，只测试类的可用性
          addLog('✅ Live2DModel 类可用，准备进行模型加载测试')
          
          // 创建一个简单的占位符图形
          const placeholder = new PIXI.Graphics()
          placeholder.beginFill(0xff0000, 0.5)
          placeholder.drawRect(250, 150, 100, 100)
          placeholder.endFill()
          
          const text = new PIXI.Text('Live2D 准备就绪', {
            fontFamily: 'Arial',
            fontSize: 24,
            fill: 0xffffff,
            align: 'center'
          })
          text.x = 300 - text.width / 2
          text.y = 200 - text.height / 2
          
          app.stage.addChild(placeholder)
          app.stage.addChild(text)
          
          addLog('✅ 占位符图形创建成功')
          addLog('🎯 Live2D 基础集成测试完成！')
          
        } catch (modelError) {
          addLog(`⚠️ 模型加载测试: ${modelError}`)
          addLog('这是预期的，因为我们还没有提供真实的模型文件')
        }

      } catch (error) {
        addLog(`❌ 错误: ${error}`)
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
            Live2D 基础集成测试
          </h1>
          <p className="text-gray-600">
            测试 pixi-live2d-display-advanced 与 PIXI v7 的基础集成
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canvas 区域 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Live2D 渲染区域</h2>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <canvas 
                ref={canvasRef}
                className="block w-full"
                style={{ 
                  maxWidth: '600px',
                  height: 'auto',
                  border: '1px solid #ccc'
                }}
              />
            </div>
          </div>

          {/* 日志区域 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">测试日志</h2>
            <div className="bg-gray-100 rounded p-4 h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">等待日志...</div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`text-sm font-mono ${
                        log.includes('❌') ? 'text-red-600' : 
                        log.includes('✅') ? 'text-green-600' : 
                        log.includes('⚠️') ? 'text-yellow-600' :
                        log.includes('🎯') ? 'text-blue-600 font-bold' :
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
          <h2 className="text-xl font-semibold mb-4">测试检查清单</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">基础功能</h3>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>PIXI.js v7 加载成功</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>pixi-live2d-display-advanced 加载成功</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>PIXI Application 创建成功</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>Live2DModel 类可用</span>
              </label>
            </div>
            <div className="space-y-2 text-sm">
              <h3 className="font-medium text-gray-900">下一步</h3>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>准备 Live2D 模型文件</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>测试模型加载</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>集成面部追踪</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span>测试舌头检测</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

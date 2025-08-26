"use client"

import { useEffect, useRef, useState } from 'react'

export default function DebugPixiPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const initTest = async () => {
      try {
        addLog('开始初始化...')
        
        if (!canvasRef.current) {
          addLog('❌ Canvas 引用为空')
          return
        }

        addLog('✅ Canvas 引用正常')
        addLog(`Canvas 尺寸: ${canvasRef.current.width}x${canvasRef.current.height}`)

        // 动态导入 PIXI
        addLog('加载 PIXI.js...')
        const PIXI = await import('pixi.js')
        addLog(`✅ PIXI.js ${PIXI.VERSION} 加载成功`)

        // 创建应用
        addLog('创建 PIXI 应用...')
        const app = new PIXI.Application({
          view: canvasRef.current,
          width: 400,
          height: 300,
          backgroundColor: 0x1099bb,
          resolution: 1,
          autoDensity: false,
        })

        addLog('✅ PIXI 应用创建成功')
        addLog(`应用尺寸: ${app.screen.width}x${app.screen.height}`)
        addLog(`Canvas 实际尺寸: ${canvasRef.current.width}x${canvasRef.current.height}`)

        // 创建简单图形
        addLog('创建图形...')
        const graphics = new PIXI.Graphics()
        
        // 绘制一个简单的矩形先测试
        graphics.beginFill(0xff0000, 1)
        graphics.drawRect(50, 50, 100, 100)
        graphics.endFill()
        
        addLog('✅ 图形创建完成')
        
        app.stage.addChild(graphics)
        addLog(`✅ 图形添加到舞台，舞台子元素数量: ${app.stage.children.length}`)

        // 手动渲染
        app.render()
        addLog('✅ 手动渲染完成')

        // 添加动画
        let frameCount = 0
        app.ticker.add((ticker) => {
          frameCount++
          graphics.rotation += 0.01
          
          if (frameCount % 60 === 0) {
            addLog(`动画运行中... 帧数: ${frameCount}, 旋转: ${graphics.rotation.toFixed(2)}`)
          }
        })

        addLog('✅ 动画启动')

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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PIXI.js 调试页面
          </h1>
          <p className="text-gray-600">
            详细调试 PIXI.js 渲染问题
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canvas 区域 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">渲染区域</h2>
            <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
              <canvas 
                ref={canvasRef}
                className="block"
                style={{ 
                  width: '400px', 
                  height: '300px',
                  border: '1px solid red' // 添加红色边框便于调试
                }}
              />
            </div>
          </div>

          {/* 日志区域 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">调试日志</h2>
            <div className="bg-gray-100 rounded p-4 h-80 overflow-y-auto">
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

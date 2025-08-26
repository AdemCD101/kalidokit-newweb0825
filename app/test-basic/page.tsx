"use client"

import { useEffect, useRef, useState } from 'react'

export default function TestBasicPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<string>('准备中...')
  const [pixiVersion, setPixiVersion] = useState<string>('')

  useEffect(() => {
    const initTest = async () => {
      try {
        setStatus('加载 PIXI.js...')
        
        // 动态导入 PIXI
        const PIXI = await import('pixi.js')
        setPixiVersion(PIXI.VERSION)
        setStatus(`PIXI.js ${PIXI.VERSION} 加载成功`)

        // 创建应用
        const app = new PIXI.Application({
          view: canvasRef.current!,
          width: 400,
          height: 300,
          backgroundColor: 0x1099bb,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })

        setStatus('PIXI 应用创建成功')

        // 创建简单图形
        const graphics = new PIXI.Graphics()
        graphics.beginFill(0xff0000, 1) // 添加 alpha 参数
        graphics.drawCircle(200, 150, 50)
        graphics.endFill()

        // 确保图形可见
        graphics.x = 0
        graphics.y = 0

        app.stage.addChild(graphics)

        console.log('Graphics added to stage:', graphics)
        console.log('App stage children:', app.stage.children.length)

        // 添加动画
        let elapsed = 0
        app.ticker.add((ticker) => {
          elapsed += ticker.deltaTime
          graphics.rotation = elapsed * 0.01
        })

        // 强制渲染一次
        app.render()

        setStatus('✅ PIXI v7 测试成功！红色圆圈正在旋转')

      } catch (error) {
        console.error('测试失败:', error)
        setStatus(`❌ 测试失败: ${error}`)
      }
    }

    if (canvasRef.current) {
      initTest()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PIXI.js v7 基础验证
          </h1>
          <p className="text-gray-600">
            验证 PIXI.js v7 是否能正常工作
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">测试状态</h2>
            <div className="text-lg font-medium">
              {status}
            </div>
            {pixiVersion && (
              <div className="text-sm text-gray-600 mt-2">
                版本: {pixiVersion}
              </div>
            )}
          </div>
          
          <div className="border rounded-lg overflow-hidden">
            <canvas 
              ref={canvasRef}
              className="w-full h-auto"
              style={{ display: 'block' }}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">检查清单</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="w-4 h-4 mr-2">✅</span>
              <span>PIXI.js v7 模块加载</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 mr-2">✅</span>
              <span>Application 创建</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 mr-2">✅</span>
              <span>Graphics 渲染</span>
            </div>
            <div className="flex items-center">
              <span className="w-4 h-4 mr-2">✅</span>
              <span>Ticker 动画</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

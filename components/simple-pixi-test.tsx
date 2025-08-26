"use client"

import { useEffect, useRef, useState } from 'react'

interface SimplePixiTestProps {
  active?: boolean
}

export default function SimplePixiTest({ active = true }: SimplePixiTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<any>(null)
  const [status, setStatus] = useState<string>('初始化中...')
  const [error, setError] = useState<string | null>(null)
  const [pixiVersion, setPixiVersion] = useState<string>('')

  useEffect(() => {
    if (!active || !canvasRef.current) return

    const initPixi = async () => {
      try {
        setStatus('加载 PIXI 模块...')
        
        // 动态加载 PIXI 模块
        const PIXI = await import('pixi.js')
        setPixiVersion(PIXI.VERSION)
        
        setStatus('创建 PIXI 应用...')

        // 创建 PIXI 应用 (v7 语法)
        const app = new PIXI.Application({
          view: canvasRef.current!,
          width: 400,
          height: 300,
          backgroundColor: 0x1099bb,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })

        appRef.current = app
        setStatus('PIXI 应用创建成功')

        // 创建一个简单的图形来测试
        const graphics = new PIXI.Graphics()
        graphics.beginFill(0xff0000)
        graphics.drawCircle(200, 150, 50)
        graphics.endFill()
        
        app.stage.addChild(graphics)

        // 添加一些动画
        let elapsed = 0
        app.ticker.add((ticker) => {
          elapsed += ticker.deltaTime
          graphics.rotation = elapsed * 0.01
        })

        setStatus('PIXI v7 测试成功！红色圆圈正在旋转')
        setError(null)

      } catch (appError) {
        console.error('PIXI 初始化失败:', appError)
        setError(`PIXI 初始化失败: ${appError}`)
        setStatus('PIXI 初始化失败')
      }
    }

    initPixi()

    // 清理函数
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, true)
        appRef.current = null
      }
    }
  }, [active])

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-gray-100 p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">PIXI.js v7 基础测试</h3>
        <div className="flex flex-col gap-2">
          <div className="text-sm">
            <span className="font-medium">状态:</span> 
            <span className={error ? 'text-red-600' : 'text-green-600'}>{status}</span>
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              <span className="font-medium">错误:</span> {error}
            </div>
          )}
          <div className="text-xs text-gray-600">
            PIXI.js: {pixiVersion || '加载中...'}
          </div>
        </div>
      </div>
      <div className="flex-1 bg-gray-200 rounded-b-lg overflow-hidden">
        <canvas 
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  )
}

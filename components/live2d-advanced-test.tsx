"use client"

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

// 动态导入 PIXI 相关模块，避免 SSR 问题
const loadPixiModules = async () => {
  const PIXI = await import('pixi.js')
  const { Live2DModel } = await import('pixi-live2d-display-advanced')
  return { PIXI, Live2DModel }
}

interface Live2DAdvancedTestProps {
  active?: boolean
}

export default function Live2DAdvancedTest({ active = true }: Live2DAdvancedTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<any>(null)
  const modelRef = useRef<any>(null)
  const [status, setStatus] = useState<string>('初始化中...')
  const [error, setError] = useState<string | null>(null)
  const [pixiVersion, setPixiVersion] = useState<string>('')

  useEffect(() => {
    if (!active || !canvasRef.current) return

    const initPixi = async () => {
      try {
        setStatus('加载 PIXI 模块...')

        // 动态加载 PIXI 模块
        const { PIXI, Live2DModel } = await loadPixiModules()
        setPixiVersion(PIXI.VERSION)

        setStatus('创建 PIXI 应用...')

        // 创建 PIXI 应用 (v7 语法)
        const app = new PIXI.Application({
          view: canvasRef.current!,
          width: 800,
          height: 600,
          backgroundColor: 0x1099bb,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        })

        appRef.current = app
        setStatus('PIXI 应用创建成功')

        // 加载 Live2D 模型
        setStatus('加载 Live2D 模型...')

        // 使用一个公开的测试模型 URL
        const modelUrl = '/models/hiyori/hiyori_pro_t10.model3.json'

        try {
          const model = await Live2DModel.from(modelUrl)
          modelRef.current = model

          // 设置模型位置和缩放
          model.x = app.screen.width / 2
          model.y = app.screen.height / 2
          model.anchor.set(0.5, 0.5)
          model.scale.set(0.3)

          // 添加到舞台
          app.stage.addChild(model)

          setStatus('Live2D 模型加载成功！')
          setError(null)

          // 测试基本动作
          setTimeout(() => {
            if (model.internalModel.motionManager) {
              model.motion('tap_body')
              setStatus('Live2D 模型加载成功！(已播放测试动作)')
            }
          }, 1000)

        } catch (modelError) {
          console.error('模型加载失败:', modelError)
          setError(`模型加载失败: ${modelError}`)
          setStatus('模型加载失败')
        }

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
      if (modelRef.current) {
        modelRef.current = null
      }
    }
  }, [active])

  const testMotion = () => {
    if (modelRef.current?.internalModel.motionManager) {
      modelRef.current.motion('tap_body')
      setStatus('播放测试动作: tap_body')
    }
  }

  const testExpression = () => {
    if (modelRef.current?.internalModel.expressionManager) {
      modelRef.current.expression('f02')
      setStatus('播放测试表情: f02')
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="bg-gray-100 p-4 rounded-t-lg">
        <h3 className="text-lg font-semibold mb-2">pixi-live2d-display-advanced 测试</h3>
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
          <div className="flex gap-2">
            <button 
              onClick={testMotion}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              disabled={!modelRef.current}
            >
              测试动作
            </button>
            <button 
              onClick={testExpression}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              disabled={!modelRef.current}
            >
              测试表情
            </button>
          </div>
          <div className="text-xs text-gray-600">
            PIXI.js: {pixiVersion || '加载中...'} | pixi-live2d-display-advanced: 0.5.4
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

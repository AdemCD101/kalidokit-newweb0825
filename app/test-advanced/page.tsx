"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'

// 动态导入组件，禁用 SSR
const Live2DAdvancedTest = dynamic(() => import('@/components/live2d-advanced-test'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">加载 Live2D 组件中...</div>
})

export default function TestAdvancedPage() {
  const [active, setActive] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            pixi-live2d-display-advanced 升级测试
          </h1>
          <p className="text-gray-600">
            测试新版本的基本功能：模型加载、动作播放、表情切换
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">升级信息</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">当前版本 (vendor)</h3>
              <ul className="text-gray-600 space-y-1">
                <li>• PIXI.js: 5.1.3</li>
                <li>• pixi-live2d-display: 0.3.1</li>
                <li>• Live2D Core: Cubism 4</li>
                <li>• 状态: 生产环境使用</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">新版本 (npm)</h3>
              <ul className="text-gray-600 space-y-1">
                <li>• PIXI.js: 7.4.3</li>
                <li>• pixi-live2d-display-advanced: 0.5.4</li>
                <li>• Live2D Core: Cubism 4</li>
                <li>• 状态: 测试中</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Live2D 测试画布</h2>
              <button
                onClick={() => setActive(!active)}
                className={`px-4 py-2 rounded font-medium ${
                  active 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {active ? '停止' : '启动'}
              </button>
            </div>
          </div>
          
          <div className="h-[600px]">
            <Live2DAdvancedTest active={active} />
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">测试检查清单</h2>
          <div className="space-y-2 text-sm">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span>PIXI.js v7 应用创建成功</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span>Live2D 模型加载成功</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span>模型正确显示在画布中</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span>动作播放功能正常</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span>表情切换功能正常</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span>无控制台错误</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span>性能表现良好</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

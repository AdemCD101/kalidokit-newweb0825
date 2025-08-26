"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'

// 动态导入组件，禁用 SSR
const SimplePixiTest = dynamic(() => import('@/components/simple-pixi-test'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">加载 PIXI 组件中...</div>
})

export default function TestPixiPage() {
  const [active, setActive] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            PIXI.js v7 基础测试
          </h1>
          <p className="text-gray-600">
            验证 PIXI.js v7 是否能正常工作
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">PIXI 测试画布</h2>
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
          
          <div className="h-[400px]">
            <SimplePixiTest active={active} />
          </div>
        </div>
      </div>
    </div>
  )
}

"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import SiteShell from "@/components/site-shell"

export default function Page() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-b from-zinc-900 to-black text-white">
        <div className="px-6 py-16 md:px-12 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              用浏览器开启你的 VTuber 直播工作台
            </h1>
            <p className="mt-4 text-zinc-300">
              无需打开桌面应用，直接在网页完成人脸/肢体捕捉并驱动模型。支持订阅制与工作流程管理。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/studio">立即体验 Studio</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                <Link href="/pricing">查看定价</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>即开即用</CardTitle>
            <CardDescription>浏览器授权摄像头，实时捕捉并驱动模型。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              后续可接入 Kalidokit/MediaPipe，实现面部/姿态/手部三通道。
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>创作者友好</CardTitle>
            <CardDescription>模型库、预设、校准向导，快速上手。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              支持导入常见 Live2D 资源格式（占位），后续完善校验与转换流程。
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>订阅制</CardTitle>
            <CardDescription>Free / Creator / Pro Studio，随需升级。</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              先用前端模拟订阅状态，后续对接支付与鉴权服务。
            </p>
          </CardContent>
        </Card>
      </section>
    </SiteShell>
  )
}

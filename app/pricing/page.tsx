"use client"

import SiteShell from "@/components/site-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

function Tier({
  title,
  price,
  desc,
  features,
  cta,
  highlight = false,
  note,
}: {
  title: string
  price: string
  desc?: string
  features: string[]
  cta: string
  highlight?: boolean
  note?: string
}) {
  return (
    <Card className={cn(highlight && "border-emerald-500")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {highlight && <Badge variant="outline">推荐</Badge>}
        </div>
        {desc && <CardDescription>{desc}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{price}</div>
        {note && <div className="mt-1 text-xs text-muted-foreground">{note}</div>}
        <ul className="mt-4 space-y-2 text-sm">
          {features.map((f) => (
            <li key={f} className="text-muted-foreground">
              • {f}
            </li>
          ))}
        </ul>
        <Button className="mt-6 w-full" asChild>
          <Link href="/dashboard">{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export default function Page() {
  return (
    <SiteShell>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">定价</h1>
          <p className="text-sm text-muted-foreground mt-1">根据创作周期选择最适合你的方案</p>
        </div>
        <Badge variant="outline" className="text-xs">
          前端演示 · 订阅流程在 /dashboard 内模拟
        </Badge>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Tier
          title="试用会员"
          price="免费 / 3 天"
          desc="注册即享 3 天完整试用"
          features={[
            "3 天完整试用",
            "试用期可使用月卡会员资格模型",
            "用于功能体验与环境检测",
            "无需绑定支付，随时升级",
          ]}
          cta="开始试用"
        />

        <Tier
          title="月卡会员"
          price="¥98 / 月"
          desc="每日约 ¥2.8"
          features={["畅用会员模型", "无限使用月卡会员资格模型", "支持直播和视频制作", "每月持续更新"]}
          cta="订阅月卡"
        />

        <Tier
          title="季度会员"
          price="¥198 / 季度"
          desc="每月约 ¥66（7.8 折），每日约 ¥2.2"
          features={["包含月卡会员中的所有权益", "可使用季度会员专属模型"]}
          cta="订阅季度"
        />

        <Tier
          title="年度会员"
          price="¥588 / 年"
          desc="每月约 ¥49（5.9 折），每日约 ¥1.6"
          features={["包含专业会员中的所有权益", "可使用年度会员专属模型", "新模型提前使用"]}
          cta="订阅年度"
          highlight
        />
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>计划选择建议</CardTitle>
            <CardDescription>根据你的创作频率与规模，选择对应计划</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• 初次体验与环境调试：选择「试用会员」，确认设备兼容与流程是否顺畅。</p>
            <p>• 短期创作或阶段性直播：选择「月卡会员」，灵活按月使用。</p>
            <p>• 稳定创作与更新：选择「季度会员」，折扣更优，包含季度专属模型。</p>
            <p>• 高频直播与长期制作：选择「年度会员」，性价比最高，享年度专属模型与新模型提前使用。</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>常见问题</CardTitle>
            <CardDescription>关于权限、生效与取消</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <div>
              <div className="font-medium text-foreground">订阅何时生效？</div>
              <div>支付完成后立即生效，可立刻使用对应模型与功能。</div>
            </div>
            <div>
              <div className="font-medium text-foreground">可以随时取消吗？</div>
              <div>支持随时取消自动续订；已支付周期仍可继续使用至到期。</div>
            </div>
            <div>
              <div className="font-medium text-foreground">试用期结束如何续用？</div>
              <div>随时在本页或「仪表盘/订阅」中升级为月卡/季度/年度会员。</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteShell>
  )
}

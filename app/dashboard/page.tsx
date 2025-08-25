"use client"

import SiteShell from "@/components/site-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useSubscription } from "@/hooks/use-subscription"

export default function Page() {
  const { plan, subscribe, cancel } = useSubscription()

  return (
    <SiteShell>
      <h1 className="text-xl font-semibold">账户与订阅</h1>
      <Card className="mt-4 max-w-xl">
        <CardHeader>
          <CardTitle>当前套餐</CardTitle>
          <CardDescription>这是前端模拟，便于调试整个订阅流程与 UI。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">状态：<span className="font-medium">{plan.toUpperCase()}</span></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => subscribe("free")}>切换到 Free</Button>
            <Button onClick={() => subscribe("creator")}>订阅 Creator</Button>
            <Button onClick={() => subscribe("pro")}>订阅 Pro</Button>
            <Button variant="destructive" onClick={cancel}>取消订阅</Button>
          </div>
          <div className="text-sm text-muted-foreground">
            接入真实后端后，此处将展示账单、发票与管理链接。
          </div>
        </CardContent>
      </Card>
    </SiteShell>
  )
}

"use client"

import SiteShell from "@/components/site-shell"
import TutorialCard from "@/components/tutorial-card"
import { tutorials } from "@/data/tutorials"

export default function TutorialsPage() {
  return (
    <SiteShell>
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">使用教程</h1>
          <p className="text-sm text-muted-foreground mt-1">面捕、模型、背景、录制与订阅的完整上手指南</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tutorials.map((t) => (
          <TutorialCard key={t.id} t={t} />
        ))}
      </div>
    </SiteShell>
  )
}

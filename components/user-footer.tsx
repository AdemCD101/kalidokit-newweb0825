"use client"

import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function formatRemain(sec: number) {
  if (sec <= 0) return "0 分钟"
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d} 天 ${h} 小时`
  if (h > 0) return `${h} 小时 ${m} 分钟`
  return `${m} 分钟`
}

function planLabel(plan: "free" | "creator" | "pro") {
  if (plan === "pro") return "Pro Studio"
  if (plan === "creator") return "Creator"
  return "Free"
}

export default function UserFooter({
  name,
  email,
  avatarUrl = "/placeholder.svg?height=64&width=64",
  plan,
  remainingSeconds,
  totalSeconds,
  onOpenDetails,
  className,
}: {
  name: string
  email?: string
  avatarUrl?: string
  plan: "free" | "creator" | "pro"
  remainingSeconds: number
  totalSeconds?: number
  onOpenDetails?: () => void
  className?: string
}) {
  const pct =
    typeof totalSeconds === "number" && totalSeconds > 0
      ? Math.max(0, Math.min(100, Math.round((remainingSeconds / totalSeconds) * 100)))
      : undefined

  return (
    <div className={cn("p-4 border-t bg-background/80 group relative", className)}>
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 rounded-full overflow-hidden border">
          <Image
            src={avatarUrl || "/placeholder.svg?height=64&width=64&query=user%20avatar"}
            alt={name}
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium truncate">{name}</div>
            <Badge variant="outline" className="whitespace-nowrap">
              {planLabel(plan)}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground truncate">{email}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>剩余时长</span>
          <span>{formatRemain(remainingSeconds)}</span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded bg-muted overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${pct ?? 100}%` }} aria-label="剩余时长进度" />
        </div>
      </div>

      {/* 悬停提示跳转按钮 */}
      <button
        type="button"
        aria-label="查看账户详情"
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2",
          "h-7 w-7 rounded-full border bg-background/90 text-foreground/80",
          "opacity-0 group-hover:opacity-100 transition-opacity text-xs",
        )}
        onClick={onOpenDetails}
      >
        {">"}
      </button>
    </div>
  )
}

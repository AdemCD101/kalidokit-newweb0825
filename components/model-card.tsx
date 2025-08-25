"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { StudioModel, ModelAccess } from "@/data/models"

function accessLabel(a: ModelAccess) {
  if (a === "yearly") return "年度专属"
  if (a === "quarterly") return "季度专属"
  if (a === "monthly") return "会员"
  return "试用可用"
}

export default function ModelCard({
  model,
  size = "default",
  className,
  onClick,
}: {
  model: StudioModel
  size?: "compact" | "default" | "large"
  className?: string
  onClick?: () => void
}) {
  const dims =
    size === "large"
      ? { imgH: 220, title: "text-lg", desc: "text-sm", pad: "p-4" }
      : size === "compact"
        ? { imgH: 120, title: "text-sm", desc: "text-xs", pad: "p-3" }
        : { imgH: 160, title: "text-base", desc: "text-sm", pad: "p-3.5" }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group text-left w-full transition-colors rounded-xl border hover:bg-muted/70 hover:shadow-sm",
        className,
      )}
      aria-label={`选择模型 ${model.name}`}
    >
      <Card className="border-0 shadow-none">
        <CardContent className={cn("p-0", dims.pad)}>
          <div className="relative w-full overflow-hidden rounded-lg border bg-muted/40" style={{ height: dims.imgH }}>
            <Image
              src={model.thumbnail || "/placeholder.svg?height=160&width=160&query=model%20thumbnail"}
              alt={model.name}
              fill
              sizes="(max-width: 640px) 100vw, 320px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute left-2 top-2">
              <Badge variant="outline" className="bg-background/70 backdrop-blur">
                {accessLabel(model.access)}
              </Badge>
            </div>
          </div>
          <div className="mt-3 min-w-0">
            <div className={cn("font-semibold text-foreground truncate", dims.title)}>{model.name}</div>
            <div className={cn("text-muted-foreground line-clamp-2", dims.desc)}>{model.description}</div>
          </div>
          {model.tags && model.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {model.tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  )
}

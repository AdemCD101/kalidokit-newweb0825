"use client"

import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Tutorial } from "@/data/tutorials"

export default function TutorialCard({
  t,
  className,
}: {
  t: Tutorial
  className?: string
}) {
  return (
    <Link href={t.href} className={cn("group block", className)} aria-label={t.title}>
      <Card className="overflow-hidden transition-colors hover:bg-muted/60">
        <div className="relative w-full" style={{ height: 180 }}>
          <Image
            src={t.image || "/placeholder.svg?height=200&width=360&query=tutorial%20cover"}
            alt={t.title}
            fill
            sizes="(max-width: 768px) 100vw, 360px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          {t.category && (
            <div className="absolute left-2 top-2">
              <Badge variant="outline" className="bg-background/70 backdrop-blur">
                {t.category}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="font-medium line-clamp-1">{t.title}</div>
          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</div>
        </CardContent>
      </Card>
    </Link>
  )
}

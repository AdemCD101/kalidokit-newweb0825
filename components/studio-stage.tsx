"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

type BackgroundColor = { type: "color"; color: string; darken?: number }
type BackgroundImage = { type: "image"; src: string; fit?: "cover" | "contain"; blur?: number; darken?: number; color?: string }
type BackgroundProps = BackgroundColor | BackgroundImage

type ModelProps = {
  placeholder?: string
  scale?: number
  position?: { x: number; y: number }
}

export default function StudioStage({
  background,
  model,
  children,
  className,
}: {
  background: BackgroundProps
  model?: ModelProps
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("absolute inset-0", className)} aria-label="Studio 舞台">
      {/* 背景层 */}
      <div className="absolute inset-0 -z-30">
        {"type" in background && background.type === "color" ? (
          <div className="w-full h-full relative">
            <div className="w-full h-full" style={{ background: background.color }} />
            {background.darken ? (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: `rgba(0,0,0,${background.darken})` }}
                aria-hidden
              />
            ) : null}
          </div>
        ) : (
          <div className="relative w-full h-full">
            <Image
              src={(background as BackgroundImage).src || "/placeholder.svg"}
              alt="背景"
              fill
              priority
              sizes="100vw"
              className={cn(
                (background as BackgroundImage).fit === "contain" ? "object-contain" : "object-cover",
                (background as BackgroundImage).blur ? "blur-sm" : ""
              )}
            />
            {(background as BackgroundImage).darken ? (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: `rgba(0,0,0,${(background as BackgroundImage).darken})` }}
                aria-hidden
              />
            ) : null}
          </div>
        )}
      </div>

      {/* 模型层（占位） - 临时隐藏以排查遮挡问题 */}
      <div className="absolute inset-0 -z-20 hidden">
        <div
          className="relative"
          style={{
            transform: `translate(${model?.position?.x ?? 0}px, ${model?.position?.y ?? 0}px) scale(${model?.scale ?? 1})`,
          }}
        >
          <div className="relative w-[56vmin] h-[56vmin] max-w-[900px] max-h-[900px]">
            <Image
              src={model?.placeholder || "/placeholder.svg?height=800&width=800&query=live2d%20model%20placeholder"}
              alt="模型占位"
              fill
              sizes="56vmin"
              className="object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>
      </div>

      {/* 挂件/自定义层 - 修复：Live2D 需要在背景之上 */}
      <div className="absolute inset-0 z-10">{children}</div>
    </div>
  )
}

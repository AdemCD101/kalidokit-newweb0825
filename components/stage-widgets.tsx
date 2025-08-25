"use client"

import { useCallback, useMemo, useRef } from "react"
import { cn } from "@/lib/utils"

export type StageWidget = {
  id: string
  type: "badge" | "chip"
  text: string
  x: number // 0-100 (%)
  y: number // 0-100 (%)
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function StageWidgets({
  widgets,
  edit = false,
  onChange,
}: {
  widgets: StageWidget[]
  edit?: boolean
  onChange?: (next: StageWidget[]) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, id: string) => {
      if (!edit) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)
      const start = { x: e.clientX, y: e.clientY }
      const initial = widgets.find((w) => w.id === id)
      if (!initial) return

      function onMove(ev: PointerEvent) {
        const dx = ev.clientX - start.x
        const dy = ev.clientY - start.y
        const w = target.clientWidth
        const h = target.clientHeight
        // Convert to percentage movement relative to container
        const nx = clamp(initial.x + (dx / rect.width) * 100, 0, 100 - (w / rect.width) * 100)
        const ny = clamp(initial.y + (dy / rect.height) * 100, 0, 100 - (h / rect.height) * 100)
        onChange?.(
          widgets.map((it) => (it.id === id ? { ...it, x: nx, y: ny } : it))
        )
      }
      function onUp(ev: PointerEvent) {
        target.releasePointerCapture(e.pointerId)
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [edit, onChange, widgets]
  )

  const styles = useMemo(
    () =>
      widgets.reduce<Record<string, React.CSSProperties>>((acc, w) => {
        acc[w.id] = {
          left: `${w.x}%`,
          top: `${w.y}%`,
        }
        return acc
      }, {}),
    [widgets]
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "pointer-events-none absolute inset-0 -z-10",
        edit && "pointer-events-auto"
      )}
      aria-label="挂件层"
    >
      {widgets.map((w) => (
        <div
          key={w.id}
          className="absolute"
          style={styles[w.id]}
        >
          <div
            className={cn(
              "select-none",
              "inline-flex items-center",
              w.type === "badge"
                ? "bg-emerald-500/90 text-white px-2 py-1 text-xs rounded"
                : "bg-white/90 text-foreground px-3 py-1 text-xs rounded",
              edit ? "cursor-move ring-2 ring-emerald-400/60" : "pointer-events-none"
            )}
            onPointerDown={(e) => startDrag(e, w.id)}
            role={edit ? "button" : undefined}
            aria-grabbed={edit ? true : undefined}
          >
            {w.text}
          </div>
        </div>
      ))}
    </div>
  )
}

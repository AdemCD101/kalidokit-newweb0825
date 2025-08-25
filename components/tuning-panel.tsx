"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"

type Props = {
  className?: string
  value: { enablePose: boolean; withKalidokitFace: boolean; withKalidokitPose: boolean; faceMaxFps: number; poseMaxFps: number }
  onChange: (v: Partial<Props["value"]>) => void
}

export default function TuningPanel({ className, value, onChange }: Props) {
  const [faceFps, setFaceFps] = useState(value.faceMaxFps)
  const [poseFps, setPoseFps] = useState(value.poseMaxFps)
  const fpsMarks = useMemo(() => [10, 15, 20, 24, 30], [])

  // 同步外部值（例如重置或恢复）
  useEffect(() => setFaceFps(value.faceMaxFps), [value.faceMaxFps])
  useEffect(() => setPoseFps(value.poseMaxFps), [value.poseMaxFps])

  return (
    <Card className={cn("absolute right-3 top-3 z-50 w-[260px] bg-white/90 backdrop-blur", className)}>
      <CardContent className="p-3 space-y-3 text-xs">
        <div className="font-medium text-sm">调优开关</div>
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">启用姿态 Pose</Label>
          <Switch checked={value.enablePose} onCheckedChange={(v) => onChange({ enablePose: Boolean(v) })} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">Face 用 Kalidokit</Label>
          <Switch checked={value.withKalidokitFace} onCheckedChange={(v) => onChange({ withKalidokitFace: Boolean(v) })} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">Pose 用 Kalidokit</Label>
          <Switch checked={value.withKalidokitPose} onCheckedChange={(v) => onChange({ withKalidokitPose: Boolean(v) })} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>Face 最大 FPS</Label>
            <span>{faceFps} fps</span>
          </div>
          <Slider
            value={[faceFps]}
            min={10}
            max={30}
            step={1}
            onValueChange={(v) => setFaceFps(v[0])}
            onValueCommit={(v) => onChange({ faceMaxFps: v[0] })}
          />
          <div className="text-[10px] text-muted-foreground">建议 20–24</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label>Pose 最大 FPS</Label>
            <span>{poseFps} fps</span>
          </div>
          <Slider
            value={[poseFps]}
            min={10}
            max={30}
            step={1}
            onValueChange={(v) => setPoseFps(v[0])}
            onValueCommit={(v) => onChange({ poseMaxFps: v[0] })}
          />
          <div className="text-[10px] text-muted-foreground">建议 12–18</div>
        </div>
      </CardContent>
    </Card>
  )
}


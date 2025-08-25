"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type StudioSettings = {
  selectedModel: string
  mirror: boolean
  smoothing: number
  expressionIntensity: number
  showLandmarks: boolean
  hudMode: "points" | "mask"
  hudPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom"
  hudDraggable?: boolean
  hudSize?: number
  editWidgets?: boolean
  tracking: { face: boolean; pose: boolean; hands: boolean }
  background: { type: "image" | "color"; src?: string; color?: string; fit?: "cover" | "contain"; darken?: number }
}

export default function StudioControls({
  settings,
  onChange,
}: {
  settings: StudioSettings
  onChange: (next: Partial<StudioSettings>) => void
}) {
  function handlePickBackground(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      onChange({ background: { ...settings.background, type: "image", src: reader.result as string } })
    }
    reader.readAsDataURL(f)
  }

  return (
    <Card className="h-full rounded-none border-0">
      <CardHeader>
        <CardTitle>控制台</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pb-10">
        <div className="space-y-2">
          <Label>模型</Label>
          <Select
            value={settings.selectedModel}
            onValueChange={(v) => onChange({ selectedModel: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择模型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sample Model">Sample Model</SelectItem>
              <SelectItem value="Creator Cat">Creator Cat</SelectItem>
              <SelectItem value="Pro Fox">Pro Fox</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Label htmlFor="mirror">镜像显示</Label>
          <Switch
            id="mirror"
            checked={settings.mirror}
            onCheckedChange={(v) => onChange({ mirror: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>平滑度</Label>
            <span className="text-xs text-muted-foreground">{settings.smoothing.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[settings.smoothing]}
            onValueChange={([v]) => onChange({ smoothing: v ?? settings.smoothing })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>表情强度</Label>
            <span className="text-xs text-muted-foreground">{settings.expressionIntensity.toFixed(2)}</span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.01}
            value={[settings.expressionIntensity]}
            onValueChange={([v]) => onChange({ expressionIntensity: v ?? settings.expressionIntensity })}
          />
        </div>

        <Separator />

        {/* HUD 设置 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="landmarks">显示网格点</Label>
            <Switch
              id="landmarks"
              checked={settings.showLandmarks}
              onCheckedChange={(v) => onChange({ showLandmarks: v, hudMode: v ? "points" : settings.hudMode })}
            />
          </div>
          <div className="space-y-2">
            <Label>HUD 模式</Label>
            <Select
              value={settings.hudMode}
              onValueChange={(v: "points" | "mask") => onChange({ hudMode: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="points">网格点</SelectItem>
                <SelectItem value="mask">灰色面具</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>HUD 位置</Label>
            <Select
              value={settings.hudPosition}
              onValueChange={(v: StudioSettings["hudPosition"]) => onChange({ hudPosition: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top-left">左上</SelectItem>
                <SelectItem value="top-right">右上</SelectItem>
                <SelectItem value="bottom-left">左下</SelectItem>
                <SelectItem value="bottom-right">右下</SelectItem>
                <SelectItem value="custom">自定义拖拽</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="hud-drag">HUD 可拖拽</Label>
            <Switch
              id="hud-drag"
              checked={!!settings.hudDraggable}
              onCheckedChange={(v) => onChange({ hudDraggable: v, hudPosition: v ? "custom" : settings.hudPosition })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>HUD 大小</Label>
              <span className="text-xs text-muted-foreground">{(settings.hudSize ?? 160).toFixed(0)}px</span>
            </div>
            <Slider
              min={120}
              max={280}
              step={2}
              value={[settings.hudSize ?? 160]}
              onValueChange={([v]) => onChange({ hudSize: v ?? 160 })}
            />
          </div>
        </div>

        <Separator />

        {/* 背景设置 */}
        <div className="space-y-3">
          <Label>背景类型</Label>
          <Select
            value={settings.background.type}
            onValueChange={(v: "image" | "color") => onChange({ background: { ...settings.background, type: v } })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="image">图片</SelectItem>
              <SelectItem value="color">纯色</SelectItem>
            </SelectContent>
          </Select>

          {settings.background.type === "image" ? (
            <>
              <div className="space-y-2">
                <Label>图片地址</Label>
                <Input
                  value={settings.background.src ?? ""}
                  onChange={(e) =>
                    onChange({ background: { ...settings.background, src: e.currentTarget.value } })
                  }
                  placeholder="/placeholder.svg?height=1080&width=1920"
                  inputMode="url"
                />
                <div className="flex items-center gap-2">
                  <input id="bgfile" type="file" accept="image/*" className="hidden" onChange={handlePickBackground} />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => document.getElementById("bgfile")?.click()}
                  >
                    本地上传
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>适应方式</Label>
                <Select
                  value={settings.background.fit ?? "cover"}
                  onValueChange={(v: "cover" | "contain") =>
                    onChange({ background: { ...settings.background, fit: v } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">填充裁切</SelectItem>
                    <SelectItem value="contain">完整包含</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>背景颜色</Label>
              <Input
                value={settings.background.color ?? "#000000"}
                onChange={(e) =>
                  onChange({ background: { ...settings.background, color: e.currentTarget.value } })
                }
                placeholder="#000000"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>暗化</Label>
              <span className="text-xs text-muted-foreground">
                {(settings.background.darken ?? 0).toFixed(2)}
              </span>
            </div>
            <Slider
              min={0}
              max={0.8}
              step={0.02}
              value={[settings.background.darken ?? 0]}
              onValueChange={([v]) =>
                onChange({ background: { ...settings.background, darken: v ?? 0 } })
              }
            />
          </div>
        </div>

        <Separator />

        {/* 通道与挂件 */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Tracking 通道</div>
          <div className="flex items-center justify-between">
            <Label htmlFor="face">Face</Label>
            <Switch
              id="face"
              checked={settings.tracking.face}
              onCheckedChange={(v) => onChange({ tracking: { ...settings.tracking, face: v } })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="pose">Pose</Label>
            <Switch
              id="pose"
              checked={settings.tracking.pose}
              onCheckedChange={(v) => onChange({ tracking: { ...settings.tracking, pose: v } })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="hands">Hands</Label>
            <Switch
              id="hands"
              checked={settings.tracking.hands}
              onCheckedChange={(v) => onChange({ tracking: { ...settings.tracking, hands: v } })}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="editWidgets">编辑挂件</Label>
            <Switch
              id="editWidgets"
              checked={!!settings.editWidgets}
              onCheckedChange={(v) => onChange({ editWidgets: v })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

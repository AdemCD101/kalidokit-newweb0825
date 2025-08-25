"use client"

import DevicePicker from "@/components/device-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export type KSettings = {
  // input
  deviceId: string | null
  resolution: "720p" | "1080p" | "auto"
  mirror: boolean

  // face
  faceEnabled: boolean
  smoothing: number
  expressionIntensity: number
  eye: { enable: boolean; blinkStrength: number }
  mouth: { enable: boolean; openSmoothing: number }

  // pose
  poseEnabled: boolean
  poseSmoothing: number

  // hands
  handsEnabled: boolean
  handsSmoothing: number

  // hud
  hudMode: "points" | "mask"
  hudPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom"
  hudDraggable: boolean
  hudSize: number

  // background
  background: { type: "image" | "color"; src?: string; color?: string; fit?: "cover" | "contain"; darken?: number }

  // widgets
  editWidgets: boolean
}

export default function KalidokitPanel({
  settings,
  onChange,
  onReset,
}: {
  settings: KSettings
  onChange: (next: Partial<KSettings>) => void
  onReset?: () => void
}) {
  return (
    <Tabs defaultValue="input" className="w-full">
      <div className="flex items-center justify-between px-6 pt-5">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="input">输入</TabsTrigger>
          <TabsTrigger value="face">Face</TabsTrigger>
          <TabsTrigger value="pose">Pose</TabsTrigger>
          <TabsTrigger value="hands">Hands</TabsTrigger>
          <TabsTrigger value="output">输出</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="input" className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>设备与分辨率</CardTitle>
            <CardDescription>选择摄像头、分辨率与镜像方式。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DevicePicker
              value={settings.deviceId}
              onChange={(deviceId) => onChange({ deviceId })}
            />
            <div className="space-y-2">
              <Label>分辨率</Label>
              <Select
                value={settings.resolution}
                onValueChange={(v: KSettings["resolution"]) => onChange({ resolution: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">自动</SelectItem>
                  <SelectItem value="720p">1280×720</SelectItem>
                  <SelectItem value="1080p">1920×1080</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="mirror">镜像显示</Label>
              <Switch id="mirror" checked={settings.mirror} onCheckedChange={(v) => onChange({ mirror: v })} />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="face" className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>面部捕捉</CardTitle>
            <CardDescription>参考 Kalidokit Face 面板，控制平滑与表情强度。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="faceEnabled">启用 Face</Label>
              <Switch id="faceEnabled" checked={settings.faceEnabled} onCheckedChange={(v) => onChange({ faceEnabled: v })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>平滑度</Label>
                <span className="text-xs text-muted-foreground">{settings.smoothing.toFixed(2)}</span>
              </div>
              <Slider min={0} max={1} step={0.01} value={[settings.smoothing]} onValueChange={([v]) => onChange({ smoothing: v ?? settings.smoothing })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>表情强度</Label>
                <span className="text-xs text-muted-foreground">{settings.expressionIntensity.toFixed(2)}</span>
              </div>
              <Slider min={0} max={2} step={0.01} value={[settings.expressionIntensity]} onValueChange={([v]) => onChange({ expressionIntensity: v ?? settings.expressionIntensity })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="eye-enable">启用眼睛</Label>
              <Switch id="eye-enable" checked={settings.eye.enable} onCheckedChange={(v) => onChange({ eye: { ...settings.eye, enable: v } })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>眨眼强度</Label>
                <span className="text-xs text-muted-foreground">{settings.eye.blinkStrength.toFixed(2)}</span>
              </div>
              <Slider min={0} max={2} step={0.01} value={[settings.eye.blinkStrength]} onValueChange={([v]) => onChange({ eye: { ...settings.eye, blinkStrength: v ?? settings.eye.blinkStrength } })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="mouth-enable">启用嘴部</Label>
              <Switch id="mouth-enable" checked={settings.mouth.enable} onCheckedChange={(v) => onChange({ mouth: { ...settings.mouth, enable: v } })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>张口平滑</Label>
                <span className="text-xs text-muted-foreground">{settings.mouth.openSmoothing.toFixed(2)}</span>
              </div>
              <Slider min={0} max={1} step={0.01} value={[settings.mouth.openSmoothing]} onValueChange={([v]) => onChange({ mouth: { ...settings.mouth, openSmoothing: v ?? settings.mouth.openSmoothing } })} />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pose" className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>姿态捕捉</CardTitle>
            <CardDescription>参考 Kalidokit Pose 面板（占位）。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="poseEnabled">启用 Pose</Label>
              <Switch id="poseEnabled" checked={settings.poseEnabled} onCheckedChange={(v) => onChange({ poseEnabled: v })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>姿态平滑</Label>
                <span className="text-xs text-muted-foreground">{settings.poseSmoothing.toFixed(2)}</span>
              </div>
              <Slider min={0} max={1} step={0.01} value={[settings.poseSmoothing]} onValueChange={([v]) => onChange({ poseSmoothing: v ?? settings.poseSmoothing })} />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="hands" className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>手部捕捉</CardTitle>
            <CardDescription>参考 Kalidokit Hand 面板（占位）。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="handsEnabled">启用 Hands</Label>
              <Switch id="handsEnabled" checked={settings.handsEnabled} onCheckedChange={(v) => onChange({ handsEnabled: v })} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>手部平滑</Label>
                <span className="text-xs text-muted-foreground">{settings.handsSmoothing.toFixed(2)}</span>
              </div>
              <Slider min={0} max={1} step={0.01} value={[settings.handsSmoothing]} onValueChange={([v]) => onChange({ handsSmoothing: v ?? settings.handsSmoothing })} />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="output" className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>输出与 HUD</CardTitle>
            <CardDescription>HUD 模式、位置、大小；舞台背景。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>HUD 模式</Label>
              <Select value={settings.hudMode} onValueChange={(v: "points" | "mask") => onChange({ hudMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                onValueChange={(v: KSettings["hudPosition"]) => onChange({ hudPosition: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label htmlFor="hudDrag">HUD 可拖拽</Label>
              <Switch id="hudDrag" checked={settings.hudDraggable} onCheckedChange={(v) => onChange({ hudDraggable: v })} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>HUD 大小</Label>
                <span className="text-xs text-muted-foreground">{settings.hudSize.toFixed(0)}px</span>
              </div>
              <Slider min={120} max={280} step={2} value={[settings.hudSize]} onValueChange={([v]) => onChange({ hudSize: v ?? settings.hudSize })} />
            </div>

            <div className="space-y-2">
              <Label>背景类型</Label>
              <Select
                value={settings.background.type}
                onValueChange={(v: "image" | "color") => onChange({ background: { ...settings.background, type: v } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">图片</SelectItem>
                  <SelectItem value="color">纯色</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.background.type === "image" ? (
              <div className="grid gap-2">
                <Label>图片地址</Label>
                <input
                  className="px-3 py-2 rounded-md border bg-background"
                  placeholder="/placeholder.svg?height=1080&width=1920"
                  value={settings.background.src ?? ""}
                  onChange={(e) => onChange({ background: { ...settings.background, src: e.currentTarget.value } })}
                />
                <Label>适应方式</Label>
                <Select
                  value={settings.background.fit ?? "cover"}
                  onValueChange={(v: "cover" | "contain") => onChange({ background: { ...settings.background, fit: v } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cover">填充裁切</SelectItem>
                    <SelectItem value="contain">完整包含</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>背景颜色</Label>
                <input
                  className="px-3 py-2 rounded-md border bg-background"
                  placeholder="#000000"
                  value={settings.background.color ?? "#000000"}
                  onChange={(e) => onChange({ background: { ...settings.background, color: e.currentTarget.value } })}
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
                onValueChange={([v]) => onChange({ background: { ...settings.background, darken: v ?? 0 } })}
              />
            </div>

            <div className="pt-2">
              <Button variant="outline" onClick={onReset}>恢复默认</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

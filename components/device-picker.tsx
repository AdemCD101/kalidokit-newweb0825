"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Device = MediaDeviceInfo & { kind: "videoinput" }

export default function DevicePicker({
  value,
  onChange,
  className,
}: {
  value?: string | null
  onChange?: (deviceId: string | null) => void
  className?: string
}) {
  const [devices, setDevices] = useState<Device[]>([])
  const [permissionAsked, setPermissionAsked] = useState(false)
  const [loading, setLoading] = useState(false)

  async function ensurePermission() {
    if (permissionAsked) return
    setLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      stream.getTracks().forEach((t) => t.stop())
      setPermissionAsked(true)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function refresh() {
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      const cams = list.filter((d) => d.kind === "videoinput") as Device[]
      setDevices(cams)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refresh()
    navigator.mediaDevices?.addEventListener?.("devicechange", refresh)
    return () => navigator.mediaDevices?.removeEventListener?.("devicechange", refresh as any)
  }, [])

  const hasLabels = useMemo(
    () => devices.some((d) => d.label && d.label.trim().length > 0),
    [devices]
  )

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Select
          value={value ?? ""}
          onValueChange={(v) => onChange?.(v || null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择摄像头" />
          </SelectTrigger>
          <SelectContent>
            {devices.length === 0 && (
              <SelectItem value="no-device" disabled>
                未发现设备
              </SelectItem>
            )}
            {devices.map((d, i) => (
              <SelectItem key={d.deviceId || `cam-${i}`} value={d.deviceId}>
                {d.label || `摄像头 ${i + 1}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="secondary" size="sm" onClick={refresh}>
          刷新
        </Button>
      </div>
      {!hasLabels && (
        <div className="text-xs text-muted-foreground">
          为显示设备名称，需要先授权摄像头。
          <Button
            type="button"
            size="sm"
            className="ml-2"
            disabled={loading}
            onClick={ensurePermission}
          >
            {loading ? "请求中..." : "授权"}
          </Button>
        </div>
      )}
    </div>
  )
}

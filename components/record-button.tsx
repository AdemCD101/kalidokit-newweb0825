"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CircleDot, Square, Download } from 'lucide-react'

export default function RecordButton({
  getCanvas,
  className,
}: {
  getCanvas: () => HTMLCanvasElement | null
  className?: string
}) {
  const [recording, setRecording] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  async function start() {
    const canvas = getCanvas()
    if (!canvas) {
      alert("未找到可录制的画面（占位）。")
      return
    }
    const stream = canvas.captureStream ? canvas.captureStream(30) : null
    if (!stream) {
      alert("当前浏览器不支持 canvas.captureStream。")
      return
    }
    const chunks: BlobPart[] = []
    const rec = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" })
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" })
      const objectUrl = URL.createObjectURL(blob)
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return objectUrl
      })
    }
    rec.start()
    recorderRef.current = rec
    setRecording(true)
  }

  function stop() {
    recorderRef.current?.stop()
    setRecording(false)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!recording ? (
        <Button size="sm" variant="destructive" onClick={start} aria-label="开始录制">
          <CircleDot className="mr-2 h-4 w-4" />
          录制
        </Button>
      ) : (
        <Button size="sm" variant="secondary" onClick={stop} aria-label="停止录制">
          <Square className="mr-2 h-4 w-4" />
          停止
        </Button>
      )}
      {url && (
        <a
          href={url}
          download={`face-hud-${Date.now()}.webm`}
          className="inline-flex items-center text-xs px-2 py-1 rounded border hover:bg-muted"
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          下载
        </a>
      )}
    </div>
  )
}

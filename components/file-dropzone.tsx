"use client"

import { useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function FileDropzone({
  id,
  accept,
  onFiles,
}: {
  id?: string
  accept?: string
  onFiles: (files: File[]) => void
}) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isOver, setIsOver] = useState(false)

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    onFiles(files)
  }

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        if (fileInputRef.current?.files?.length) {
          onFiles(Array.from(fileInputRef.current.files))
        }
      }}
      className={cn(
        "relative rounded-md border border-dashed p-6 text-center",
        isOver ? "bg-muted" : ""
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsOver(false)
        const files = Array.from(e.dataTransfer.files || [])
        onFiles(files)
      }}
    >
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        multiple
        onChange={handlePick}
      />
      <p className="text-sm text-muted-foreground">
        拖拽模型资源到此处，或
      </p>
      <Button
        type="button"
        variant="secondary"
        className="mt-3"
        onClick={() => fileInputRef.current?.click()}
      >
        选择文件
      </Button>
      <p className="mt-2 text-xs text-muted-foreground">
        支持：{accept || "文件"}，可多选。
      </p>
    </form>
  )
}

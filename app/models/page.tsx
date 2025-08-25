"use client"

import SiteShell from "@/components/site-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import FileDropzone from "@/components/file-dropzone"
import ModelCard from "@/components/model-card"
import { models } from "@/data/models"
import Link from "next/link"

export default function Page() {
  return (
    <SiteShell>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">模型库</h1>
        <Button form="upload" type="submit">
          上传模型
        </Button>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>导入你的 Live2D 资源</CardTitle>
          <CardDescription>支持常见容器格式与入口文件（占位）。</CardDescription>
        </CardHeader>
        <CardContent>
          <FileDropzone
            id="upload"
            accept={".zip,.json,.model3.json,.moc3"}
            onFiles={(files) => {
              console.log("Selected files:", files.length)
            }}
          />

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((m) => (
              <div key={m.id} className="flex flex-col">
                <ModelCard model={m} size="large" onClick={() => {}} />
                <div className="mt-3">
                  <Button asChild className="w-full">
                    <Link href={`/studio?model=${encodeURIComponent(m.id)}`}>加载到 Studio</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </SiteShell>
  )
}

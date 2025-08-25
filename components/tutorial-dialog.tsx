"use client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function TutorialDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>使用教程</DialogTitle>
          <DialogDescription>快速上手面部捕捉与舞台设置</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>1. 点击“面部捕捉”，授权摄像头，屏幕边缘会出现方形 HUD（仅显示网格/面具，不显示真实视频）。</p>
          <p>2. 点击“背景”更换舞台背景图片；支持本地文件。</p>
          <p>3. 进入“模型”页面导入/选择 Live2D 模型（占位）。</p>
          <p>4. 返回主页可查看定价或管理订阅。</p>
          <p className="text-muted-foreground">提示：空格键可启动/停止捕捉，Esc 可关闭本弹窗。</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

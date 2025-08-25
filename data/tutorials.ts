export type Tutorial = {
  id: string
  title: string
  description: string
  image: string
  href: string
  category?: string
}

export const tutorials: Tutorial[] = [
  {
    id: "face-capture-setup",
    title: "面部捕捉快速上手",
    description: "授权摄像头、打开 HUD、基础参数调节的完整流程。",
    image: "/placeholder.svg?height=200&width=360",
    href: "/tutorials#face-capture-setup",
    category: "入门",
  },
  {
    id: "camera-calibration",
    title: "摄像头矫正与光线优化",
    description: "通过矫正与补光，提升表情跟踪的稳定性。",
    image: "/placeholder.svg?height=200&width=360",
    href: "/tutorials#camera-calibration",
    category: "设备",
  },
  {
    id: "live2d-import",
    title: "导入 Live2D 模型",
    description: "支持常见资源格式的导入与入口文件选择（演示）。",
    image: "/placeholder.svg?height=200&width=360",
    href: "/tutorials#live2d-import",
    category: "模型",
  },
  {
    id: "expression-mapping",
    title: "表情与映射参数",
    description: "平滑度、表情强度、眼睛眨眼与嘴部开合的基础设置。",
    image: "/placeholder.svg?height=200&width=360",
    href: "/tutorials#expression-mapping",
    category: "参数",
  },
  {
    id: "background-setup",
    title: "舞台背景与适配",
    description: "图片/纯色背景、适配方式与暗化效果的设置。",
    image: "/placeholder.svg?height=200&width=360",
    href: "/tutorials#background-setup",
    category: "舞台",
  },
  {
    id: "record-export",
    title: "录制与导出",
    description: "合成画面录制与导出 WebM（演示）流程。",
    image: "/placeholder.svg?height=200&width=360",
    href: "/tutorials#record-export",
    category: "输出",
  },
  {
    id: "widgets-usage",
    title: "挂件与对齐吸附",
    description: "添加挂件、拖拽与对齐吸附规则（演示）。",
    image: "/placeholder.svg?height=200&width=360",
    href: "/tutorials#widgets-usage",
    category: "装饰",
  },
  {
    id: "subscription-plans",
    title: "订阅与会员权益",
    description: "试用、月卡、季度与年度会员的区别与升级路径。",
    image: "/placeholder.svg?height=200&width=360",
    href: "/tutorials#subscription-plans",
    category: "账户",
  },
]

export type ModelAccess = "trial" | "monthly" | "quarterly" | "yearly"

export type StudioModel = {
  id: string
  name: string
  description: string
  thumbnail: string
  access: ModelAccess // 最低可用会员等级
  tags?: string[]
}

export const models: StudioModel[] = [
  {
    id: "cat",
    name: "猫猫 V1",
    description: "轻量可爱风，适合入门直播。",
    thumbnail: "/placeholder.svg?height=320&width=320",
    access: "trial",
    tags: ["可爱", "入门"],
  },
  {
    id: "fox",
    name: "狐狐 Studio",
    description: "高表情度，支持丰富表情预设。",
    thumbnail: "/placeholder.svg?height=320&width=320",
    access: "monthly",
    tags: ["表情丰富", "直播"],
  },
  {
    id: "bear",
    name: "熊熊 Lite",
    description: "稳态表现出色，资源占用低。",
    thumbnail: "/placeholder.svg?height=320&width=320",
    access: "trial",
    tags: ["稳定", "轻量"],
  },
  {
    id: "bunny",
    name: "兔叽 Creator",
    description: "创作者常用基础款，易上手。",
    thumbnail: "/placeholder.svg?height=320&width=320",
    access: "monthly",
    tags: ["创作", "基础款"],
  },
  {
    id: "neko",
    name: "Neko Pro",
    description: "Pro 级动作捕捉映射优化。",
    thumbnail: "/placeholder.svg?height=320&width=320",
    access: "quarterly",
    tags: ["Pro", "动作映射"],
  },
]

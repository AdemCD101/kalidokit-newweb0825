"use client"

import Image from "next/image"
import Link from "next/link"
import type React from "react"
import { forwardRef, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Box,
  ImageIcon,
  Smile,
  BookOpen,
  LogIn,
  ChevronRight,
  Crosshair,
  Settings,
  Wrench,
  Bell,
  CreditCard,
  UserIcon,
  BarChart3,
} from "lucide-react"
import dynamic from "next/dynamic"
import DevicePicker from "@/components/device-picker"
import { useLocalStorage } from "@/hooks/use-local-storage"

// 动态导入 FaceHUD，避免 SSR 水合问题
const FaceHUD = dynamic(() => import("@/components/face-hud"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center text-xs text-gray-400">Loading...</div>
})

type FaceHUDHandle = {
  start: () => Promise<void>
  stop: () => void
  getCanvas: () => HTMLCanvasElement | null
  getStream: () => MediaStream | null
}
import { useAuth, createUserFromEmail } from "@/hooks/use-auth"
import UserFooter from "@/components/user-footer"
import { useSubscription } from "@/hooks/use-subscription"

const loginBtn = "bg-emerald-600 hover:bg-emerald-700 text-white" // 保持注册/登录按钮绿色

type PanelView = "home" | "models" | "modelSettings" | "backgrounds" | "tutorial" | "faceSettings" | "auth" | "account"

type Bg = { type: "image" | "color"; src?: string; color?: string; fit?: "cover" | "contain"; darken?: number }

type Props = {
  className?: string
  onPickBackground: () => void
  onToggleFace: () => void
  faceActive: boolean
  onOpenTutorial: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  view: PanelView
  onChangeView: (v: PanelView) => void
  onFaceStreamChange?: (stream: MediaStream | null) => void
  selectedModelId?: string | null
  onSelectModel?: (id: string) => void
  onSelectBackground?: (bg: Bg) => void
}

const sampleModels = [
  { id: "cat", name: "猫猫 V1", img: "/placeholder.svg?height=160&width=160", desc: "轻量可爱风，适合入门直播。" },
  {
    id: "fox",
    name: "狐狐 Studio",
    img: "/placeholder.svg?height=160&width=160",
    desc: "高表情度，支持丰富表情预设。",
  },
  { id: "bear", name: "熊熊 Lite", img: "/placeholder.svg?height=160&width=160", desc: "稳态表现出色，资源占用低。" },
  {
    id: "bunny",
    name: "兔叽 Creator",
    img: "/placeholder.svg?height=160&width=160",
    desc: "创作者常用基础款，易上手。",
  },
  { id: "neko", name: "Neko Pro", img: "/placeholder.svg?height=160&width=160", desc: "Pro 级动作捕捉映射优化。" },
]

const sampleBackgrounds: {
  id: string
  name: string
  type: "image" | "color"
  img?: string
  color?: string
  desc: string
  bg: Bg
}[] = [
  {
    id: "room",
    name: "工作室房间",
    type: "image",
    img: "/placeholder.svg?height=120&width=200",
    desc: "柔和室内光，直播常用。",
    bg: { type: "image", src: "/placeholder.svg?height=1080&width=1920", fit: "cover", darken: 0.2 },
  },
  {
    id: "city-night",
    name: "城市夜景",
    type: "image",
    img: "/placeholder.svg?height=120&width=200",
    desc: "霓虹夜景，氛围十足。",
    bg: { type: "image", src: "/placeholder.svg?height=1080&width=1920", fit: "cover", darken: 0.35 },
  },
  {
    id: "gradient-soft",
    name: "柔和渐变",
    type: "image",
    img: "/placeholder.svg?height=120&width=200",
    desc: "简洁不干扰主体。",
    bg: { type: "image", src: "/placeholder.svg?height=1080&width=1920", fit: "cover", darken: 0.1 },
  },
  {
    id: "solid-dark",
    name: "纯色·深灰",
    type: "color",
    color: "#111827",
    desc: "专注主体，简洁低调。",
    bg: { type: "color", color: "#111827", darken: 0 },
  },
  {
    id: "solid-light",
    name: "纯色·浅灰",
    type: "color",
    color: "#e5e7eb",
    desc: "干净明亮的中性背景。",
    bg: { type: "color", color: "#e5e7eb", darken: 0 },
  },
]

// 小型分段切换（滑块）
function Segmented({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const idx = options.findIndex((o) => o.value === value)
  return (
    <div className="relative grid grid-cols-2 rounded-md border bg-background p-0.5">
      <div
        className="absolute top-0.5 bottom-0.5 w-1/2 rounded-sm bg-muted transition-transform duration-300"
        style={{ transform: `translateX(${idx * 100}%)` }}
        aria-hidden
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cn(
            "relative z-10 text-sm py-1.5 rounded-sm transition-colors",
            o.value === value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default forwardRef<HTMLDivElement, Props>(function LeftControlPanel(
  {
    className,
    onPickBackground,
    onToggleFace,
    faceActive,
    onOpenTutorial,
    collapsed = false,
    onToggleCollapse,
    view,
    onChangeView,
    onFaceStreamChange,
    selectedModelId,
    onSelectModel,
    onSelectBackground,
  },
  ref,
) {
  const { toast } = useToast()
  const { user, login, logout, update } = useAuth()
  const { plan } = useSubscription()

  // 折叠态键盘可展开
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!collapsed) return
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onToggleCollapse?.()
    }
  }

  const selectedModel = useMemo(() => sampleModels.find((m) => m.id === selectedModelId) ?? null, [selectedModelId])
  const [modelTab, setModelTab] = useState<"shortcuts" | "model">("shortcuts")

  const isModels = view === "models"
  const isModelSettings = view === "modelSettings"
  const isBackgrounds = view === "backgrounds"
  const isTutorial = view === "tutorial"
  const isFaceSettings = view === "faceSettings"
  const isAuth = view === "auth"
  const isAccount = view === "account"

  const panelWidthClass = collapsed
    ? "w-[72px]"
    : isModelSettings
      ? "w-[460px] max-w-[94vw]"
      : isBackgrounds || isModels
        ? "w-[420px] max-w-[92vw]"
        : isTutorial || isFaceSettings
          ? "w-[640px] max-w-[96vw]"
          : isAuth
            ? "w-[420px] max-w-[92vw]"
            : isAccount
              ? "w-[760px] max-w-[96vw]"
              : "w-[300px] max-w-[88vw]"

  // 内嵌 HUD（主页预览区）
  const hudInlineRef = useRef<FaceHUDHandle>(null)
  const previewSize = 180

  // 本地模型选择
  function onPickLocalModel(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    console.log(
      "Selected local model files:",
      files.map((f) => f.name),
    )
    onSelectModel?.("local")
    e.currentTarget.value = ""
  }

  // 面部捕捉详细设置：本地存储
  type FaceSettingsState = {
    deviceId: string | null
    resolution: "auto" | "360p" | "720p" | "1080p"
    mirror: boolean
    faceFps: number
    enablePose: boolean
    enableHands: boolean
    hud: {
      mode: "points" | "mask"
      position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom"
      draggable: boolean
      size: number
    }
    face: {
      smoothing: number
      expressionIntensity: number
      eye: { enable: boolean; blinkStrength: number; blinkSmoothing: number }
      mouth: { enable: boolean; openSmoothing: number }
    }
    debug: { showLandmarks: boolean }
  }
  const [faceCfg, setFaceCfg] = useLocalStorage<FaceSettingsState>("studio.faceSettings", {
    deviceId: null,
    resolution: "360p",
    mirror: true,
    faceFps: 30, // 恢复到 30fps，像 Kalidokit 示例
    enablePose: false,
    enableHands: false,
    hud: { mode: "points", position: "bottom-right", draggable: false, size: 200 },
    face: {
      smoothing: 0.6,
      expressionIntensity: 1,
      eye: { enable: true, blinkStrength: 1, blinkSmoothing: 0.5 }, // 新增眨眼平滑
      mouth: { enable: true, openSmoothing: 0.25 }, // 降低嘴部平滑，更自然
    },
    debug: { showLandmarks: true },
  })
  function updateFaceCfg(next: Partial<FaceSettingsState>) {
    setFaceCfg({ ...faceCfg, ...next })
  }

  // 面部设置页的独立预览开关（默认关闭以避免双重推理）
  const facePreviewRef = useRef<FaceHUDHandle>(null)
  const [previewOn, setPreviewOn] = useState(false)
  useEffect(() => {
    if (!isFaceSettings) {
      setPreviewOn(false)
    }
  }, [isFaceSettings])

  // 账户视图：登录/注册
  const [authTab, setAuthTab] = useState<"login" | "register">("login")
  const [loginForm, setLoginForm] = useState({ email: "", password: "", remember: true })
  const [registerForm, setRegisterForm] = useState({ email: "", password: "", confirm: "", agree: false })
  const [registerCode, setRegisterCode] = useState("")
  const [sentCode, setSentCode] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<number | null>(null)

  function isEmail(v: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
  }
  function generateCode(len = 6) {
    let s = ""
    for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10).toString()
    return s
  }
  function startCooldown(seconds = 60) {
    setCooldown(seconds)
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    timerRef.current = window.setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current)
            timerRef.current = null
          }
          return 0
        }
        return c - 1
      })
    }, 1000)
  }
  async function sendVerifyCode() {
    if (!isEmail(registerForm.email)) {
      toast({ variant: "destructive", title: "邮箱格式有误", description: "请先填写有效的邮箱地址" })
      return
    }
    if (cooldown > 0) return
    const code = generateCode(6)
    setSentCode(code)
    startCooldown(60)
    toast({ title: "验证码已发送", description: `验证码（演示）：${code}` })
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    // 直接模拟登录
    const next =
      user && user.email === loginForm.email && user.remainingSeconds > 0
        ? user
        : createUserFromEmail(loginForm.email || "demo@vtube.dev", 7200)
    login(next)
    toast({ title: "登录成功", description: "已进入演示账户" })
    onChangeView("home")
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!isEmail(registerForm.email)) {
      toast({ variant: "destructive", title: "邮箱格式有误", description: "请填写有效的邮箱地址" })
      return
    }
    if (registerForm.password.length < 6) {
      toast({ variant: "destructive", title: "密码过短", description: "密码至少 6 位" })
      return
    }
    if (registerForm.password !== registerForm.confirm) {
      toast({ variant: "destructive", title: "两次密码不一致", description: "请确认密码一致" })
      return
    }
    if (!registerForm.agree) {
      toast({ variant: "destructive", title: "未同意条款", description: "请勾选同意用户协议与隐私政策" })
      return
    }
    if (!sentCode) {
      toast({ variant: "destructive", title: "请先获取验证码", description: "点击“发送验证码”获取邮箱验证码" })
      return
    }
    if (registerCode.trim() !== sentCode) {
      toast({ variant: "destructive", title: "验证码错误", description: "请检查验证码是否正确" })
      return
    }
    const next = createUserFromEmail(registerForm.email, 259200) // 3 天试用
    login(next)
    toast({ title: "注册成功", description: "已为你创建账户并自动登录（演示）" })
    onChangeView("home")
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  // 使用中剩余时长倒计时：仅在面部捕捉开启时扣减
  useEffect(() => {
    if (!user || !faceActive || user.remainingSeconds <= 0) return
    const id = window.setInterval(() => {
      const next = Math.max(0, (user?.remainingSeconds ?? 0) - 1)
      update({ remainingSeconds: next })
    }, 1000)
    return () => window.clearInterval(id)
  }, [user, faceActive, update])

  function renderFooter() {
    if (user) {
      return (
        <UserFooter
          name={user.name}
          email={user.email}
          avatarUrl={user.avatarUrl}
          plan={plan}
          remainingSeconds={user.remainingSeconds}
          totalSeconds={user.totalSeconds}
          onOpenDetails={() => onChangeView("account")}
        />
      )
    }
    // 未登录
    return (
      <div className="p-4 border-t" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          className={cn("w-full", loginBtn)}
          onClick={() => onChangeView("auth")}
          aria-label="注册或登录"
        >
          <LogIn className="mr-1.5 h-4 w-4" />
          注册/登录
        </Button>
        <p className="mt-2 text-xs text-muted-foreground text-center">注册即可试用三天</p>
      </div>
    )
  }

  return (
    <aside
      ref={ref}
      onKeyDown={handleKeyDown}
      className={cn(
        "absolute left-4 top-4 bottom-4 z-40 select-none",
        "transition-all duration-300 ease-out",
        panelWidthClass,
        className,
      )}
      aria-label="控制面板"
      aria-expanded={!collapsed}
      role={collapsed ? "group" : undefined}
      tabIndex={collapsed ? 0 : -1}
    >
      <div
        className={cn(
          "h-full",
          "transition-transform duration-300 ease-out",
          collapsed
            ? "border-0 bg-transparent shadow-none backdrop-blur-0 scale-95"
            : "rounded-xl border bg-background/85 backdrop-blur-md shadow-xl overflow-hidden scale-100",
        )}
      >
        {collapsed ? (
          // 折叠态
          <div className="h-full w-full flex items-center justify-center">
            <div
              className={cn(
                "flex flex-col items-center gap-2 p-2",
                "rounded-full border bg-background/90 shadow",
                "transition-shadow duration-300 ease-out",
              )}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="icon"
                variant="ghost"
                aria-label="模型"
                className="h-10 w-10 rounded-full hover:bg-muted"
                onClick={() => {
                  onChangeView("models")
                  onToggleCollapse?.()
                }}
              >
                <Box className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="背景"
                className="h-10 w-10 rounded-full hover:bg-muted"
                onClick={() => {
                  onChangeView("backgrounds")
                  onToggleCollapse?.()
                }}
              >
                <ImageIcon className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={faceActive ? "停止面部捕捉" : "面部捕捉"}
                className={cn(
                  "h-10 w-10 rounded-full hover:bg-muted",
                  faceActive && "bg-black text-white hover:bg-black",
                )}
                onClick={onToggleFace}
              >
                <Smile className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="使用教程"
                className="h-10 w-10 rounded-full hover:bg-muted"
                onClick={() => {
                  onChangeView("tutorial")
                  onToggleCollapse?.()
                }}
              >
                <BookOpen className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="展开面板"
                className="mt-1 h-10 w-10 rounded-full hover:bg-muted"
                onClick={onToggleCollapse}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
          // 展开态内容
          <div className="h-full flex flex-col">
            {/* 顶部栏 */}
            <div className="p-3 border-b flex items-center justify-between">
              {isModels || isModelSettings || isBackgrounds || isTutorial || isFaceSettings || isAuth || isAccount ? (
                <button
                  type="button"
                  className="group inline-flex items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-muted/60 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isModelSettings) onChangeView("models")
                    else if (isAccount) onChangeView("home")
                    else onChangeView("home")
                  }}
                >
                  <span
                    className="inline-block w-3 select-none transition-transform duration-150 group-hover:-translate-x-1"
                    aria-hidden="true"
                  >
                    {"<"}
                  </span>
                  <span>返回</span>
                </button>
              ) : (
                <Link
                  href="/"
                  className="group inline-flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  aria-label="返回主页"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className="inline-block w-3 select-none transition-transform duration-150 group-hover:-translate-x-1"
                    aria-hidden="true"
                  >
                    {"<"}
                  </span>
                  <span>返回主页</span>
                </Link>
              )}

              {isModelSettings && selectedModel && (
                <div className="ml-2 text-xs text-muted-foreground truncate">
                  正在编辑：<span className="font-medium text-foreground">{selectedModel.name}</span>
                </div>
              )}
            </div>

            {/* 主区内容 */}
            {isModels ? (
              <>
                {/* 模型列表 + 本地 */}
                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-medium">模型库</div>
                      <div className="text-xs text-muted-foreground">选择一个模型后进入模型设置</div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        id="local-model-input"
                        type="file"
                        className="hidden"
                        accept=".zip,.json,.model3.json,.moc3"
                        multiple
                        onChange={onPickLocalModel}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          document.getElementById("local-model-input")?.click()
                        }}
                      >
                        使用本地模型
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-2 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2.5">
                    {sampleModels.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        aria-label={`选择模型 ${m.name}`}
                        className="group w-full flex items-center gap-4 rounded-xl border bg-background/95 p-4 min-h-[96px] hover:bg-muted/70 hover:shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectModel?.(m.id)
                        }}
                      >
                        <div className="relative h-20 w-20 rounded-lg overflow-hidden border bg-muted/40 shrink-0">
                          <Image
                            src={m.img || "/placeholder.svg?height=160&width=160"}
                            alt={m.name}
                            fill
                            sizes="80px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-foreground truncate">{m.name}</div>
                          <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{m.desc}</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {renderFooter()}
              </>
            ) : isModelSettings && selectedModel ? (
              <>
                <div className="px-4 pt-4 space-y-3">
                  <div className="text-base font-medium">模型设置</div>
                  <Segmented
                    value={modelTab}
                    onChange={(v) => setModelTab(v as "shortcuts" | "model")}
                    options={[
                      { value: "shortcuts", label: "快捷键设置" },
                      { value: "model", label: "模型设置" },
                    ]}
                  />
                </div>

                <div className="px-4 py-4 flex-1 overflow-y-auto space-y-6">
                  {modelTab === "shortcuts" ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">单击输入框后按下键盘按键即可修改对应快捷键。</div>
                      <ShortcutItem label="开始/停止面部捕捉" defaultKey="Space" />
                      <ShortcutItem label="显示/隐藏 HUD" defaultKey="H" />
                      <ShortcutItem label="切换控制面板折叠" defaultKey="P" />
                      <ShortcutItem label="重置模型位置" defaultKey="R" />
                      <ShortcutItem label="截图（占位）" defaultKey="S" />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>模型缩放</Label>
                          <span className="text-xs text-muted-foreground" id="scaleHint">
                            建议 0.8 - 1.2
                          </span>
                        </div>
                        <Slider min={0.5} max={2} step={0.01} defaultValue={[1]} aria-labelledby="scaleHint" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>位置 X</Label>
                          <Slider min={-300} max={300} step={1} defaultValue={[0]} />
                        </div>
                        <div className="space-y-2">
                          <Label>位置 Y</Label>
                          <Slider min={-300} max={300} step={1} defaultValue={[60]} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="mirror">镜像模型</Label>
                          <Switch id="mirror" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>表情强度</Label>
                          <span className="text-xs text-muted-foreground">1.00</span>
                        </div>
                        <Slider min={0} max={2} step={0.01} defaultValue={[1]} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>眨眼强度</Label>
                          <span className="text-xs text-muted-foreground">1.00</span>
                        </div>
                        <Slider min={0} max={2} step={0.01} defaultValue={[1]} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>张口平滑</Label>
                          <span className="text-xs text-muted-foreground">0.50</span>
                        </div>
                        <Slider min={0} max={1} step={0.01} defaultValue={[0.5]} />
                      </div>
                    </div>
                  )}
                </div>

                {renderFooter()}
              </>
            ) : isBackgrounds ? (
              <>
                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                  <div>
                    <div className="text-base font-medium">背景库</div>
                    <div className="text-xs text-muted-foreground">选择一个背景立即应用，或上传本地图片</div>
                  </div>
                </div>

                <div className="px-4 pb-2 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2.5">
                    {sampleBackgrounds.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        aria-label={`选择背景 ${b.name}`}
                        className="group w-full flex items-center gap-4 rounded-xl border bg-background/95 p-4 min-h-[96px] hover:bg-muted/70 hover:shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectBackground?.(b.bg)
                        }}
                      >
                        {b.type === "image" ? (
                          <div className="relative h-20 w-28 rounded-lg overflow-hidden border bg-muted/40 shrink-0">
                            <Image
                              src={b.img || "/placeholder.svg?height=120&width=200"}
                              alt={b.name}
                              fill
                              sizes="112px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                        ) : (
                          <div
                            className="h-20 w-28 rounded-lg overflow-hidden border shrink-0"
                            style={{ background: b.color || "#000" }}
                            aria-label={b.name}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold text-foreground truncate">{b.name}</div>
                          <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{b.desc}</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>

                {renderFooter()}
              </>
            ) : isTutorial ? (
              <>
                <div className="px-4 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="text-base font-medium">使用教程合集</div>
                    <Badge variant="outline">入门必读</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    覆盖从初次上手到录制导出、挂件、订阅等完整流程的教程索引
                  </div>
                </div>
                <Separator className="mt-3" />
                <div className="px-4 py-3 flex-1 overflow-y-auto">
                  <div className="relative w-full aspect-[16/6] rounded-md overflow-hidden border bg-muted">
                    <Image
                      src={"/placeholder.svg?height=200&width=800&query=tutorial%20banner"}
                      alt="教程横幅"
                      fill
                      className="object-cover"
                      sizes="(max-width: 600px) 100vw, 640px"
                    />
                  </div>
                </div>

                <div className="px-4 pb-0" />
                {renderFooter()}
              </>
            ) : isFaceSettings ? (
              <>
                <div className="px-4 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    <div className="text-base font-medium">面部捕捉 · 详细设置</div>
                    <Badge variant="outline">Beta</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={previewOn}
                      onCheckedChange={setPreviewOn}
                      className={cn("data-[state=checked]:bg-emerald-500")}
                      aria-label={previewOn ? "关闭预览" : "开启预览"}
                    />
                    <span className="text-xs text-muted-foreground">{previewOn ? "预览开启" : "预览关闭"}</span>
                  </div>
                </div>

                <div className="px-4 py-3 flex-1 overflow-y-auto space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">输入与速率</CardTitle>
                      <CardDescription>选择摄像头、分辨率、帧率与镜像显示</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DevicePicker value={faceCfg.deviceId} onChange={(deviceId) => updateFaceCfg({ deviceId })} />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>分辨率</Label>
                          <Select
                            value={faceCfg.resolution}
                            onValueChange={(v: "auto" | "360p" | "720p" | "1080p") => updateFaceCfg({ resolution: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="360p">640×360（推荐）</SelectItem>
                              <SelectItem value="720p">1280×720</SelectItem>
                              <SelectItem value="1080p">1920×1080</SelectItem>
                              <SelectItem value="auto">自动</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>模型 FPS</Label>
                          <Select value={String(faceCfg.faceFps)} onValueChange={(v) => updateFaceCfg({ faceFps: Number(v) })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="12">12（省电）</SelectItem>
                              <SelectItem value="15">15</SelectItem>
                              <SelectItem value="20">20（推荐）</SelectItem>
                              <SelectItem value="24">24</SelectItem>
                              <SelectItem value="30">30</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end justify-between col-span-2">
                          <Label htmlFor="mirror">镜像显示</Label>
                          <Switch id="mirror" checked={faceCfg.mirror} onCheckedChange={(v) => updateFaceCfg({ mirror: v })} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">跟踪项开关</CardTitle>
                      <CardDescription>是否启用 Pose 与 Hands（Hands 默认关闭）</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">启用 Pose</div>
                          <div className="text-xs text-muted-foreground">上半身姿态，较耗资源，建议 12–15 FPS</div>
                        </div>
                        <Switch checked={faceCfg.enablePose} onCheckedChange={(v) => updateFaceCfg({ enablePose: v })} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">启用 Hands</div>
                          <div className="text-xs text-muted-foreground">手部关键点，默认关闭</div>
                        </div>
                        <Switch checked={faceCfg.enableHands} onCheckedChange={(v) => updateFaceCfg({ enableHands: v })} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">HUD 预览与外观</CardTitle>
                      <CardDescription>设置 HUD 模式、位置、大小与拖拽</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div
                        className="relative w-full rounded-md border bg-black/80"
                        style={{ height: Math.max(160, faceCfg.hud.size) }}
                      >
                        <FaceHUD
                          ref={facePreviewRef}
                          active={previewOn}
                          size={Math.max(160, faceCfg.hud.size)}
                          mode={faceCfg.hud.mode}
                          mirror={faceCfg.mirror}
                          position="custom"
                          draggable={false}
                          deviceId={faceCfg.deviceId}
                          resolution={faceCfg.resolution}
                          maxFps={faceCfg.faceFps}
                          smoothing={faceCfg.face.smoothing}
                          className="inset-0"
                        />
                        {!previewOn && (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                            预览已关闭
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>HUD 模式</Label>
                          <Select
                            value={faceCfg.hud.mode}
                            onValueChange={(v: "points" | "mask") =>
                              updateFaceCfg({ hud: { ...faceCfg.hud, mode: v } })
                            }
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
                            value={faceCfg.hud.position}
                            onValueChange={(v: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "custom") =>
                              updateFaceCfg({ hud: { ...faceCfg.hud, position: v } })
                            }
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
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="hudDrag">HUD 可拖拽</Label>
                        <Switch
                          id="hudDrag"
                          checked={faceCfg.hud.draggable}
                          onCheckedChange={(v) => updateFaceCfg({ hud: { ...faceCfg.hud, draggable: v } })}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>HUD 大小</Label>
                          <span className="text-xs text-muted-foreground">{faceCfg.hud.size.toFixed(0)}px</span>
                        </div>
                        <Slider
                          min={120}
                          max={280}
                          step={2}
                          value={[faceCfg.hud.size]}
                          onValueChange={([v]) =>
                            updateFaceCfg({ hud: { ...faceCfg.hud, size: v ?? faceCfg.hud.size } })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Kalidokit 完整参数</CardTitle>
                      <CardDescription>完整的 Kalidokit 功能，像示例项目一样</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>平滑度</Label>
                          <span className="text-xs text-muted-foreground">{faceCfg.face.smoothing.toFixed(2)}</span>
                        </div>
                        <Slider
                          min={0}
                          max={1}
                          step={0.01}
                          value={[faceCfg.face.smoothing]}
                          onValueChange={([v]) =>
                            updateFaceCfg({ face: { ...faceCfg.face, smoothing: v ?? faceCfg.face.smoothing } })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>表情强度</Label>
                          <span className="text-xs text-muted-foreground">
                            {faceCfg.face.expressionIntensity.toFixed(2)}
                          </span>
                        </div>
                        <Slider
                          min={0}
                          max={2}
                          step={0.01}
                          value={[faceCfg.face.expressionIntensity]}
                          onValueChange={([v]) =>
                            updateFaceCfg({
                              face: { ...faceCfg.face, expressionIntensity: v ?? faceCfg.face.expressionIntensity },
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="eyeEnable">启用眼睛</Label>
                        <Switch
                          id="eyeEnable"
                          checked={faceCfg.face.eye.enable}
                          onCheckedChange={(v) =>
                            updateFaceCfg({ face: { ...faceCfg.face, eye: { ...faceCfg.face.eye, enable: v } } })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>眨眼强度</Label>
                          <span className="text-xs text-muted-foreground">
                            {faceCfg.face.eye.blinkStrength.toFixed(2)}
                          </span>
                        </div>
                        <Slider
                          min={0}
                          max={2}
                          step={0.01}
                          value={[faceCfg.face.eye.blinkStrength]}
                          onValueChange={([v]) =>
                            updateFaceCfg({
                              face: {
                                ...faceCfg.face,
                                eye: { ...faceCfg.face.eye, blinkStrength: v ?? faceCfg.face.eye.blinkStrength },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>眨眼平滑</Label>
                          <span className="text-xs text-muted-foreground">
                            {faceCfg.face.eye.blinkSmoothing.toFixed(2)}
                          </span>
                        </div>
                        <Slider
                          min={0}
                          max={1}
                          step={0.01}
                          value={[faceCfg.face.eye.blinkSmoothing]}
                          onValueChange={([v]) =>
                            updateFaceCfg({
                              face: {
                                ...faceCfg.face,
                                eye: { ...faceCfg.face.eye, blinkSmoothing: v ?? faceCfg.face.eye.blinkSmoothing },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="mouthEnable">启用嘴部</Label>
                        <Switch
                          id="mouthEnable"
                          checked={faceCfg.face.mouth.enable}
                          onCheckedChange={(v) =>
                            updateFaceCfg({ face: { ...faceCfg.face, mouth: { ...faceCfg.face.mouth, enable: v } } })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>张口平滑</Label>
                          <span className="text-xs text-muted-foreground">
                            {faceCfg.face.mouth.openSmoothing.toFixed(2)}
                          </span>
                        </div>
                        <Slider
                          min={0}
                          max={1}
                          step={0.01}
                          value={[faceCfg.face.mouth.openSmoothing]}
                          onValueChange={([v]) =>
                            updateFaceCfg({
                              face: {
                                ...faceCfg.face,
                                mouth: {
                                  ...faceCfg.face,
                                  mouth: {
                                    ...faceCfg.face.mouth,
                                    openSmoothing: v ?? faceCfg.face.mouth.openSmoothing,
                                  },
                                }.mouth,
                              },
                            })
                          }
                        />
                      </div>

                      {/* 新增：Kalidokit 高级参数 */}
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-3">Kalidokit 高级参数</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="smoothBlink">平滑眨眼</Label>
                            <Switch id="smoothBlink" checked={true} disabled />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="enableWink">眨眼检测</Label>
                            <Switch id="enableWink" checked={true} disabled />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>头部旋转限制</Label>
                              <span className="text-xs text-muted-foreground">30°</span>
                            </div>
                            <Slider
                              min={10}
                              max={60}
                              step={5}
                              value={[30]}
                              disabled
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="px-4 pb-4 text-xs text-muted-foreground">
                  提示：本页预览独立于主页开关。关闭本页预览不会影响主页的“面部捕捉”开关。
                </div>
                {renderFooter()}
              </>
            ) : isAuth ? (
              <>
                <div className="px-4 pt-4">
                  <div className="text-base font-medium">账户</div>
                  <div className="text-xs text-muted-foreground mt-0.5">使用滑块在登录与注册之间切换（仅前端演示）</div>
                </div>

                <div className="px-4 pt-3">
                  <Segmented
                    value={authTab}
                    onChange={(v) => setAuthTab(v as "login" | "register")}
                    options={[
                      { value: "login", label: "登录" },
                      { value: "register", label: "注册" },
                    ]}
                  />
                </div>

                <div className="px-4 py-4 flex-1 overflow-y-auto">
                  {authTab === "login" ? (
                    <form className="space-y-4" onSubmit={handleLogin}>
                      <div className="space-y-2">
                        <Label htmlFor="email">邮箱</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm((s) => ({ ...s, email: e.currentTarget.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">密码</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="至少 6 位"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm((s) => ({ ...s, password: e.currentTarget.value }))}
                          required
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="remember"
                            checked={loginForm.remember}
                            onCheckedChange={(v) => setLoginForm((s) => ({ ...s, remember: !!v }))}
                          />
                          <Label htmlFor="remember" className="text-xs text-muted-foreground">
                            记住我
                          </Label>
                        </div>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => toast({ title: "找回密码（占位）", description: "稍后接入邮件找回" })}
                        >
                          忘记密码？
                        </button>
                      </div>
                      <Button type="submit" className={cn("w-full", loginBtn)}>
                        登录
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        没有账号？
                        <button
                          type="button"
                          className="ml-1 underline underline-offset-2 hover:text-foreground"
                          onClick={() => setAuthTab("register")}
                        >
                          立即注册
                        </button>
                      </p>
                    </form>
                  ) : (
                    <form className="space-y-4" onSubmit={handleRegister}>
                      <div className="space-y-2">
                        <Label htmlFor="r-email">邮箱</Label>
                        <Input
                          id="r-email"
                          type="email"
                          placeholder="name@example.com"
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm((s) => ({ ...s, email: e.currentTarget.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="r-code">邮箱验证码</Label>
                        <div className="flex gap-2">
                          <Input
                            id="r-code"
                            placeholder="6 位数字"
                            inputMode="numeric"
                            pattern="\d*"
                            value={registerCode}
                            onChange={(e) => setRegisterCode(e.currentTarget.value)}
                            required
                          />
                          <Button type="button" variant="outline" onClick={sendVerifyCode} disabled={cooldown > 0}>
                            {cooldown > 0 ? `${cooldown}s 后重发` : "发送验证码"}
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          点击“发送验证码”后将把验证码发送至上方邮箱（演示环境会在通知中显示验证码）
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="r-pwd">密码</Label>
                        <Input
                          id="r-pwd"
                          type="password"
                          placeholder="至少 6 位"
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm((s) => ({ ...s, password: e.currentTarget.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="r-cfm">确认密码</Label>
                        <Input
                          id="r-cfm"
                          type="password"
                          placeholder="再次输入密码"
                          value={registerForm.confirm}
                          onChange={(e) => setRegisterForm((s) => ({ ...s, confirm: e.currentTarget.value }))}
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="agree"
                          checked={registerForm.agree}
                          onCheckedChange={(v) => setRegisterForm((s) => ({ ...s, agree: !!v }))}
                        />
                        <Label htmlFor="agree" className="text-xs text-muted-foreground">
                          我已阅读并同意
                          <button
                            type="button"
                            className="mx-1 underline underline-offset-2 hover:text-foreground"
                            onClick={() => toast({ title: "用户协议（占位）" })}
                          >
                            用户协议
                          </button>
                          与
                          <button
                            type="button"
                            className="ml-1 underline underline-offset-2 hover:text-foreground"
                            onClick={() => toast({ title: "隐私政策（占位）" })}
                          >
                            隐私政策
                          </button>
                        </Label>
                      </div>
                      <Button type="submit" className={cn("w-full", loginBtn)}>
                        注册
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        已有账号？
                        <button
                          type="button"
                          className="ml-1 underline underline-offset-2 hover:text-foreground"
                          onClick={() => setAuthTab("login")}
                        >
                          去登录
                        </button>
                      </p>
                    </form>
                  )}
                </div>

                {renderFooter()}
              </>
            ) : isAccount ? (
              <>
                {/* 账户中心 */}
                <div className="px-5 pt-4">
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <div className="text-base font-medium">账户中心</div>
                    <Badge variant="outline">{plan.toUpperCase()}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    查看并管理你的基本信息、用量数据、订阅方案与通知消息
                  </div>
                </div>
                <Separator className="mt-3" />

                <div className="px-5 py-4 flex-1 overflow-y-auto space-y-4">
                  {/* 基本信息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">基本信息</CardTitle>
                      <CardDescription>头像、昵称与邮箱</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center gap-4">
                      <div className="relative h-14 w-14 rounded-full overflow-hidden border">
                        <Image
                          src={user?.avatarUrl || "/placeholder.svg?height=80&width=80&query=user%20avatar"}
                          alt="用户头像"
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 w-full">
                        <div className="space-y-1">
                          <Label htmlFor="acc-name">昵称</Label>
                          <Input
                            id="acc-name"
                            value={user?.name ?? ""}
                            onChange={(e) => user && update({ name: e.currentTarget.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="acc-email">邮箱</Label>
                          <Input id="acc-email" value={user?.email ?? ""} readOnly />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 数据面板 */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          用量概览
                        </CardTitle>
                        <CardDescription>试用剩余时长与使用进度</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>剩余时长</span>
                          <span>{Math.max(0, user?.remainingSeconds ?? 0)}s</span>
                        </div>
                        <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500"
                            style={{
                              width:
                                user?.totalSeconds && user.totalSeconds > 0
                                  ? `${Math.round(((user.remainingSeconds ?? 0) / user.totalSeconds) * 100)}%`
                                  : "100%",
                            }}
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>
                            会话数（占位）<div className="text-foreground font-medium mt-0.5">3</div>
                          </div>
                          <div>
                            录制时长（占位）<div className="text-foreground font-medium mt-0.5">14m</div>
                          </div>
                          <div>
                            模型数量（占位）<div className="text-foreground font-medium mt-0.5">5</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          订阅方案
                        </CardTitle>
                        <CardDescription>当前方案与升级选项</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm">
                          当前方案：<span className="font-medium">{plan.toUpperCase()}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => (window.location.href = "/pricing")}>
                            查看定价
                          </Button>
                          <Button size="sm" onClick={() => (window.location.href = "/dashboard")}>
                            管理订阅
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          升级以解锁更高分辨率与录制导出等 Pro 功能（占位）
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 通知消息 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        通知消息
                      </CardTitle>
                      <CardDescription>系统推送与订阅提醒</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        {
                          id: 1,
                          title: "欢迎加入皮套姬！",
                          desc: "你已获得 3 天试用时长，开始创建你的 VTuber 舞台吧。",
                        },
                        { id: 2, title: "订阅提示", desc: "升级到 Creator 解锁更高帧率与模型云存储（占位）。" },
                        { id: 3, title: "版本更新", desc: "新增人脸捕捉详细设置与教程合集入口（占位）。" },
                      ].map((n) => (
                        <div key={n.id} className="rounded-md border p-3">
                          <div className="text-sm font-medium">{n.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">{n.desc}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* 账户页底部也展示用户组件（无按钮，仅提示跳转） */}
                {renderFooter()}
              </>
            ) : (
              // 默认 home 视图
              <>
                {/* 品牌区 */}
                <div className="p-4 flex items-center gap-3 border-b">
                  <div className="relative h-12 w-12 rounded-md overflow-hidden border">
                    <Image
                      src="/placeholder.svg?height=96&width=96"
                      alt="皮套姬 Logo"
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-semibold">皮套姬</div>
                    <div className="text-xs text-muted-foreground">在线 live2d 服务平台 · 即开即用</div>
                  </div>
                </div>

                {/* 操作 */}
                <div className="p-4 space-y-3 flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => onChangeView("models")}
                  >
                    <Box className="mr-2 h-4 w-4" />
                    模型
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => onChangeView("backgrounds")}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    背景
                  </Button>

                  {/* 面部捕捉：按钮 + 开关 + 展开 HUD */}
                  <div
                    className={cn(
                      "w-full rounded-xl border transition-all",
                      faceActive ? "border-emerald-500 ring-1 ring-emerald-500/40" : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center">
                        <Smile className="mr-2 h-4 w-4" />
                        <span className="text-sm">面部捕捉</span>
                      </div>
                      <Switch
                        checked={faceActive}
                        onCheckedChange={(checked) => {
                          if (checked !== faceActive) onToggleFace()
                        }}
                        className={cn("data-[state=checked]:bg-emerald-500", "data-[state=unchecked]:bg-muted")}
                        aria-label={faceActive ? "关闭面部捕捉" : "开启面部捕捉"}
                      />
                    </div>

                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300",
                        faceActive ? "max-h-[280px] px-3 pb-3" : "max-h-0 px-3 pb-0",
                      )}
                    >
                      <div
                        className="relative w-full rounded-md border bg-black/80"
                        style={{ height: previewSize }}
                        aria-label="面部捕捉预览"
                      >
                        <FaceHUD
                          ref={hudInlineRef}
                          active={faceActive}
                          width={238}
                          height={previewSize}
                          mode="points"
                          mirror={true}
                          position="custom"
                          draggable={false}
                          resolution={faceCfg.resolution}
                          maxFps={faceCfg.faceFps}
                          onStreamChange={onFaceStreamChange}
                          className="inset-0"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            console.log("矫正摄像头：TODO 实现校准流程")
                          }}
                          aria-label="矫正摄像头"
                        >
                          <Crosshair className="mr-1.5 h-4 w-4" />
                          矫正摄像头
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onChangeView("faceSettings")
                          }}
                          aria-label="详细设置"
                        >
                          <Settings className="mr-1.5 h-4 w-4" />
                          详细设置
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => onChangeView("tutorial")}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    使用教程
                  </Button>
                </div>

                {renderFooter()}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
})

// 快捷键单行组件
function ShortcutItem({ label, defaultKey }: { label: string; defaultKey: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(defaultKey)

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault()
    e.stopPropagation()
    let key = e.key
    if (key === " ") key = "Space"
    setValue(key.length === 1 ? key.toUpperCase() : key)
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      <Input
        value={editing ? "按下键盘..." : value}
        readOnly
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onKeyDown={onKeyDown}
        className={cn("h-8 w-[140px] text-center", editing ? "border-foreground/40" : "")}
      />
    </div>
  )
}

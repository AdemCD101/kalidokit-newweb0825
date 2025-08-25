"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useAuth, createUserFromEmail } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

const loginBtn = "bg-emerald-600 hover:bg-emerald-700 text-white"

export default function NavAuth() {
  const { user, login } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  // forms
  const [tab, setTab] = useState<"login" | "register">("login")
  const [loginForm, setLoginForm] = useState({ email: "", password: "" })
  const [registerForm, setRegisterForm] = useState({ email: "", password: "", confirm: "" })
  const [code, setCode] = useState("")
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

  async function sendVerify() {
    if (!isEmail(registerForm.email)) {
      toast({ variant: "destructive", title: "邮箱格式有误", description: "请先填写有效的邮箱地址" })
      return
    }
    if (cooldown > 0) return
    const c = generateCode(6)
    setSentCode(c)
    startCooldown(60)
    toast({ title: "验证码已发送", description: `验证码（演示）：${c}` })
  }

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    // 直接模拟登录
    const next = createUserFromEmail(loginForm.email || "demo@vtube.dev", 7200)
    login(next)
    toast({ title: "登录成功", description: "已进入演示账户" })
    setOpen(false)
  }

  async function onRegister(e: React.FormEvent) {
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
    if (!sentCode) {
      toast({ variant: "destructive", title: "请先获取验证码", description: "点击“发送验证码”获取邮箱验证码" })
      return
    }
    if (code.trim() !== sentCode) {
      toast({ variant: "destructive", title: "验证码错误", description: "请检查验证码是否正确" })
      return
    }
    const next = createUserFromEmail(registerForm.email, 259200) // 3 天试用
    login(next)
    toast({ title: "注册成功", description: "已为你创建账户并自动登录（演示）" })
    setOpen(false)
  }

  if (user) {
    // 登录后：显示头像与菜单
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full border px-2 py-1.5 hover:bg-muted transition-colors"
            aria-label="账户菜单"
          >
            <span className="relative h-7 w-7 overflow-hidden rounded-full border">
              <Image
                src={user.avatarUrl || "/placeholder.svg?height=64&width=64&query=user%20avatar"}
                alt={user.name}
                fill
                sizes="28px"
                className="object-cover"
              />
            </span>
            <span className="hidden sm:block max-w-[120px] truncate text-sm">{user.name}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs">已登录：{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/studio">进入 Studio</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard">仪表盘/订阅</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      <Button size="sm" className={cn(loginBtn)} onClick={() => setOpen(true)}>
        注册 / 登录
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>欢迎回来</DialogTitle>
            <DialogDescription>登录或注册开始你的 VTuber 之旅</DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "register")} className="w-full">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="space-y-4" onSubmit={onLogin}>
                <div className="space-y-2">
                  <Label htmlFor="nav-email">邮箱</Label>
                  <Input
                    id="nav-email"
                    type="email"
                    placeholder="name@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((s) => ({ ...s, email: e.currentTarget.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nav-pwd">密码</Label>
                  <Input
                    id="nav-pwd"
                    type="password"
                    placeholder="至少 6 位"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((s) => ({ ...s, password: e.currentTarget.value }))}
                    required
                  />
                </div>
                <Button type="submit" className={cn("w-full", loginBtn)}>
                  登录
                </Button>
                <p className="text-xs text-muted-foreground text-center">没有账号？上方切换到“注册”</p>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form className="space-y-4" onSubmit={onRegister}>
                <div className="space-y-2">
                  <Label htmlFor="nav-r-email">邮箱</Label>
                  <Input
                    id="nav-r-email"
                    type="email"
                    placeholder="name@example.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((s) => ({ ...s, email: e.currentTarget.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nav-r-code">邮箱验证码</Label>
                  <div className="flex gap-2">
                    <Input
                      id="nav-r-code"
                      placeholder="6 位数字"
                      inputMode="numeric"
                      pattern="\d*"
                      value={code}
                      onChange={(e) => setCode(e.currentTarget.value)}
                      required
                    />
                    <Button type="button" variant="outline" onClick={sendVerify} disabled={cooldown > 0}>
                      {cooldown > 0 ? `${cooldown}s 后重发` : "发送验证码"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nav-r-pwd">密码</Label>
                  <Input
                    id="nav-r-pwd"
                    type="password"
                    placeholder="至少 6 位"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((s) => ({ ...s, password: e.currentTarget.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nav-r-cfm">确认密码</Label>
                  <Input
                    id="nav-r-cfm"
                    type="password"
                    placeholder="再次输入密码"
                    value={registerForm.confirm}
                    onChange={(e) => setRegisterForm((s) => ({ ...s, confirm: e.currentTarget.value }))}
                    required
                  />
                </div>
                <Button type="submit" className={cn("w-full", loginBtn)}>
                  注册
                </Button>
                <p className="text-xs text-muted-foreground text-center">注册即送 3 天试用时长</p>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

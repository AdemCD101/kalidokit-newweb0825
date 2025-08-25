"use client"

import TopNav from "@/components/top-nav"

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </main>
      <footer className="border-t py-6 text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4">
          © {new Date().getFullYear()} VTube Studio Web（演示） · 前端原型
        </div>
      </footer>
    </div>
  )
}

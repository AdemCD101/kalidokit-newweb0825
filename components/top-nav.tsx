"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import NavAuth from "@/components/nav-auth"

const links = [
  { href: "/", label: "首页" },
  { href: "/studio", label: "Studio" },
  { href: "/models", label: "模型库" },
  { href: "/pricing", label: "定价" },
  { href: "/tutorials", label: "使用教程" },
]

export default function TopNav() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center">
        <Link href="/" className="font-semibold">
          VTube Studio Web
        </Link>
        <nav className="ml-6 hidden md:flex items-center gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors",
                pathname === l.href && "text-foreground font-medium",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <NavAuth />
        </div>
      </div>
    </header>
  )
}

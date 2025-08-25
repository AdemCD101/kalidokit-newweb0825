import Link from "next/link"

const TopNav = () => {
  const links = [
    { href: "/tutorials", label: "使用教程" },
    // Other links here
  ]

  return (
    <nav className="bg-white p-4">
      <ul className="flex space-x-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default TopNav
import Image from "next/image"
import Link from "next/link"
import { tutorials } from "@/data/tutorials"
import Badge from "./Badge"
import Separator from "./Separator"
import { renderFooter } from "./Footer"

const LeftControlPanel = ({ isTutorial }) => {
  return (
    <div className="flex flex-col h-full">
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
        {isTutorial ? (
          <>
            <div className="relative w-full aspect-[16/6] rounded-md overflow-hidden border bg-muted">
              <Image
                src={"/placeholder.svg?height=200&width=800&query=tutorial%20banner"}
                alt="教程横幅"
                fill
                className="object-cover"
                sizes="(max-width: 600px) 100vw, 640px"
              />
            </div>

            <div className="mt-4 space-y-2">
              {tutorials.slice(0, 8).map((t) => (
                <Link
                  key={t.id}
                  href={t.href}
                  className="group flex items-center gap-3 rounded-lg border p-2 hover:bg-muted/70 transition-colors"
                >
                  <div className="relative h-12 w-20 rounded-md overflow-hidden border bg-muted/40 shrink-0">
                    <Image
                      src={t.image || "/placeholder.svg"}
                      alt={t.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="relative w-full aspect-[16/6] rounded-md overflow-hidden border bg-muted">
            <Image
              src={"/placeholder.svg?height=200&width=800&query=tutorial%20banner"}
              alt="教程横幅"
              fill
              className="object-cover"
              sizes="(max-width: 600px) 100vw, 640px"
            />
          </div>
        )}
      </div>
      <div className="px-4 pb-0" />
      {renderFooter()}
    </div>
  )
}

export default LeftControlPanel;

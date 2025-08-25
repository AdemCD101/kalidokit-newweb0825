"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import LeftControlPanel from "@/components/left-control-panel"
import TutorialDialog from "@/components/tutorial-dialog"
import StudioStage from "@/components/studio-stage"
import StageWidgets, { type StageWidget } from "@/components/stage-widgets"
import { useLocalStorage } from "@/hooks/use-local-storage"
import Live2DStage from "@/components/live2d-stage"
import DemoLive2D from "@/components/demo-live2d"
import TuningPanel from "@/components/tuning-panel"

type Bg = { type: "image" | "color"; src?: string; color?: string; fit?: "cover" | "contain"; darken?: number }
type PanelView = "home" | "models" | "modelSettings" | "backgrounds" | "tutorial" | "faceSettings" | "auth" | "account"

export default function StudioRedesignedPage() {
  const [running, setRunning] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [panelView, setPanelView] = useState<PanelView>("home")
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [tune, setTune] = useState({ enablePose: false, withKalidokitFace: true, withKalidokitPose: false, faceMaxFps: 30, poseMaxFps: 12 })
  const panelRef = useRef<HTMLDivElement>(null)
  const fileInputId = "bg-file-picker"
  const sp = useSearchParams()

  useEffect(() => {
    const id = sp.get("model")
    if (id) {
      setSelectedModelId(id)
      setPanelView("modelSettings")
      setCollapsed(false)
    }
    // no deps: run once on mount and rely on initial URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [background, setBackground] = useLocalStorage<Bg>("studio.bg", {
    type: "image",
    src: "/placeholder.svg?height=1080&width=1920",
    fit: "cover",
    darken: 0.25,
    color: "#9ca3af",
  })

  const [widgets] = useLocalStorage<StageWidget[]>("studio.widgets", [

    { id: "badge", type: "badge", text: "DEMO", x: 85, y: 3 },
    { id: "chip", type: "chip", text: "Pro 功能占位", x: 2, y: 3 },
  ])

  const [faceStream, setFaceStream] = useState<MediaStream | null>(null)

  function toggleFace() {
    setRunning((v) => !v)
  }

  function pickBackground() {
    document.getElementById(fileInputId)?.click()
  }

  function onPickBgFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () =>
      setBackground({
        type: "image",
        src: String(reader.result),
        fit: "cover",
        darken: background.darken ?? 0.25,
        color: background.color ?? "#9ca3af",
      })
    reader.readAsDataURL(f)
    e.currentTarget.value = ""
  }

  // Hotkeys
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault()
        toggleFace()
      }
      if (e.key === "Escape") setTutorialOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  // Click outside to collapse
  function handleBackgroundClick(e: React.MouseEvent<HTMLDivElement>) {
    const panel = panelRef.current
    const path = (e.nativeEvent as any).composedPath?.() as EventTarget[] | undefined
    const clickedInsidePanel = panel && path ? path.includes(panel) : panel ? panel.contains(e.target as Node) : false
    if (!clickedInsidePanel) {
      setCollapsed(true)
    }
  }

  return (
    <div className="h-screen w-full bg-gray-100 relative overflow-hidden" onMouseDown={handleBackgroundClick}>
      {/* Full-screen stage */}
      <StudioStage
        background={background}
        model={{
          placeholder: "/placeholder.svg?height=800&width=800",
          scale: 1,
          position: { x: 0, y: 60 },
        }}
      >
        {/* Demo pipeline: consume FaceHUD's stream instead of opening a new one */}
        <DemoLive2D active={running} stream={faceStream ?? undefined} tuning={tune} />
        {/* Our native pipeline (Pixi v6/v7 + ESM libs). Keep for later switch-over */}
        {/* <Live2DStage active={running} /> */}
        <StageWidgets widgets={widgets} edit={false} onChange={() => {}} />
      </StudioStage>

      {/* Floating left panel */}
      <LeftControlPanel
        ref={panelRef}
        collapsed={collapsed}
        view={panelView}
        selectedModelId={selectedModelId}
        onFaceStreamChange={setFaceStream}
        onSelectModel={(id) => {
          setSelectedModelId(id)
          setPanelView("modelSettings")
          setCollapsed(false)
        }}
        onSelectBackground={(bg) => {
          setBackground(bg)
        }}
        onChangeView={(v) => setPanelView(v)}
        onToggleCollapse={() => setCollapsed((val) => !val)}
        onPickBackground={pickBackground}
        onToggleFace={toggleFace}
        faceActive={running}
        onOpenTutorial={() => {
          setCollapsed(false)
          setPanelView("tutorial")
        }}
      />

      {/* Hidden file input for background */}
      <input id={fileInputId} type="file" accept="image/*" className="hidden" onChange={onPickBgFile} />

      {/* Legacy tutorial dialog */}
      <TutorialDialog open={tutorialOpen} onOpenChange={setTutorialOpen} />

      {/* 调优开关面板：不占左侧面板位置，临时入口 */}
      <TuningPanel
        value={tune}
        onChange={(p) => setTune((v) => ({ ...v, ...p }))}
      />
    </div>
  )
}

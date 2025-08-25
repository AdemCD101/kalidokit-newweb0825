"use client"

import { useEffect, useState } from "react"

type Plan = "free" | "creator" | "pro"
const KEY = "demo.plan"

export function useSubscription() {
  const [plan, setPlan] = useState<Plan>("free")

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem(KEY) as Plan)) || "free"
    setPlan(saved)
  }, [])

  function subscribe(next: Plan) {
    setPlan(next)
    if (typeof window !== "undefined") localStorage.setItem(KEY, next)
  }
  function cancel() {
    subscribe("free")
  }

  return { plan, subscribe, cancel }
}

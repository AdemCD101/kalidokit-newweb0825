"use client"

import { useLocalStorage } from "@/hooks/use-local-storage"

export type AuthUser = {
  id: string
  email: string
  name: string
  avatarUrl?: string
  remainingSeconds: number
  totalSeconds?: number
}

const KEY = "studio.auth.user"

export function createUserFromEmail(email: string, seedSeconds = 259200) {
  const name = email.split("@")[0] || "User"
  return {
    id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
    email,
    name,
    avatarUrl: "/placeholder.svg?height=64&width=64",
    remainingSeconds: seedSeconds,
    totalSeconds: seedSeconds,
  } as AuthUser
}

export function useAuth() {
  const [user, setUser] = useLocalStorage<AuthUser | null>(KEY, null)

  function login(next: AuthUser) {
    setUser(next)
  }
  function logout() {
    setUser(null)
  }
  function update(patch: Partial<AuthUser>) {
    setUser((prev) => (prev ? { ...prev, ...patch } : (prev as any)))
  }

  return { user, login, logout, update }
}

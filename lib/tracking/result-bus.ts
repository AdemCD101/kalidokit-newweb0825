// Simple result bus for sharing solved results between FaceHUD and consumers
// Avoids prop drilling and duplicate inference

export type FaceSolved = any
export type PoseSolved = any
export type HandSolved = any

let latestFace: FaceSolved | null = null
const faceSubs = new Set<(r: FaceSolved) => void>()

export function publishFaceSolved(r: FaceSolved) {
  latestFace = r
  for (const cb of faceSubs) {
    try { cb(r) } catch {}
  }
}

export function subscribeFaceSolved(cb: (r: FaceSolved) => void): () => void {
  faceSubs.add(cb)
  // push last immediately if exists
  if (latestFace) {
    try { cb(latestFace) } catch {}
  }
  return () => { faceSubs.delete(cb) }
}

export function getLatestFaceSolved() { return latestFace }


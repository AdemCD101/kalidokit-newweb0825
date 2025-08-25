// MediaPipe Face Mesh rings and helpers (officially used sequences)
// Note: These are commonly used ordered rings for 468-landmarks model.
// They are suitable for drawing closed paths and generating contour edges.

export const FACE_OVAL = [
  10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,
  400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109
]

export const LIPS_OUTER = [
  61,146,91,181,84,17,314,405,321,375,291
]
export const LIPS_INNER = [
  78,95,88,178,87,14,317,402,318,324,308
]

export const LEFT_EYE = [
  33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246
]
export const RIGHT_EYE = [
  263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466
]

// Simple eyebrow outlines (upper arcs)
export const LEFT_EYEBROW = [70,63,105,66,107,55,65,52,53,46]
export const RIGHT_EYEBROW = [300,293,334,296,336,285,295,282,283,276]

// Nose: bottom contour ring and a simple bridge polyline
export const NOSE_BOTTOM = [
  20,94,125,141,235,31,228,229,230,231,232,233,244,245,122,6,202,214,234
]
// A trimmed nostril polyline (no long cross-face links)
export const NOSE_NOSTRILS = [94,141,235,31,228,229,230,231,232,233,244,245]
export const NOSE_BRIDGE = [168,6,197,195,5,4]

// Helpers
export function closeRing(ring: number[]): number[] {
  if (ring.length === 0) return ring
  if (ring[0] === ring[ring.length - 1]) return ring
  return [...ring, ring[0]]
}

export function ringToEdges(ring: number[]): [number, number][] {
  const closed = closeRing(ring)
  const edges: [number, number][] = []
  for (let i = 1; i < closed.length; i++) edges.push([closed[i - 1], closed[i]])
  return edges
}

export function polylineToEdges(line: number[]): [number, number][] {
  const edges: [number, number][] = []
  for (let i = 1; i < line.length; i++) edges.push([line[i - 1], line[i]])
  return edges
}

export const CONTOUR_EDGES: [number, number][][] = [
  ringToEdges(FACE_OVAL),
  ringToEdges(LEFT_EYE),
  ringToEdges(RIGHT_EYE),
  ringToEdges(LIPS_OUTER),
  ringToEdges(LIPS_INNER),
  polylineToEdges(LEFT_EYEBROW),
  polylineToEdges(RIGHT_EYEBROW),
  polylineToEdges(NOSE_BOTTOM),
  polylineToEdges(NOSE_BRIDGE),
]

export type Landmark = { x: number; y: number; z?: number }
export type LandmarkList = Landmark[]


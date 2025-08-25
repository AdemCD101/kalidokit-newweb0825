"use client"

/**
 * 安全加载 MediaPipe Tasks Vision（浏览器 ESM），失败则使用 Mock。
 * - 通过 jsDelivr 远程 ESM bundle 避免打包器注入 require。
 * - 添加 webpackIgnore 与 vite-ignore 双注释，兼容不同打包器。
 * - 所有 createXxxLandmarker 都在失败时返回 Mock，不抛异常。
 */

const VISION_VERSION = "0.10.15"
// Offline-first paths (place files under public/vendor/tasks-vision/0.10.15)
const LOCAL_BASE = `/vendor/tasks-vision/${VISION_VERSION}`
const LOCAL_BUNDLE_URL = `${LOCAL_BASE}/vision_bundle.mjs`
const LOCAL_WASM_BASE_URL = `${LOCAL_BASE}/wasm`

// CDN fallback
const CDN_BUNDLE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/vision_bundle.mjs`
const CDN_WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}/wasm`

let currentWasmBaseUrl = LOCAL_WASM_BASE_URL

const isBrowser = typeof window !== "undefined" && typeof document !== "undefined"

let visionModulePromise: Promise<any> | null = null
async function loadVisionModule() {
  if (!isBrowser) throw new Error("Not in a browser runtime")
  if (!visionModulePromise) {
    // Offline-first: try local bundle first, then fallback to CDN
    async function tryImport(url: string) {
      return import(/* webpackIgnore: true */ /* @vite-ignore */ url)
    }
    visionModulePromise = tryImport(LOCAL_BUNDLE_URL)
      .then((m) => { currentWasmBaseUrl = LOCAL_WASM_BASE_URL; return m })
      .catch(() => tryImport(CDN_BUNDLE_URL).then((m) => { currentWasmBaseUrl = CDN_WASM_BASE_URL; return m }))
  }
  return visionModulePromise
}

let filesetPromise: Promise<any> | null = null
async function getFileset() {
  if (!filesetPromise) {
    const vision = await loadVisionModule()
    filesetPromise = vision.FilesetResolver.forVisionTasks(currentWasmBaseUrl)
  }
  return filesetPromise
}

/** ----- Mock 实现，保证 API 存在且不抛错 ----- */

class MockFaceLandmarker {
  detectForVideo() {
    return {} as any
  }
}
class MockPoseLandmarker {
  detectForVideo() {
    return {} as any
  }
}
class MockHandLandmarker {
  detectForVideo() {
    return { landmarks: [], handedness: [] } as any
  }
}

export async function createFaceLandmarker() {
  const vision = await loadVisionModule()
  const fileset = await getFileset()

  // Offline-first model path, then GCS fallback
  const LOCAL_MODEL = `${LOCAL_BASE}/models/face_landmarker.task`
  const GCS_MODEL =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
  try {
    return await vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: LOCAL_MODEL },
      outputFaceBlendshapes: true,
      runningMode: "VIDEO",
      numFaces: 1,
    })
  } catch (e) {
    console.warn("[mediapipe] Local face model missing, fallback to GCS")
    try {
      return await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: GCS_MODEL },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1,
      })
    } catch (err) {
      console.warn("[mediapipe] FaceLandmarker fallback to mock:", err)
      return new MockFaceLandmarker()
    }
  }
}

export async function createPoseLandmarker() {
  try {
    const vision = await loadVisionModule()
    const fileset = await getFileset()
    const LOCAL_MODEL = `${LOCAL_BASE}/models/pose_landmarker_full.task`
    const GCS_MODEL =
      "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task"
    try {
      return await vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: LOCAL_MODEL },
        runningMode: "VIDEO",
        numPoses: 1,
      })
    } catch {
      return await vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: GCS_MODEL },
        runningMode: "VIDEO",
        numPoses: 1,
      })
    }
  } catch (err) {
    console.warn("[mediapipe] PoseLandmarker fallback to mock:", err)
    return new MockPoseLandmarker()
  }
}

export async function createHandLandmarker() {
  try {
    const vision = await loadVisionModule()
    const fileset = await getFileset()
    const LOCAL_MODEL = `${LOCAL_BASE}/models/hand_landmarker.task`
    const GCS_MODEL =
      "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"
    try {
      return await vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: LOCAL_MODEL },
        runningMode: "VIDEO",
        numHands: 2,
      })
    } catch {
      return await vision.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: GCS_MODEL },
        runningMode: "VIDEO",
        numHands: 2,
      })
    }
  } catch (err) {
    console.warn("[mediapipe] HandLandmarker fallback to mock:", err)
    return new MockHandLandmarker()
  }
}

/** 对外：可选探测，便于 UI 提示（不必强依赖） */
export async function hasMediapipeSupport() {
  try {
    const vision = await loadVisionModule()
    return !!vision?.FilesetResolver
  } catch {
    return false
  }
}

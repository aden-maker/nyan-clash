import { useSyncExternalStore } from 'react'
import { BUILTIN_BACKGROUNDS, BUILTIN_PETS, DEFAULT_NYAN_SETTINGS } from './registry'
import {
  BackgroundItem,
  NyanSettings,
  PET_POSES,
  PetPack,
  PetPose,
  PetSprite,
  StoredBackground
} from './types'

/* ---------- 设置（localStorage） ---------- */

const SETTINGS_KEY = 'nyan-settings'

function loadSettings(): NyanSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_NYAN_SETTINGS, ...JSON.parse(raw) } : DEFAULT_NYAN_SETTINGS
  } catch {
    return DEFAULT_NYAN_SETTINGS
  }
}

let settings = loadSettings()
const settingsListeners = new Set<() => void>()

export function patchNyanSettings(patch: Partial<NyanSettings>): void {
  settings = { ...settings, ...patch }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  settingsListeners.forEach((l) => l())
}

export function useNyanSettings(): [NyanSettings, typeof patchNyanSettings] {
  const value = useSyncExternalStore(
    (l) => {
      settingsListeners.add(l)
      return () => settingsListeners.delete(l)
    },
    () => settings
  )
  return [value, patchNyanSettings]
}

/* ---------- 自定义桌宠 / 背景（IndexedDB） ---------- */

const DB_NAME = 'nyan-assets'
type StoreName = 'pets' | 'backgrounds'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (): void => {
      req.result.createObjectStore('pets', { keyPath: 'id' })
      req.result.createObjectStore('backgrounds', { keyPath: 'id' })
    }
    req.onsuccess = (): void => resolve(req.result)
    req.onerror = (): void => reject(req.error)
  })
}

async function dbRun<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest
): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store))
    req.onsuccess = (): void => resolve(req.result as T)
    req.onerror = (): void => reject(req.error)
  })
}

interface Library {
  pets: PetPack[]
  backgrounds: BackgroundItem[]
}

let library: Library = { pets: BUILTIN_PETS, backgrounds: BUILTIN_BACKGROUNDS }
const libraryListeners = new Set<() => void>()
const blobUrls = new Map<string, string>()

function toBackgroundItem({ blob, ...item }: StoredBackground): BackgroundItem {
  if (!blob) return item
  let url = blobUrls.get(item.id)
  if (!url) {
    url = URL.createObjectURL(blob)
    blobUrls.set(item.id, url)
  }
  return { ...item, src: url }
}

async function reloadLibrary(): Promise<void> {
  const [pets, backgrounds] = await Promise.all([
    dbRun<PetPack[]>('pets', 'readonly', (s) => s.getAll()),
    dbRun<StoredBackground[]>('backgrounds', 'readonly', (s) => s.getAll())
  ])
  library = {
    pets: [...BUILTIN_PETS, ...pets],
    backgrounds: [...BUILTIN_BACKGROUNDS, ...backgrounds.map(toBackgroundItem)]
  }
  libraryListeners.forEach((l) => l())
}

reloadLibrary().catch(() => undefined)

export function useNyanLibrary(): Library {
  return useSyncExternalStore(
    (l) => {
      libraryListeners.add(l)
      return () => libraryListeners.delete(l)
    },
    () => library
  )
}

const newId = (prefix: string): string =>
  `${prefix}:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export async function savePet(pack: Omit<PetPack, 'id' | 'builtin'>): Promise<PetPack> {
  const saved: PetPack = { ...pack, id: newId('custom') }
  await dbRun('pets', 'readwrite', (s) => s.put(saved))
  await reloadLibrary()
  return saved
}

export async function removePet(id: string): Promise<void> {
  await dbRun('pets', 'readwrite', (s) => s.delete(id))
  if (settings.petId === id) patchNyanSettings({ petId: DEFAULT_NYAN_SETTINGS.petId })
  await reloadLibrary()
}

export async function saveBackground(
  item: Omit<StoredBackground, 'id' | 'builtin'>
): Promise<BackgroundItem> {
  const saved: StoredBackground = { ...item, id: newId('custom') }
  await dbRun('backgrounds', 'readwrite', (s) => s.put(saved))
  await reloadLibrary()
  return toBackgroundItem(saved)
}

export async function removeBackground(id: string): Promise<void> {
  await dbRun('backgrounds', 'readwrite', (s) => s.delete(id))
  if (settings.backgroundId === id) patchNyanSettings({ backgroundId: 'auto' })
  await reloadLibrary()
  const url = blobUrls.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    blobUrls.delete(id)
  }
}

/* ---------- 导入 / 导出工具 ---------- */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = (): void => resolve(img)
    img.onerror = (): void => reject(new Error('图片加载失败'))
    img.src = src
  })
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (): void => resolve(reader.result as string)
    reader.onerror = (): void => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** 读取图片并按需缩小，避免 IndexedDB 里存过大的原图 */
async function imageFileToDataUrl(
  file: Blob,
  limit: { maxWidth?: number; maxHeight?: number },
  type: 'image/png' | 'image/jpeg'
): Promise<{ src: string; width: number; height: number }> {
  const original = await readAsDataUrl(file)
  const img = await loadImage(original)
  const ratio = Math.min(
    1,
    (limit.maxWidth ?? Infinity) / img.naturalWidth,
    (limit.maxHeight ?? Infinity) / img.naturalHeight
  )
  if (ratio === 1 && file.type === type) {
    return { src: original, width: img.naturalWidth, height: img.naturalHeight }
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * ratio)
  canvas.height = Math.round(img.naturalHeight * ratio)
  const ctx = canvas.getContext('2d')
  if (!ctx) return { src: original, width: img.naturalWidth, height: img.naturalHeight }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return { src: canvas.toDataURL(type, 0.9), width: canvas.width, height: canvas.height }
}

const MAX_BACKGROUND_BYTES = 512 * 1024 * 1024

export async function importBackgroundFile(file: File): Promise<BackgroundItem> {
  const name = file.name.replace(/\.[^.]+$/, '')
  if (file.size > MAX_BACKGROUND_BYTES) throw new Error('文件太大了，背景文件请小于 512 MB')

  if (file.type.startsWith('video/')) {
    const { poster, tone } = await captureVideoPoster(file)
    return saveBackground({ name, src: '', kind: 'video', blob: file, poster, tone })
  }

  if (await isAnimatedImage(file)) {
    const url = URL.createObjectURL(file)
    try {
      const tone = guessTone(await loadImage(url))
      return saveBackground({ name, src: '', kind: 'image', blob: file, tone })
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  const { src } = await imageFileToDataUrl(file, { maxWidth: 2560 }, 'image/jpeg')
  return saveBackground({ name, src, tone: guessTone(await loadImage(src)) })
}

/** GIF 一律视为动图；PNG 看有没有 acTL 块（APNG）；WebP 看 VP8X 的动画标志位 */
async function isAnimatedImage(file: File): Promise<boolean> {
  if (file.type === 'image/gif') return true
  const head = new Uint8Array(await file.slice(0, 64 * 1024).arrayBuffer())
  const ascii = (from: number, len: number): string =>
    String.fromCharCode(...head.subarray(from, from + len))
  if (file.type === 'image/png') {
    for (let i = 8; i + 8 <= head.length;) {
      const len = new DataView(head.buffer).getUint32(i)
      const type = ascii(i + 4, 4)
      if (type === 'acTL') return true
      if (type === 'IDAT') return false
      i += 12 + len
    }
    return false
  }
  if (file.type === 'image/webp') {
    return ascii(12, 4) === 'VP8X' && (head[20] & 0x02) !== 0
  }
  return false
}

function captureVideoPoster(file: Blob): Promise<{ poster: string; tone: 'light' | 'dark' }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    const done = (): void => {
      video.onloadeddata = video.onseeked = video.onerror = null
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
    }
    video.onloadeddata = (): void => {
      video.currentTime = Math.min(1, (video.duration || 0) * 0.1)
    }
    video.onseeked = (): void => {
      const width = Math.min(640, video.videoWidth)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * width)
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
      const result = { poster: canvas.toDataURL('image/jpeg', 0.8), tone: guessTone(video) }
      done()
      resolve(result)
    }
    video.onerror = (): void => {
      done()
      reject(new Error('视频无法播放，请使用 MP4（H.264）或 WebM 格式'))
    }
    video.src = url
  })
}

function guessTone(source: CanvasImageSource): 'light' | 'dark' {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 18
  const ctx = canvas.getContext('2d')
  if (!ctx) return 'light'
  ctx.drawImage(source, 0, 0, 32, 18)
  const data = ctx.getImageData(0, 0, 32, 18).data
  let sum = 0
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  return sum / (data.length / 4) > 128 ? 'light' : 'dark'
}

export async function importPetFromImages(
  name: string,
  files: Partial<Record<PetPose, { file: File; facing?: 'left' | 'right' }>>
): Promise<PetPack> {
  if (!files.stand) throw new Error('至少需要一张“站立”图片')
  const sprites: Partial<Record<PetPose, PetSprite>> = {}
  for (const pose of PET_POSES) {
    const entry = files[pose]
    if (!entry) continue
    const { src } = await imageFileToDataUrl(entry.file, { maxHeight: 512 }, 'image/png')
    sprites[pose] = { src, facing: entry.facing ?? 'right' }
  }
  return savePet({ name: name || '自定义桌宠', sprites: sprites as PetPack['sprites'] })
}

export async function importPetPackFile(file: File): Promise<PetPack> {
  const data = JSON.parse(await file.text())
  if (!data || typeof data !== 'object' || typeof data.sprites?.stand?.src !== 'string') {
    throw new Error('桌宠包格式不正确：缺少 sprites.stand.src')
  }
  const sprites: Partial<Record<PetPose, PetSprite>> = {}
  for (const pose of PET_POSES) {
    const s = data.sprites[pose]
    if (s && typeof s.src === 'string') {
      sprites[pose] = {
        src: s.src,
        facing: s.facing === 'left' ? 'left' : 'right',
        scale: typeof s.scale === 'number' ? s.scale : undefined
      }
    }
  }
  return savePet({
    name: String(data.name || file.name.replace(/\.json$/i, '')),
    author: data.author ? String(data.author) : undefined,
    sprites: sprites as PetPack['sprites'],
    lines: Array.isArray(data.lines) ? data.lines.map(String) : undefined
  })
}

/** 导出为可分享的 .json 桌宠包，图片内嵌为 data URL */
export async function exportPetPack(pack: PetPack): Promise<void> {
  const sprites: Partial<Record<PetPose, PetSprite>> = {}
  for (const pose of PET_POSES) {
    const s = pack.sprites[pose]
    if (!s) continue
    const src = s.src.startsWith('data:')
      ? s.src
      : await readAsDataUrl(await (await fetch(s.src)).blob())
    sprites[pose] = { ...s, src }
  }
  const { name, author, lines } = pack
  const blob = new Blob([JSON.stringify({ name, author, sprites, lines }, null, 2)], {
    type: 'application/json'
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name}.nyanpet.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

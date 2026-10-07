export type PetPose = 'stand' | 'walk' | 'climb' | 'drag' | 'sleep'

export const PET_POSES: PetPose[] = ['stand', 'walk', 'climb', 'drag', 'sleep']

export interface PetSprite {
  /** 图片地址：data URL、http(s) URL 或打包进应用的资源 URL */
  src: string
  /** 图片中角色朝向，引擎据此决定是否水平翻转；climb 姿势表示墙在哪一侧。默认 right */
  facing?: 'left' | 'right'
  /** 相对 stand 姿势的显示高度比例，默认 1 */
  scale?: number
}

/**
 * 桌宠包。导入的 .json 文件即为去掉 id / builtin 字段后的本结构：
 *
 * {
 *   "name": "我的桌宠",
 *   "author": "可选",
 *   "sprites": {
 *     "stand": { "src": "data:image/png;base64,..." },
 *     "walk":  { "src": "...", "facing": "left" },
 *     "climb": { "src": "...", "facing": "right" },
 *     "drag":  { "src": "...", "scale": 1.05 },
 *     "sleep": { "src": "...", "scale": 0.6 }
 *   },
 *   "lines": ["点击时随机说的话", "..."]
 * }
 *
 * 只有 stand 必填，缺失的姿势会回退到 stand。
 */
export interface PetPack {
  id: string
  name: string
  author?: string
  builtin?: boolean
  sprites: { stand: PetSprite } & Partial<Record<Exclude<PetPose, 'stand'>, PetSprite>>
  lines?: string[]
}

/** 叠加在背景上的内置动画特效 */
export type BackgroundEffect = 'stars'

export interface BackgroundItem {
  id: string
  name: string
  /** 图片或视频地址；自定义背景存的是 blob，加载时生成 object URL */
  src: string
  /** 默认 image（含 GIF / 动态 WebP / APNG 动图） */
  kind?: 'image' | 'video'
  /** 视频的封面图，用于缩略图和首帧占位 */
  poster?: string
  effect?: BackgroundEffect
  /** 图片整体明暗，用于自动模式和遮罩配色 */
  tone?: 'light' | 'dark'
  builtin?: boolean
}

/** IndexedDB 中的自定义背景：原文件以 Blob 保存，src 留空 */
export interface StoredBackground extends BackgroundItem {
  blob?: Blob
}

export type BackgroundChoice = 'auto' | 'none' | string

export interface NyanSettings {
  petEnabled: boolean
  petId: string
  /** stand 姿势的显示高度（px） */
  petSize: number
  /** 移动速度倍率 */
  petSpeed: number
  /** roam：到处走动；static：安静待在右下角 */
  petBehavior: 'roam' | 'static'
  petClimb: boolean
  backgroundId: BackgroundChoice
  /** 背景上方的主题色遮罩不透明度（0-90） */
  backgroundDim: number
  /** 背景模糊（px） */
  backgroundBlur: number
  /** 切回窗口时识别剪贴板里的订阅链接 */
  clipboardDetect: boolean
  /** 设置页是否展开不常用的设置 */
  showAdvancedSettings: boolean
}

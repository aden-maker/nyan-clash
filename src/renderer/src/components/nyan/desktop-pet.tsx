import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { toast } from '@renderer/components/base/toast'
import { useNyanLibrary, useNyanSettings } from '@renderer/nyan/store'
import { BUILTIN_PETS } from '@renderer/nyan/registry'
import { PET_POSES, PetPose, PetSprite } from '@renderer/nyan/types'

type Mode = 'walk' | 'idle' | 'sleep' | 'climb' | 'hang' | 'fall' | 'drag'

const POSE_OF: Record<Mode, PetPose> = {
  walk: 'walk',
  idle: 'stand',
  sleep: 'sleep',
  climb: 'climb',
  hang: 'climb',
  fall: 'drag',
  drag: 'drag'
}

const GRAVITY = 2400
const WALK_SPEED = 70
const CLIMB_SPEED = 45
const CLICK_SLOP = 5

const rand = (min: number, max: number): number => min + Math.random() * (max - min)

interface Physics {
  mode: Mode
  /** 角色底边中点（视口坐标） */
  cx: number
  by: number
  vx: number
  vy: number
  dir: 1 | -1
  wall: 'left' | 'right'
  timer: number
  targetBy: number
}

const DesktopPet: React.FC = () => {
  const { t } = useTranslation()
  const [settings, patchSettings] = useNyanSettings()
  const { pets } = useNyanLibrary()
  const { appConfig } = useAppConfig()
  const proxyOn = appConfig?.sysProxy?.enable ?? false

  const pack = pets.find((p) => p.id === settings.petId) ?? BUILTIN_PETS[0]
  const sprite = useCallback(
    (pose: PetPose): PetSprite => pack.sprites[pose] ?? pack.sprites.stand,
    [pack]
  )

  const reducedMotion = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const roam = settings.petBehavior === 'roam' && !reducedMotion

  const [mode, setMode] = useState<Mode>('idle')
  const [facing, setFacing] = useState<'left' | 'right'>('left')
  const [bubble, setBubble] = useState<string | null>(null)
  const [squish, setSquish] = useState(0)
  const [bubbleSide, setBubbleSide] = useState<'left' | 'right'>('left')

  const rootRef = useRef<HTMLDivElement>(null)
  const aspects = useRef<Partial<Record<PetPose, number>>>({})
  const phys = useRef<Physics>({
    mode: 'idle',
    cx: window.innerWidth - 120,
    by: window.innerHeight,
    vx: 0,
    vy: 0,
    dir: -1,
    wall: 'right',
    timer: 2,
    targetBy: 0
  })
  const drag = useRef<
    { startX: number; startY: number; moved: boolean; samples: number[][] } | undefined
  >(undefined)
  const bubbleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const roamRef = useRef(roam)
  roamRef.current = roam

  const say = useCallback((text: string, ms = 3500) => {
    setBubble(text)
    clearTimeout(bubbleTimer.current)
    bubbleTimer.current = setTimeout(() => setBubble(null), ms)
  }, [])

  useEffect(() => () => clearTimeout(bubbleTimer.current), [])

  const firstProxyRender = useRef(true)
  useEffect(() => {
    if (firstProxyRender.current) {
      firstProxyRender.current = false
      return
    }
    say(t(proxyOn ? 'mascot.proxyOn' : 'mascot.proxyOff'))
  }, [proxyOn, say, t])

  useEffect(() => {
    aspects.current = {}
    for (const pose of PET_POSES) {
      const img = new Image()
      img.onload = (): void => {
        aspects.current[pose] = img.naturalWidth / img.naturalHeight
      }
      img.src = sprite(pose).src
    }
  }, [sprite])

  const size = useCallback(
    (pose: PetPose): { w: number; h: number } => {
      const h = settingsRef.current.petSize * (sprite(pose).scale ?? 1)
      return { w: h * (aspects.current[pose] ?? 0.62), h }
    },
    [sprite]
  )

  const enter = useCallback((next: Mode, timer = 0) => {
    const p = phys.current
    p.mode = next
    p.timer = timer
    setMode(next)
  }, [])

  // 主循环
  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const tick = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const p = phys.current
      const W = window.innerWidth
      const H = window.innerHeight
      const speed = settingsRef.current.petSpeed
      const { w, h } = size(POSE_OF[p.mode])
      const minX = w / 2
      const maxX = W - w / 2
      p.timer -= dt

      switch (p.mode) {
        case 'idle':
          p.by = H
          if (p.timer <= 0 && roamRef.current) {
            if (Math.random() < 0.15) {
              enter('sleep', rand(8, 16))
            } else {
              p.dir = Math.random() < 0.5 ? -1 : 1
              enter('walk', rand(4, 10))
            }
          } else if (p.timer <= 0) {
            p.timer = rand(6, 12)
          }
          break
        case 'sleep':
          p.by = H
          if (p.timer <= 0) enter('idle', rand(1, 3))
          break
        case 'walk': {
          p.by = H
          p.cx += p.dir * WALK_SPEED * speed * dt
          const hitWall = p.cx <= minX || p.cx >= maxX
          if (hitWall) {
            p.cx = Math.min(Math.max(p.cx, minX), maxX)
            p.wall = p.cx <= minX ? 'left' : 'right'
            if (settingsRef.current.petClimb && Math.random() < 0.6) {
              p.targetBy = rand(H * 0.3, H * 0.75)
              enter('climb')
            } else {
              p.dir = p.wall === 'left' ? 1 : -1
            }
          } else if (p.timer <= 0) {
            enter('idle', rand(2, 5))
          }
          break
        }
        case 'climb':
          p.by -= CLIMB_SPEED * speed * dt
          if (p.by <= p.targetBy) enter('hang', rand(1, 3))
          break
        case 'hang':
          if (p.timer <= 0) {
            const away = p.wall === 'left' ? 1 : -1
            p.vx = away * rand(120, 260)
            p.vy = -rand(200, 420)
            p.dir = away as 1 | -1
            enter('fall')
          }
          break
        case 'fall':
          p.vy += GRAVITY * dt
          p.cx += p.vx * dt
          p.by += p.vy * dt
          if (p.cx <= minX || p.cx >= maxX) {
            p.cx = Math.min(Math.max(p.cx, minX), maxX)
            p.vx = -p.vx * 0.4
          }
          if (p.by >= H) {
            p.by = H
            p.vx = 0
            p.vy = 0
            setSquish((n) => n + 1)
            enter('idle', rand(1.5, 3))
          }
          break
        case 'drag':
          break
      }

      if (p.mode === 'climb' || p.mode === 'hang') {
        p.cx = p.wall === 'left' ? minX : maxX
      } else {
        p.cx = Math.min(Math.max(p.cx, minX), maxX)
      }
      p.by = Math.min(Math.max(p.by, h), H)

      const want = p.mode === 'climb' || p.mode === 'hang' ? p.wall : p.dir > 0 ? 'right' : 'left'
      setFacing((f) => (f === want ? f : want))
      setBubbleSide((s) => {
        const next = p.cx > W / 2 ? 'right' : 'left'
        return s === next ? s : next
      })

      if (rootRef.current) {
        rootRef.current.style.transform = `translate3d(${p.cx - w / 2}px, ${p.by - h}px, 0)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enter, size])

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startY: e.clientY, moved: false, samples: [] }
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > CLICK_SLOP) {
      d.moved = true
      enter('drag')
      say(t('mascot.picked'), 2000)
    }
    if (!d.moved) return
    const p = phys.current
    const { h } = size('drag')
    p.cx = e.clientX
    p.by = e.clientY + h * 0.92
    d.samples.push([performance.now(), e.clientX, e.clientY])
    if (d.samples.length > 5) d.samples.shift()
  }

  const onPointerUp = (): void => {
    const d = drag.current
    drag.current = undefined
    if (!d) return
    const p = phys.current
    if (!d.moved) {
      setSquish((n) => n + 1)
      if (p.mode === 'sleep') {
        enter('idle', rand(2, 4))
        say(t('mascot.wake'))
        return
      }
      const lines = pack.lines?.length
        ? pack.lines
        : (t('mascot.lines', { returnObjects: true }) as string[])
      const pool = [t(proxyOn ? 'mascot.proxyOn' : 'mascot.proxyOff'), ...lines]
      say(pool[Math.floor(Math.random() * pool.length)])
      return
    }
    const s = d.samples
    if (s.length >= 2) {
      const [t0, x0, y0] = s[0]
      const [t1, x1, y1] = s[s.length - 1]
      const span = Math.max((t1 - t0) / 1000, 0.016)
      p.vx = Math.max(-1500, Math.min(1500, (x1 - x0) / span))
      p.vy = Math.max(-1500, Math.min(1500, (y1 - y0) / span))
    } else {
      p.vx = 0
      p.vy = 0
    }
    if (Math.abs(p.vx) > 600 || p.vy < -600) say(t('mascot.thrown'), 2500)
    enter('fall')
  }

  const onContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault()
    patchSettings({ petEnabled: false })
    toast.success(t('nyan.pet.hiddenHint'))
  }

  const pose = POSE_OF[mode]
  const current = sprite(pose)
  const flip = (current.facing ?? 'right') !== facing
  const height = settings.petSize * (current.scale ?? 1)

  return (
    <div
      ref={rootRef}
      className="nyan-pet pointer-events-none fixed top-0 left-0 z-30"
      style={{ willChange: 'transform' }}
    >
      {bubble && (
        <div
          className={`nyan-bubble pointer-events-auto absolute w-max max-w-52 rounded-large border border-primary/30 bg-content1 px-3 py-2 text-small text-foreground shadow-medium select-text ${bubbleSide === 'right' ? 'right-1/2 rounded-br-none' : 'left-1/2 rounded-bl-none'}`}
          style={{ bottom: height + 4 }}
        >
          {bubble}
        </div>
      )}
      <div style={{ transform: flip ? 'scaleX(-1)' : undefined }}>
        <div className={`nyan-pet-${mode}`}>
          <img
            key={`${pose}-${squish}`}
            src={current.src}
            alt=""
            draggable={false}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onContextMenu={onContextMenu}
            style={{ height }}
            className={`app-nodrag pointer-events-auto block max-w-none cursor-grab touch-none drop-shadow-lg active:cursor-grabbing ${squish ? 'nyan-pet-squish' : ''}`}
          />
        </div>
      </div>
    </div>
  )
}

export default DesktopPet

import React, { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  phase: number
  speed: number
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

const FRAME_MS = 1000 / 30

/** 星星闪烁 + 偶尔划过的流星。只画在画面上方 70%，避开地面景物 */
const StarField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let stars: Star[] = []
    let meteors: Meteor[] = []
    let width = 0
    let height = 0
    let raf = 0
    let last = 0
    let nextMeteor = performance.now() + 2000

    const resize = (): void => {
      const dpr = window.devicePixelRatio || 1
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round((width * height) / 9000)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() ** 1.4 * height * 0.7,
        r: Math.random() * 1.2 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 1.5 + 0.5
      }))
    }

    const draw = (now: number): void => {
      ctx.clearRect(0, 0, width, height)
      const t = now / 1000
      for (const s of stars) {
        const alpha = reduced ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase))
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
        if (s.r > 1.2) {
          ctx.globalAlpha = alpha * 0.25
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      for (const m of meteors) {
        const tail = 14
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tail, m.y - m.vy * tail)
        grad.addColorStop(0, 'rgba(255,255,255,0.95)')
        grad.addColorStop(1, 'rgba(160,220,255,0)')
        ctx.globalAlpha = Math.min(1, m.life)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick)
      if (now - last < FRAME_MS) return
      last = now

      if (now > nextMeteor) {
        nextMeteor = now + 3000 + Math.random() * 6000
        const speed = 12 + Math.random() * 8
        meteors.push({
          x: width * (0.3 + Math.random() * 0.7),
          y: height * Math.random() * 0.25,
          vx: -speed,
          vy: speed * (0.35 + Math.random() * 0.25),
          life: 1.4
        })
      }
      for (const m of meteors) {
        m.x += m.vx
        m.y += m.vy
        m.life -= 0.035
      }
      meteors = meteors.filter((m) => m.life > 0 && m.x > -100 && m.y < height)
      draw(now)
    }

    resize()
    const observer = new ResizeObserver(() => {
      resize()
      if (reduced) draw(0)
    })
    observer.observe(canvas)
    if (reduced) draw(0)
    else raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
}

export default StarField

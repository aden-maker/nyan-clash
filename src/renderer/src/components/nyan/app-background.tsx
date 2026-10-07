import React, { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useNyanLibrary, useNyanSettings } from '@renderer/nyan/store'
import { AUTO_BACKGROUND } from '@renderer/nyan/registry'
import StarField from './star-field'

/** 窗口最小化或被隐藏时暂停，回来再继续，避免后台白白解码视频 */
const BackgroundVideo: React.FC<{ src: string; poster?: string; style: React.CSSProperties }> = ({
  src,
  poster,
  style
}) => {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const sync = (): void => {
      if (document.hidden) video.pause()
      else video.play().catch(() => undefined)
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [src])

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay
      className="absolute inset-0 h-full w-full object-cover"
      style={style}
    />
  )
}

const AppBackground: React.FC = () => {
  const [settings] = useNyanSettings()
  const { backgrounds } = useNyanLibrary()
  const { resolvedTheme } = useTheme()

  const id =
    settings.backgroundId === 'auto'
      ? AUTO_BACKGROUND[resolvedTheme === 'dark' ? 'dark' : 'light']
      : settings.backgroundId
  const bg = id === 'none' ? undefined : backgrounds.find((b) => b.id === id)

  useEffect(() => {
    document.documentElement.classList.toggle('nyan-has-bg', Boolean(bg))
  }, [bg])

  if (!bg) return null

  const mediaStyle: React.CSSProperties = {
    filter: settings.backgroundBlur ? `blur(${settings.backgroundBlur}px)` : undefined,
    transform: settings.backgroundBlur ? 'scale(1.06)' : undefined
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {bg.kind === 'video' ? (
        <BackgroundVideo key={bg.id} src={bg.src} poster={bg.poster} style={mediaStyle} />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center transition-[background-image] duration-500"
          style={{ ...mediaStyle, backgroundImage: `url("${bg.src}")` }}
        />
      )}
      <div
        className="absolute inset-0 bg-background"
        style={{ opacity: settings.backgroundDim / 100 }}
      />
      {bg.effect === 'stars' && <StarField />}
    </div>
  )
}

export default AppBackground

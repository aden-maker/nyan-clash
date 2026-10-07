import standImg from '@renderer/assets/nyan/pets/nyan/stand.png'
import walkImg from '@renderer/assets/nyan/pets/nyan/walk.png'
import climbImg from '@renderer/assets/nyan/pets/nyan/climb.png'
import dragImg from '@renderer/assets/nyan/pets/nyan/drag.png'
import sleepImg from '@renderer/assets/nyan/pets/nyan/sleep.png'
import skyImg from '@renderer/assets/nyan/backgrounds/sky.jpg'
import nightImg from '@renderer/assets/nyan/backgrounds/night.jpg'
import seasideImg from '@renderer/assets/nyan/backgrounds/seaside.jpg'
import { BackgroundItem, NyanSettings, PetPack } from './types'

export const BUILTIN_PETS: PetPack[] = [
  {
    id: 'builtin:nyan',
    name: 'Nyan',
    author: 'Nyan Clash',
    builtin: true,
    sprites: {
      stand: { src: standImg },
      walk: { src: walkImg, facing: 'left' },
      climb: { src: climbImg, facing: 'right' },
      drag: { src: dragImg, scale: 1.05 },
      sleep: { src: sleepImg, scale: 0.6, facing: 'right' }
    }
  }
]

export const BUILTIN_BACKGROUNDS: BackgroundItem[] = [
  { id: 'builtin:sky', name: 'nyan.background.sky', src: skyImg, tone: 'light', builtin: true },
  {
    id: 'builtin:seaside',
    name: 'nyan.background.seaside',
    src: seasideImg,
    tone: 'light',
    builtin: true
  },
  {
    id: 'builtin:night',
    name: 'nyan.background.night',
    src: nightImg,
    tone: 'dark',
    builtin: true
  },
  {
    id: 'builtin:night-live',
    name: 'nyan.background.nightLive',
    src: nightImg,
    effect: 'stars',
    tone: 'dark',
    builtin: true
  }
]

export const AUTO_BACKGROUND = { light: 'builtin:sky', dark: 'builtin:night-live' } as const

export const DEFAULT_NYAN_SETTINGS: NyanSettings = {
  petEnabled: true,
  petId: 'builtin:nyan',
  petSize: 110,
  petSpeed: 1,
  petBehavior: 'roam',
  petClimb: true,
  backgroundId: 'auto',
  backgroundDim: 45,
  backgroundBlur: 0,
  clipboardDetect: true,
  showAdvancedSettings: false
}

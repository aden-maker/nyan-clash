import { heroui } from '@heroui/react'

// Nyan Clash：天空蓝 + 薄荷绿
const sky = {
  50: '#EAF8FF',
  100: '#D2F0FF',
  200: '#A8E2FF',
  300: '#78D2FF',
  400: '#4CC2FB',
  500: '#22AEF0',
  600: '#108CCB',
  700: '#0B6EA2',
  800: '#0B5680',
  900: '#0A4466'
}

const mint = {
  50: '#E8FDF6',
  100: '#C8F9E8',
  200: '#95F1D3',
  300: '#5FE5BC',
  400: '#34D3A6',
  500: '#19BA8F',
  600: '#0F9775',
  700: '#0E785F',
  800: '#0E5F4D',
  900: '#0C4E40'
}

const reversed = (scale: typeof sky): typeof sky => ({
  50: scale[900],
  100: scale[800],
  200: scale[700],
  300: scale[600],
  400: scale[500],
  500: scale[400],
  600: scale[300],
  700: scale[200],
  800: scale[100],
  900: scale[50]
})

export default heroui({
  layout: {
    radius: { small: '10px', medium: '14px', large: '20px' },
    boxShadow: {
      small: '0 2px 10px 0 rgba(34, 174, 240, 0.10), 0 1px 3px 0 rgba(34, 174, 240, 0.08)',
      medium: '0 6px 20px 0 rgba(34, 174, 240, 0.14), 0 2px 6px 0 rgba(34, 174, 240, 0.10)',
      large: '0 12px 36px 0 rgba(34, 174, 240, 0.18), 0 4px 12px 0 rgba(34, 174, 240, 0.12)'
    }
  },
  themes: {
    light: {
      colors: {
        background: '#F3FAFF',
        foreground: '#1E2A38',
        divider: 'rgba(34, 174, 240, 0.15)',
        focus: sky[400],
        content1: '#FFFFFF',
        content2: '#EEF7FD',
        content3: '#E2F0FA',
        content4: '#D3E7F5',
        default: {
          50: '#F6FAFD',
          100: '#EDF4FA',
          200: '#DCE8F2',
          300: '#C6D7E5',
          400: '#A2B6C8',
          500: '#7E93A8',
          600: '#5F7489',
          700: '#48596B',
          800: '#334150',
          900: '#212C38',
          DEFAULT: '#C6D7E5',
          foreground: '#1E2A38'
        },
        primary: { ...sky, DEFAULT: sky[500], foreground: '#FFFFFF' },
        secondary: { ...mint, DEFAULT: mint[500], foreground: '#FFFFFF' },
        success: { ...mint, DEFAULT: mint[400], foreground: '#FFFFFF' }
      }
    },
    dark: {
      colors: {
        background: '#0E1726',
        foreground: '#E6F1FF',
        divider: 'rgba(76, 194, 251, 0.15)',
        focus: sky[400],
        content1: '#152238',
        content2: '#1B2B45',
        content3: '#233654',
        content4: '#2C4263',
        default: {
          50: '#111B2B',
          100: '#1A2638',
          200: '#24334A',
          300: '#30425D',
          400: '#475C79',
          500: '#6A7F9C',
          600: '#93A5BE',
          700: '#B8C6D8',
          800: '#D9E2EE',
          900: '#EEF3F9',
          DEFAULT: '#30425D',
          foreground: '#E6F1FF'
        },
        primary: { ...reversed(sky), DEFAULT: sky[400], foreground: '#0E1726' },
        secondary: { ...reversed(mint), DEFAULT: mint[400], foreground: '#0E1726' },
        success: { ...reversed(mint), DEFAULT: mint[300], foreground: '#0E1726' }
      }
    }
  }
})

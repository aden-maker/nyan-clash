import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from '@renderer/components/base/toast'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { useProfileConfig } from '@renderer/hooks/use-profile-config'
import {
  addProfileItem,
  getProfileConfig,
  triggerSysProxy,
  updateTrayIconImmediate
} from '@renderer/utils/ipc'

/**
 * 从任意文本里认出订阅链接：http(s) 地址，或机场「一键导入」用的
 * clash:// / mihomo://install-config?url=... 链接。认不出时返回 undefined。
 */
export function parseSubscriptionUrl(text: string): string | undefined {
  const value = text.trim()
  if (!value || value.length > 4096 || /\s/.test(value)) return undefined
  try {
    const url = new URL(value)
    if (url.protocol === 'clash:' || url.protocol === 'mihomo:') {
      const inner = url.host === 'install-config' ? url.searchParams.get('url') : null
      return inner ? parseSubscriptionUrl(inner) : undefined
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

const SUBSCRIPTION_HINT =
  /sub|token|clash|mihomo|subscribe|flag=|target=|\/link\/|\/api\/v\d+\/client|\.ya?ml(\?|$)/i

/** 剪贴板识别用：普通网页链接不打扰，只认长得像订阅的地址 */
export function looksLikeSubscription(text: string): boolean {
  const value = text.trim()
  if (/^(clash|mihomo):\/\/install-config/i.test(value)) return true
  const url = parseSubscriptionUrl(value)
  if (!url) return false
  const { pathname, search } = new URL(url)
  return SUBSCRIPTION_HINT.test(pathname + search)
}

/** 隐藏订阅里的 token，只露出域名，避免截图时泄露 */
export function maskSubscriptionUrl(url: string): string {
  try {
    const { protocol, host } = new URL(url)
    return `${protocol}//${host}/••••••`
  } catch {
    return '••••••'
  }
}

/** 导入订阅并切换为当前配置 */
export function useImportSubscription(): {
  importing: boolean
  importSubscription: (url: string) => Promise<boolean>
} {
  const { t } = useTranslation()
  const { mutateProfileConfig, changeCurrentProfile } = useProfileConfig()
  const [importing, setImporting] = useState(false)

  const importSubscription = useCallback(
    async (input: string): Promise<boolean> => {
      const url = parseSubscriptionUrl(input)
      if (!url) {
        toast.error(t('home.import.invalid'))
        return false
      }
      setImporting(true)
      try {
        await addProfileItem({ name: '', type: 'remote', url })
        const config = await getProfileConfig()
        const added = config.items.filter((item) => item.url === url).at(-1)
        if (added && config.current !== added.id) await changeCurrentProfile(added.id)
        mutateProfileConfig()
        window.electron.ipcRenderer.send('updateTrayMenu')
        toast.success(t('home.import.success', { name: added?.name ?? '' }))
        return true
      } catch (e) {
        toast.error(String(e), t('home.import.failed'))
        return false
      } finally {
        setImporting(false)
      }
    },
    [t, mutateProfileConfig, changeCurrentProfile]
  )

  return { importing, importSubscription }
}

/** 与侧栏「系统代理」开关相同的切换流程，失败时回滚 */
export async function setSystemProxy(
  enable: boolean,
  tunEnabled: boolean,
  patchAppConfig: ReturnType<typeof useAppConfig>['patchAppConfig']
): Promise<void> {
  updateTrayIconImmediate(enable, tunEnabled)
  try {
    await patchAppConfig({ sysProxy: { enable } })
    await triggerSysProxy(enable)
    window.electron.ipcRenderer.send('updateFloatingWindow')
    window.electron.ipcRenderer.send('updateTrayMenu')
  } catch (e) {
    await patchAppConfig({ sysProxy: { enable: !enable } })
    updateTrayIconImmediate(!enable, tunEnabled)
    throw e
  }
}

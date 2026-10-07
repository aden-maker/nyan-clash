import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { useProfileConfig } from '@renderer/hooks/use-profile-config'
import { useNyanSettings } from '@renderer/nyan/store'
import {
  looksLikeSubscription,
  maskSubscriptionUrl,
  parseSubscriptionUrl,
  useImportSubscription
} from '@renderer/nyan/subscription'

const SEEN_KEY = 'nyan-clipboard-seen'

/** 订阅链接里带 token，只记录哈希，不把原文写进 localStorage */
function hashText(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/** 切回窗口时检查剪贴板；同一段内容只询问一次，已导入过的链接不再打扰 */
const ClipboardSubscription: React.FC = () => {
  const { t } = useTranslation()
  const [settings] = useNyanSettings()
  const { profileConfig } = useProfileConfig()
  const { importing, importSubscription } = useImportSubscription()
  const [found, setFound] = useState<string>()
  const knownUrls = useRef<Set<string>>(new Set())

  useEffect(() => {
    knownUrls.current = new Set(
      (profileConfig?.items ?? []).flatMap((i) => parseSubscriptionUrl(i.url ?? '') ?? [])
    )
  }, [profileConfig])

  const check = useCallback(async (): Promise<void> => {
    if (!profileConfig || document.hidden || !document.hasFocus()) return
    let text: string
    try {
      text = (await navigator.clipboard.readText()).trim()
    } catch {
      return
    }
    const hash = hashText(text)
    if (!text || hash === localStorage.getItem(SEEN_KEY)) return
    const url = parseSubscriptionUrl(text)
    if (!url || !looksLikeSubscription(text) || knownUrls.current.has(url)) return
    localStorage.setItem(SEEN_KEY, hash)
    setFound(url)
  }, [profileConfig])

  useEffect(() => {
    if (!settings.clipboardDetect) return
    const timer = window.setTimeout(check, 800)
    window.addEventListener('focus', check)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', check)
    }
  }, [settings.clipboardDetect, check])

  return (
    <Modal isOpen={Boolean(found)} onClose={() => setFound(undefined)} size="sm" backdrop="blur">
      <ModalContent>
        <ModalHeader>{t('home.clipboard.title')}</ModalHeader>
        <ModalBody>
          <p className="text-small text-default-500">{t('home.clipboard.description')}</p>
          <code className="select-text truncate rounded-medium bg-content2 px-3 py-2 text-small">
            {found && maskSubscriptionUrl(found)}
          </code>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={() => setFound(undefined)}>
            {t('home.clipboard.ignore')}
          </Button>
          <Button
            color="primary"
            isLoading={importing}
            onPress={async () => {
              if (found && (await importSubscription(found))) setFound(undefined)
            }}
          >
            {t('home.clipboard.import')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default ClipboardSubscription

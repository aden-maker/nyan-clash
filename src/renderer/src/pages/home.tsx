import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, CardBody, Input, Progress } from '@heroui/react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FaCircleArrowDown, FaCircleArrowUp } from 'react-icons/fa6'
import { IoChevronForward, IoClipboardOutline, IoFlash, IoPower } from 'react-icons/io5'
import BasePage from '@renderer/components/base/base-page'
import OutboundModeSwitcher from '@renderer/components/sider/outbound-mode-switcher'
import { toast } from '@renderer/components/base/toast'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { useControledMihomoConfig } from '@renderer/hooks/use-controled-mihomo-config'
import { useGroups } from '@renderer/hooks/use-groups'
import { useProfileConfig } from '@renderer/hooks/use-profile-config'
import { calcTraffic } from '@renderer/utils/calc'
import { mihomoChangeProxy, mihomoGroupDelay } from '@renderer/utils/ipc'
import { setSystemProxy, useImportSubscription } from '@renderer/nyan/subscription'

const delayColor = (delay?: number): string =>
  !delay
    ? 'text-default-400'
    : delay < 300
      ? 'text-success'
      : delay < 800
        ? 'text-warning'
        : 'text-danger'

const ConnectButton: React.FC<{
  connected: boolean
  busy: boolean
  onPress: () => void
}> = ({ connected, busy, onPress }) => {
  const { t } = useTranslation()
  return (
    <button
      onClick={onPress}
      disabled={busy}
      aria-pressed={connected}
      className={`nyan-connect group relative flex h-40 w-40 shrink-0 flex-col items-center justify-center gap-1 rounded-full text-white transition-transform duration-300 hover:scale-105 active:scale-95 disabled:opacity-70 ${connected ? 'nyan-connect-on' : 'nyan-connect-off'}`}
    >
      <IoPower className={`text-5xl ${busy ? 'animate-pulse' : ''}`} />
      <span className="text-medium font-bold">
        {busy ? t('home.connect.busy') : connected ? t('home.connect.on') : t('home.connect.off')}
      </span>
    </button>
  )
}

const Speed: React.FC = () => {
  const [traffic, setTraffic] = useState<IMihomoTrafficInfo>({ up: 0, down: 0 })
  useEffect(
    () =>
      window.electron.ipcRenderer.on('mihomoTraffic', (_e: unknown, ...args: unknown[]) =>
        setTraffic(args[0] as IMihomoTrafficInfo)
      ),
    []
  )
  return (
    <div className="flex gap-4 text-small text-default-500">
      <span className="flex items-center gap-1">
        <FaCircleArrowUp className="text-primary" />
        {calcTraffic(traffic.up)}/s
      </span>
      <span className="flex items-center gap-1">
        <FaCircleArrowDown className="text-secondary" />
        {calcTraffic(traffic.down)}/s
      </span>
    </div>
  )
}

const ImportGuide: React.FC = () => {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const { importing, importSubscription } = useImportSubscription()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  return (
    <Card className="nyan-home-card">
      <CardBody className="gap-3 p-5">
        <div>
          <h3 className="text-large font-bold">{t('home.import.title')}</h3>
          <p className="mt-1 text-small text-default-500">{t('home.import.description')}</p>
        </div>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            size="md"
            value={url}
            onValueChange={setUrl}
            placeholder={t('home.import.placeholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url.trim())
                importSubscription(url).then((ok) => ok && setUrl(''))
            }}
            endContent={
              <button
                title={t('home.import.paste')}
                className="text-default-400 hover:text-primary"
                onClick={async () => setUrl((await navigator.clipboard.readText()).trim())}
              >
                <IoClipboardOutline className="text-lg" />
              </button>
            }
          />
          <Button
            color="primary"
            isLoading={importing}
            isDisabled={!url.trim()}
            onPress={() => importSubscription(url).then((ok) => ok && setUrl(''))}
          >
            {t('home.import.button')}
          </Button>
        </div>
        <ol className="list-decimal space-y-0.5 pl-5 text-tiny text-default-500">
          <li>{t('home.import.tip1')}</li>
          <li>{t('home.import.tip2')}</li>
        </ol>
      </CardBody>
    </Card>
  )
}

const ProfileSummary: React.FC<{ item: IProfileItem }> = ({ item }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const info = item.extra
  const used = info ? info.upload + info.download : 0
  const expire = info?.expire ? new Date(info.expire * 1000) : undefined
  const daysLeft = expire ? Math.ceil((expire.getTime() - Date.now()) / 86400000) : undefined

  return (
    <Card isPressable onPress={() => navigate('/profiles')} className="nyan-home-card">
      <CardBody className="gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-tiny text-default-500">{t('home.profile.title')}</span>
          <IoChevronForward className="text-default-400" />
        </div>
        <div className="truncate text-medium font-bold">{item.name}</div>
        {info && info.total > 0 ? (
          <>
            <Progress
              size="sm"
              aria-label={t('home.profile.traffic')}
              value={Math.min(100, (used / info.total) * 100)}
              color={used / info.total > 0.9 ? 'danger' : 'primary'}
            />
            <div className="flex justify-between text-tiny text-default-500">
              <span>
                {calcTraffic(used)} / {calcTraffic(info.total)}
              </span>
              {daysLeft !== undefined && (
                <span className={daysLeft <= 7 ? 'text-danger' : ''}>
                  {daysLeft > 0
                    ? t('home.profile.daysLeft', { days: daysLeft })
                    : t('home.profile.expired')}
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="text-tiny text-default-500">{t('home.profile.noInfo')}</span>
        )}
      </CardBody>
    </Card>
  )
}

const NodeSummary: React.FC<{ mode?: OutboundMode }> = ({ mode }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { groups, mutate } = useGroups()
  const [testing, setTesting] = useState(false)

  const group = useMemo(
    () =>
      mode === 'global'
        ? groups?.find((g) => g.name === 'GLOBAL')
        : (groups?.find((g) => g.name !== 'GLOBAL') ?? groups?.[0]),
    [groups, mode]
  )
  const current = group?.all.find((p) => p.name === group.now)
  const delay = current?.history.at(-1)?.delay

  const pickFastest = async (): Promise<void> => {
    if (!group) return
    setTesting(true)
    try {
      const result = await mihomoGroupDelay(group.name, group.testUrl)
      const best = Object.entries(result)
        .filter(([name, d]) => d > 0 && name !== group.name)
        .sort((a, b) => a[1] - b[1])[0]
      if (!best) {
        toast.error(t('home.node.allFailed'))
      } else if (group.type === 'Selector') {
        await mihomoChangeProxy(group.name, best[0])
        toast.success(t('home.node.switched', { name: best[0], delay: best[1] }))
      } else {
        toast.success(t('home.node.tested', { name: best[0], delay: best[1] }))
      }
      await mutate()
    } catch (e) {
      toast.error(String(e))
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="nyan-home-card">
      <CardBody className="gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-tiny text-default-500">
            {group ? t('home.node.title', { group: group.name }) : t('home.node.titleEmpty')}
          </span>
          <button
            className="text-default-400 hover:text-primary"
            title={t('home.node.more')}
            onClick={() => navigate('/proxies')}
          >
            <IoChevronForward />
          </button>
        </div>
        {mode === 'direct' ? (
          <div className="text-medium font-bold">{t('home.node.direct')}</div>
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-medium font-bold">{group?.now ?? '—'}</span>
            <span className={`shrink-0 text-small ${delayColor(delay)}`}>
              {delay ? `${delay} ms` : ''}
            </span>
          </div>
        )}
        <Button
          size="sm"
          variant="flat"
          color="primary"
          isLoading={testing}
          isDisabled={!group || mode === 'direct'}
          startContent={!testing && <IoFlash />}
          onPress={pickFastest}
        >
          {group?.type === 'Selector' || !group ? t('home.node.fastest') : t('home.node.test')}
        </Button>
      </CardBody>
    </Card>
  )
}

const Home: React.FC = () => {
  const { t } = useTranslation()
  const { appConfig, patchAppConfig } = useAppConfig()
  const { controledMihomoConfig } = useControledMihomoConfig()
  const { profileConfig } = useProfileConfig()
  const [busy, setBusy] = useState(false)

  const sysProxy = appConfig?.sysProxy?.enable ?? false
  const tun = controledMihomoConfig?.tun?.enable ?? false
  const connected = sysProxy || tun
  const items = profileConfig?.items ?? []
  const currentItem = items.find((i) => i.id === profileConfig?.current)
  const hasProfile = items.length > 0

  const toggle = async (): Promise<void> => {
    if (!connected && !hasProfile) {
      toast.warning(t('home.connect.needProfile'))
      return
    }
    if (tun && !sysProxy) {
      toast.info(t('home.connect.tunOn'))
      return
    }
    setBusy(true)
    try {
      await setSystemProxy(!sysProxy, tun, patchAppConfig)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <BasePage title={t('home.title')}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
        <Card className="nyan-home-card overflow-visible">
          <CardBody className="flex flex-col items-center gap-8 overflow-visible p-8 sm:flex-row">
            <ConnectButton connected={connected} busy={busy} onPress={toggle} />
            <div className="flex w-full min-w-0 flex-col gap-3">
              <div>
                <h2 className="text-2xl font-bold">
                  {connected ? t('home.status.on') : t('home.status.off')}
                </h2>
                <p className="mt-1 text-small text-default-500">
                  {!hasProfile
                    ? t('home.status.noProfile')
                    : connected
                      ? tun
                        ? t('home.status.viaTun')
                        : t('home.status.viaSysProxy')
                      : t('home.status.hint')}
                </p>
              </div>
              <OutboundModeSwitcher />
              <Speed />
            </div>
          </CardBody>
        </Card>

        {hasProfile ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {currentItem ? <ProfileSummary item={currentItem} /> : <ImportGuide />}
            <NodeSummary mode={controledMihomoConfig?.mode} />
          </div>
        ) : (
          <ImportGuide />
        )}
      </div>
    </BasePage>
  )
}

export default Home

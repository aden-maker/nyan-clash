import React from 'react'
import { Button } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { IoCodeSlash, IoHeart, IoOpenOutline } from 'react-icons/io5'
import SettingCard from '@renderer/components/base/base-setting-card'
import { version } from '@renderer/utils/init'
import { NYAN_CREDITS, NYAN_LINKS } from '@renderer/nyan/meta'
import logoImg from '@renderer/assets/logo.png'

const NyanAbout: React.FC = () => {
  const { t } = useTranslation()

  return (
    <SettingCard title={t('nyan.about.title')}>
      <div className="flex items-center gap-3 py-2">
        <img src={logoImg} alt="" className="h-12 w-12 rounded-large" draggable={false} />
        <div className="min-w-0 flex-1">
          <div className="text-medium font-bold">Nyan Clash v{version}</div>
          <div className="text-tiny text-default-500">{t('nyan.about.license')}</div>
        </div>
        <div className="flex shrink-0 gap-2">
          {NYAN_LINKS.repo && (
            <Button
              size="sm"
              variant="flat"
              startContent={<IoCodeSlash />}
              onPress={() => window.open(NYAN_LINKS.repo)}
            >
              {t('nyan.about.source')}
            </Button>
          )}
          {NYAN_LINKS.donate && (
            <Button
              size="sm"
              color="danger"
              variant="flat"
              startContent={<IoHeart />}
              onPress={() => window.open(NYAN_LINKS.donate)}
            >
              {t('nyan.about.donate')}
            </Button>
          )}
        </div>
      </div>
      <h4 className="mt-2 mb-1 text-small text-default-500">{t('nyan.about.credits')}</h4>
      <ul className="divide-y divide-default-100">
        {NYAN_CREDITS.map((c) => (
          <li key={c.name} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <div className="text-small font-semibold">{c.name}</div>
              <div className="text-tiny text-default-500">
                {t(c.role)} · {c.license}
              </div>
            </div>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              title={c.url}
              onPress={() => window.open(c.url)}
            >
              <IoOpenOutline />
            </Button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-tiny leading-relaxed text-default-400">{t('nyan.about.note')}</p>
    </SettingCard>
  )
}

export default NyanAbout

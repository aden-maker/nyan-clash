import { Button } from '@heroui/react'
import BasePage from '@renderer/components/base/base-page'
import { IoChevronDown, IoCodeSlash } from 'react-icons/io5'
import { RiBilibiliFill } from 'react-icons/ri'
import WebdavConfig from '@renderer/components/settings/webdav-config'
import GeneralConfig from '@renderer/components/settings/general-config'
import MihomoConfig from '@renderer/components/settings/mihomo-config'
import Actions from '@renderer/components/settings/actions'
import ShortcutConfig from '@renderer/components/settings/shortcut-config'
import SiderConfig from '@renderer/components/settings/sider-config'
import SubStoreConfig from '@renderer/components/settings/substore-config'
import LocalBackupConfig from '@renderer/components/settings/local-backup-config'
import NyanConfig from '@renderer/components/nyan/nyan-config'
import NyanAbout from '@renderer/components/nyan/nyan-about'
import { NYAN_LINKS } from '@renderer/nyan/meta'
import { useNyanSettings } from '@renderer/nyan/store'
import { useTranslation } from 'react-i18next'

const Settings: React.FC = () => {
  const { t } = useTranslation()
  const [nyan, patchNyan] = useNyanSettings()

  return (
    <BasePage
      title={t('settings.title')}
      header={
        <>
          {NYAN_LINKS.repo && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="app-nodrag"
              title={t('nyan.about.source')}
              onPress={() => window.open(NYAN_LINKS.repo)}
            >
              <IoCodeSlash className="text-lg" />
            </Button>
          )}
          {NYAN_LINKS.bilibili && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              className="app-nodrag"
              title={t('nyan.about.bilibili')}
              onPress={() => window.open(NYAN_LINKS.bilibili)}
            >
              <RiBilibiliFill className="text-lg" />
            </Button>
          )}
        </>
      }
    >
      <NyanConfig />
      <GeneralConfig />
      <div className="nyan-home-card mx-2 mb-2 rounded-large bg-content1 p-2 shadow-small">
        <Button
          fullWidth
          variant="flat"
          startContent={
            <IoChevronDown
              className={`transition-transform ${nyan.showAdvancedSettings ? 'rotate-180' : ''}`}
            />
          }
          onPress={() => patchNyan({ showAdvancedSettings: !nyan.showAdvancedSettings })}
        >
          {nyan.showAdvancedSettings ? t('settings.advanced.hide') : t('settings.advanced.show')}
        </Button>
        {!nyan.showAdvancedSettings && (
          <p className="mt-1.5 text-center text-tiny text-default-500">
            {t('settings.advanced.hint')}
          </p>
        )}
      </div>
      {nyan.showAdvancedSettings && (
        <>
          <SubStoreConfig />
          <SiderConfig />
          <WebdavConfig />
          <MihomoConfig />
          <ShortcutConfig />
          <LocalBackupConfig />
        </>
      )}
      <Actions />
      <NyanAbout />
    </BasePage>
  )
}

export default Settings

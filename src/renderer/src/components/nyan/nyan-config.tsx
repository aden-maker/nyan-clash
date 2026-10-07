import React, { useRef, useState } from 'react'
import {
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Slider,
  Switch,
  Tab,
  Tabs,
  Tooltip
} from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { IoAdd, IoClose, IoDownloadOutline, IoBan, IoPlay, IoSparkles } from 'react-icons/io5'
import SettingCard from '@renderer/components/base/base-setting-card'
import SettingItem from '@renderer/components/base/base-setting-item'
import { toast } from '@renderer/components/base/toast'
import {
  exportPetPack,
  importBackgroundFile,
  importPetPackFile,
  removeBackground,
  removePet,
  useNyanLibrary,
  useNyanSettings
} from '@renderer/nyan/store'
import { DEFAULT_NYAN_SETTINGS } from '@renderer/nyan/registry'
import PetImportModal from './pet-import-modal'

interface TileProps {
  selected: boolean
  onSelect: () => void
  label: string
  children: React.ReactNode
  actions?: React.ReactNode
  wide?: boolean
}

const Tile: React.FC<TileProps> = ({ selected, onSelect, label, children, actions, wide }) => (
  <div className="group relative flex flex-col items-center gap-1">
    <button
      onClick={onSelect}
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-medium border-2 bg-content2 transition-all ${wide ? 'aspect-video' : 'h-24'} ${selected ? 'border-primary shadow-medium' : 'border-transparent hover:border-primary/40'}`}
    >
      {children}
    </button>
    <span className={`w-full truncate text-center text-tiny ${selected ? 'text-primary' : ''}`}>
      {label}
    </span>
    {actions && (
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {actions}
      </div>
    )}
  </div>
)

const TileAction: React.FC<{ title: string; onPress: () => void; children: React.ReactNode }> = ({
  title,
  onPress,
  children
}) => (
  <Tooltip content={title}>
    <button
      onClick={(e) => {
        e.stopPropagation()
        onPress()
      }}
      className="flex h-6 w-6 items-center justify-center rounded-full bg-content1/90 text-default-600 shadow-small hover:text-primary"
    >
      {children}
    </button>
  </Tooltip>
)

const NyanConfig: React.FC = () => {
  const { t } = useTranslation()
  const [settings, patch] = useNyanSettings()
  const { pets, backgrounds } = useNyanLibrary()
  const [creating, setCreating] = useState(false)
  const packInput = useRef<HTMLInputElement>(null)
  const bgInput = useRef<HTMLInputElement>(null)

  const run = async (fn: () => Promise<unknown>, ok?: string): Promise<void> => {
    try {
      await fn()
      if (ok) toast.success(ok)
    } catch (e) {
      toast.error(String(e))
    }
  }

  return (
    <SettingCard title={t('nyan.title')}>
      <SettingItem title={t('home.clipboard.setting')} divider>
        <Switch
          size="sm"
          isSelected={settings.clipboardDetect}
          onValueChange={(v) => patch({ clipboardDetect: v })}
        />
      </SettingItem>
      <SettingItem title={t('nyan.pet.enable')} divider>
        <Switch
          size="sm"
          isSelected={settings.petEnabled}
          onValueChange={(v) => patch({ petEnabled: v })}
        />
      </SettingItem>

      <h4 className="mb-2 text-small text-default-500">{t('nyan.pet.choose')}</h4>
      <div className="mb-2 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
        {pets.map((pet) => (
          <Tile
            key={pet.id}
            selected={settings.petId === pet.id}
            onSelect={() => patch({ petId: pet.id, petEnabled: true })}
            label={pet.name}
            actions={
              <>
                <TileAction
                  title={t('nyan.pet.export')}
                  onPress={() => run(() => exportPetPack(pet))}
                >
                  <IoDownloadOutline />
                </TileAction>
                {!pet.builtin && (
                  <TileAction
                    title={t('common.delete')}
                    onPress={() => run(() => removePet(pet.id))}
                  >
                    <IoClose />
                  </TileAction>
                )}
              </>
            }
          >
            <img
              src={pet.sprites.stand.src}
              alt=""
              className="max-h-[88%] max-w-[88%] object-contain"
              draggable={false}
            />
          </Tile>
        ))}
        <Dropdown>
          <DropdownTrigger>
            <button className="flex h-24 flex-col items-center justify-center gap-1 rounded-medium border-2 border-dashed border-default-300 text-default-500 hover:border-primary hover:text-primary">
              <IoAdd className="text-2xl" />
              <span className="text-tiny">{t('nyan.pet.add')}</span>
            </button>
          </DropdownTrigger>
          <DropdownMenu
            onAction={(key) => (key === 'images' ? setCreating(true) : packInput.current?.click())}
          >
            <DropdownItem key="images" description={t('nyan.pet.fromImagesDesc')}>
              {t('nyan.pet.fromImages')}
            </DropdownItem>
            <DropdownItem key="pack" description={t('nyan.pet.fromPackDesc')}>
              {t('nyan.pet.fromPack')}
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>
      <input
        ref={packInput}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file)
            run(async () => {
              const pack = await importPetPackFile(file)
              patch({ petId: pack.id, petEnabled: true })
            }, t('nyan.pet.importedPack'))
        }}
      />

      <SettingItem title={t('nyan.pet.behavior')}>
        <Tabs
          size="sm"
          color="primary"
          selectedKey={settings.petBehavior}
          onSelectionChange={(key) => patch({ petBehavior: key as 'roam' | 'static' })}
        >
          <Tab key="roam" title={t('nyan.pet.roam')} />
          <Tab key="static" title={t('nyan.pet.static')} />
        </Tabs>
      </SettingItem>
      <SettingItem title={t('nyan.pet.climb')}>
        <Switch
          size="sm"
          isSelected={settings.petClimb}
          isDisabled={settings.petBehavior === 'static'}
          onValueChange={(v) => patch({ petClimb: v })}
        />
      </SettingItem>
      <SettingItem title={t('nyan.pet.size')}>
        <Slider
          size="sm"
          className="w-1/2"
          minValue={60}
          maxValue={220}
          step={5}
          value={settings.petSize}
          onChange={(v) => patch({ petSize: v as number })}
          getValue={(v) => `${v}px`}
        />
      </SettingItem>
      <SettingItem title={t('nyan.pet.speed')} divider>
        <Slider
          size="sm"
          className="w-1/2"
          minValue={0.3}
          maxValue={3}
          step={0.1}
          value={settings.petSpeed}
          onChange={(v) => patch({ petSpeed: v as number })}
          getValue={(v) => `${v}x`}
        />
      </SettingItem>

      <h4 className="mb-2 text-small text-default-500">{t('nyan.background.choose')}</h4>
      <div className="mb-2 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
        <Tile
          wide
          selected={settings.backgroundId === 'auto'}
          onSelect={() => patch({ backgroundId: 'auto' })}
          label={t('nyan.background.auto')}
        >
          <IoSparkles className="text-2xl text-primary" />
        </Tile>
        <Tile
          wide
          selected={settings.backgroundId === 'none'}
          onSelect={() => patch({ backgroundId: 'none' })}
          label={t('nyan.background.none')}
        >
          <IoBan className="text-2xl text-default-400" />
        </Tile>
        {backgrounds.map((bg) => (
          <Tile
            key={bg.id}
            wide
            selected={settings.backgroundId === bg.id}
            onSelect={() => patch({ backgroundId: bg.id })}
            label={bg.builtin ? t(bg.name) : bg.name}
            actions={
              !bg.builtin && (
                <TileAction
                  title={t('common.delete')}
                  onPress={() => run(() => removeBackground(bg.id))}
                >
                  <IoClose />
                </TileAction>
              )
            }
          >
            <img
              src={bg.kind === 'video' ? bg.poster : bg.src}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
            {(bg.kind === 'video' || bg.effect || bg.src.startsWith('blob:')) && (
              <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                <IoPlay className="text-[9px]" />
                {t('nyan.background.live')}
              </span>
            )}
          </Tile>
        ))}
        <button
          onClick={() => bgInput.current?.click()}
          className="flex aspect-video flex-col items-center justify-center gap-1 rounded-medium border-2 border-dashed border-default-300 text-default-500 hover:border-primary hover:text-primary"
        >
          <IoAdd className="text-2xl" />
          <span className="text-tiny">{t('nyan.background.add')}</span>
        </button>
      </div>
      <input
        ref={bgInput}
        type="file"
        accept="image/*,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file)
            run(async () => {
              const bg = await importBackgroundFile(file)
              patch({ backgroundId: bg.id })
            }, t('nyan.background.imported'))
        }}
      />

      <SettingItem title={t('nyan.background.dim')}>
        <Slider
          size="sm"
          className="w-1/2"
          minValue={0}
          maxValue={90}
          step={5}
          value={settings.backgroundDim}
          isDisabled={settings.backgroundId === 'none'}
          onChange={(v) => patch({ backgroundDim: v as number })}
          getValue={(v) => `${v}%`}
        />
      </SettingItem>
      <SettingItem title={t('nyan.background.blur')}>
        <Slider
          size="sm"
          className="w-1/2"
          minValue={0}
          maxValue={20}
          step={1}
          value={settings.backgroundBlur}
          isDisabled={settings.backgroundId === 'none'}
          onChange={(v) => patch({ backgroundBlur: v as number })}
          getValue={(v) => `${v}px`}
        />
      </SettingItem>
      <Divider className="my-2" />
      <Button
        size="sm"
        variant="flat"
        className="w-full"
        onPress={() =>
          patch({
            ...DEFAULT_NYAN_SETTINGS,
            petEnabled: settings.petEnabled,
            petId: settings.petId,
            backgroundId: settings.backgroundId,
            clipboardDetect: settings.clipboardDetect,
            showAdvancedSettings: settings.showAdvancedSettings
          })
        }
      >
        {t('nyan.reset')}
      </Button>
      {creating && <PetImportModal onClose={() => setCreating(false)} />}
    </SettingCard>
  )
}

export default NyanConfig

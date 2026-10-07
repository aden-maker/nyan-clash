import React, { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader
} from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { IoSwapHorizontal } from 'react-icons/io5'
import { toast } from '@renderer/components/base/toast'
import { importPetFromImages, patchNyanSettings } from '@renderer/nyan/store'
import { PET_POSES, PetPose } from '@renderer/nyan/types'

interface Props {
  onClose: () => void
}

type Entry = { file: File; url: string; facing: 'left' | 'right' }

const PetImportModal: React.FC<Props> = ({ onClose }) => {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [entries, setEntries] = useState<Partial<Record<PetPose, Entry>>>({})
  const [saving, setSaving] = useState(false)

  useEffect(
    () => () => Object.values(entries).forEach((e) => e && URL.revokeObjectURL(e.url)),
    [entries]
  )

  const pick = (pose: PetPose, file?: File): void => {
    if (!file) return
    setEntries((prev) => ({
      ...prev,
      [pose]: { file, url: URL.createObjectURL(file), facing: prev[pose]?.facing ?? 'right' }
    }))
  }

  const toggleFacing = (pose: PetPose): void => {
    setEntries((prev) => {
      const e = prev[pose]
      return e
        ? { ...prev, [pose]: { ...e, facing: e.facing === 'left' ? 'right' : 'left' } }
        : prev
    })
  }

  const save = async (): Promise<void> => {
    setSaving(true)
    try {
      const pack = await importPetFromImages(name.trim(), entries)
      patchNyanSettings({ petId: pack.id, petEnabled: true })
      toast.success(t('nyan.pet.imported', { name: pack.name }))
      onClose()
    } catch (e) {
      toast.error(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen onOpenChange={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>{t('nyan.pet.createTitle')}</ModalHeader>
        <ModalBody className="gap-3">
          <Input
            size="sm"
            label={t('nyan.pet.name')}
            value={name}
            onValueChange={setName}
            placeholder={t('nyan.pet.namePlaceholder')}
          />
          <p className="text-tiny text-default-500">{t('nyan.pet.createHint')}</p>
          <div className="grid grid-cols-5 gap-2">
            {PET_POSES.map((pose) => {
              const e = entries[pose]
              return (
                <div key={pose} className="flex flex-col items-center gap-1">
                  <label className="flex h-24 w-full cursor-pointer items-center justify-center overflow-hidden rounded-medium border-2 border-dashed border-default-300 bg-content2 hover:border-primary">
                    {e ? (
                      <img
                        src={e.url}
                        alt=""
                        className="max-h-full max-w-full object-contain"
                        style={{ transform: e.facing === 'left' ? 'scaleX(-1)' : undefined }}
                      />
                    ) : (
                      <span className="text-2xl text-default-400">+</span>
                    )}
                    <input
                      type="file"
                      accept="image/png,image/webp,image/gif,image/jpeg"
                      className="hidden"
                      onChange={(ev) => pick(pose, ev.target.files?.[0])}
                    />
                  </label>
                  <span className="text-tiny">
                    {t(`nyan.pose.${pose}`)}
                    {pose === 'stand' && <span className="text-danger">*</span>}
                  </span>
                  {e && (
                    <Button
                      size="sm"
                      variant="light"
                      className="h-6 min-w-0 px-1 text-tiny"
                      startContent={<IoSwapHorizontal />}
                      onPress={() => toggleFacing(pose)}
                    >
                      {t(e.facing === 'left' ? 'nyan.pet.facingLeft' : 'nyan.pet.facingRight')}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" variant="light" onPress={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            color="primary"
            isDisabled={!entries.stand}
            isLoading={saving}
            onPress={save}
          >
            {t('common.save')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default PetImportModal

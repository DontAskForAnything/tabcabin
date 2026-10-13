import { Upload } from 'lucide-react'
import { Button } from '@tabcabin/ui'
import { useRef } from 'react'
import { useT } from '@/i18n'
import { IMPORT_ACCEPT, useImportFile } from '../../shared/useImportFile'
import { Row } from '../Row'

/** Imports a backup, a Toby or tabExtend export, a bookmarks file or a list of links. */
export function ImportFileRow() {
  const t = useT()
  const fileInput = useRef<HTMLInputElement>(null)
  const run = useImportFile()

  return (
    <Row label={t('transfer.import')} hint={t('transfer.importHint')}>
      <input
        ref={fileInput}
        type="file"
        accept={IMPORT_ACCEPT}
        aria-label={t('transfer.import')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void run(file)
        }}
      />
      <Button size="sm" icon={<Upload size={14} />} onClick={() => fileInput.current?.click()}>
        {t('transfer.chooseFile')}
      </Button>
    </Row>
  )
}

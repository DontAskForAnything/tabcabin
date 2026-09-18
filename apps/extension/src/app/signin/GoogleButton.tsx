import { useT } from '@/i18n'
import { GoogleMark } from './GoogleMark'

/** The main way in: a large "Continue with Google" button. */
export function GoogleButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-[54px] w-full items-center justify-center gap-3 rounded-[14px] border border-line bg-card text-[15.5px] font-semibold shadow-card transition-[border-color,box-shadow,transform] outline-none hover:border-ink-4 focus-visible:shadow-[0_0_0_2px_var(--focus)] active:scale-[0.99] disabled:opacity-50"
    >
      <GoogleMark size={20} />
      {t('sync.google')}
    </button>
  )
}

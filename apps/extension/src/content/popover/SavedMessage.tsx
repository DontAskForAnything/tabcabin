import { Check } from 'lucide-react'

export function SavedMessage({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-success text-white">
        <Check size={22} strokeWidth={2.8} />
      </span>
      <span className="text-[15px] font-semibold">{text}</span>
    </div>
  )
}

import { Eye, EyeOff } from 'lucide-react'
import { type ComponentProps, useId, useState } from 'react'
import { cn } from '../lib/cn'
import { FIELD_INPUT } from './fieldInput'
import { IconButton } from './IconButton'
import { useUiText } from './UiText'

export interface PasswordFieldProps extends Omit<ComponentProps<'input'>, 'type'> {
  label: string
}

/**
 * Labeled password field with an eye button that shows what was typed. The button sits outside the
 * label, so the field is still named by the label alone.
 */
export function PasswordField({ label, className, id, ...props }: PasswordFieldProps) {
  const text = useUiText()
  const ownId = useId()
  const inputId = id ?? ownId
  const [shown, setShown] = useState(false)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={shown ? 'text' : 'password'}
          // A shown password is plain text, which the spell checker would otherwise read.
          spellCheck={false}
          // Edge draws its own eye in password fields.
          className={cn(FIELD_INPUT, 'w-full pr-11 [&::-ms-reveal]:hidden')}
          {...props}
        />
        <IconButton
          label={shown ? text.hidePassword : text.showPassword}
          icon={shown ? <EyeOff size={17} /> : <Eye size={17} />}
          size="sm"
          tooltip={false}
          className="absolute top-1/2 right-2 -translate-y-1/2"
          // Keeps the cursor in the field, so typing goes on after a click.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setShown((value) => !value)}
        />
      </div>
    </div>
  )
}

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { Favicon } from './LetterTile'

describe('components', () => {
  it('renders a button with the given variant', () => {
    const onClick = vi.fn()
    render(
      <Button variant="primary" onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button.className).toContain('bg-accent')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('toggles a checkbox', () => {
    const onChange = vi.fn()
    render(<Checkbox checked={false} onCheckedChange={onChange} label="Done" />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Done' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('falls back to a letter tile when the favicon fails', () => {
    const { container } = render(<Favicon src="https://x/icon.png" seed="github.com" />)
    const img = container.querySelector('img')!
    fireEvent.error(img)
    expect(container.textContent).toBe('G')
  })
})

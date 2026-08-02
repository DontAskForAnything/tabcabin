import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearToasts, dismissToast, toast } from './toast'
import { renderHook, act } from '@testing-library/react'
import { useToasts } from './toast'

afterEach(() => {
  clearToasts()
  vi.useRealTimers()
})

describe('toast store', () => {
  it('adds, auto-dismisses and caps the stack', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useToasts())
    act(() => {
      for (let i = 0; i < 6; i++) toast({ title: `t${i}` })
    })
    expect(result.current.map((t) => t.title)).toEqual(['t2', 't3', 't4', 't5'])
    act(() => {
      vi.advanceTimersByTime(4600)
    })
    expect(result.current).toHaveLength(0)
  })

  it('keeps toasts with an action longer and dismisses manually', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useToasts())
    let id = 0
    act(() => {
      id = toast({ title: 'Deleted', action: { label: 'Undo', onClick: () => {} } })
    })
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current).toHaveLength(1)
    act(() => dismissToast(id))
    expect(result.current).toHaveLength(0)
  })
})

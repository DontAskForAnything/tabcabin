import type { CSSProperties } from 'react'
import './done.css'

/** Six specks that fly out of a checkbox when its to-do is ticked off. */
export function DoneBurst() {
  return (
    <span aria-hidden className="done-burst">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <i key={i} style={{ '--angle': `${i * 60 - 30}deg` } as CSSProperties} />
      ))}
    </span>
  )
}

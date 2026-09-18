import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles.css'

export type Surface = 'newtab' | 'sidepanel' | 'signin'

export function mountApp(surface: Surface) {
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing #root element')
  createRoot(root).render(
    <StrictMode>
      <App surface={surface} />
    </StrictMode>,
  )
}

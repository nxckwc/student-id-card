'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

const getInitialTheme = () => {
  if (typeof document !== 'undefined') return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  return 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme)

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('theme')
    const nextTheme = storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    setTheme(nextTheme)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', nextTheme === 'dark')
    window.localStorage.setItem('theme', nextTheme)
    setTheme(nextTheme)
  }

  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex size-9 items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
      aria-label={label}
      title={label}
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

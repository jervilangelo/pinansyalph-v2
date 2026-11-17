import { useEffect, useState } from 'react'

/**
 * Bridge to the splash overlay in index.html. The overlay is plain HTML and
 * CSS so it paints before any JavaScript arrives; the app calls
 * markAppReady() once a real page has mounted. index.html owns the timing
 * (first visit lets the logo reveal finish; repeat visits leave at once)
 * and a CSS fail-safe hides the overlay even if this is never called.
 */
let done = false

export function markAppReady() {
  if (done || typeof window === 'undefined') return
  done = true
  const w = window as Window & { __ppReady?: () => void }
  const fonts = document.fonts?.ready ?? Promise.resolve()
  // Wait for the brand fonts so the first frame is final, but never more than 1.2s.
  Promise.race([fonts, new Promise((r) => setTimeout(r, 1200))]).then(() => {
    requestAnimationFrame(() => w.__ppReady?.())
  })
}

const isGone = () => {
  if (typeof document === 'undefined') return true
  const s = document.getElementById('splash')
  return !s || s.classList.contains('out')
}

/** True once the splash has started to leave (or was never there). */
export function useSplashGone() {
  const [gone, setGone] = useState(isGone)
  useEffect(() => {
    if (gone) return
    const on = () => setGone(true)
    window.addEventListener('pp:splash-out', on)
    // Fail-safe, matching the CSS one in index.html.
    const t = setTimeout(on, 8000)
    return () => {
      window.removeEventListener('pp:splash-out', on)
      clearTimeout(t)
    }
  }, [gone])
  return gone
}

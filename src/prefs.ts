/**
 * The only things PinansyalPH keeps for its own settings: the language and the
 * theme, in this browser's localStorage. Storage can be missing or blocked
 * (private windows, strict settings); reads then return null and writes are
 * skipped, and the site uses its defaults.
 */
export function readPref(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage unavailable: the choice lasts for this visit only.
  }
}

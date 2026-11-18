import { BookOpen, Cloud, Dumbbell, Gamepad2, Heart, Music, Newspaper, ShoppingBag, Sparkles, Tv, type LucideIcon } from 'lucide-react'
import type { CustomIcon } from '../../../calculators/subscriptions'

export const ICONS: Record<CustomIcon, { icon: LucideIcon; label: string }> = {
  tv: { icon: Tv, label: 'TV' },
  music: { icon: Music, label: 'Music' },
  cloud: { icon: Cloud, label: 'Cloud' },
  sparkles: { icon: Sparkles, label: 'AI' },
  gamepad: { icon: Gamepad2, label: 'Games' },
  dumbbell: { icon: Dumbbell, label: 'Fitness' },
  book: { icon: BookOpen, label: 'Learning' },
  newspaper: { icon: Newspaper, label: 'News' },
  bag: { icon: ShoppingBag, label: 'Shopping' },
  heart: { icon: Heart, label: 'Dating' },
}

/** Up to two letters from a name: "Disney+" → "D", "Prime Video" → "PV". */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return '?'
  return (words.length > 1 && words[1][0] === words[1][0].toUpperCase() ? words[0][0] + words[1][0] : words[0][0]).toUpperCase()
}

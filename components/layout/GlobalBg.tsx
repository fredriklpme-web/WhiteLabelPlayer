'use client'
import { useBg } from '@/lib/background-context'

export default function GlobalBg() {
  const { bgUrl, isDark } = useBg()
  if (!bgUrl) return null
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: bgUrl.startsWith('http') ? `url(${bgUrl}) center/cover` : bgUrl,
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: isDark ? 'rgba(0,0,0,0.58)' : 'rgba(255,255,255,0.72)',
      }} />
    </>
  )
}

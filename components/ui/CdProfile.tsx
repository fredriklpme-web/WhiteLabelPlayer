'use client'
import { useId } from 'react'

interface CdProfileProps {
  label1?: string | null
  label2?: string | null
  avatarUrl?: string | null
  width?: number
}

export default function CdProfile({ label1, label2, avatarUrl, width = 260 }: CdProfileProps) {
  const uid = useId().replace(/:/g, '')

  const bgRatio = 1811 / 2278
  const h = Math.round(width / bgRatio)

  const fgHeightPct = 1057 / 2278
  const fgTopPct = 1 - fgHeightPct

  const photoH = Math.round(h * 0.52)
  const photoX = Math.round(width * 0.04)
  const photoW = Math.round(width * 0.92)

  const line1TopPct = 0.675
  const line2TopPct = 0.775

  return (
    <div style={{ position: 'relative', width, height: h, flexShrink: 0, overflow: 'hidden' }}>

      {/* Lager 1: Bakgrund */}
      <img src="/cd-bg.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />

      {/* Lager 2: Profilbild */}
      <div style={{ position: 'absolute', left: photoX, top: 0, width: photoW, height: photoH, overflow: 'hidden' }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'StealThis, cursive', fontSize: width * 0.14, color: '#333' }}>
              {[label1, label2].filter(Boolean).map(s => s![0]).join('').toUpperCase().slice(0, 2) || '?'}
            </span>
          </div>
        )}
      </div>

      {/* Lager 3: CD-förgrund */}
      <img src="/cd-fg.png" alt="" style={{ position: 'absolute', left: 0, top: `${fgTopPct * 100}%`, width: '100%', height: `${fgHeightPct * 100}%`, objectFit: 'fill', display: 'block' }} />

      {/* Lager 4: Dymo-label 1 */}
      {label1 && (
        <div style={{
          position: 'absolute', left: '6%', right: '6%',
          top: `${line1TopPct * 100}%`, transform: 'translateY(-50%)',
          textAlign: 'center', fontFamily: 'StealThis, cursive',
          fontSize: 32, color: '#111', letterSpacing: '0.04em',
          lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden',
        }}>
          {label1}
        </div>
      )}

      {/* Lager 5: Dymo-label 2 */}
      {label2 && (
        <div style={{
          position: 'absolute', left: '6%', right: '6%',
          top: `${line2TopPct * 100}%`, transform: 'translateY(-50%)',
          textAlign: 'center', fontFamily: 'StealThis, cursive',
          fontSize: 32, color: '#111', letterSpacing: '0.04em',
          lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden',
        }}>
          {label2}
        </div>
      )}
    </div>
  )
}

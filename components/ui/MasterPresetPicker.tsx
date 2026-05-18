'use client'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { MasterPreset } from '@/lib/audio-master'
import { createClient } from '@/lib/supabase/client'

const PRESETS: { value: MasterPreset; label: string; desc: string }[] = [
  { value: 'off',    label: 'Off',    desc: 'No processing' },
  { value: 'clean',  label: 'Clean',  desc: 'Light EQ + gentle compression' },
  { value: 'warm',   label: 'Warm',   desc: 'More body, softer highs' },
  { value: 'loud',   label: 'Loud',   desc: 'Maximized perceived volume' },
  { value: 'bright', label: 'Bright', desc: 'More presence and air' },
]

interface Props {
  trackId: string
  current: MasterPreset
  onChange: (preset: MasterPreset) => void
  onClose: () => void
}

export default function MasterPresetPicker({ trackId, current, onChange, onClose }: Props) {
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const select = async (preset: MasterPreset) => {
    setSaving(true)
    onChange(preset)
    await supabase.from('tracks').update({ master_preset: preset }).eq('id', trackId)
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: '12px 12px 0 0', width: '100%', maxWidth: 480, padding: '20px 20px 32px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sparkles size={15} style={{ color: 'var(--accent)' }} />
          <span style={{ fontFamily: 'StealThis, cursive', fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#111' }}>
            Auto Master
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#aaa', marginBottom: 18 }}>
          Improves playback in the player. Does not modify your file.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PRESETS.map(p => (
            <button key={p.value} onClick={() => select(p.value)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                background: current === p.value ? '#fdf3e3' : '#f8f7f3',
                border: `0.5px solid ${current === p.value ? 'var(--accent)' : '#eee'}`,
                transition: 'all 0.15s',
              }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: current === p.value ? 'var(--accent)' : '#222' }}>
                  {p.label}
                </div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{p.desc}</div>
              </div>
              {current === p.value && (
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>

        {saving && <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 12 }}>Saving...</p>}
      </div>
    </div>
  )
}

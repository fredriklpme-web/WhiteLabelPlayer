'use client'

import { useState } from 'react'
import { X, ImageUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const PRESETS = [
  { label: 'Beige', bg: 'linear-gradient(135deg, #f0ece0, #e0d8c0)', dark: false },
  { label: 'Svart', bg: '#111111', dark: true },
  { label: 'Blå', bg: 'linear-gradient(135deg, #e8f0f8, #c8ddf0)', dark: false },
  { label: 'Varm', bg: 'linear-gradient(135deg, #f8e8e0, #f0c8b0)', dark: false },
  { label: 'Grön', bg: 'linear-gradient(135deg, #e8f4e8, #c0ddc0)', dark: false },
  { label: 'Mörk lila', bg: 'linear-gradient(135deg, #1a1020, #2a1840)', dark: true },
  { label: 'Bränd orange', bg: 'linear-gradient(135deg, #2a1500, #3d2200)', dark: true },
  { label: 'Is', bg: 'linear-gradient(135deg, #f0f4f8, #dce8f4)', dark: false },
]

interface BgPickerProps {
  currentBg: string | null
  isDark: boolean
  onClose: () => void
  onSave: (url: string | null, isDark: boolean) => void
}

export default function BgPicker({ currentBg, isDark, onClose, onSave }: BgPickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<typeof PRESETS[0] | null>(null)
  const [customFile, setCustomFile] = useState<File | null>(null)
  const [customPreview, setCustomPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleFile = (file: File) => {
    setCustomFile(file)
    setSelectedPreset(null)
    const reader = new FileReader()
    reader.onload = e => setCustomPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      if (customFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const path = `${user.id}/background_${Date.now()}.${customFile.name.split('.').pop()}`
        await supabase.storage.from('images').upload(path, customFile, { upsert: true })
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
        await supabase.from('profiles').update({ background_url: publicUrl, background_is_dark: false }).eq('id', user.id)
        onSave(publicUrl, false)
      } else if (selectedPreset) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from('profiles').update({ background_url: selectedPreset.bg, background_is_dark: selectedPreset.dark }).eq('id', user.id)
        onSave(selectedPreset.bg, selectedPreset.dark)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="animate-overlay" style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 12, width: 420 }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '0.5px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111' }}>Choose background</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}><X size={17} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 10, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Presets</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
            {PRESETS.map(p => (
              <div key={p.label} onClick={() => { setSelectedPreset(p); setCustomFile(null); setCustomPreview(null) }}
                title={p.label}
                style={{
                  aspectRatio: '1', borderRadius: 8, background: p.bg,
                  border: `2px solid ${selectedPreset?.label === p.label ? 'var(--accent)' : 'transparent'}`,
                  cursor: 'pointer', transition: 'border-color 0.15s',
                }} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#ccc', textAlign: 'center', letterSpacing: '0.08em', margin: '12px 0' }}>— or upload your own —</div>
          <div
            onClick={() => document.getElementById('bgFileInput')?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            style={{
              border: '1px dashed #ddd', borderRadius: 8, padding: 20, textAlign: 'center',
              cursor: 'pointer', background: customPreview ? 'transparent' : '#fafaf8',
              backgroundImage: customPreview ? `url(${customPreview})` : 'none',
              backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 80,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
            {!customPreview && (
              <>
                <div style={{ fontSize: 22, color: '#ccc', marginBottom: 6 }}>↑</div>
                <p style={{ fontSize: 12, color: '#aaa' }}>Dra hit en bild eller <span style={{ color: 'var(--accent)' }}>välj från dator</span></p>
                <p style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>JPG · PNG · WebP · max 5 MB</p>
              </>
            )}
            {customPreview && (
              <div style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 12, padding: '4px 10px', borderRadius: 4 }}>
                {customFile?.name}
              </div>
            )}
            <input id="bgFileInput" type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ background: 'none', border: '0.5px solid #ddd', color: '#888', fontSize: 13, padding: '7px 14px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={loading || (!selectedPreset && !customFile)}
            style={{ background: '#111', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, padding: '7px 16px', borderRadius: 6, cursor: 'pointer', opacity: (!selectedPreset && !customFile) ? 0.4 : 1 }}>
            {loading ? 'Sparar...' : 'Save background'}
          </button>
        </div>
      </div>
    </div>
  )
}

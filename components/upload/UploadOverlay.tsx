'use client'

import { useState, useRef } from 'react'
import { X, Upload, Music, Disc, List, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Tab = 'track' | 'album' | 'playlist'

interface UploadOverlayProps {
  onClose: () => void
  onSuccess: () => void
}

export default function UploadOverlay({ onClose, onSuccess }: UploadOverlayProps) {
  const [tab, setTab] = useState<Tab>('track')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [albumFiles, setAlbumFiles] = useState<File[]>([])
  const [title, setTitle] = useState('')
  const [albumTitle, setAlbumTitle] = useState('')
  const [year, setYear] = useState('')
  const [playlistTitle, setPlaylistTitle] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const albumInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleSaveTrack = async () => {
    if (!audioFile || !title) { setError('Select a file and enter a title.'); return }
    setLoading(true); setError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { setError('You are not signed in. Reload the page.'); setLoading(false); return }

      const safeName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const audioPath = `${user.id}/${Date.now()}_${safeName}`
      const { error: uploadError } = await supabase.storage.from('audio').upload(audioPath, audioFile, { upsert: true })
      if (uploadError) { setError(`Uppladdning misslyckades: ${uploadError.message}`); setLoading(false); return }

      const { data: signedData, error: signError } = await supabase.storage.from('audio').createSignedUrl(audioPath, 3600 * 24 * 365)
      if (signError || !signedData) { setError('Kunde inte skapa URL.'); setLoading(false); return }

      let coverUrl = null
      if (coverFile) {
        const coverPath = `${user.id}/${Date.now()}_${coverFile.name}`
        const { error: ce } = await supabase.storage.from('images').upload(coverPath, coverFile, { upsert: true })
        if (!ce) {
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(coverPath)
          coverUrl = publicUrl
        }
      }

      const { error: dbError } = await supabase.from('tracks').insert({
        user_id: user.id, title,
        file_url: signedData.signedUrl,
        file_format: audioFile.name.split('.').pop()?.toLowerCase() ?? null,
        file_size: audioFile.size,
      })
      if (dbError) { setError(`Databasfel: ${dbError.message}`); setLoading(false); return }
      onSuccess()
    } catch (e: any) {
      setError(e?.message ?? 'Okänt fel')
      setLoading(false)
    }
  }

  const handleSaveAlbum = async () => {
    if (!albumFiles.length || !albumTitle) { setError('Enter album title and select audio files.'); return }
    setLoading(true); setError('')
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { setError('You are not signed in.'); setLoading(false); return }

      let coverUrl = null
      if (coverFile) {
        const coverPath = `${user.id}/${Date.now()}_${coverFile.name}`
        const { error: ce } = await supabase.storage.from('images').upload(coverPath, coverFile, { upsert: true })
        if (!ce) {
          const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(coverPath)
          coverUrl = publicUrl
        }
      }

      const { data: album, error: albumError } = await supabase.from('albums').insert({
        user_id: user.id, title: albumTitle,
        year: year ? parseInt(year) : null, cover_url: coverUrl,
      }).select().single()
      if (albumError || !album) { setError(`Albumfel: ${albumError?.message}`); setLoading(false); return }

      for (let i = 0; i < albumFiles.length; i++) {
        const file = albumFiles[i]
        const safeFileName = file.name.normalize("NFD").replace(/[0300-036f]/g, "").replace(/[åä]/g, "a").replace(/[ö]/g, "o").replace(/[ÅÄ]/g, "A").replace(/[Ö]/g, "O").replace(/[^a-zA-Z0-9._-]/g, "_"); const audioPath = `${user.id}/${album.id}/${i}_${safeFileName}`
        const { error: ue } = await supabase.storage.from('audio').upload(audioPath, file, { upsert: true })
        if (ue) continue
        const { data: sd } = await supabase.storage.from('audio').createSignedUrl(audioPath, 3600 * 24 * 365)
        if (!sd) continue
        const trackTitle = file.name.replace(/\.[^/.]+$/, '').replace(/^\d+[\s._-]+/, '')
        await supabase.from('tracks').insert({
          user_id: user.id, album_id: album.id, title: trackTitle,
          file_url: sd.signedUrl, file_format: file.name.split('.').pop()?.toLowerCase() ?? null,
          file_size: file.size, track_number: i + 1,
        })
      }
      onSuccess()
    } catch (e: any) {
      setError(e?.message ?? 'Okänt fel')
      setLoading(false)
    }
  }

  const handleSavePlaylist = async () => {
    if (!playlistTitle) { setError('Enter a name.'); return }
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('You are not signed in.'); setLoading(false); return }
      const { error: e } = await supabase.from('playlists').insert({ user_id: user.id, title: playlistTitle })
      if (e) { setError(e.message); setLoading(false); return }
      onSuccess()
    } catch (e: any) {
      setError(e?.message ?? 'Okänt fel')
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (tab === 'track') handleSaveTrack()
    else if (tab === 'album') handleSaveAlbum()
    else handleSavePlaylist()
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'track', label: 'Single track', icon: <Music size={13} /> },
    { key: 'album', label: 'Album', icon: <Disc size={13} /> },
    { key: 'playlist', label: 'Playlist', icon: <List size={13} /> },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="animate-overlay" style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 12, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, letterSpacing: '0.06em', color: '#111', textTransform: 'uppercase' }}>Add music</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', borderBottom: '0.5px solid #eee' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setError('') }} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 0', fontSize: 12, cursor: 'pointer', background: 'none',
              border: 'none', borderBottom: `2px solid ${tab === t.key ? '#111' : 'transparent'}`,
              color: tab === t.key ? '#111' : '#aaa', letterSpacing: '0.04em',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 20 }}>
          {error && (
            <div style={{ background: '#fff5f5', border: '0.5px solid #ffcccc', borderRadius: 6, padding: '10px 12px', marginBottom: 14, fontSize: 13, color: '#cc0000' }}>
              {error}
            </div>
          )}

          {tab === 'track' && (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) { setAudioFile(f); if (!title) setTitle(f.name.replace(/\.[^/.]+$/, '')) } }}
                onClick={() => audioInputRef.current?.click()}
                style={{ border: `1px dashed ${dragOver ? 'var(--accent)' : '#ddd'}`, borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: dragOver ? '#fdf3e3' : '#fafaf8', transition: 'all 0.15s' }}>
                <Upload size={24} style={{ color: audioFile ? 'var(--accent)' : '#ccc', marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: '#aaa' }}>
                  {audioFile ? <strong style={{ color: '#111' }}>{audioFile.name}</strong> : <>Drop your file here or <span style={{ color: 'var(--accent)' }}>choose from computer</span></>}
                </p>
                <p style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>MP3 · WAV · M4A · FLAC · AAC · OGG</p>
                <input ref={audioInputRef} type="file" accept="audio/*" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setAudioFile(f); if (!title) setTitle(f.name.replace(/\.[^/.]+$/, '')) } }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Låttitel</label>
                <input style={inp} type="text" placeholder="Enter title..." value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Omslagsbild</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inp, flex: 1, color: coverFile ? '#111' : '#aaa', cursor: 'pointer' }} type="text" readOnly
                    placeholder="Choose image (optional)..." value={coverFile?.name ?? ''} onClick={() => coverInputRef.current?.click()} />
                  <button onClick={() => coverInputRef.current?.click()}
                    style={{ padding: '0 12px', background: '#f4f4f0', border: '0.5px solid #ddd', borderRadius: 6, cursor: 'pointer', color: '#666' }}>
                    <ImageIcon size={14} />
                  </button>
                  <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setCoverFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>
            </>
          )}

          {tab === 'album' && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Albumtitel</label>
                <input style={inp} type="text" placeholder="Album name..." value={albumTitle} onChange={e => setAlbumTitle(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>År</label>
                  <input style={inp} type="text" placeholder="2024" value={year} onChange={e => setYear(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Omslagsbild</label>
                  <input style={{ ...inp, color: coverFile ? '#111' : '#aaa', cursor: 'pointer' }} type="text" readOnly
                    placeholder="Choose image..." value={coverFile?.name ?? ''} onClick={() => coverInputRef.current?.click()} />
                  <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setCoverFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>
              <div onClick={() => albumInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); setAlbumFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/'))) }}
                style={{ border: `1px dashed ${dragOver ? 'var(--accent)' : '#ddd'}`, borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', background: '#fafaf8' }}>
                <Disc size={24} style={{ color: albumFiles.length ? 'var(--accent)' : '#ccc', marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: '#aaa' }}>
                  {albumFiles.length ? <strong style={{ color: '#111' }}>{albumFiles.length} ljudfiler valda</strong> : <>Dra hit alla låtar eller <span style={{ color: 'var(--accent)' }}>choose from computer</span></>}
                </p>
                <p style={{ fontSize: 11, color: '#ccc', marginTop: 4 }}>Select multiple files at once</p>
                <input ref={albumInputRef} type="file" accept="audio/*" multiple style={{ display: 'none' }} onChange={e => setAlbumFiles(Array.from(e.target.files ?? []))} />
              </div>
              {albumFiles.length > 0 && (
                <div style={{ marginTop: 10, background: '#fafaf8', border: '0.5px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
                  {albumFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderBottom: i < albumFiles.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--accent)', minWidth: 20 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, color: '#333', flex: 1 }}>{f.name.replace(/\.[^/.]+$/, '').replace(/^\d+[\s._-]+/, '')}</span>
                      <span style={{ fontSize: 10, color: '#bbb' }}>{f.name.split('.').pop()?.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'playlist' && (
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Namn på spellistan</label>
              <input style={inp} type="text" placeholder="My playlist..." value={playlistTitle} onChange={e => setPlaylistTitle(e.target.value)} />
              <p style={{ fontSize: 12, color: '#bbb', marginTop: 8 }}>Du kan lägga till låtar efteråt från biblioteksvyn.</p>
            </div>
          )}
        </div>

        <div style={{ padding: '14px 20px', borderTop: '0.5px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ background: 'none', border: '0.5px solid #ddd', color: '#888', fontSize: 13, padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={{
            background: '#111', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500,
            padding: '8px 18px', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
          }}>
            {loading ? 'Saving...' : tab === 'track' ? 'Save track' : tab === 'album' ? 'Upload album' : 'Create playlist'}
          </button>
        </div>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 10, letterSpacing: '0.1em', color: '#999', textTransform: 'uppercase', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', background: '#fafaf8', border: '0.5px solid #ddd', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#222', fontFamily: 'var(--font-body)' }

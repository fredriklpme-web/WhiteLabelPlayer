'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Play, Music, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Track } from '@/types'
import { usePlayer } from '@/lib/player-context'
import UploadOverlay from '@/components/upload/UploadOverlay'
import TrackMenu from '@/components/ui/TrackMenu'

function formatTime(s: number | null) {
  if (!s) return ''
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function TracksPage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const { play, currentTrack, isPlaying } = usePlayer()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: trks }, { data: pls }] = await Promise.all([
      supabase.from('tracks').select('*, album:albums(title)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('playlists').select('*').eq('user_id', user.id),
    ])
    setTracks(trks ?? [])
    setPlaylists(pls ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const openMenu = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setMenuTrack(track)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '15px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111' }}>Låtar</span>
        <button onClick={() => setShowUpload(true)} style={{ background: '#111', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Ladda upp
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? <div style={{ color: '#aaa', fontSize: 13 }}>Loading...</div>
        : tracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Music size={32} style={{ color: '#ddd', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#aaa' }}>No tracks yet</p>
            <button onClick={() => setShowUpload(true)} style={{ marginTop: 10, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Upload your first track →</button>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.88)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }}>
            {tracks.map((track, i) => (
              <div key={track.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < tracks.length - 1 ? '0.5px solid #f4f4f4' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(253,248,240,0.95)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ fontSize: 11, color: currentTrack?.id === track.id ? 'var(--accent)' : '#ccc', width: 20, textAlign: 'center', fontFamily: 'var(--font-display)' }}>
                  {currentTrack?.id === track.id && isPlaying ? '▶' : i + 1}
                </div>
                <button onClick={() => play(track, tracks)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 0 }}><Play size={13} /></button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>{track.album?.title ?? 'Single'}{track.file_format ? ` · ${track.file_format.toUpperCase()}` : ''}</div>
                </div>
                <span style={{ fontSize: 11, color: '#bbb', fontFamily: 'var(--font-display)' }}>{formatTime(track.duration)}</span>
                <button onClick={e => openMenu(e, track)} style={{ background: 'none', border: '0.5px solid #eee', color: '#aaa', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>
                  <MoreHorizontal size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {showUpload && <UploadOverlay onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); load() }} />}
      {menuTrack && <TrackMenu track={menuTrack} playlists={playlists} position={menuPos} onClose={() => setMenuTrack(null)} onRefresh={load} />}
    </div>
  )
}

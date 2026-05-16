'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Play, MoreHorizontal, List, Pencil, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Track } from '@/types'
import { usePlayer } from '@/lib/player-context'
import TrackMenu from '@/components/ui/TrackMenu'

function formatTime(s: number | null) {
  if (!s) return ''
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [playlist, setPlaylist] = useState<any>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [allPlaylists, setAllPlaylists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [editingTitle, setEditingTitle] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const { play, currentTrack, isPlaying } = usePlayer()
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: pl } = await supabase.from('playlists').select('*').eq('id', id).single()
    const { data: items } = await supabase.from('playlist_items')
      .select('*, track:tracks(*, album:albums(title))')
      .eq('playlist_id', id).order('position')
    const { data: { user } } = await supabase.auth.getUser()
    const { data: pls } = await supabase.from('playlists').select('*').eq('user_id', user?.id ?? '')
    setPlaylist(pl)
    setNewTitle(pl?.title ?? '')
    setTracks((items ?? []).map((i: any) => i.track).filter(Boolean))
    setAllPlaylists(pls ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRename = async () => {
    if (!newTitle.trim()) return
    await supabase.from('playlists').update({ title: newTitle.trim() }).eq('id', id)
    setPlaylist((p: any) => ({ ...p, title: newTitle.trim() }))
    setEditingTitle(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete playlistn "${playlist?.title}"?`)) return
    await supabase.from('playlists').delete().eq('id', id)
    router.push('/playlists')
  }

  const removeFromPlaylist = async (trackId: string) => {
    await supabase.from('playlist_items').delete().eq('playlist_id', id).eq('track_id', trackId)
    load()
  }

  const openMenu = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setMenuTrack(track)
  }

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13, position: 'relative', zIndex: 1 }}>Laddar...</div>

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '15px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <ArrowLeft size={15} /> Back
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'flex-end' }}>
          <div style={{ width: 100, height: 100, borderRadius: 8, background: '#f0efe9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '0.5px solid #eee' }}>
            <List size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Playlist</div>
            {editingTitle ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingTitle(false) }}
                  style={{ flex: 1, border: '0.5px solid #ddd', borderRadius: 6, padding: '6px 10px', fontSize: 18, color: '#111', background: 'rgba(255,255,255,0.9)' }} />
                <button onClick={handleRename} style={{ background: '#111', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Save</button>
                <button onClick={() => setEditingTitle(false)} style={{ background: 'none', border: '0.5px solid #ddd', color: '#888', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#111' }}>{playlist?.title}</div>
                <button onClick={() => setEditingTitle(true)} style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', padding: 2 }}>
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{tracks.length} tracks</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {tracks.length > 0 && (
                <button onClick={() => play(tracks[0], tracks)} style={{ background: '#111', border: 'none', color: '#fff', fontSize: 12, padding: '8px 16px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Play size={13} /> Play all
                </button>
              )}
              <button onClick={handleDelete} style={{ background: 'none', border: '0.5px solid #fca5a5', color: '#dc2626', fontSize: 12, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={13} /> Delete playlist
              </button>
            </div>
          </div>
        </div>

        {/* Låtlista */}
        {tracks.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.88)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#aaa' }}>No tracks in this playlist yet</p>
            <p style={{ fontSize: 12, color: '#ccc', marginTop: 6 }}>Add tracks via the ··· menu on any track</p>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.88)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }}>
            {tracks.map((track, i) => (
              <div key={track.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < tracks.length - 1 ? '0.5px solid #f4f4f4' : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fdf8f0')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ fontSize: 11, color: currentTrack?.id === track.id ? 'var(--accent)' : '#ccc', width: 20, textAlign: 'center' }}>
                  {currentTrack?.id === track.id && isPlaying ? '▶' : i + 1}
                </div>
                <button onClick={() => play(track, tracks)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 0 }}><Play size={13} /></button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                  <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>{(track as any).album?.title ?? 'Enskild låt'}</div>
                </div>
                <span style={{ fontSize: 11, color: '#bbb' }}>{formatTime(track.duration)}</span>
                <button onClick={() => removeFromPlaylist(track.id)} title="Ta bort" style={{ background: 'none', border: '0.5px solid #eee', color: '#ccc', padding: '4px 7px', borderRadius: 4, cursor: 'pointer' }}>
                  <X size={11} />
                </button>
                <button onClick={e => openMenu(e, track)} style={{ background: 'none', border: '0.5px solid #eee', color: '#aaa', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>
                  <MoreHorizontal size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {menuTrack && <TrackMenu track={menuTrack} playlists={allPlaylists} position={menuPos} onClose={() => setMenuTrack(null)} onRefresh={load} />}
    </div>
  )
}

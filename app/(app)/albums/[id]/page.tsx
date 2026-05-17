'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Play, MoreHorizontal, Disc, Pencil, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Track, Album } from '@/types'
import { usePlayer } from '@/lib/player-context'
import TrackMenu from '@/components/ui/TrackMenu'
import ShareModal from '@/components/ui/ShareModal'

function formatTime(s: number | null) {
  if (!s) return ''
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [album, setAlbum] = useState<Album | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [editingTitle, setEditingTitle] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const { play, currentTrack, isPlaying } = usePlayer()
  const supabase = createClient()

  const load = useCallback(async () => {
    const [{ data: alb }, { data: trks }, { data: { user } }] = await Promise.all([
      supabase.from('albums').select('*').eq('id', id).single(),
      supabase.from('tracks').select('*').eq('album_id', id).order('track_number'),
      supabase.auth.getUser(),
    ])
    const { data: pls } = await supabase.from('playlists').select('*').eq('user_id', user?.id ?? '')
    setAlbum(alb)
    setNewTitle(alb?.title ?? '')
    setTracks(trks ?? [])
    setPlaylists(pls ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRenameAlbum = async () => {
    if (!newTitle.trim()) return
    await supabase.from('albums').update({ title: newTitle.trim() }).eq('id', id)
    setAlbum(a => a ? { ...a, title: newTitle.trim() } : a)
    setEditingTitle(false)
  }

  const handleDeleteAlbum = async () => {
    if (!confirm(`Delete albumet "${album?.title}" och alla dess tracks?`)) return
    await supabase.from('tracks').delete().eq('album_id', id)
    await supabase.from('albums').delete().eq('id', id)
    router.push('/albums')
  }

  const openMenu = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setMenuTrack(track)
  }

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 13, position: 'relative', zIndex: 1 }}>Laddar...</div>
  if (!album) return <div style={{ flex: 1, padding: 24, color: '#aaa', position: 'relative', zIndex: 1 }}>Album hittades inte.</div>

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '15px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <ArrowLeft size={15} /> Back
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', position: 'relative', zIndex: 1 }}>
        {/* Album header */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'flex-end' }}>
          <div style={{ width: 120, height: 120, borderRadius: 8, background: album.cover_url ? `url(${album.cover_url}) center/cover` : '#f0efe9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '0.5px solid #eee' }}>
            {!album.cover_url && <Disc size={32} style={{ color: '#ccc' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#aaa', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Album</div>
            {editingTitle ? (
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameAlbum(); if (e.key === 'Escape') setEditingTitle(false) }}
                  style={{ flex: 1, border: '0.5px solid #ddd', borderRadius: 6, padding: '6px 10px', fontSize: 18, color: '#111', background: 'rgba(255,255,255,0.9)' }}
                />
                <button onClick={handleRenameAlbum} style={{ background: '#111', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Save</button>
                <button onClick={() => setEditingTitle(false)} style={{ background: 'none', border: '0.5px solid #ddd', color: '#888', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: '#111' }}>{album.title}</div>
                <button onClick={() => setEditingTitle(true)} style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', padding: 2 }}>
                  <Pencil size={14} />
                </button>
              </div>
            )}
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{tracks.length} tracks{album.year ? ` · ${album.year}` : ''}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => tracks.length && play(tracks[0], tracks)} style={{ background: '#111', border: 'none', color: '#fff', fontSize: 12, padding: '8px 16px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Play size={13} /> Play all
              </button>
              <button onClick={() => setShowShare(true)} style={{ background: 'none', border: '0.5px solid #ddd', color: '#666', fontSize: 12, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              Share
            </button>
              <button onClick={handleDeleteAlbum} style={{ background: 'none', border: '0.5px solid #fca5a5', color: '#dc2626', fontSize: 12, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={13} /> Delete album
              </button>
            </div>
          </div>
        </div>

        {/* Låtlista */}
        <div style={{ background: 'rgba(255,255,255,0.88)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }}>
          {tracks.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#aaa' }}>No tracks in this album</div>
          ) : tracks.map((track, i) => (
            <div key={track.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: i < tracks.length - 1 ? '0.5px solid #f4f4f4' : 'none', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fdf8f0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ fontSize: 11, color: currentTrack?.id === track.id ? 'var(--accent)' : '#ccc', width: 20, textAlign: 'center', fontFamily: 'var(--font-display)' }}>
                {currentTrack?.id === track.id && isPlaying ? '▶' : (track.track_number ?? i + 1)}
              </div>
              <button onClick={() => play(track, tracks)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', padding: 0 }}><Play size={13} /></button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                {track.file_format && <div style={{ fontSize: 11, color: '#bbb', marginTop: 1 }}>{track.file_format.toUpperCase()}</div>}
              </div>
              <span style={{ fontSize: 11, color: '#bbb', fontFamily: 'var(--font-display)' }}>{formatTime(track.duration)}</span>
              <button onClick={e => openMenu(e, track)} style={{ background: 'none', border: '0.5px solid #eee', color: '#aaa', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>
                <MoreHorizontal size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
      {showShare {menuTrack && <TrackMenu{menuTrack && <TrackMenu album {menuTrack && <TrackMenu{menuTrack && <TrackMenu <ShareModal type="album" resourceId={album.id} title={album.title} onClose={() => setShowShare(false)} />}
      {menuTrack && <TrackMenu track={menuTrack} playlists={playlists} position={menuPos} onClose={() => setMenuTrack(null)} onRefresh={load} />}
    </div>
  )
}

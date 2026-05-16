'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Disc, Image as ImgIcon, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Track, Album, Profile } from '@/types'
import { usePlayer } from '@/lib/player-context'
import { useBg } from '@/lib/background-context'
import { useRouter } from 'next/navigation'
import UploadOverlay from '@/components/upload/UploadOverlay'
import BgPicker from '@/components/ui/BgPicker'
import TrackMenu from '@/components/ui/TrackMenu'

function formatTime(s: number | null) {
  if (!s) return ''
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

function LibraryPageInner() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [albums, setAlbums] = useState<Album[]>([])
  const [recentTracks, setRecentTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [menuTrack, setMenuTrack] = useState<Track | null>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const { play, currentTrack, isPlaying } = usePlayer()
  const { setBg } = useBg()
  const router = useRouter()
  const supabase = createClient()

  const searchParams = useSearchParams()
  useEffect(() => { if (searchParams.get('upload') === '1') setShowUpload(true) }, [searchParams])

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: prof }, { data: albs }, { data: tracks }, { data: pls }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('albums').select('*, tracks(count)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
      supabase.from('tracks').select('*, album:albums(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('playlists').select('*').eq('user_id', user.id),
    ])
    setProfile(prof)
    setAlbums(albs ?? [])
    setRecentTracks(tracks ?? [])
    setPlaylists(pls ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const openMenu = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation()
    setMenuPos({ x: e.clientX, y: e.clientY })
    setMenuTrack(track)
  }

  const isDark = profile?.background_is_dark ?? false
  const cardBg = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.88)'
  const cardBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
  const textPrimary = isDark ? '#f0f0f0' : '#111'
  const textSecondary = isDark ? '#888' : '#aaa'
  const sectionColor = isDark ? 'rgba(255,255,255,0.4)' : '#999'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      {/* Topbar */}
      <div style={{ padding: '15px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111' }}>Library</span>
        <button onClick={() => setShowUpload(true)} style={{ background: '#111', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          <Plus size={14} /> Ladda upp
        </button>
      </div>

      {/* Scrollbart innehåll */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '20px 24px' }}>

          {/* Album-sektion */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: sectionColor }}>Recently added albums</span>
            <button onClick={() => setShowBgPicker(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.85)', border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#ddd'}`, color: isDark ? 'rgba(255,255,255,0.7)' : '#666', padding: '5px 10px', borderRadius: 6, cursor: 'pointer' }}>
              <ImgIcon size={12} /> Change background
            </button>
          </div>

          {loading ? (
            <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textSecondary, fontSize: 13 }}>Loading...</div>
          ) : albums.length === 0 ? (
            <div style={{ background: cardBg, border: `0.5px solid ${cardBorder}`, borderRadius: 8, padding: 32, textAlign: 'center', marginBottom: 24 }}>
              <Disc size={28} style={{ color: textSecondary, margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: textSecondary }}>No albums yet</p>
              <button onClick={() => setShowUpload(true)} style={{ marginTop: 10, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Upload your first album →</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 28 }}>
              {albums.map(album => (
                <div key={album.id} onClick={() => router.push(`/albums/${album.id}`)}
                  style={{ background: cardBg, border: `0.5px solid ${cardBorder}`, borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#aaa'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = cardBorder; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                  <div style={{ aspectRatio: '1', background: album.cover_url ? `url(${album.cover_url}) center/cover` : (isDark ? '#1a1a1a' : '#f0efe9'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!album.cover_url && <Disc size={18} style={{ color: isDark ? '#555' : '#bbb' }} />}
                  </div>
                  <div style={{ padding: '8px 10px', borderTop: `0.5px solid ${cardBorder}` }}>
                    <div style={{ fontSize: 11, color: textPrimary, fontWeight: 500 }}>{album.title}</div>
                    <div style={{ fontSize: 10, color: textSecondary, marginTop: 2 }}>{(album as any).tracks?.[0]?.count ?? 0} låtar{album.year ? ` · ${album.year}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recently added tracks */}
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: sectionColor, marginBottom: 10 }}>Recently added tracks</div>
          <div style={{ background: cardBg, border: `0.5px solid ${cardBorder}`, borderRadius: 8, overflow: 'hidden' }}>
            {recentTracks.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: textSecondary }}>No tracks yet</div>
            ) : recentTracks.map((track, i) => (
              <div key={track.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px', borderBottom: i < recentTracks.length - 1 ? `0.5px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f4f4f4'}` : 'none', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : '#fdf8f0')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ fontSize: 11, color: currentTrack?.id === track.id ? 'var(--accent)' : textSecondary, width: 18, textAlign: 'center', fontFamily: 'var(--font-display)' }}>
                  {currentTrack?.id === track.id && isPlaying ? '▶' : i + 1}
                </div>
                <button onClick={() => play(track, recentTracks)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, padding: 0 }}>▷</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                  <div style={{ fontSize: 11, color: textSecondary, marginTop: 1 }}>{track.album?.title ?? 'Enskild låt'}{track.file_format ? ` · ${track.file_format.toUpperCase()}` : ''}</div>
                </div>
                <span style={{ fontSize: 11, color: textSecondary, fontFamily: 'var(--font-display)' }}>{formatTime(track.duration)}</span>
                <button onClick={e => openMenu(e, track)} style={{ background: 'none', border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#eee'}`, color: '#aaa', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>
                  <MoreHorizontal size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showUpload && <UploadOverlay onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); loadData() }} />}
      {showBgPicker && <BgPicker
        currentBg={profile?.background_url ?? null}
        isDark={profile?.background_is_dark ?? false}
        onClose={() => setShowBgPicker(false)}
        onSave={(url, dark) => {
          setProfile(p => p ? { ...p, background_url: url, background_is_dark: dark } : p)
          setBg(url, dark)
          setShowBgPicker(false)
        }}
      />}
      {menuTrack && <TrackMenu track={menuTrack} playlists={playlists} position={menuPos} onClose={() => setMenuTrack(null)} onRefresh={loadData} />}
    </div>
  )
}


import { Suspense } from 'react'
export default function LibraryPage() {
  return (
    <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>Loading...</div>}>
      <LibraryPageInner />
    </Suspense>
  )
}
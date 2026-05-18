'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Play, Pause, SkipBack, SkipForward, Lock, Disc, List, Repeat } from 'lucide-react'

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [link, setLink] = useState<any>(null)
  const [resource, setResource] = useState<any>(null)
  const [tracks, setTracks] = useState<any[]>([])
  const [status, setStatus] = useState<'loading' | 'password' | 'ready' | 'expired' | 'notfound'>('loading')
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [repeat, setRepeat] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const tracksRef = useRef<any[]>([])
  const repeatRef = useRef(false)
  const supabase = createClient()

  tracksRef.current = tracks
  repeatRef.current = repeat

  const updateMediaSession = (track: any, playing: boolean) => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'White Label Player',
      album: '',
    })
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  }

  const playTrack = useCallback((idx: number, trackList?: any[]) => {
    const list = trackList ?? tracksRef.current
    if (!list[idx]) return
    const audio = audioRef.current!
    audio.src = list[idx].file_url
    audio.play()
    setCurrentIdx(idx)
    setIsPlaying(true)
    updateMediaSession(list[idx], true)
  }, [])

  const loadResource = useCallback(async (linkData: any) => {
    let trackList: any[] = []
    if (linkData.type === 'album') {
      const { data: alb } = await supabase.from('albums').select('*').eq('id', linkData.resource_id).single()
      const { data: trks } = await supabase.from('tracks').select('*').eq('album_id', linkData.resource_id).order('track_number')
      setResource(alb)
      trackList = trks ?? []
    } else {
      const { data: pl } = await supabase.from('playlists').select('*').eq('id', linkData.resource_id).single()
      const { data: items } = await supabase.from('playlist_items').select('*, track:tracks(*)').eq('playlist_id', linkData.resource_id).order('position')
      setResource(pl)
      trackList = (items ?? []).map((i: any) => i.track).filter(Boolean)
    }
    setTracks(trackList)
    setStatus('ready')
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    audio.ontimeupdate = () => {
      setProgress(audio.currentTime)
      setDuration(audio.duration || 0)
      if ('mediaSession' in navigator && audio.duration) {
        try { navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: 1, position: audio.currentTime }) } catch {}
      }
    }

    audio.onended = () => {
      if (repeatRef.current) { audio.currentTime = 0; audio.play(); return }
      const list = tracksRef.current
      setCurrentIdx(i => {
        const next = i + 1 < list.length ? i + 1 : 0
        audio.src = list[next].file_url
        audio.play()
        updateMediaSession(list[next], true)
        return next
      })
    }

    return () => { audio.pause(); audio.src = '' }
  }, [])

  // Media Session actions
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.setActionHandler('play', () => { audioRef.current?.play(); setIsPlaying(true) })
    navigator.mediaSession.setActionHandler('pause', () => { audioRef.current?.pause(); setIsPlaying(false) })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      const list = tracksRef.current
      setCurrentIdx(i => { const next = (i + 1) % list.length; playTrack(next, list); return next })
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return }
      const list = tracksRef.current
      setCurrentIdx(i => { const prev = i > 0 ? i - 1 : 0; playTrack(prev, list); return prev })
    })
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (audioRef.current && d.seekTime !== undefined) audioRef.current.currentTime = d.seekTime
    })
  }, [playTrack])

  useEffect(() => {
    supabase.from('share_links').select('*').eq('token', token).single().then(({ data }) => {
      if (!data) { setStatus('notfound'); return }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { setStatus('expired'); return }
      setLink(data)
      if (data.password_hash) setStatus('password')
      else loadResource(data)
    })
  }, [token])

  const handlePassword = () => {
    if (btoa(password) === link.password_hash) { setPwError(false); loadResource(link) }
    else setPwError(true)
  }

  const togglePlay = () => {
    const audio = audioRef.current!
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else {
      if (!audio.src && tracks.length) { audio.src = tracks[0].file_url; updateMediaSession(tracks[0], true) }
      audio.play(); setIsPlaying(true)
    }
  }

  const currentTrack = tracks[currentIdx]

  const errorPage = (title: string, sub: string) => (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <style>{`@font-face { font-family: 'StealThis'; src: url('/StealThisFont.ttf') format('truetype'); }`}</style>
      <div style={{ fontSize: 15, color: '#555' }}>{title}</div>
      <div style={{ fontSize: 12, color: '#333' }}>{sub}</div>
      <a href="/" style={{ marginTop: 20, fontSize: 12, color: '#d4820a', textDecoration: 'none' }}>White Label Player →</a>
    </div>
  )

  if (status === 'loading') return <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 13 }}>Loading...</div>
  if (status === 'notfound') return errorPage("Link not found", "This share link doesn't exist or has been removed.")
  if (status === 'expired') return errorPage("Link expired", "This share link is no longer active.")

  if (status === 'password') return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@font-face { font-family: 'StealThis'; src: url('/StealThisFont.ttf') format('truetype'); }`}</style>
      <div style={{ background: '#111', border: '0.5px solid #222', borderRadius: 12, padding: 36, width: '90%', maxWidth: 340, textAlign: 'center' }}>
        <Lock size={28} style={{ color: '#d4820a', margin: '0 auto 20px' }} />
        <div style={{ fontFamily: 'StealThis, cursive', fontSize: 16, color: '#f0f0f0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Protected</div>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 24 }}>Enter the password to listen</div>
        <input autoFocus type="password" placeholder="Password..."
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePassword()}
          style={{ width: '100%', background: '#1a1a1a', border: `0.5px solid ${pwError ? '#dc2626' : '#2a2a2a'}`, borderRadius: 6, padding: '10px 12px', fontSize: 14, color: '#ddd', marginBottom: 8, textAlign: 'center' }}
        />
        {pwError && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>Incorrect password</div>}
        <button onClick={handlePassword} style={{ width: '100%', background: '#d4820a', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, padding: '11px 0', borderRadius: 6, cursor: 'pointer' }}>
          Listen
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        @font-face { font-family: 'StealThis'; src: url('/StealThisFont.ttf') format('truetype'); }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { -webkit-text-size-adjust: 100%; }
      `}</style>

      {/* Top bar */}
      <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 }}>
        <div style={{ fontFamily: 'StealThis, cursive', fontSize: 12, letterSpacing: '0.1em', color: '#2a2a2a', textTransform: 'uppercase' }}>WL Player</div>
        <a href="/" style={{ fontSize: 11, color: '#333', textDecoration: 'none' }}>Create your own →</a>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px 140px' }}>

        {/* Header */}
        <div style={{ display: 'flex', gap: 18, marginBottom: 24, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            {resource?.cover_url ? (
              <img src={resource.cover_url} style={{ width: 90, height: 90, borderRadius: 8, objectFit: 'cover', border: '0.5px solid #1e1e1e' }} alt="" />
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: 8, background: '#141414', border: '0.5px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {link?.type === 'album' ? <Disc size={28} style={{ color: '#2a2a2a' }} /> : <List size={28} style={{ color: '#2a2a2a' }} />}
              </div>
            )}
          </div>
          <div style={{ flex: 1, paddingTop: 2 }}>
            <div style={{ fontSize: 10, color: '#333', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
              {link?.type === 'album' ? 'Album' : 'Playlist'}
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f0', lineHeight: 1.2, marginBottom: 4 }}>{resource?.title}</div>
            <div style={{ fontSize: 12, color: '#444' }}>{tracks.length} track{tracks.length !== 1 ? 's' : ''}{resource?.year ? ` · ${resource.year}` : ''}</div>
            <button onClick={() => tracks.length && playTrack(0)} style={{ marginTop: 12, background: '#d4820a', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Play size={13} /> Play all
            </button>
          </div>
        </div>

        {/* Infotext */}
        {link?.description && (
          <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Note</div>
            <p style={{ fontSize: 14, color: '#777', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{link.description}</p>
          </div>
        )}

        {/* Track list */}
        <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
          {tracks.map((track, i) => (
            <div key={track.id} onClick={() => playTrack(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                borderBottom: i < tracks.length - 1 ? '0.5px solid #161616' : 'none',
                cursor: 'pointer', background: currentIdx === i ? '#1a1400' : 'transparent',
                transition: 'background 0.1s', WebkitTapHighlightColor: 'transparent',
              }}>
              <div style={{ width: 20, textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: currentIdx === i ? '#d4820a' : '#333', flexShrink: 0 }}>
                {currentIdx === i && isPlaying ? '▶' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: currentIdx === i ? '#f0f0f0' : '#bbb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {track.title}
                </div>
                {track.file_format && <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>{track.file_format.toUpperCase()}</div>}
              </div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: currentIdx === i ? '#d4820a' : '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Play size={11} style={{ color: currentIdx === i ? '#fff' : '#444', marginLeft: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <a href="/" style={{ fontSize: 11, color: '#222', textDecoration: 'none' }}>
            Create your own at <span style={{ color: '#d4820a' }}>whitelabelplayer.se</span>
          </a>
        </div>
      </div>

      {/* Sticky player – alltid i botten */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(10,10,10,0.97)',
        borderTop: '0.5px solid #1e1e1e',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '10px 20px 12px' }}>

          {/* Låttitel */}
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: currentTrack ? '#ddd' : '#333', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack?.title ?? 'Select a track'}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ height: 3, background: '#222', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
              onClick={e => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                if (audioRef.current && duration) audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
              }}>
              <div style={{ height: '100%', width: `${duration ? (progress / duration) * 100 : 0}%`, background: '#d4820a', borderRadius: 2 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace' }}>{formatTime(progress)}</span>
              <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace' }}>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Kontroller */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <button onClick={() => setRepeat(r => !r)} style={{ background: 'none', border: 'none', color: repeat ? '#d4820a' : '#333', cursor: 'pointer', padding: 6 }}>
              <Repeat size={18} />
            </button>
            <button onClick={() => { const prev = currentIdx > 0 ? currentIdx - 1 : 0; playTrack(prev) }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 6 }}>
              <SkipBack size={22} />
            </button>
            <button onClick={togglePlay} style={{ width: 48, height: 48, borderRadius: '50%', background: '#d4820a', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
            </button>
            <button onClick={() => { const next = (currentIdx + 1) % tracks.length; playTrack(next) }} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 6 }}>
              <SkipForward size={22} />
            </button>
            <div style={{ width: 30 }} />
          </div>
        </div>
      </div>
    </div>
  )
}

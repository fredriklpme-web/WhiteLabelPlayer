'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Play, Pause, SkipBack, SkipForward, Lock, Disc, List } from 'lucide-react'

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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createClient()

  const loadResource = useCallback(async (linkData: any) => {
    if (linkData.type === 'album') {
      const { data: alb } = await supabase.from('albums').select('*').eq('id', linkData.resource_id).single()
      const { data: trks } = await supabase.from('tracks').select('*').eq('album_id', linkData.resource_id).order('track_number')
      setResource(alb)
      setTracks(trks ?? [])
    } else {
      const { data: pl } = await supabase.from('playlists').select('*').eq('id', linkData.resource_id).single()
      const { data: items } = await supabase.from('playlist_items')
        .select('*, track:tracks(*)')
        .eq('playlist_id', linkData.resource_id)
        .order('position')
      setResource(pl)
      setTracks((items ?? []).map((i: any) => i.track).filter(Boolean))
    }
    setStatus('ready')
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio
    audio.ontimeupdate = () => { setProgress(audio.currentTime); setDuration(audio.duration || 0) }
    audio.onended = () => {
      setCurrentIdx(i => {
        const next = i + 1
        if (next < tracks.length) {
          audio.src = tracks[next].file_url
          audio.play()
          return next
        }
        setIsPlaying(false)
        return i
      })
    }
    return () => { audio.pause(); audio.src = '' }
  }, [tracks])

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
    if (btoa(password) === link.password_hash) {
      setPwError(false)
      loadResource(link)
    } else {
      setPwError(true)
    }
  }

  const playTrack = (idx: number) => {
    const audio = audioRef.current!
    audio.src = tracks[idx].file_url
    audio.play()
    setCurrentIdx(idx)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    const audio = audioRef.current!
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else {
      if (!audio.src && tracks.length) audio.src = tracks[0].file_url
      audio.play()
      setIsPlaying(true)
    }
  }

  const currentTrack = tracks[currentIdx]

  // Error states
  const errorPage = (title: string, sub: string) => (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
      <div style={{ background: '#111', border: '0.5px solid #222', borderRadius: 12, padding: 36, width: 340, textAlign: 'center' }}>
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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', fontFamily: "'DM Sans', sans-serif", paddingBottom: 100 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        @font-face { font-family: 'StealThis'; src: url('/StealThisFont.ttf') format('truetype'); }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Top bar */}
      <div style={{ padding: '16px 24px', borderBottom: '0.5px solid #141414', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: 'StealThis, cursive', fontSize: 12, letterSpacing: '0.1em', color: '#2a2a2a', textTransform: 'uppercase' }}>WL Player</div>
        <a href="/" style={{ fontSize: 11, color: '#333', textDecoration: 'none', letterSpacing: '0.04em' }}>
          Create your own private player →
        </a>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>

        {/* Album/Playlist header */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 28, alignItems: 'flex-start' }}>
          {/* Cover */}
          <div style={{ flexShrink: 0 }}>
            {resource?.cover_url ? (
              <img src={resource.cover_url} style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover', border: '0.5px solid #1e1e1e' }} alt="" />
            ) : (
              <div style={{ width: 120, height: 120, borderRadius: 8, background: '#141414', border: '0.5px solid #1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {link?.type === 'album'
                  ? <Disc size={36} style={{ color: '#2a2a2a' }} />
                  : <List size={36} style={{ color: '#2a2a2a' }} />
                }
              </div>
            )}
          </div>

          {/* Meta */}
          <div style={{ flex: 1, paddingTop: 4 }}>
            <div style={{ fontSize: 10, color: '#333', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
              {link?.type === 'album' ? 'Album' : 'Playlist'}
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: '#f0f0f0', lineHeight: 1.2, marginBottom: 6 }}>
              {resource?.title}
            </div>
            <div style={{ fontSize: 13, color: '#444' }}>
              {tracks.length} track{tracks.length !== 1 ? 's' : ''}
              {resource?.year ? ` · ${resource.year}` : ''}
            </div>
            <button onClick={() => tracks.length && playTrack(0)} style={{ marginTop: 14, background: '#d4820a', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, padding: '9px 20px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Play size={14} /> Play all
            </button>
          </div>
        </div>

        {/* Description / infotext */}
        {link?.description && (
          <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontSize: 10, color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Note</div>
            <p style={{ fontSize: 14, color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{link.description}</p>
          </div>
        )}

        {/* Track list */}
        <div style={{ background: '#111', border: '0.5px solid #1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
          {tracks.map((track, i) => (
            <div key={track.id} onClick={() => playTrack(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                borderBottom: i < tracks.length - 1 ? '0.5px solid #161616' : 'none',
                cursor: 'pointer', background: currentIdx === i ? '#1a1400' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (currentIdx !== i) (e.currentTarget as HTMLElement).style.background = '#161616' }}
              onMouseLeave={e => { if (currentIdx !== i) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <div style={{ width: 22, textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: currentIdx === i ? '#d4820a' : '#333', flexShrink: 0 }}>
                {currentIdx === i && isPlaying ? '▶' : i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: currentIdx === i ? '#f0f0f0' : '#bbb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {track.title}
                </div>
                {track.file_format && (
                  <div style={{ fontSize: 11, color: '#333', marginTop: 2 }}>{track.file_format.toUpperCase()}</div>
                )}
              </div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: currentIdx === i && isPlaying ? '#d4820a' : '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Play size={12} style={{ color: currentIdx === i && isPlaying ? '#fff' : '#555', marginLeft: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 48, paddingBottom: 20 }}>
          <a href="/" style={{ fontSize: 12, color: '#2a2a2a', textDecoration: 'none', letterSpacing: '0.06em' }}>
            Create your own private music library at <span style={{ color: '#d4820a' }}>whitelabelplayer.se</span>
          </a>
        </div>
      </div>

      {/* Fixed player */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(17,17,17,0.96)', borderTop: '0.5px solid #1e1e1e', backdropFilter: 'blur(10px)', padding: '12px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Track info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: currentTrack ? '#ddd' : '#333', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTrack?.title ?? 'Select a track to play'}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button onClick={() => currentIdx > 0 && playTrack(currentIdx - 1)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 2 }}><SkipBack size={16} /></button>
              <button onClick={togglePlay} style={{ width: 36, height: 36, borderRadius: '50%', background: '#d4820a', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
              </button>
              <button onClick={() => currentIdx < tracks.length - 1 && playTrack(currentIdx + 1)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 2 }}><SkipForward size={16} /></button>
            </div>

            {/* Progress */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 2, background: '#222', borderRadius: 1, cursor: 'pointer' }}
                onClick={e => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  if (audioRef.current && duration) audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration
                }}>
                <div style={{ height: '100%', width: `${duration ? (progress / duration) * 100 : 0}%`, background: '#d4820a', borderRadius: 1, transition: 'width 0.1s' }} />
              </div>
              <span style={{ fontSize: 11, color: '#333', fontFamily: 'monospace', flexShrink: 0 }}>{formatTime(progress)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePlayer } from '@/lib/player-context'
import { Disc, Music, List, Upload, Settings, SkipBack, SkipForward, Play, Pause } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CdProfile from '@/components/ui/CdProfile'

const navItems = [
  { href: '/library', label: 'Library', icon: Disc },
  { href: '/albums', label: 'Albums', icon: Disc },
  { href: '/tracks', label: 'Låtar', icon: Music },
  { href: '/playlists', label: 'Playlists', icon: List },
]

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function Sidebar() {
  const pathname = usePathname()
  const { currentTrack, isPlaying, progress, duration, pause, resume, next, prev, seek } = usePlayer()
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  const DYMO_W = 44

  return (
    <aside style={{
      width: 400, minWidth: 400,
      background: 'var(--bg-sidebar)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'relative', zIndex: 10, flexShrink: 0,
    }}>

      {/* Dymo-strip längs höger kant */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: DYMO_W, background: '#f0f0e8',
        borderLeft: '2px solid #333',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 11,
      }}>
        <span style={{
          fontFamily: 'StealThis, cursive', fontSize: 18,
          letterSpacing: '0.22em', color: '#111',
          textTransform: 'uppercase', writingMode: 'vertical-rl',
          textOrientation: 'mixed', transform: 'rotate(180deg)',
          whiteSpace: 'nowrap', userSelect: 'none',
        }}>
          HEAR THIS ALBUM · WHITE LABEL PLAYER ·
        </span>
      </div>

      {/* Logo – fast i toppen */}
      <div style={{ padding: '16px 56px 12px 22px', borderBottom: '0.5px solid #2a2a2a', flexShrink: 0 }}>
        <div style={{ fontFamily: 'StealThis, cursive', fontSize: 18, letterSpacing: '0.08em', color: '#f0f0f0', textTransform: 'uppercase' }}>
          WL Player
        </div>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.1em', marginTop: 2, textTransform: 'uppercase' }}>Your library</div>
      </div>

      {/* Scrollbar mittsektion – CD + nav */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 0 }}>

        {/* CD-profil */}
        <div style={{ padding: '12px 56px 12px 22px', borderBottom: '0.5px solid #2a2a2a', display: 'flex', justifyContent: 'center' }}>
          <CdProfile label1={(profile?.display_name ?? '').split('|')[0] || null} label2={(profile?.display_name ?? '').split('|')[1] || null} avatarUrl={profile?.avatar_url} width={260} />
        </div>

        {/* Nav */}
        <nav style={{ padding: '8px 0' }}>
          <div style={{ padding: '6px 56px 3px 22px', fontSize: 9, letterSpacing: '0.14em', color: '#3a3a3a', textTransform: 'uppercase' }}>Musik</div>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/library' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 56px 9px 22px', fontSize: 14,
                color: active ? '#f0f0f0' : '#777',
                borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                background: active ? '#1a1500' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              }}>
                <Icon size={15} />{label}
              </Link>
            )
          })}
        </nav>

        {/* Konto */}
        <nav style={{ padding: '8px 0', borderTop: '0.5px solid #1e1e1e' }}>
          <div style={{ padding: '6px 56px 3px 22px', fontSize: 9, letterSpacing: '0.14em', color: '#3a3a3a', textTransform: 'uppercase' }}>Konto</div>
          <Link href="/upload" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 56px 9px 22px', fontSize: 14, color: '#777', textDecoration: 'none' }}>
            <Upload size={15} /> Upload
          </Link>
          <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 56px 9px 22px', fontSize: 14, color: '#777', textDecoration: 'none' }}>
            <Settings size={15} /> Settings
          </Link>
        </nav>
      </div>

      {/* Mini-spelare – fast i botten */}
      <div style={{ padding: '10px 56px 10px 14px', borderTop: '0.5px solid #2a2a2a', flexShrink: 0 }}>
        <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontSize: 13, color: currentTrack ? '#ddd' : '#444', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack?.title ?? 'Nothing playing'}
          </div>
          {currentTrack?.album && (
            <div style={{ fontSize: 11, color: '#555', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {(currentTrack.album as any).title}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <button onClick={prev} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 2 }}><SkipBack size={14} /></button>
            <button onClick={isPlaying ? pause : resume} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 2 }}>
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button onClick={next} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 2 }}><SkipForward size={14} /></button>
            <span style={{ fontSize: 11, color: '#555', fontFamily: 'StealThis, cursive' }}>{formatTime(progress)}</span>
          </div>
          <div style={{ marginTop: 8, height: 2, background: '#2e2e2e', borderRadius: 1, cursor: 'pointer' }}
            onClick={e => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); seek((e.clientX - rect.left) / rect.width) }}>
            <div style={{ height: '100%', width: `${duration ? (progress / duration) * 100 : 0}%`, background: 'var(--accent)', borderRadius: 1 }} />
          </div>
        </div>
      </div>

    </aside>
  )
}

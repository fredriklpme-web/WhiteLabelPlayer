'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePlayer } from '@/lib/player-context'
import { Disc, Music, List, Upload, Settings, SkipBack, SkipForward, Play, Pause, Menu, X, Repeat, Volume2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CdProfile from '@/components/ui/CdProfile'

const navItems = [
  { href: '/library', label: 'Library', icon: Disc },
  { href: '/albums', label: 'Albums', icon: Disc },
  { href: '/tracks', label: 'Tracks', icon: Music },
  { href: '/playlists', label: 'Playlists', icon: List },
]

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export default function Sidebar() {
  const pathname = usePathname()
  const { currentTrack, isPlaying, progress, duration, pause, resume, next, prev, seek, repeat, toggleRepeat, normalize, toggleNormalize, analyzing } = usePlayer()
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Stäng meny vid navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  const parts = (profile?.display_name ?? '').split('|')
  const label1 = parts[0] || null
  const label2 = parts[1] || null

  const DYMO_W = 44

  const sidebarContent = (
    <aside style={{
      width: isMobile ? '100%' : 400,
      minWidth: isMobile ? '100%' : 400,
      background: 'var(--bg-sidebar)',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'relative', zIndex: 10, flexShrink: 0,
    }}>
      {/* Dymo-strip */}
      {!isMobile && (
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
      )}

      {/* Logo + close button on mobile */}
      <div style={{ padding: isMobile ? '16px 20px' : '18px 56px 14px 22px', borderBottom: '0.5px solid #2a2a2a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'StealThis, cursive', fontSize: 16, letterSpacing: '0.08em', color: '#f0f0f0', textTransform: 'uppercase' }}>WL Player</div>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: '0.1em', marginTop: 2, textTransform: 'uppercase' }}>Your library</div>
        </div>
        {isMobile && (
          <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            <X size={22} />
          </button>
        )}
      </div>

      {/* Scrollbar mittsektion */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* CD-profil – döljs på mobil för att spara plats */}
        {!isMobile && (
          <div style={{ padding: '14px 56px 14px 22px', borderBottom: '0.5px solid #2a2a2a', display: 'flex', justifyContent: 'center' }}>
            <CdProfile label1={label1} label2={label2} avatarUrl={profile?.avatar_url} width={260} />
          </div>
        )}

        {/* Nav */}
        <nav style={{ padding: '10px 0' }}>
          <div style={{ padding: `6px ${isMobile ? '20px' : '56px'} 3px ${isMobile ? '20px' : '22px'}`, fontSize: 9, letterSpacing: '0.14em', color: '#3a3a3a', textTransform: 'uppercase' }}>Music</div>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/library' && pathname.startsWith(href))
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: `${isMobile ? '12px 20px' : '9px 56px 9px 22px'}`, fontSize: isMobile ? 15 : 14,
                color: active ? '#f0f0f0' : '#777',
                borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                background: active ? '#1a1500' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              }}>
                <Icon size={16} />{label}
              </Link>
            )
          })}
        </nav>

        {/* Konto */}
        <nav style={{ padding: '8px 0', borderTop: '0.5px solid #1e1e1e' }}>
          <div style={{ padding: `6px ${isMobile ? '20px' : '56px'} 3px ${isMobile ? '20px' : '22px'}`, fontSize: 9, letterSpacing: '0.14em', color: '#3a3a3a', textTransform: 'uppercase' }}>Account</div>
          <Link href="/upload" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `${isMobile ? '12px 20px' : '9px 56px 9px 22px'}`, fontSize: isMobile ? 15 : 14, color: '#777', textDecoration: 'none' }}>
            <Upload size={15} /> Upload
          </Link>
          <Link href="/settings" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: `${isMobile ? '12px 20px' : '9px 56px 9px 22px'}`, fontSize: isMobile ? 15 : 14, color: '#777', textDecoration: 'none' }}>
            <Settings size={15} /> Settings
          </Link>
        </nav>
      </div>

      {/* Mini-spelare */}
      <div style={{ padding: `10px ${isMobile ? '14px' : '56px 10px 14px'}`, borderTop: '0.5px solid #2a2a2a', flexShrink: 0 }}>
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
            <button onClick={prev} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4 }}><SkipBack size={14} /></button>
            <button onClick={isPlaying ? pause : resume} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4 }}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={next} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 4 }}><SkipForward size={14} /></button>
            <button onClick={toggleRepeat} title="Repeat" style={{ background: "none", border: "none", color: repeat ? "var(--accent)" : "#444", cursor: "pointer", padding: 4 }}><Repeat size={12} /></button>
            <button onClick={toggleNormalize} title={normalize ? "Normalize: On (-14 LUFS)" : "Normalize: Off"} style={{ background: "none", border: "none", color: normalize ? "var(--accent)" : "#444", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontFamily: "monospace" }}><Volume2 size={12} />{ analyzing ? "..." : normalize ? "N" : ""}</button>
            <span style={{ fontSize: 11, color: "#555", fontFamily: "StealThis, cursive" }}>{formatTime(progress)}</span>
          </div>
          <div style={{ marginTop: 8, height: 2, background: '#2e2e2e', borderRadius: 1, cursor: 'pointer' }}
            onClick={e => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); seek((e.clientX - rect.left) / rect.width) }}>
            <div style={{ height: '100%', width: `${duration ? (progress / duration) * 100 : 0}%`, background: 'var(--accent)', borderRadius: 1 }} />
          </div>
        </div>
      </div>
    </aside>
  )

  if (isMobile) {
    return (
      <>
        {/* Mobile topbar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 20,
          background: '#111', borderBottom: '0.5px solid #2a2a2a',
          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontFamily: 'StealThis, cursive', fontSize: 14, letterSpacing: '0.08em', color: '#f0f0f0', textTransform: 'uppercase' }}>WL Player</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Mini-speler info */}
            {currentTrack && (
              <div style={{ fontSize: 12, color: '#888', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentTrack.title}
              </div>
            )}
            <button onClick={isPlaying ? pause : resume} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 2 }}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 2 }}>
              <Menu size={22} />
            </button>
          </div>
        </div>

        {/* Mobile drawer overlay */}
        {mobileOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 30 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileOpen(false)} />
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '85%', maxWidth: 360, zIndex: 31, overflowY: 'auto' }}>
              {sidebarContent}
            </div>
          </div>
        )}
      </>
    )
  }

  return sidebarContent
}

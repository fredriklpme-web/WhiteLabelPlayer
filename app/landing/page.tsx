'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const cards = [
  { label: 'For artists', text: 'Keep your demos, rough mixes and unreleased songs in one private player. Listen to your own material like a real music library before it is ready to release.' },
  { label: 'For friends sharing music', text: 'Stop losing songs in chats, download folders and old links. Upload tracks from friends and keep everything organized, playable and easy to find.' },
  { label: 'For producers', text: 'Collect beats, drafts, client mixes and work-in-progress tracks in one place. Build playlists, compare versions and listen outside the studio.' },
  { label: 'For your personal archive', text: 'Keep old recordings, finished tracks, experiments and private audio files in one clean player instead of scattered across devices and cloud storage.' },
  { label: 'For bands', text: 'Keep rehearsal recordings, song ideas, live takes and new demos together. Everyone can organize their own private listening space before anything goes public.' },
  { label: 'For songwriters', text: 'Save ideas, voice notes, toplines, demos and unfinished songs in a player built for listening — not just file storage.' },
  { label: 'For unreleased projects', text: 'Create albums and playlists for music that is still in progress. Live with the material, test the order and hear how it feels before release.' },
  { label: 'For studios and teams', text: 'Organize private audio for internal listening, review sessions and creative development without relying on messy folders or temporary links.' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f8f7f3', fontFamily: "'DM Sans', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        @font-face { font-family: 'StealThis'; src: url('/StealThisFont.ttf') format('truetype'); }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fu { animation: fadeUp 0.7s ease forwards; opacity: 0; }
        .d1 { animation-delay: 0.1s; } .d2 { animation-delay: 0.25s; }
        .d3 { animation-delay: 0.4s; } .d4 { animation-delay: 0.55s; } .d5 { animation-delay: 0.72s; }
        .card { transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s; cursor: default; }
        .card:hover { border-color: #d4820a !important; transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.07); }
        .cta-amber { background: #d4820a; transition: background 0.18s, transform 0.15s; }
        .cta-amber:hover { background: #a86208 !important; transform: translateY(-1px); }
        .cta-dark { background: #111; transition: background 0.18s, transform 0.15s; }
        .cta-dark:hover { background: #333 !important; transform: translateY(-1px); }
        .nav-signin { transition: color 0.15s; }
        .nav-signin:hover { color: #111 !important; }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 48px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(248,247,243,0.96)' : 'transparent',
        borderBottom: scrolled ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        transition: 'all 0.3s',
      }}>
        <div style={{ fontFamily: 'StealThis, cursive', fontSize: 32, letterSpacing: '0.08em', color: '#111', textTransform: 'uppercase' }}>
          White Label Player
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Link href="/login" className="nav-signin" style={{ fontSize: 13, color: '#777', textDecoration: 'none', padding: '7px 14px', borderRadius: 6 }}>
            Sign in
          </Link>
          <Link href="/login" className="cta-dark" style={{ fontSize: 13, fontWeight: 500, color: '#fff', padding: '7px 18px', borderRadius: 6, textDecoration: 'none' }}>
            Create account
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        position: 'relative', minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 100px', textAlign: 'center',
      }}>
        {/* Bakgrundsbild – spara din bild som /public/hero-bg.jpg */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'url(/hero-bg.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: '#e8e0cc',
        }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'rgba(248,247,243,0.65)' }} />

        <div className="fu d1" style={{ position: 'relative', zIndex: 2, marginBottom: 28 }}>
          <span style={{
            fontFamily: 'StealThis, cursive', fontSize: 22,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            background: '#f0f0e8', border: '1.5px solid #222',
            borderRadius: 3, padding: '6px 20px', display: 'inline-block', color: '#111',
          }}>White Label Player</span>
        </div>

        <h1 className="fu d2" style={{
          position: 'relative', zIndex: 2,
          fontSize: 'clamp(28px, 5vw, 58px)', fontWeight: 600,
          color: '#111', lineHeight: 1.15, maxWidth: 720,
          letterSpacing: '-0.02em', marginBottom: 22,
        }}>
          For all the music that is not on Spotify yet.
        </h1>

        <p className="fu d3" style={{
          position: 'relative', zIndex: 2,
          fontSize: 'clamp(15px, 2vw, 19px)', color: '#111',
          lineHeight: 1.75, maxWidth: 560, marginBottom: 44,
        }}>
          Demos, rough mixes, friends' songs, unreleased tracks and private recordings — uploaded, organized and ready to play.
        </p>

        <div className="fu d4" style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Link href="/login" className="cta-amber" style={{
            display: 'inline-block', color: '#fff',
            fontSize: 15, fontWeight: 600, padding: '14px 40px',
            borderRadius: 8, textDecoration: 'none', letterSpacing: '0.01em',
          }}>
            Create your private player — free
          </Link>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#aaa' }}>
              Already have an account?
            </span>
            <Link href="/login" style={{ fontSize: 22, color: '#d4820a', textDecoration: 'none', fontWeight: 500 }}>
              Sign in →
            </Link>
          </div>
          <span style={{ fontSize: 22, color: '#111', maxWidth: 400 }}>
            Your files stay inside your personal account and are only accessible to you.
          </span>
        </div>

        <div className="fu d5" style={{ position: 'absolute', bottom: 40, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.3 }}>
          <div style={{ width: 1, height: 40, background: '#111' }} />
          <span style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#111' }}>scroll</span>
        </div>
      </section>

      {/* Cards */}
      <section style={{ padding: '72px 32px 0', maxWidth: 1140, margin: '0 auto' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 14 }}>
          {cards.slice(0, 4).map(card => (
            <div key={card.label} className="card" style={{
              background: 'rgba(255,255,255,0.9)', border: '0.5px solid rgba(0,0,0,0.1)',
              borderRadius: 10, padding: '26px 22px',
            }}>
              <div style={{ fontFamily: 'StealThis, cursive', fontSize: 32, letterSpacing: '0.16em', color: '#d4820a', marginBottom: 10, textTransform: 'uppercase' }}>
                {card.label}
              </div>
              <p style={{ fontSize: 14, color: '#555', lineHeight: 1.7 }}>{card.text}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '52px 0 36px' }}>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.1)' }} />
          <span style={{ fontFamily: 'StealThis, cursive', fontSize: 32, letterSpacing: '0.18em', color: '#ccc', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>And more</span>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,0,0,0.1)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 88 }}>
          {cards.slice(4).map(card => (
            <div key={card.label} className="card" style={{
              background: 'rgba(255,255,255,0.65)', border: '0.5px solid rgba(0,0,0,0.07)',
              borderRadius: 10, padding: '26px 22px',
            }}>
              <div style={{ fontFamily: 'StealThis, cursive', fontSize: 32, letterSpacing: '0.16em', color: '#999', marginBottom: 10, textTransform: 'uppercase' }}>
                {card.label}
              </div>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7 }}>{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ background: '#111', padding: '88px 24px', textAlign: 'center' }}>
        <div style={{ marginBottom: 28 }}>
          <span style={{ fontFamily: 'StealThis, cursive', fontSize: 60, letterSpacing: '0.22em', textTransform: 'uppercase', background: '#f0f0e8', color: '#111', borderRadius: 3, padding: '4px 16px', display: 'inline-block' }}>
            White Label Player
          </span>
        </div>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 42px)', fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: 14, lineHeight: 1.2 }}>
          Create your own private player<br />in 2 minutes.
        </h2>
        <p style={{ fontSize: 15, color: '#666', marginBottom: 36 }}>
          Your files stay inside your personal account and are only accessible to you.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login" className="cta-amber" style={{ display: 'inline-block', color: '#fff', fontSize: 15, fontWeight: 600, padding: '14px 40px', borderRadius: 8, textDecoration: 'none' }}>
            Create account — it's free
          </Link>
          <Link href="/login" style={{ display: 'inline-block', color: '#666', fontSize: 15, padding: '14px 28px', borderRadius: 8, textDecoration: 'none', border: '0.5px solid #333' }}>
            Sign in
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0a0a0a', padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'StealThis, cursive', fontSize: 12, color: '#333', letterSpacing: '0.08em', textTransform: 'uppercase' }}>White Label Player</span>
        <span style={{ fontSize: 11, color: '#2a2a2a' }}>Private. Personal. Yours.</span>
      </footer>
    </div>
  )
}

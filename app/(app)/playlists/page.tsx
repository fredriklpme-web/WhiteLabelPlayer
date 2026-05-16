'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, List } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Playlist } from '@/types'
import UploadOverlay from '@/components/upload/UploadOverlay'

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('playlists').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setPlaylists(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '15px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111' }}>Spellistor</span>
        <button onClick={() => setShowUpload(true)} style={{ background: '#111', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> New playlist
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', position: 'relative', zIndex: 1 }}>
        {loading ? <div style={{ color: '#aaa', fontSize: 13 }}>Loading...</div>
        : playlists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <List size={32} style={{ color: '#ddd', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#aaa' }}>No playlists yet</p>
            <button onClick={() => setShowUpload(true)} style={{ marginTop: 10, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Create your first playlist →</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {playlists.map(pl => (
              <div key={pl.id} onClick={() => router.push(`/playlists/${pl.id}`)}
                style={{ background: 'rgba(255,255,255,0.88)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#aaa'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0efe9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <List size={16} style={{ color: 'var(--accent)' }} />
                </div>
                <div style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{pl.title}</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{new Date(pl.created_at).toLocaleDateString('sv-SE')}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showUpload && <UploadOverlay onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); load() }} />}
    </div>
  )
}

'use client'
import { useEffect, useState, useCallback } from 'react'
import { Plus, Disc } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Album } from '@/types'
import UploadOverlay from '@/components/upload/UploadOverlay'

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('albums').select('*, tracks(count)').eq('user_id', user.id).order('created_at', { ascending: false })
    setAlbums(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '15px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111' }}>Album</span>
        <button onClick={() => setShowUpload(true)} style={{ background: '#111', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, padding: '7px 14px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> New album
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {loading ? <div style={{ color: '#aaa', fontSize: 13 }}>Loading...</div>
        : albums.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Disc size={32} style={{ color: '#ddd', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 13, color: '#aaa' }}>No albums yet</p>
            <button onClick={() => setShowUpload(true)} style={{ marginTop: 10, fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Upload your first album →</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {albums.map(album => (
              <div key={album.id} onClick={() => router.push(`/albums/${album.id}`)}
                style={{ background: 'rgba(255,255,255,0.88)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#aaa'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.08)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>
                <div style={{ aspectRatio: '1', background: album.cover_url ? `url(${album.cover_url}) center/cover` : '#f0efe9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!album.cover_url && <Disc size={28} style={{ color: '#ccc' }} />}
                </div>
                <div style={{ padding: '10px 12px', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{album.title}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{(album as any).tracks?.[0]?.count ?? 0} tracks{album.year ? ` · ${album.year}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showUpload && <UploadOverlay onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); load() }} />}
    </div>
  )
}

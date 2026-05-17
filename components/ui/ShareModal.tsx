'use client'
import { useState, useEffect } from 'react'
import { X, Link, Lock, Clock, Copy, Check, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ShareModalProps {
  type: 'album' | 'playlist'
  resourceId: string
  title: string
  onClose: () => void
}

export default function ShareModal({ type, resourceId, title, onClose }: ShareModalProps) {
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [expires, setExpires] = useState<'7' | '30' | 'never'>('never')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [existingLinks, setExistingLinks] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('share_links').select('*')
        .eq('user_id', user.id).eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
      setExistingLinks(data ?? [])
    }
    load()
  }, [resourceId])

  const handleCreate = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let expiresAt = null
      if (expires !== 'never') {
        const d = new Date()
        d.setDate(d.getDate() + parseInt(expires))
        expiresAt = d.toISOString()
      }

      const { data, error } = await supabase.from('share_links').insert({
        user_id: user.id, type, resource_id: resourceId,
        password_hash: usePassword && password ? btoa(password) : null,
        description: description.trim() || null,
        expires_at: expiresAt,
      }).select().single()

      if (error || !data) { console.error(error); return }

      const url = `${window.location.origin}/s/${data.token}`
      setShareUrl(url)
      setExistingLinks(prev => [data, ...prev])
      setPassword(''); setDescription('')
    } finally { setLoading(false) }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const deleteLink = async (id: string) => {
    await supabase.from('share_links').delete().eq('id', id)
    setExistingLinks(prev => prev.filter(l => l.id !== id))
  }

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never expires'
    const d = new Date(expiresAt)
    if (d < new Date()) return 'Expired'
    const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
    return `${days}d left`
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', border: '0.5px solid #e0e0e0', borderRadius: 12, width: 480, maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'StealThis, cursive', fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#111' }}>Share</div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20 }}>

          {/* Create new */}
          <div style={{ background: '#f8f7f3', border: '0.5px solid #e8e8e4', borderRadius: 8, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>Create share link</div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Message to listener (optional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Here are the demos from our last session. Let me know what you think..."
                maxLength={300}
                rows={3}
                style={{ width: '100%', background: '#fff', border: '0.5px solid #ddd', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#222', resize: 'vertical', fontFamily: 'inherit' }}
              />
              <div style={{ fontSize: 11, color: '#ccc', textAlign: 'right', marginTop: 2 }}>{description.length}/300</div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: usePassword ? 10 : 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={13} style={{ color: '#aaa' }} />
                <span style={{ fontSize: 13, color: '#555' }}>Password protect</span>
              </div>
              <button onClick={() => setUsePassword(p => !p)} style={{ width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: usePassword ? '#d4820a' : '#ddd', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: usePassword ? 18 : 2, transition: 'left 0.2s' }} />
              </button>
            </div>

            {usePassword && (
              <input style={{ width: '100%', background: '#fff', border: '0.5px solid #ddd', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#222', marginBottom: 12 }}
                type="text" placeholder="Enter password..." value={password} onChange={e => setPassword(e.target.value)} />
            )}

            {/* Expiry */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Clock size={13} style={{ color: '#aaa' }} />
              <span style={{ fontSize: 13, color: '#555' }}>Expires</span>
              {(['7', '30', 'never'] as const).map(opt => (
                <button key={opt} onClick={() => setExpires(opt)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', background: expires === opt ? '#111' : '#fff', color: expires === opt ? '#fff' : '#888', border: `0.5px solid ${expires === opt ? '#111' : '#ddd'}`, transition: 'all 0.15s' }}>
                  {opt === 'never' ? 'Never' : `${opt}d`}
                </button>
              ))}
            </div>

            <button onClick={handleCreate} disabled={loading || (usePassword && !password)}
              style={{ background: '#111', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, padding: '9px 18px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: (usePassword && !password) ? 0.5 : 1 }}>
              <Link size={14} />
              {loading ? 'Creating...' : 'Create link'}
            </button>
          </div>

          {/* New link result */}
          {shareUrl && (
            <div style={{ background: '#f0fdf4', border: '0.5px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#166534', marginBottom: 8, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Link created!</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, background: '#fff', border: '0.5px solid #ddd', borderRadius: 6, padding: '7px 10px', fontSize: 12, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {shareUrl}
                </div>
                <button onClick={() => copyUrl(shareUrl)} style={{ background: copied ? '#d4820a' : '#111', border: 'none', color: '#fff', padding: '0 14px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
                  {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
            </div>
          )}

          {/* Existing links */}
          {existingLinks.length > 0 && (
            <div>
              <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', marginBottom: 10 }}>Active links</div>
              {existingLinks.map(link => (
                <div key={link.id} style={{ padding: '10px 12px', background: '#fafaf8', border: '0.5px solid #eee', borderRadius: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: link.description ? 6 : 0 }}>
                    <div style={{ flex: 1, fontSize: 12, color: '#333', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {window.location.origin}/s/{link.token}
                    </div>
                    <button onClick={() => copyUrl(`${window.location.origin}/s/${link.token}`)} style={{ background: 'none', border: '0.5px solid #ddd', color: '#888', padding: '3px 7px', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}>
                      <Copy size={12} />
                    </button>
                    <button onClick={() => deleteLink(link.id)} style={{ background: 'none', border: '0.5px solid #fca5a5', color: '#dc2626', padding: '3px 7px', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {link.description && (
                    <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      "{link.description}"
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#bbb', display: 'flex', gap: 10 }}>
                    {link.password_hash && <span>🔒 Password</span>}
                    <span>{formatExpiry(link.expires_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

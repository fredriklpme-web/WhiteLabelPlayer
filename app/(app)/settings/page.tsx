'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Lock, Trash2, LogOut, Camera } from 'lucide-react'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [label1, setLabel1] = useState('')
  const [label2, setLabel2] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        setProfile(data)
        if (data?.display_name) {
          const parts = data.display_name.split('|')
          setLabel1(parts[0] ?? '')
          setLabel2(parts[1] ?? '')
        }
        setAvatarPreview(data?.avatar_url ?? null)
      })
    })
  }, [])

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      let avatarUrl = profile?.avatar_url ?? null
      if (avatarFile) {
        const path = `${user.id}/avatar_${Date.now()}.${avatarFile.name.split('.').pop()}`
        await supabase.storage.from('images').upload(path, avatarFile, { upsert: true })
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path)
        avatarUrl = publicUrl
      }
      const displayName = [label1.trim(), label2.trim()].filter(Boolean).join('|')
      const { error } = await supabase.from('profiles').update({ display_name: displayName || null, avatar_url: avatarUrl }).eq('id', user.id)
      if (error) showMsg('Error: ' + error.message, 'error')
      else showMsg('Profile saved!', 'success')
    } finally { setLoading(false) }
  }

  const handleChangePassword = async () => {
    if (!newPassword) return
    if (newPassword !== confirmPassword) { showMsg('Passwords do not match.', 'error'); return }
    if (newPassword.length < 6) { showMsg('Minimum 6 characters.', 'error'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) showMsg('Error: ' + error.message, 'error')
      else { showMsg('Password updated!', 'success'); setNewPassword(''); setConfirmPassword('') }
    } finally { setLoading(false) }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? Your account and all your music will be permanently deleted.')) return
    if (!confirm('Last warning – this cannot be undone.')) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.auth.signOut()
      router.push('/login')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
      <div style={{ padding: '15px 24px', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: 'StealThis, cursive', fontSize: 16, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#111' }}>Settings</span>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '0.5px solid #ddd', color: '#555', fontSize: 13, padding: '7px 14px', borderRadius: 6, cursor: 'pointer' }}>
          <LogOut size={14} /> Log out
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 520 }}>

          {message && (
            <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fff5f5', border: `0.5px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`, borderRadius: 6, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: message.type === 'success' ? '#166534' : '#991b1b' }}>
              {message.text}
            </div>
          )}

          {/* Profile */}
          <div style={card}>
            <div style={cardHeader}>
              <User size={15} style={{ color: 'var(--accent)' }} />
              <span style={cardTitle}>Profile</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
              <div style={{ position: 'relative', width: 68, height: 68 }}>
                <div style={{ width: 68, height: 68, borderRadius: '50%', background: avatarPreview ? `url(${avatarPreview}) center/cover` : '#f0efe9', border: '0.5px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!avatarPreview && <User size={26} style={{ color: '#ccc' }} />}
                </div>
                <label style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, background: '#111', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #fff' }}>
                  <Camera size={12} style={{ color: '#fff' }} />
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
                  }} />
                </label>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{profile?.email}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 3 }}>Click the image to change</div>
              </div>
            </div>

            {/* CD Labels */}
            <div style={{ background: '#f8f7f3', border: '0.5px solid #e8e8e4', borderRadius: 8, padding: '16px 18px', marginBottom: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', marginBottom: 14 }}>
                CD Labels
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>
                  <span style={{ background: '#111', color: '#f0f0e8', fontFamily: 'StealThis, cursive', fontSize: 12, padding: '2px 10px', borderRadius: 2, marginRight: 10, letterSpacing: '0.1em' }}>LABEL 1</span>
                  Line 1 on the disc
                </label>
                <input style={inp} type="text" placeholder="e.g. Homemade Songs" value={label1} onChange={e => setLabel1(e.target.value)} maxLength={24} />
              </div>
              <div>
                <label style={lbl}>
                  <span style={{ background: '#111', color: '#f0f0e8', fontFamily: 'StealThis, cursive', fontSize: 12, padding: '2px 10px', borderRadius: 2, marginRight: 10, letterSpacing: '0.1em' }}>LABEL 2</span>
                  Line 2 on the disc
                </label>
                <input style={inp} type="text" placeholder="e.g. by Fredrik" value={label2} onChange={e => setLabel2(e.target.value)} maxLength={24} />
              </div>
            </div>

            <button onClick={handleSaveProfile} disabled={loading} style={btnPrimary}>
              {loading ? 'Saving...' : 'Save profile'}
            </button>
          </div>

          {/* Password */}
          <div style={card}>
            <div style={cardHeader}>
              <Lock size={15} style={{ color: 'var(--accent)' }} />
              <span style={cardTitle}>Password</span>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>New password</label>
              <input style={inp} type="password" placeholder="Minimum 6 characters..." value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Confirm password</label>
              <input style={inp} type="password" placeholder="Repeat password..." value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            <button onClick={handleChangePassword} disabled={loading || !newPassword} style={{ ...btnPrimary, opacity: !newPassword ? 0.5 : 1 }}>
              Change password
            </button>
          </div>

          {/* Danger zone */}
          <div style={{ background: '#fff8f8', border: '0.5px solid #fca5a5', borderRadius: 10, padding: 20 }}>
            <div style={cardHeader}>
              <Trash2 size={15} style={{ color: '#dc2626' }} />
              <span style={{ ...cardTitle, color: '#dc2626' }}>Danger zone</span>
            </div>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Delete your account and all your music permanently. This cannot be undone.</p>
            <button onClick={handleDeleteAccount} disabled={loading} style={{ background: 'none', border: '0.5px solid #dc2626', color: '#dc2626', fontSize: 14, padding: '9px 18px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> Delete my account
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.9)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 10, padding: 22, marginBottom: 16 }
const cardHeader: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }
const cardTitle: React.CSSProperties = { fontFamily: 'StealThis, cursive', fontSize: 14, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555' }
const lbl: React.CSSProperties = { display: 'flex', alignItems: 'center', fontSize: 12, color: '#888', marginBottom: 8 }
const inp: React.CSSProperties = { width: '100%', background: '#fff', border: '0.5px solid #ddd', borderRadius: 6, padding: '9px 12px', fontSize: 14, color: '#222', fontFamily: 'var(--font-body)' }
const btnPrimary: React.CSSProperties = { background: '#111', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, padding: '9px 18px', borderRadius: 6, cursor: 'pointer', fontFamily: 'StealThis, cursive', letterSpacing: '0.06em' }

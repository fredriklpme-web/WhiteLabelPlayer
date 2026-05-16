'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handle = async () => {
    setLoading(true)
    setMessage('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setMessage(error.message)
        else router.push('/library')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setMessage(error.message)
        else setMessage('Check your email to confirm your account.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 360 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#111', marginBottom: 4 }}>
          WL Player
        </div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 32 }}>
          {mode === 'login' ? 'Sign in to your library' : 'Create a new account'}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>E-post</label>
          <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com" onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Lösenord</label>
          <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>

        {message && <div style={{ fontSize: 13, color: message.includes('Kolla') ? 'green' : 'red', marginBottom: 14 }}>{message}</div>}

        <button onClick={handle} disabled={loading} style={{
          width: '100%', background: '#111', border: 'none', color: '#fff',
          fontSize: 13, fontWeight: 500, padding: '11px 0', borderRadius: 7,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-display)',
          letterSpacing: '0.06em', opacity: loading ? 0.7 : 1,
        }}>
          {loading ? '...' : mode === 'login' ? 'SIGN IN' : 'REGISTER'}
        </button>

        <button onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
          style={{ width: '100%', background: 'none', border: 'none', color: '#888', fontSize: 13, marginTop: 14, cursor: 'pointer' }}>
          {mode === 'login' ? 'No account? Register' : 'Have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 10, letterSpacing: '0.1em', color: '#999', textTransform: 'uppercase', marginBottom: 6 }
const inp: React.CSSProperties = { width: '100%', background: '#fff', border: '0.5px solid #ddd', borderRadius: 7, padding: '10px 12px', fontSize: 14, color: '#222', fontFamily: 'var(--font-body)' }

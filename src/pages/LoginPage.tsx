import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email o password non corretti.')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 60% 0%, rgba(83,74,183,0.2) 0%, transparent 60%), var(--bg)',
      padding: '24px'
    }}>
      {/* Logo area */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: 'white',
          margin: '0 auto 16px', boxShadow: 'var(--shadow-primary)'
        }}>SM</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Studio Montemurro</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>Il tuo spazio fiscale personale</p>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} style={{
        width: '100%', maxWidth: 360,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px'
      }}>
        <div className="form-row">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="la-tua@email.it"
            required
          />
        </div>
        <div className="form-row" style={{ marginBottom: 20 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            color: 'var(--danger)', fontSize: 13, marginBottom: 16
          }}>{error}</div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
          {loading ? <span className="spinner" /> : 'Accedi'}
        </button>
      </form>

      <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 32 }}>
        © {new Date().getFullYear()} Studio Montemurro · Tutti i diritti riservati
      </p>
    </div>
  )
}

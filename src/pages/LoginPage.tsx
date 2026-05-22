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
      background: 'linear-gradient(160deg, #f5f7fa 0%, #eef1f5 100%)',
      padding: '24px'
    }}>
      {/* Logo esteso */}
      <div style={{ marginBottom: '36px', textAlign: 'center' }}>
        <img
          src="/logo-esteso.png"
          alt="Montemurro Studio Tributario"
          style={{ height: 80, maxWidth: 320, objectFit: 'contain' }}
        />
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} style={{
        width: '100%', maxWidth: 360,
        background: 'white',
        border: '1px solid rgba(7,36,62,0.1)',
        borderRadius: 20,
        padding: '28px',
        boxShadow: '0 4px 32px rgba(7,36,62,0.1)'
      }}>
        <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
          Il tuo spazio fiscale personale
        </p>

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
            background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            color: 'var(--danger)', fontSize: 13, marginBottom: 16
          }}>{error}</div>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading}
          style={{ width: '100%', justifyContent: 'center', padding: '13px' }}>
          {loading ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : 'Accedi'}
        </button>
      </form>

      <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 32 }}>
        © {new Date().getFullYear()} Montemurro Studio Tributario
      </p>
    </div>
  )
}

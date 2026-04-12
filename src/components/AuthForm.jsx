import { useState } from 'react'
import { supabase } from '../supabase'

export default function AuthForm() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/projects/todo',
      })
      if (error) {
        setError(error.message)
      } else {
        setResetSent(true)
      }
      setLoading(false)
      return
    }

    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (error) setError(error.message)
    setLoading(false)
  }

  if (mode === 'forgot') {
    return (
      <div className="auth-container">
        <h1>Todo App</h1>
        {resetSent ? (
          <p className="auth-info">Check your email for a password reset link.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        <button
          type="button"
          className="toggle"
          onClick={() => { setMode('signin'); setResetSent(false); setError(null) }}
        >
          Back to Sign In
        </button>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <h1>Todo App</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>
      </form>
      <button
        type="button"
        className="toggle"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
      >
        {mode === 'signin' ? 'Need an account? Sign Up' : 'Have an account? Sign In'}
      </button>
      {mode === 'signin' && (
        <button
          type="button"
          className="toggle"
          onClick={() => { setMode('forgot'); setError(null) }}
        >
          Forgot password?
        </button>
      )}
    </div>
  )
}

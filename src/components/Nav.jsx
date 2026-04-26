import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Nav({ session }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav className="nav" aria-label="Main navigation">
      <Link to="/" className="nav-logo">
        VK<span>.</span>
      </Link>
      <div className="nav-links">
        <Link to="/" className={pathname === '/' ? 'active' : undefined}>
          home
        </Link>
        <a href="/#experiments">projects</a>
        <Link
          to="/projects/bills"
          className={pathname.startsWith('/projects/bills') ? 'active' : undefined}
        >
          bills
        </Link>
        <a href="mailto:me@varunkapuria.xyz" className="nav-cta">
          me@varunkapuria.xyz
        </a>
        {session === undefined ? null : session ? (
          <button className="nav-auth-btn" onClick={handleSignOut}>sign out</button>
        ) : (
          <Link to="/projects/bills" className="nav-auth-btn">sign in</Link>
        )}
      </div>
    </nav>
  )
}

import { Link, useLocation } from 'react-router-dom'

export default function Nav() {
  const { pathname } = useLocation()

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
      </div>
    </nav>
  )
}

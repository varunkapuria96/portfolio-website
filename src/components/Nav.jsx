import { Link, useLocation } from 'react-router-dom'

export default function Nav() {
  const { pathname } = useLocation()

  return (
    <nav className="nav">
      <Link to="/" className="nav-logo">
        VK<span>.</span>
      </Link>
      <div className="nav-links">
        <Link to="/" className={pathname === '/' ? 'active' : ''}>
          home
        </Link>
        <a href="/#experiments">projects</a>
        <a
          href="mailto:varunkapuria@arizona.edu"
          className="nav-cta"
        >
          varunkapuria@arizona.edu
        </a>
      </div>
    </nav>
  )
}

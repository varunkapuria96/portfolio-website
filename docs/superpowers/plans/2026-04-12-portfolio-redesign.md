# Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the todo-app into a personal portfolio site with a dark terminal aesthetic, routing the existing Todo App to `/projects/todo` and adding a new homepage at `/`.

**Architecture:** Add `react-router-dom` for URL routing. Create two new components — `Nav` (shared sticky navbar) and `Portfolio` (homepage). Refactor `App.jsx` to set up `BrowserRouter` with two routes. Extend `index.css` with portfolio styles and adapt existing styles to the dark theme.

**Tech Stack:** React 19, react-router-dom v6, Supabase (unchanged), Vite, Vitest + Testing Library

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/Nav.jsx` | Create | Sticky navbar — logo, home/projects links, email CTA |
| `src/components/Portfolio.jsx` | Create | Homepage — hero section + projects grid |
| `src/components/Nav.test.jsx` | Create | Tests for Nav rendering and active link state |
| `src/components/Portfolio.test.jsx` | Create | Tests for hero content and all 6 project cards |
| `src/App.jsx` | Modify | Set up BrowserRouter, Nav, and two routes |
| `src/App.test.jsx` | Create | Smoke test that portfolio renders at `/` |
| `src/index.css` | Modify | Dark theme base + portfolio styles + scoped todo styles |

---

## Task 1: Install react-router-dom

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the package**

```bash
npm install react-router-dom
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify it appears in dependencies**

Open `package.json` and confirm `"react-router-dom"` is in `"dependencies"` with a version like `"^6.x.x"`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add react-router-dom"
```

---

## Task 2: Update index.css for dark theme + portfolio styles

**Files:**
- Modify: `src/index.css`

No unit tests — visual changes verified manually at the end.

- [ ] **Step 1: Replace the entire contents of `src/index.css`**

```css
/* ===== RESET ===== */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ===== BASE ===== */
body {
  font-family: 'Courier New', Courier, monospace;
  background: #0f0f0f;
  color: #e5e5e5;
}

/* ===== NAV ===== */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 40px;
  border-bottom: 1px solid #1a1a1a;
  background: #0f0f0f;
  position: sticky;
  top: 0;
  z-index: 10;
}

.nav-logo {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  text-decoration: none;
}

.nav-logo span {
  color: #00ff88;
}

.nav-links {
  display: flex;
  gap: 28px;
  align-items: center;
}

.nav-links a {
  color: #888;
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.5px;
}

.nav-links a:hover,
.nav-links a.active {
  color: #00ff88;
}

.nav-cta {
  border: 1px solid #222;
  padding: 5px 14px;
  border-radius: 2px;
  font-size: 12px;
}

.nav-cta:hover {
  border-color: #00ff88 !important;
  color: #00ff88 !important;
}

/* ===== HERO ===== */
.hero {
  padding: 80px 40px 60px;
  max-width: 900px;
}

.hero-tag {
  font-size: 11px;
  color: #00ff88;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.hero h1 {
  font-size: 56px;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
  margin-bottom: 20px;
}

.hero h1 .accent {
  color: #00ff88;
}

.hero-sub {
  font-size: 14px;
  color: #666;
  line-height: 1.8;
  max-width: 520px;
  margin-bottom: 32px;
}

.hero-links {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.hero-links a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #888;
  text-decoration: none;
  border: 1px solid #222;
  padding: 7px 18px;
  border-radius: 2px;
  font-family: 'Courier New', Courier, monospace;
}

.hero-links a:hover {
  border-color: #00ff88;
  color: #00ff88;
}

.hero-links .btn-primary {
  background: #00ff88;
  color: #0f0f0f;
  border-color: #00ff88;
  font-weight: 700;
}

.hero-links .btn-primary:hover {
  background: #00cc70;
  border-color: #00cc70;
  color: #0f0f0f;
}

/* ===== SECTION LABEL ===== */
.section-label {
  padding: 0 40px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.section-label span {
  font-size: 11px;
  color: #00ff88;
  letter-spacing: 3px;
  text-transform: uppercase;
  white-space: nowrap;
}

.section-label::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #1a1a1a;
}

/* ===== PROJECTS GRID ===== */
.projects-grid {
  padding: 0 40px 80px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-width: 1100px;
}

.project-card {
  display: block;
  border: 1px solid #1a1a1a;
  border-radius: 4px;
  padding: 20px;
  background: #111;
  text-decoration: none;
  color: inherit;
  position: relative;
  transition: border-color 0.2s;
}

.project-card:hover {
  border-color: #00ff88;
}

.project-card.live {
  border-color: #1a3a2a;
}

.live-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 9px;
  color: #00ff88;
  border: 1px solid #00ff88;
  padding: 2px 7px;
  border-radius: 2px;
  letter-spacing: 1px;
}

.project-lang {
  font-size: 10px;
  color: #444;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.project-name {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.project-desc {
  font-size: 12px;
  color: #555;
  line-height: 1.6;
  margin-bottom: 14px;
}

.project-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  font-size: 10px;
  color: #444;
  border: 1px solid #1f1f1f;
  padding: 2px 8px;
  border-radius: 2px;
}

.project-card.live .tag {
  color: #00ff88;
  border-color: #1a3a2a;
}

/* ===== PORTFOLIO FOOTER ===== */
.portfolio-footer {
  border-top: 1px solid #1a1a1a;
  padding: 20px 40px;
  font-size: 11px;
  color: #333;
  display: flex;
  justify-content: space-between;
}

.portfolio-footer .accent {
  color: #00ff88;
}

/* ===== AUTH + TODO (dark-themed, scoped) ===== */
.auth-container,
.todo-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 16px 16px;
}

.auth-container h1 {
  text-align: center;
  color: #fff;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

form {
  display: flex;
  gap: 8px;
}

input[type='email'],
input[type='password'],
input[type='text'] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #333;
  border-radius: 4px;
  font-size: 16px;
  background: #111;
  color: #e5e5e5;
  font-family: 'Courier New', Courier, monospace;
}

input[type='email']:focus,
input[type='password']:focus,
input[type='text']:focus {
  outline: none;
  border-color: #00ff88;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #4f46e5;
  color: white;
  cursor: pointer;
  font-size: 16px;
  font-family: 'Courier New', Courier, monospace;
}

button:disabled {
  opacity: 0.6;
  cursor: default;
}

button.toggle {
  background: transparent;
  color: #00ff88;
  padding: 0;
  font-size: 14px;
  text-align: center;
}

.error {
  color: #ef4444;
  font-size: 14px;
}

ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #1f1f1f;
  border-radius: 6px;
  background: #111;
}

.todo-item span {
  flex: 1;
  font-size: 16px;
}

.todo-item button {
  background: #ef4444;
  padding: 4px 10px;
  font-size: 14px;
}

.todo-item input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "style: dark terminal theme + portfolio CSS"
```

---

## Task 3: Create Nav component

**Files:**
- Create: `src/components/Nav.jsx`
- Create: `src/components/Nav.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Nav.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Nav from './Nav'

function renderNav(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Nav />
    </MemoryRouter>
  )
}

test('renders VK. logo', () => {
  renderNav()
  expect(screen.getByText('VK')).toBeInTheDocument()
})

test('renders home link', () => {
  renderNav()
  expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument()
})

test('renders projects link', () => {
  renderNav()
  expect(screen.getByRole('link', { name: /^projects$/i })).toBeInTheDocument()
})

test('home link has active class on /', () => {
  renderNav('/')
  expect(screen.getByRole('link', { name: /^home$/i })).toHaveClass('active')
})

test('home link does not have active class on /projects/todo', () => {
  renderNav('/projects/todo')
  expect(screen.getByRole('link', { name: /^home$/i })).not.toHaveClass('active')
})

test('renders email contact link', () => {
  renderNav()
  expect(screen.getByRole('link', { name: /varunkapuria@arizona\.edu/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test
```

Expected: FAIL — `Cannot find module './Nav'`

- [ ] **Step 3: Implement Nav.jsx**

Create `src/components/Nav.jsx`:

```jsx
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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test
```

Expected: all Nav tests PASS, existing tests unaffected.

- [ ] **Step 5: Commit**

```bash
git add src/components/Nav.jsx src/components/Nav.test.jsx
git commit -m "feat: add Nav component"
```

---

## Task 4: Create Portfolio component

**Files:**
- Create: `src/components/Portfolio.jsx`
- Create: `src/components/Portfolio.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Portfolio.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Portfolio from './Portfolio'

function renderPortfolio() {
  return render(
    <MemoryRouter>
      <Portfolio />
    </MemoryRouter>
  )
}

test('renders name in hero heading', () => {
  renderPortfolio()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Varun')
})

test('renders GitHub link with correct href', () => {
  renderPortfolio()
  expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute(
    'href',
    'https://github.com/varunkapuria96'
  )
})

test('renders LinkedIn link', () => {
  renderPortfolio()
  expect(screen.getByRole('link', { name: /linkedin/i })).toBeInTheDocument()
})

test('renders all 6 project cards', () => {
  renderPortfolio()
  expect(screen.getByText('Todo App')).toBeInTheDocument()
  expect(screen.getByText('BTC Prediction')).toBeInTheDocument()
  expect(screen.getByText('CNN Image Classifier')).toBeInTheDocument()
  expect(screen.getByText('Employee Attrition')).toBeInTheDocument()
  expect(screen.getByText('Retail Website + SQL')).toBeInTheDocument()
  expect(screen.getByText('ETL Warehouse')).toBeInTheDocument()
})

test('Todo App card has LIVE badge', () => {
  renderPortfolio()
  expect(screen.getByText('LIVE')).toBeInTheDocument()
})

test('Todo App card links to /projects/todo', () => {
  renderPortfolio()
  const todoLink = screen.getByRole('link', { name: /todo app/i })
  expect(todoLink).toHaveAttribute('href', '/projects/todo')
})

test('non-live cards link to GitHub externally', () => {
  renderPortfolio()
  const btcLink = screen.getByRole('link', { name: /btc prediction/i })
  expect(btcLink).toHaveAttribute(
    'href',
    'https://github.com/varunkapuria96/btcprediction'
  )
  expect(btcLink).toHaveAttribute('target', '_blank')
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test
```

Expected: FAIL — `Cannot find module './Portfolio'`

- [ ] **Step 3: Implement Portfolio.jsx**

Create `src/components/Portfolio.jsx`:

```jsx
import { Link } from 'react-router-dom'

const PROJECTS = [
  {
    id: 'todo',
    lang: 'JavaScript',
    name: 'Todo App',
    desc: 'Full-stack task manager with auth, real-time sync, and CRUD operations.',
    tags: ['React', 'Supabase', 'Vite'],
    live: true,
    href: '/projects/todo',
  },
  {
    id: 'btc',
    lang: 'Python',
    name: 'BTC Prediction',
    desc: 'Machine learning model to predict Bitcoin price movements.',
    tags: ['Python', 'ML'],
    href: 'https://github.com/varunkapuria96/btcprediction',
  },
  {
    id: 'cnn',
    lang: 'Jupyter',
    name: 'CNN Image Classifier',
    desc: 'AlexNet architecture for image classification on the Oxford-IIIT Pet Dataset.',
    tags: ['Python', 'CNN', 'AlexNet'],
    href: 'https://github.com/varunkapuria96/image-data-classification-cnn-alexnet',
  },
  {
    id: 'attrition',
    lang: 'R',
    name: 'Employee Attrition',
    desc: 'Analysis of employee attrition costs and mitigation strategies.',
    tags: ['R', 'Analytics'],
    href: 'https://github.com/varunkapuria96/employeeatrittion',
  },
  {
    id: 'retail',
    lang: 'SQL / PHP',
    name: 'Retail Website + SQL',
    desc: 'Full backend with DDL, DML, DCL scripts and ASP.NET frontend for Harbor Freight.',
    tags: ['SQL', 'PHP', 'ASP.NET'],
    href: 'https://github.com/varunkapuria96/Website-Implementation-with-SQL',
  },
  {
    id: 'etl',
    lang: 'HCL / Python',
    name: 'ETL Warehouse',
    desc: 'Northwind database ETL pipeline using SSIS and Visual Studio.',
    tags: ['SSIS', 'SQL', 'ETL'],
    href: 'https://github.com/varunkapuria96/ETL-Datawarehouse-SSIS-VisualStudio',
  },
]

function ProjectCard({ lang, name, desc, tags, live, href }) {
  const className = `project-card${live ? ' live' : ''}`

  if (live) {
    return (
      <Link to={href} className={className} aria-label={name}>
        <span className="live-badge">LIVE</span>
        <div className="project-lang">{lang}</div>
        <div className="project-name">{name}</div>
        <div className="project-desc">{desc}</div>
        <div className="project-tags">
          {tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      </Link>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      aria-label={name}
    >
      <div className="project-lang">{lang}</div>
      <div className="project-name">{name}</div>
      <div className="project-desc">{desc}</div>
      <div className="project-tags">
        {tags.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
    </a>
  )
}

export default function Portfolio() {
  return (
    <>
      <section className="hero">
        <p className="hero-tag">// hello world</p>
        <h1>
          Varun<br />
          Kapuria<span className="accent">.</span>
        </h1>
        <p className="hero-sub">
          Sales analyst turned builder. I use data to drive decisions at work —
          and build small experiments on the side to learn how things actually
          get made.
        </p>
        <div className="hero-links">
          <a href="#experiments" className="btn-primary">↓ projects</a>
          <a
            href="https://github.com/varunkapuria96"
            target="_blank"
            rel="noreferrer"
          >
            GitHub ↗
          </a>
          <a
            href="https://www.linkedin.com/in/varunkapuria"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn ↗
          </a>
        </div>
      </section>

      <div className="section-label">
        <span>// experiments</span>
      </div>

      <section id="experiments" className="projects-grid">
        {PROJECTS.map(p => (
          <ProjectCard key={p.id} {...p} />
        ))}
      </section>

      <footer className="portfolio-footer">
        <span>varun kapuria</span>
        <span>seattle, wa · built with <span className="accent">react</span></span>
      </footer>
    </>
  )
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test
```

Expected: all Portfolio tests PASS, all prior tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Portfolio.jsx src/components/Portfolio.test.jsx
git commit -m "feat: add Portfolio homepage component"
```

---

## Task 5: Refactor App.jsx with routing

**Files:**
- Modify: `src/App.jsx`
- Create: `src/App.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/App.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import App from './App'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

test('renders Nav and Portfolio at default route', () => {
  render(<App />)
  // Nav logo
  expect(screen.getByText('VK')).toBeInTheDocument()
  // Hero heading
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Varun')
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test
```

Expected: FAIL — test finds no heading because current App renders `null` or `<AuthForm>`, not `<Portfolio>`.

- [ ] **Step 3: Rewrite App.jsx**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Nav from './components/Nav'
import Portfolio from './components/Portfolio'
import AuthForm from './components/AuthForm'
import TodoApp from './components/TodoApp'

function TodoRoute() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  return session ? <TodoApp session={session} /> : <AuthForm />
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Portfolio />} />
        <Route path="/projects/todo" element={<TodoRoute />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 4: Run all tests — expect PASS**

```bash
npm test
```

Expected: ALL tests pass — App, Nav, Portfolio, AuthForm, TodoApp, TodoItem.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "feat: set up React Router with portfolio home and todo route"
```

---

## Task 6: Smoke test in browser

No code changes — verify the full experience manually.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

- [ ] **Step 2: Verify homepage**

- Dark background, monospace font throughout
- Nav shows `VK.` logo on the left, `home` · `projects` · email on the right
- `home` link is highlighted green (active)
- Hero section shows "Varun Kapuria." with green period
- Projects grid shows 6 cards in 3 columns
- Todo App card has a green `LIVE` badge

- [ ] **Step 3: Verify project navigation**

- Click `↓ projects` button — page scrolls to the experiments grid
- Click the `LIVE` Todo App card — URL changes to `/http://localhost:5173/projects/todo`, auth form appears
- Nav still visible at the top
- `home` link is no longer highlighted green
- Sign in with Supabase credentials — Todo App loads and works

- [ ] **Step 4: Verify nav links on todo page**

- Clicking `projects` in the nav navigates to `/#experiments`
- Clicking `VK.` logo navigates back to `/`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: portfolio redesign complete"
```

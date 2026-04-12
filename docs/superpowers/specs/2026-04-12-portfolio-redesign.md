# Portfolio Redesign — Design Spec

**Date:** 2026-04-12
**Status:** Approved

---

## Overview

Transform the existing todo-app site into a personal portfolio for Varun Kapuria, showcasing GitHub experiments. The Todo App becomes one project accessible via the nav — not the landing page. The portfolio uses React Router for clean URL-based routing.

---

## Visual Identity

- **Style:** Dark terminal aesthetic
- **Background:** `#0f0f0f`
- **Accent color:** `#00ff88` (green)
- **Text:** `#e5e5e5` (primary), `#888` (secondary), `#555` (muted)
- **Font:** `'Courier New', monospace` throughout
- **Cards/surfaces:** `#111` with `1px solid #1a1a1a` borders
- **Hover state:** border transitions to `#00ff88`

---

## Routing Structure

Install `react-router-dom`. Two routes:

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `<Portfolio>` | Homepage — Hero + Projects grid |
| `/projects/todo` | `<TodoApp>` (auth-gated) | The existing Todo App |

All other project cards link externally to GitHub (`target="_blank"`).

---

## Components

### `<Nav>`
Sticky top bar, `#0f0f0f` background, `1px solid #1a1a1a` bottom border.

- **Left:** `VK.` logo — links to `/`
- **Right links:** `home` · `projects` (smooth-scrolls to `#experiments` section on `/`) · email CTA (`varunkapuria@arizona.edu`) styled as an outlined button
- Active link highlighted in `#00ff88`
- On `/projects/todo`, `projects` nav link navigates to `/#experiments` (home, scrolled to grid); `home` link navigates to `/`

### `<Portfolio>` (homepage)

**Hero section** (`padding: 80px 40px`):
- Tag line: `// hello world` in green, letter-spaced
- H1: `Varun Kapuria.` — large, white, monospace, period in green
- Sub-text: _"Sales analyst turned builder. I use data to drive decisions at work — and build small experiments on the side to learn how things actually get made."_
- Links row: `↓ projects` (primary filled, scrolls to grid) · `GitHub ↗` · `LinkedIn ↗` · `Resume ↗`
  - GitHub: `https://github.com/varunkapuria96`
  - LinkedIn: existing link from resume
  - Resume: PDF link (to be provided or omitted initially)

**Section divider:** `// experiments` label with a horizontal rule extending to the right.

**Projects grid** (`id="experiments"`, 3-column CSS grid, `gap: 16px`):

Each card shows: language tag · project name · short description · tech tags

| Project | Lang tag | Description | Tags | Link type |
|---------|----------|-------------|------|-----------|
| Todo App | JavaScript | Full-stack task manager with auth, real-time sync, and CRUD operations | React, Supabase, Vite | Internal route: `/projects/todo` — `LIVE` badge |
| BTC Prediction | Python | Machine learning model to predict Bitcoin price movements | Python, ML | GitHub |
| CNN Image Classifier | Jupyter | AlexNet architecture for image classification on Oxford-IIIT Pet Dataset | Python, CNN, AlexNet | GitHub |
| Employee Attrition | R | Analysis of employee attrition costs and mitigation strategies | R, Analytics | GitHub |
| Retail Website + SQL | SQL / PHP | Full backend with DDL, DML, DCL scripts and ASP.NET frontend | SQL, PHP, ASP.NET | GitHub |
| ETL Warehouse | HCL / Python | Northwind database ETL pipeline using SSIS and Visual Studio | SSIS, SQL, ETL | GitHub |

Cards with `LIVE` badge have a distinct `border-color: #1a3a2a` at rest, `#00ff88` on hover.

**Footer:** `varun kapuria` on the left · `seattle, wa · built with react` on the right.

### `<TodoApp>` (existing, at `/projects/todo`)

- Unchanged functionally
- Wrapped in the shared `<Nav>` so the nav bar is always visible
- Auth (Supabase) works the same — same credentials, same session
- The heading inside `<AuthForm>` ("Todo App") remains as-is

---

## Auth & Session Behaviour

- Supabase session is global — if logged in on `/projects/todo`, navigating back to `/` keeps you logged in
- No auth required to view the portfolio homepage
- Navigating to `/projects/todo` shows `<AuthForm>` if not logged in, `<TodoApp>` if logged in — same logic as today, just now rendered under `/projects/todo`

---

## File Structure Changes

```
src/
  components/
    Nav.jsx              ← new
    Portfolio.jsx        ← new (homepage)
    AuthForm.jsx         ← unchanged
    TodoApp.jsx          ← unchanged (wrapped by router)
    TodoItem.jsx         ← unchanged
  App.jsx                ← refactored: sets up Router + routes
  index.css              ← extended with portfolio + nav styles
  supabase.js            ← unchanged
```

---

## Styling Approach

Extend `index.css` with portfolio-specific styles. No new CSS framework. Keep the existing `.auth-container`, `.todo-container`, `.todo-item` etc. styles intact — they still apply under `/projects/todo`.

---

## Out of Scope

- No about/experience/skills/contact sections (lean layout chosen)
- No animations beyond CSS hover transitions
- No dark/light mode toggle
- No contact form
- Resume PDF link can be omitted until Varun has a hosted URL

# Change Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add forgot-password and change-password flows to the existing todo app using a shared `ChangePasswordForm` component.

**Architecture:** A new `ChangePasswordForm` handles both flows by calling `supabase.auth.updateUser`. `AuthForm` gains a `'forgot'` mode that sends reset emails. `TodoApp` renders `ChangePasswordForm` inline behind a toggle. `App.jsx` watches for Supabase's `PASSWORD_RECOVERY` auth event and renders `ChangePasswordForm` when detected.

**Tech Stack:** React 18, Vite, Supabase JS SDK v2, Vitest, React Testing Library

---

## File Map

```
src/
├── App.jsx                              # Modified: handle PASSWORD_RECOVERY event, render ChangePasswordForm
├── App.test.jsx                         # New: test PASSWORD_RECOVERY rendering
├── index.css                            # Modified: add .success style
└── components/
    ├── ChangePasswordForm.jsx           # New: shared password update form
    ├── ChangePasswordForm.test.jsx      # New: tests for ChangePasswordForm
    ├── AuthForm.jsx                     # Modified: add 'forgot' mode
    ├── AuthForm.test.jsx                # Modified: add forgot-mode tests, update mock
    ├── TodoApp.jsx                      # Modified: add Change Password button + form toggle
    └── TodoApp.test.jsx                 # Modified: add change password tests, update mock
```

---

## Task 1: ChangePasswordForm component

**Files:**
- Create: `src/components/ChangePasswordForm.jsx`
- Create: `src/components/ChangePasswordForm.test.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ChangePasswordForm.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChangePasswordForm from './ChangePasswordForm'

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

import { supabase } from '../supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ChangePasswordForm', () => {
  it('renders new password and confirm fields', () => {
    render(<ChangePasswordForm />)
    expect(screen.getByPlaceholderText(/new password/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/confirm new password/i)).toBeInTheDocument()
  })

  it('shows error when passwords do not match', async () => {
    render(<ChangePasswordForm />)
    await userEvent.type(screen.getByPlaceholderText(/new password/i), 'abc123')
    await userEvent.type(screen.getByPlaceholderText(/confirm new password/i), 'xyz999')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it('calls updateUser with new password when passwords match', async () => {
    render(<ChangePasswordForm />)
    await userEvent.type(screen.getByPlaceholderText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByPlaceholderText(/confirm new password/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'newpass123' })
  })

  it('shows success message after successful update', async () => {
    render(<ChangePasswordForm />)
    await userEvent.type(screen.getByPlaceholderText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByPlaceholderText(/confirm new password/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText(/password updated successfully/i)).toBeInTheDocument()
  })

  it('calls onSuccess after successful update', async () => {
    const onSuccess = vi.fn()
    render(<ChangePasswordForm onSuccess={onSuccess} />)
    await userEvent.type(screen.getByPlaceholderText(/new password/i), 'newpass123')
    await userEvent.type(screen.getByPlaceholderText(/confirm new password/i), 'newpass123')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    await screen.findByText(/password updated successfully/i)
    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows Supabase error when update fails', async () => {
    supabase.auth.updateUser.mockResolvedValueOnce({
      error: { message: 'Password should be at least 6 characters' },
    })
    render(<ChangePasswordForm />)
    await userEvent.type(screen.getByPlaceholderText(/new password/i), 'abc')
    await userEvent.type(screen.getByPlaceholderText(/confirm new password/i), 'abc')
    await userEvent.click(screen.getByRole('button', { name: /update password/i }))
    expect(await screen.findByText('Password should be at least 6 characters')).toBeInTheDocument()
  })

  it('renders Cancel button when onCancel is provided', () => {
    render(<ChangePasswordForm onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('does not render Cancel button when onCancel is not provided', () => {
    render(<ChangePasswordForm />)
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    render(<ChangePasswordForm onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: FAIL — `Cannot find module './ChangePasswordForm'`

- [ ] **Step 3: Create `src/components/ChangePasswordForm.jsx`**

```jsx
import { useState } from 'react'
import { supabase } from '../supabase'

export default function ChangePasswordForm({ onCancel, onSuccess }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      onSuccess?.()
    }
    setLoading(false)
  }

  if (success) {
    return <p className="success">Password updated successfully.</p>
  }

  return (
    <div className="auth-container">
      <h2>Change Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
      {onCancel && (
        <button type="button" className="toggle" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add `.success` style to `src/index.css`**

Add after the `.error` rule (around line 72):

```css
.success {
  color: #16a34a;
  font-size: 14px;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: 9 new ChangePasswordForm tests pass, 15 existing tests still pass (24 total)

- [ ] **Step 6: Commit**

```bash
git add src/components/ChangePasswordForm.jsx src/components/ChangePasswordForm.test.jsx src/index.css
git commit -m "feat: add ChangePasswordForm component with tests"
```

---

## Task 2: AuthForm — forgot password mode

**Files:**
- Modify: `src/components/AuthForm.jsx`
- Modify: `src/components/AuthForm.test.jsx`

- [ ] **Step 1: Add new tests to `src/components/AuthForm.test.jsx`**

First, update the `vi.mock` factory to include `resetPasswordForEmail` (add it to the existing mock):

```jsx
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(() => ({ error: null })),
      signUp: vi.fn(() => ({ error: null })),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))
```

Then add these tests at the end of the existing `describe('AuthForm', ...)` block:

```jsx
  it('shows Forgot password link in sign in mode', () => {
    render(<AuthForm />)
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument()
  })

  it('switches to forgot mode when Forgot password clicked', async () => {
    render(<AuthForm />)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(screen.getByRole('button', { name: /send reset email/i })).toBeInTheDocument()
  })

  it('shows Back to Sign In link in forgot mode', async () => {
    render(<AuthForm />)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    expect(screen.getByRole('button', { name: /back to sign in/i })).toBeInTheDocument()
  })

  it('returns to sign in mode when Back to Sign In clicked', async () => {
    render(<AuthForm />)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    await userEvent.click(screen.getByRole('button', { name: /back to sign in/i }))
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })

  it('calls resetPasswordForEmail with email and redirectTo on submit', async () => {
    render(<AuthForm />)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset email/i }))
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: window.location.origin,
    })
  })

  it('shows confirmation message after reset email sent', async () => {
    render(<AuthForm />)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'user@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send reset email/i }))
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  it('shows error when resetPasswordForEmail fails', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'Unable to validate email address' },
    })
    render(<AuthForm />)
    await userEvent.click(screen.getByRole('button', { name: /forgot password/i }))
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'bad')
    await userEvent.click(screen.getByRole('button', { name: /send reset email/i }))
    expect(await screen.findByText('Unable to validate email address')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
npm test
```

Expected: new AuthForm tests FAIL (no forgot mode yet), existing 24 pass

- [ ] **Step 3: Replace `src/components/AuthForm.jsx` entirely**

```jsx
import { useState } from 'react'
import { supabase } from '../supabase'

export default function AuthForm() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) setError(error.message)
      else setResetSent(true)
    } else {
      const { error } =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  if (mode === 'forgot' && resetSent) {
    return (
      <div className="auth-container">
        <h1>Todo App</h1>
        <p>Check your email for a reset link.</p>
        <button
          type="button"
          className="toggle"
          onClick={() => { setResetSent(false); switchMode('signin') }}
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
        {mode !== 'forgot' && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading
            ? 'Loading...'
            : mode === 'signin'
            ? 'Sign In'
            : mode === 'signup'
            ? 'Sign Up'
            : 'Send Reset Email'}
        </button>
      </form>
      {mode === 'signin' && (
        <>
          <button type="button" className="toggle" onClick={() => switchMode('signup')}>
            Need an account? Sign Up
          </button>
          <button type="button" className="toggle" onClick={() => switchMode('forgot')}>
            Forgot password?
          </button>
        </>
      )}
      {mode === 'signup' && (
        <button type="button" className="toggle" onClick={() => switchMode('signin')}>
          Have an account? Sign In
        </button>
      )}
      {mode === 'forgot' && (
        <button type="button" className="toggle" onClick={() => switchMode('signin')}>
          Back to Sign In
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test
```

Expected: all 31 tests pass (24 previous + 7 new AuthForm tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/AuthForm.jsx src/components/AuthForm.test.jsx
git commit -m "feat: add forgot password mode to AuthForm"
```

---

## Task 3: TodoApp — Change Password button

**Files:**
- Modify: `src/components/TodoApp.jsx`
- Modify: `src/components/TodoApp.test.jsx`

- [ ] **Step 1: Add new tests to `src/components/TodoApp.test.jsx`**

First, update the `vi.mock` factory to include `updateUser` in `auth` (the mock already defines `auth.signOut` — add `updateUser` alongside it):

In the mock factory, change:
```js
auth: {
  signOut: vi.fn().mockResolvedValue({}),
},
```
to:
```js
auth: {
  signOut: vi.fn().mockResolvedValue({}),
  updateUser: vi.fn().mockResolvedValue({ error: null }),
},
```

Apply the same change in the `beforeEach` `mockImplementation` block.

Then add these tests at the end of the existing `describe('TodoApp', ...)` block:

```jsx
  it('renders a Change Password button', async () => {
    render(<TodoApp session={mockSession} />)
    await screen.findByText('Buy milk')
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument()
  })

  it('shows ChangePasswordForm when Change Password clicked', async () => {
    render(<TodoApp session={mockSession} />)
    await screen.findByText('Buy milk')
    await userEvent.click(screen.getByRole('button', { name: /change password/i }))
    expect(screen.getByPlaceholderText(/new password/i)).toBeInTheDocument()
  })

  it('hides ChangePasswordForm and shows todos when Cancel clicked', async () => {
    render(<TodoApp session={mockSession} />)
    await screen.findByText('Buy milk')
    await userEvent.click(screen.getByRole('button', { name: /change password/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByPlaceholderText(/new password/i)).not.toBeInTheDocument()
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify new ones fail**

```bash
npm test
```

Expected: 3 new TodoApp tests FAIL, 31 others pass

- [ ] **Step 3: Replace `src/components/TodoApp.jsx` entirely**

```jsx
import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import TodoItem from './TodoItem'
import ChangePasswordForm from './ChangePasswordForm'

export default function TodoApp({ session }) {
  const [todos, setTodos] = useState([])
  const [text, setText] = useState('')
  const [showChangePassword, setShowChangePassword] = useState(false)

  useEffect(() => {
    async function fetchTodos() {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: true })
      if (data) setTodos(data)
    }
    fetchTodos()
  }, [])

  async function addTodo(e) {
    e.preventDefault()
    if (!text.trim()) return
    const { data } = await supabase
      .from('todos')
      .insert({ text: text.trim(), user_id: session.user.id })
      .select()
      .single()
    if (data) {
      setTodos(prev => [...prev, data])
      setText('')
    }
  }

  async function toggleTodo(id, completed) {
    const { data } = await supabase
      .from('todos')
      .update({ completed })
      .eq('id', id)
      .select()
      .single()
    if (data) setTodos(prev => prev.map(t => (t.id === id ? data : t)))
  }

  async function deleteTodo(id) {
    const { error } = await supabase.from('todos').delete().eq('id', id)
    if (!error) setTodos(prev => prev.filter(t => t.id !== id))
  }

  if (showChangePassword) {
    return (
      <div className="todo-container">
        <ChangePasswordForm
          onCancel={() => setShowChangePassword(false)}
          onSuccess={() => setTimeout(() => setShowChangePassword(false), 2000)}
        />
      </div>
    )
  }

  return (
    <div className="todo-container">
      <div className="header">
        <h1>My Todos</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowChangePassword(true)}>Change Password</button>
          <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
        </div>
      </div>
      <form onSubmit={addTodo}>
        <input
          type="text"
          placeholder="Add a todo..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
          />
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
npm test
```

Expected: all 34 tests pass (31 previous + 3 new TodoApp tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/TodoApp.jsx src/components/TodoApp.test.jsx
git commit -m "feat: add change password button to TodoApp"
```

---

## Task 4: App — PASSWORD_RECOVERY event

**Files:**
- Modify: `src/App.jsx`
- Create: `src/App.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/App.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

let authChangeCallback

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn((callback) => {
        authChangeCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  authChangeCallback = null
})

describe('App PASSWORD_RECOVERY', () => {
  it('renders ChangePasswordForm when PASSWORD_RECOVERY event fires', async () => {
    render(<App />)
    // Wait for initial auth check to complete
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument()
    authChangeCallback('PASSWORD_RECOVERY', { user: { id: 'user-1' } })
    expect(await screen.findByPlaceholderText(/new password/i)).toBeInTheDocument()
  })

  it('does not render Cancel button in recovery mode', async () => {
    render(<App />)
    await screen.findByRole('button', { name: /sign in/i })
    authChangeCallback('PASSWORD_RECOVERY', { user: { id: 'user-1' } })
    await screen.findByPlaceholderText(/new password/i)
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: 2 new App tests FAIL, 34 others pass

- [ ] **Step 3: Replace `src/App.jsx` entirely**

```jsx
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import AuthForm from './components/AuthForm'
import TodoApp from './components/TodoApp'
import ChangePasswordForm from './components/ChangePasswordForm'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (isRecovery) return <ChangePasswordForm onSuccess={() => setIsRecovery(false)} />
  return session ? <TodoApp session={session} /> : <AuthForm />
}
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
npm test
```

Expected: all 36 tests pass (34 previous + 2 new App tests)

- [ ] **Step 5: Commit and push**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "feat: handle PASSWORD_RECOVERY event in App"
git push
```

Vercel will auto-deploy within ~30 seconds.

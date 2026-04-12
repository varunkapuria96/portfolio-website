import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Nav from './components/Nav'
import Portfolio from './components/Portfolio'
import SqlWebsite from './components/SqlWebsite'
import AuthForm from './components/AuthForm'
import TodoApp from './components/TodoApp'
import ResetPassword from './components/ResetPassword'

export function TodoRoute() {
  const [session, setSession] = useState(undefined)
  const [recoveryMode, setRecoveryMode] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setRecoveryMode(true)
        } else if (event === 'SIGNED_OUT') {
          setRecoveryMode(false)
        }
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (session && recoveryMode) return <ResetPassword onDone={() => setRecoveryMode(false)} />
  return session ? <TodoApp session={session} /> : <AuthForm />
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Portfolio />} />
        <Route path="/projects/todo" element={<TodoRoute />} />
        <Route path="/projects/sql-website" element={<SqlWebsite />} />
      </Routes>
    </BrowserRouter>
  )
}

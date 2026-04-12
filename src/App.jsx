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

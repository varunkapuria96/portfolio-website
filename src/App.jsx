import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import AuthForm from './components/AuthForm'
import TodoApp from './components/TodoApp'

export default function App() {
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

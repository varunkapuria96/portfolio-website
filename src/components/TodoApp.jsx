import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import TodoItem from './TodoItem'

export default function TodoApp({ session }) {
  const [todos, setTodos] = useState([])
  const [text, setText] = useState('')

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
    if (data) setTodos(prev => [...prev, data])
    setText('')
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
    await supabase.from('todos').delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="todo-container">
      <div className="header">
        <h1>My Todos</h1>
        <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
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

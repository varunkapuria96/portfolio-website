import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function ManageRooms({ session }) {
  const [rooms, setRooms] = useState([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')

  useEffect(() => {
    supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setRooms(data) })
  }, [])

  async function addRoom(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const { data } = await supabase
      .from('rooms')
      .insert({ name: newName.trim(), user_id: session.user.id })
      .select()
      .single()
    if (data) setRooms(prev => [...prev, data])
    setNewName('')
  }

  async function saveEdit(id) {
    if (!editingName.trim()) { setEditingId(null); return }
    const { data } = await supabase
      .from('rooms')
      .update({ name: editingName.trim() })
      .eq('id', id)
      .select()
      .single()
    if (data) setRooms(prev => prev.map(r => r.id === id ? data : r))
    setEditingId(null)
  }

  async function deleteRoom(id) {
    if (!window.confirm('Delete this room? It will not affect existing bills.')) return
    await supabase.from('rooms').delete().eq('id', id)
    setRooms(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="manage-section">
      <h2>Rooms</h2>
      <ul className="manage-list">
        {rooms.map(room => (
          <li key={room.id} className="manage-item">
            {editingId === room.id ? (
              <input
                className="manage-input"
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onBlur={() => saveEdit(room.id)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(room.id) }}
                autoFocus
              />
            ) : (
              <span
                onClick={() => { setEditingId(room.id); setEditingName(room.name) }}
                title="Click to edit"
              >
                {room.name}
              </span>
            )}
            <button
              className="manage-delete"
              onClick={() => deleteRoom(room.id)}
              aria-label={`Delete ${room.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={addRoom} className="manage-add-form">
        <input
          className="manage-input"
          placeholder="New room name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
        <button type="submit" className="manage-add-btn">Add</button>
      </form>
    </div>
  )
}

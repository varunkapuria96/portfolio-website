import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const emptyForm = { name: '', careers_url: '', priority: 'medium', notes: '' }

export default function CompaniesList({ session }) {
  const [companies, setCompanies] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)

  useEffect(() => {
    supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setCompanies(data) })
  }, [])

  async function addCompany(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    const { data } = await supabase
      .from('companies')
      .insert({ ...form, name: form.name.trim(), user_id: session.user.id })
      .select()
      .single()
    if (data) {
      setCompanies(prev => [...prev, data])
      setForm(emptyForm)
    }
  }

  function startEdit(company) {
    setEditingId(company.id)
    setEditForm({
      name: company.name,
      careers_url: company.careers_url || '',
      priority: company.priority,
      notes: company.notes || '',
    })
  }

  async function saveEdit(id) {
    if (!editForm.name.trim()) return
    const { data } = await supabase
      .from('companies')
      .update({ ...editForm, name: editForm.name.trim() })
      .eq('id', id)
      .select()
      .single()
    if (data) setCompanies(prev => prev.map(c => (c.id === id ? data : c)))
    setEditingId(null)
  }

  async function deleteCompany(id) {
    if (!window.confirm('Delete this company? Its jobs and contacts will stay but lose the company link.')) return
    await supabase.from('companies').delete().eq('id', id)
    setCompanies(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="jobs-section">
      <h2>Company Watchlist</h2>

      <ul className="jobs-card-list">
        {companies.map(company => (
          <li key={company.id} className="jobs-card">
            {editingId === company.id ? (
              <div className="jobs-edit-form">
                <input
                  className="manage-input"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Company name"
                />
                <input
                  className="manage-input"
                  value={editForm.careers_url}
                  onChange={e => setEditForm(f => ({ ...f, careers_url: e.target.value }))}
                  placeholder="Careers page URL"
                />
                <select
                  className="manage-input"
                  value={editForm.priority}
                  onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                >
                  <option value="high">High priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="low">Low priority</option>
                </select>
                <textarea
                  className="manage-input"
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes"
                  rows={2}
                />
                <div className="jobs-edit-actions">
                  <button className="manage-add-btn" onClick={() => saveEdit(company.id)}>Save</button>
                  <button className="manage-delete" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="jobs-card-header">
                  <span className="jobs-card-title">{company.name}</span>
                  <span className={`jobs-badge jobs-priority-${company.priority}`}>{company.priority}</span>
                </div>
                {company.careers_url && (
                  <a href={company.careers_url} target="_blank" rel="noreferrer" className="jobs-card-link">
                    {company.careers_url}
                  </a>
                )}
                {company.notes && <p className="jobs-card-notes">{company.notes}</p>}
                <div className="jobs-card-actions">
                  <button className="manage-add-btn" onClick={() => startEdit(company)}>Edit</button>
                  <button
                    className="manage-delete"
                    onClick={() => deleteCompany(company.id)}
                    aria-label={`Delete ${company.name}`}
                  >
                    ×
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={addCompany} className="jobs-add-form">
        <input
          className="manage-input"
          placeholder="Company name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <input
          className="manage-input"
          placeholder="Careers page URL (optional)"
          value={form.careers_url}
          onChange={e => setForm(f => ({ ...f, careers_url: e.target.value }))}
        />
        <p className="jobs-card-meta">
          Use the company's job listing page (not a single job link) so Refresh Jobs can find new postings.
        </p>
        <select
          className="manage-input"
          value={form.priority}
          onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
        >
          <option value="high">High priority</option>
          <option value="medium">Medium priority</option>
          <option value="low">Low priority</option>
        </select>
        <textarea
          className="manage-input"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={2}
        />
        <button type="submit" className="manage-add-btn">Add Company</button>
      </form>
    </div>
  )
}

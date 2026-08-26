import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const emptyForm = {
  name: '', company_id: '', job_id: '', role_title: '', linkedin_url: '', email: '',
  outreach_status: 'not_contacted', notes: '',
}

const OUTREACH_STATUSES = ['not_contacted', 'messaged', 'replied', 'meeting_scheduled', 'no_response']

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function ContactsList({ session }) {
  const [contacts, setContacts] = useState([])
  const [companies, setCompanies] = useState([])
  const [jobs, setJobs] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)

  useEffect(() => {
    supabase.from('companies').select('*').order('name', { ascending: true })
      .then(({ data }) => { if (data) setCompanies(data) })
    supabase.from('jobs').select('*').order('title', { ascending: true })
      .then(({ data }) => { if (data) setJobs(data) })
    supabase.from('contacts').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setContacts(data) })
  }, [])

  function companyName(id) {
    return companies.find(c => c.id === id)?.name || 'Unlinked'
  }

  function jobTitle(id) {
    return jobs.find(j => j.id === id)?.title
  }

  function toRow(f) {
    return { ...f, company_id: f.company_id || null, job_id: f.job_id || null }
  }

  async function addContact(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    const { data } = await supabase
      .from('contacts')
      .insert({ ...toRow(form), name: form.name.trim(), user_id: session.user.id })
      .select()
      .single()
    if (data) {
      setContacts(prev => [data, ...prev])
      setForm(emptyForm)
    }
  }

  function startEdit(contact) {
    setEditingId(contact.id)
    setEditForm({
      name: contact.name,
      company_id: contact.company_id || '',
      job_id: contact.job_id || '',
      role_title: contact.role_title || '',
      linkedin_url: contact.linkedin_url || '',
      email: contact.email || '',
      outreach_status: contact.outreach_status,
      notes: contact.notes || '',
    })
  }

  async function saveEdit(id) {
    if (!editForm.name.trim()) return
    const { data } = await supabase
      .from('contacts')
      .update({ ...toRow(editForm), name: editForm.name.trim() })
      .eq('id', id)
      .select()
      .single()
    if (data) setContacts(prev => prev.map(c => (c.id === id ? data : c)))
    setEditingId(null)
  }

  async function setOutreachStatus(id, outreach_status) {
    const { data } = await supabase.from('contacts').update({ outreach_status }).eq('id', id).select().single()
    if (data) setContacts(prev => prev.map(c => (c.id === id ? data : c)))
  }

  async function markContactedToday(contact) {
    const patch = {
      last_contacted_at: today(),
      outreach_status: contact.outreach_status === 'not_contacted' ? 'messaged' : contact.outreach_status,
    }
    const { data } = await supabase.from('contacts').update(patch).eq('id', contact.id).select().single()
    if (data) setContacts(prev => prev.map(c => (c.id === contact.id ? data : c)))
  }

  async function deleteContact(id) {
    if (!window.confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const jobsForCompany = (companyId) => jobs.filter(j => j.company_id === companyId)

  return (
    <div className="jobs-section">
      <h2>People to Reach Out To</h2>

      <ul className="jobs-card-list">
        {contacts.map(contact => (
          <li key={contact.id} className="jobs-card">
            {editingId === contact.id ? (
              <div className="jobs-edit-form">
                <input
                  className="manage-input"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Name"
                />
                <select
                  className="manage-input"
                  value={editForm.company_id}
                  onChange={e => setEditForm(f => ({ ...f, company_id: e.target.value, job_id: '' }))}
                >
                  <option value="">No company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  className="manage-input"
                  value={editForm.job_id}
                  onChange={e => setEditForm(f => ({ ...f, job_id: e.target.value }))}
                >
                  <option value="">No specific job</option>
                  {jobsForCompany(editForm.company_id).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
                <input
                  className="manage-input"
                  value={editForm.role_title}
                  onChange={e => setEditForm(f => ({ ...f, role_title: e.target.value }))}
                  placeholder="Their role"
                />
                <input
                  className="manage-input"
                  value={editForm.linkedin_url}
                  onChange={e => setEditForm(f => ({ ...f, linkedin_url: e.target.value }))}
                  placeholder="LinkedIn URL"
                />
                <input
                  className="manage-input"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="Email"
                />
                <textarea
                  className="manage-input"
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes"
                  rows={2}
                />
                <div className="jobs-edit-actions">
                  <button className="manage-add-btn" onClick={() => saveEdit(contact.id)}>Save</button>
                  <button className="manage-delete" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="jobs-card-header">
                  <span className="jobs-card-title">{contact.name}</span>
                  <select
                    className={`jobs-badge jobs-status-select jobs-outreach-${contact.outreach_status}`}
                    value={contact.outreach_status}
                    onChange={e => setOutreachStatus(contact.id, e.target.value)}
                  >
                    {OUTREACH_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <p className="jobs-card-meta">
                  {contact.role_title ? `${contact.role_title} · ` : ''}{companyName(contact.company_id)}
                  {jobTitle(contact.job_id) ? ` · ${jobTitle(contact.job_id)}` : ''}
                </p>
                {contact.linkedin_url && (
                  <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="jobs-card-link">
                    {contact.linkedin_url}
                  </a>
                )}
                {contact.email && <p className="jobs-card-meta">{contact.email}</p>}
                {contact.notes && <p className="jobs-card-notes">{contact.notes}</p>}
                {contact.last_contacted_at && (
                  <p className="jobs-card-meta">Last contacted {contact.last_contacted_at}</p>
                )}
                <div className="jobs-card-actions">
                  <button className="manage-add-btn" onClick={() => markContactedToday(contact)}>Mark contacted today</button>
                  <button className="manage-add-btn" onClick={() => startEdit(contact)}>Edit</button>
                  <button
                    className="manage-delete"
                    onClick={() => deleteContact(contact.id)}
                    aria-label={`Delete ${contact.name}`}
                  >
                    ×
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={addContact} className="jobs-add-form">
        <input
          className="manage-input"
          placeholder="Name"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
        <select
          className="manage-input"
          value={form.company_id}
          onChange={e => setForm(f => ({ ...f, company_id: e.target.value, job_id: '' }))}
        >
          <option value="">No company</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          className="manage-input"
          value={form.job_id}
          onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
        >
          <option value="">No specific job</option>
          {jobsForCompany(form.company_id).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <input
          className="manage-input"
          placeholder="Their role"
          value={form.role_title}
          onChange={e => setForm(f => ({ ...f, role_title: e.target.value }))}
        />
        <input
          className="manage-input"
          placeholder="LinkedIn URL"
          value={form.linkedin_url}
          onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
        />
        <input
          className="manage-input"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        />
        <textarea
          className="manage-input"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={2}
        />
        <button type="submit" className="manage-add-btn">Add Contact</button>
      </form>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const emptyForm = {
  title: '', company_id: '', location: '', job_url: '', source: 'linkedin',
  description: '', status: 'saved', applied_at: '',
}

const STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected', 'archived']

export default function JobsList({ session }) {
  const [jobs, setJobs] = useState([])
  const [companies, setCompanies] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)

  useEffect(() => {
    supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true })
      .then(({ data }) => { if (data) setCompanies(data) })

    supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setJobs(data) })
  }, [])

  function companyName(id) {
    return companies.find(c => c.id === id)?.name || 'Unlinked'
  }

  function toRow(f) {
    return { ...f, company_id: f.company_id || null, applied_at: f.applied_at || null }
  }

  async function addJob(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    const { data } = await supabase
      .from('jobs')
      .insert({ ...toRow(form), title: form.title.trim(), user_id: session.user.id })
      .select()
      .single()
    if (data) {
      setJobs(prev => [data, ...prev])
      setForm(emptyForm)
    }
  }

  function startEdit(job) {
    setEditingId(job.id)
    setEditForm({
      title: job.title,
      company_id: job.company_id || '',
      location: job.location || '',
      job_url: job.job_url || '',
      source: job.source,
      description: job.description || '',
      status: job.status,
      applied_at: job.applied_at || '',
    })
  }

  async function saveEdit(id) {
    if (!editForm.title.trim()) return
    const { data } = await supabase
      .from('jobs')
      .update({ ...toRow(editForm), title: editForm.title.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (data) setJobs(prev => prev.map(j => (j.id === id ? data : j)))
    setEditingId(null)
  }

  async function setStatus(id, status) {
    const patch = { status, updated_at: new Date().toISOString() }
    if (status === 'applied') patch.applied_at = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('jobs').update(patch).eq('id', id).select().single()
    if (data) setJobs(prev => prev.map(j => (j.id === id ? data : j)))
  }

  async function deleteJob(id) {
    if (!window.confirm('Delete this job?')) return
    await supabase.from('jobs').delete().eq('id', id)
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  const visibleJobs = statusFilter === 'all' ? jobs : jobs.filter(j => j.status === statusFilter)

  return (
    <div className="jobs-section">
      <div className="jobs-section-header">
        <h2>Jobs</h2>
        <select className="manage-input jobs-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <ul className="jobs-card-list">
        {visibleJobs.map(job => (
          <li key={job.id} className="jobs-card">
            {editingId === job.id ? (
              <div className="jobs-edit-form">
                <input
                  className="manage-input"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Job title"
                />
                <select
                  className="manage-input"
                  value={editForm.company_id}
                  onChange={e => setEditForm(f => ({ ...f, company_id: e.target.value }))}
                >
                  <option value="">No company</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input
                  className="manage-input"
                  value={editForm.location}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Location"
                />
                <input
                  className="manage-input"
                  value={editForm.job_url}
                  onChange={e => setEditForm(f => ({ ...f, job_url: e.target.value }))}
                  placeholder="Job posting URL"
                />
                <select
                  className="manage-input"
                  value={editForm.source}
                  onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="company_site">Company site</option>
                  <option value="referral">Referral</option>
                  <option value="other">Other</option>
                </select>
                <textarea
                  className="manage-input"
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description / notes"
                  rows={3}
                />
                <div className="jobs-edit-actions">
                  <button className="manage-add-btn" onClick={() => saveEdit(job.id)}>Save</button>
                  <button className="manage-delete" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="jobs-card-header">
                  <span className="jobs-card-title">{job.title}</span>
                  <select
                    className={`jobs-badge jobs-status-select jobs-status-${job.status}`}
                    value={job.status}
                    onChange={e => setStatus(job.id, e.target.value)}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <p className="jobs-card-meta">
                  {companyName(job.company_id)}{job.location ? ` · ${job.location}` : ''} · {job.source}
                </p>
                {job.job_url && (
                  <a href={job.job_url} target="_blank" rel="noreferrer" className="jobs-card-link">
                    {job.job_url}
                  </a>
                )}
                {job.description && <p className="jobs-card-notes">{job.description}</p>}
                <div className="jobs-card-actions">
                  <button className="manage-add-btn" onClick={() => startEdit(job)}>Edit</button>
                  <button
                    className="manage-delete"
                    onClick={() => deleteJob(job.id)}
                    aria-label={`Delete ${job.title}`}
                  >
                    ×
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={addJob} className="jobs-add-form">
        <input
          className="manage-input"
          placeholder="Job title"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        />
        <select
          className="manage-input"
          value={form.company_id}
          onChange={e => setForm(f => ({ ...f, company_id: e.target.value }))}
        >
          <option value="">No company</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          className="manage-input"
          placeholder="Location"
          value={form.location}
          onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
        />
        <input
          className="manage-input"
          placeholder="Job posting URL"
          value={form.job_url}
          onChange={e => setForm(f => ({ ...f, job_url: e.target.value }))}
        />
        <select
          className="manage-input"
          value={form.source}
          onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
        >
          <option value="linkedin">LinkedIn</option>
          <option value="company_site">Company site</option>
          <option value="referral">Referral</option>
          <option value="other">Other</option>
        </select>
        <textarea
          className="manage-input"
          placeholder="Description / notes (optional)"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
        />
        <button type="submit" className="manage-add-btn">Add Job</button>
      </form>
    </div>
  )
}

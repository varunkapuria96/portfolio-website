import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function JobFinds({ session }) {
  const [finds, setFinds] = useState([])
  const [companies, setCompanies] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState(null)

  function loadFinds() {
    return supabase
      .from('job_finds')
      .select('*')
      .eq('status', 'pending')
      .order('discovered_at', { ascending: false })
      .then(({ data }) => { if (data) setFinds(data) })
  }

  useEffect(() => {
    loadFinds()
    supabase.from('companies').select('*').order('name', { ascending: true })
      .then(({ data }) => { if (data) setCompanies(data) })
  }, [])

  function companyName(id) {
    return companies.find(c => c.id === id)?.name || 'Unknown company'
  }

  async function refresh() {
    setRefreshing(true)
    setSummary(null)
    const { data, error } = await supabase.functions.invoke('refresh-company-jobs', { body: {} })
    if (error || data?.error) {
      setSummary({ error: data?.error || error.message })
    } else {
      setSummary(data)
      await loadFinds()
    }
    setRefreshing(false)
  }

  async function addToJobs(find) {
    const { error } = await supabase.from('jobs').insert({
      user_id: session.user.id,
      company_id: find.company_id,
      title: find.title,
      location: find.location,
      job_url: find.job_url,
      source: 'company_site',
      status: 'saved',
    })
    if (!error) {
      await supabase.from('job_finds').delete().eq('id', find.id)
      setFinds(prev => prev.filter(f => f.id !== find.id))
    }
  }

  async function dismiss(id) {
    await supabase.from('job_finds').update({ status: 'dismissed' }).eq('id', id)
    setFinds(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div className="jobs-section">
      <div className="jobs-section-header">
        <h2>New Finds</h2>
        <button className="manage-add-btn" onClick={refresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh Jobs'}
        </button>
      </div>

      {summary && (
        <p className="jobs-card-meta">
          {summary.error
            ? `Refresh failed: ${summary.error}`
            : `Checked ${summary.checked_companies} compan${summary.checked_companies === 1 ? 'y' : 'ies'}, found ${summary.new_finds} new posting${summary.new_finds === 1 ? '' : 's'}.`}
          {summary.errors?.length > 0 && (
            <span> Couldn't check: {summary.errors.map(e => e.company_name).join(', ')}.</span>
          )}
        </p>
      )}

      {finds.length === 0 ? (
        <p className="jobs-card-meta">No pending finds. Add companies with a careers URL, then hit Refresh Jobs.</p>
      ) : (
        <ul className="jobs-card-list">
          {finds.map(find => (
            <li key={find.id} className="jobs-card">
              <div className="jobs-card-header">
                <span className="jobs-card-title">{find.title}</span>
              </div>
              <p className="jobs-card-meta">
                {companyName(find.company_id)}{find.location ? ` · ${find.location}` : ''}
              </p>
              <a href={find.job_url} target="_blank" rel="noreferrer" className="jobs-card-link">
                {find.job_url}
              </a>
              <div className="jobs-card-actions">
                <button className="manage-add-btn" onClick={() => addToJobs(find)}>Add to Jobs</button>
                <button className="manage-delete" onClick={() => dismiss(find.id)} aria-label={`Dismiss ${find.title}`}>
                  ×
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

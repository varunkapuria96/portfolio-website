import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const LOW_SCORE_THRESHOLD = 60

function sortByScore(a, b) {
  if (a.match_score == null && b.match_score == null) return 0
  if (a.match_score == null) return 1
  if (b.match_score == null) return -1
  return b.match_score - a.match_score
}

function scoreBadgeClass(score) {
  if (score == null) return 'jobs-badge'
  if (score >= 80) return 'jobs-badge jobs-score-high'
  if (score >= LOW_SCORE_THRESHOLD) return 'jobs-badge jobs-score-mid'
  return 'jobs-badge jobs-score-low'
}

export default function JobFinds({ session }) {
  const [finds, setFinds] = useState([])
  const [companies, setCompanies] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState(null)
  const [showLowScoring, setShowLowScoring] = useState(false)

  function loadFinds() {
    return supabase
      .from('job_finds')
      .select('*')
      .eq('status', 'pending')
      .then(({ data }) => { if (data) setFinds([...data].sort(sortByScore)) })
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

  const lowScoringCount = finds.filter(f => f.match_score != null && f.match_score < LOW_SCORE_THRESHOLD).length
  const visibleFinds = showLowScoring
    ? finds
    : finds.filter(f => f.match_score == null || f.match_score >= LOW_SCORE_THRESHOLD)

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
          {summary.scored === false && (
            <span> Upload your resume on the Resume tab to enable match scoring.</span>
          )}
        </p>
      )}

      {lowScoringCount > 0 && (
        <label className="jobs-card-meta" style={{ display: 'block', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={showLowScoring}
            onChange={e => setShowLowScoring(e.target.checked)}
          />{' '}
          Show low-scoring finds (&lt;{LOW_SCORE_THRESHOLD}) — {lowScoringCount} hidden
        </label>
      )}

      {visibleFinds.length === 0 ? (
        <p className="jobs-card-meta">No pending finds. Add companies with a careers URL, then hit Refresh Jobs.</p>
      ) : (
        <ul className="jobs-card-list">
          {visibleFinds.map(find => (
            <li key={find.id} className="jobs-card">
              <div className="jobs-card-header">
                <span className="jobs-card-title">{find.title}</span>
                {find.match_score != null && (
                  <span className={scoreBadgeClass(find.match_score)}>{find.match_score} match</span>
                )}
              </div>
              <p className="jobs-card-meta">
                {companyName(find.company_id)}{find.location ? ` · ${find.location}` : ''}
              </p>
              {find.match_reason && <p className="jobs-card-notes">{find.match_reason}</p>}
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

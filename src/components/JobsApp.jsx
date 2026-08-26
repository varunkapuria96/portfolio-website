import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import CompaniesList from './CompaniesList'
import JobsList from './JobsList'
import ContactsList from './ContactsList'
import JobFinds from './JobFinds'

export default function JobsApp({ session }) {
  const [tab, setTab] = useState('jobs')
  const [pendingFinds, setPendingFinds] = useState(0)

  useEffect(() => {
    supabase
      .from('job_finds')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => { if (typeof count === 'number') setPendingFinds(count) })
  }, [tab])

  return (
    <div className="bills-app">
      <div className="bills-tabs">
        <button className={tab === 'jobs' ? 'active' : ''} onClick={() => setTab('jobs')}>
          Jobs
        </button>
        <button className={tab === 'companies' ? 'active' : ''} onClick={() => setTab('companies')}>
          Companies
        </button>
        <button className={tab === 'contacts' ? 'active' : ''} onClick={() => setTab('contacts')}>
          People
        </button>
        <button className={tab === 'finds' ? 'active' : ''} onClick={() => setTab('finds')}>
          New Finds{pendingFinds > 0 ? ` (${pendingFinds})` : ''}
        </button>
      </div>

      <div className="bills-content">
        {tab === 'jobs' && <JobsList session={session} />}
        {tab === 'companies' && <CompaniesList session={session} />}
        {tab === 'contacts' && <ContactsList session={session} />}
        {tab === 'finds' && <JobFinds session={session} />}
      </div>
    </div>
  )
}

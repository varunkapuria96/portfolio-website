import { useState } from 'react'
import CompaniesList from './CompaniesList'
import JobsList from './JobsList'
import ContactsList from './ContactsList'

export default function JobsApp({ session }) {
  const [tab, setTab] = useState('jobs')

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
      </div>

      <div className="bills-content">
        {tab === 'jobs' && <JobsList session={session} />}
        {tab === 'companies' && <CompaniesList session={session} />}
        {tab === 'contacts' && <ContactsList session={session} />}
      </div>
    </div>
  )
}

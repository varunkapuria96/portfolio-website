import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function ManageCompany({ session }) {
  const [company, setCompany] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('company_info')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle()
      setCompany(data || { header: '', subheader: '' })
      setLoaded(true)
    }
    load()
  }, [session.user.id])

  async function save(field, value) {
    if (company.id) {
      await supabase.from('company_info').update({ [field]: value }).eq('id', company.id)
      setCompany(prev => ({ ...prev, [field]: value }))
    } else {
      const { data } = await supabase
        .from('company_info')
        .insert({ user_id: session.user.id, [field]: value })
        .select()
        .single()
      if (data) setCompany(data)
    }
  }

  if (!loaded) return null

  return (
    <div className="manage-section manage-company">
      <h2>Company Info</h2>
      <p className="manage-company-hint">Appears at the top of every printed bill.</p>

      <div className="manage-company-fields">
        <label className="manage-company-label">
          Header
          <input
            className="manage-company-input"
            placeholder="e.g. Sharma Curtains & Furnishings"
            defaultValue={company.header}
            onBlur={e => save('header', e.target.value)}
          />
        </label>

        <label className="manage-company-label">
          Subheader
          <textarea
            className="manage-company-textarea"
            placeholder={"e.g. 12 Main Street, Mumbai\nPhone: 98765 43210\nGST: 27XXXXX1234Z1Z5"}
            defaultValue={company.subheader}
            onBlur={e => save('subheader', e.target.value)}
            rows={4}
          />
        </label>
      </div>
    </div>
  )
}

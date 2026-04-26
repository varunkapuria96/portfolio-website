import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function isoToDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function BillsList({ session, onEdit }) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setBills(data)
        setLoading(false)
      })
  }, [])

  async function createBill() {
    const { data } = await supabase
      .from('bills')
      .insert({ user_id: session.user.id })
      .select()
      .single()
    if (data) {
      setBills(prev => [data, ...prev])
      onEdit(data.id)
    }
  }

  async function deleteBill(e, id) {
    e.stopPropagation()
    if (!window.confirm('Delete this bill?')) return
    await supabase.from('bills').delete().eq('id', id)
    setBills(prev => prev.filter(b => b.id !== id))
  }

  if (loading) return null

  return (
    <div>
      <div className="bills-list-header">
        <h2>Bills</h2>
        <button className="new-bill-btn" onClick={createBill}>+ New Bill</button>
      </div>

      {bills.length === 0 ? (
        <p className="bills-empty">No bills yet — click &quot;+ New Bill&quot; to start.</p>
      ) : (
        <table className="bills-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bills.map(bill => (
              <tr key={bill.id} onClick={() => onEdit(bill.id)}>
                <td>{bill.customer_name || <span style={{ color: '#444' }}>Untitled</span>}</td>
                <td>{isoToDisplay(bill.date)}</td>
                <td>
                  <button
                    className="action-btn"
                    onClick={e => deleteBill(e, bill.id)}
                    aria-label="Delete bill"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

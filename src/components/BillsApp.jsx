import { useState } from 'react'
import BillsList from './BillsList'
import BillEditor from './BillEditor'
import ManageRooms from './ManageRooms'
import ManageProducts from './ManageProducts'

export default function BillsApp({ session }) {
  const [tab, setTab] = useState('bills')
  const [editingBillId, setEditingBillId] = useState(null)

  function handleEdit(id) {
    setEditingBillId(id)
  }

  function handleBack() {
    setEditingBillId(null)
  }

  return (
    <div className="bills-app">
      <div className="bills-tabs">
        <button
          className={tab === 'bills' ? 'active' : ''}
          onClick={() => { setTab('bills'); setEditingBillId(null) }}
        >
          Bills
        </button>
        <button
          className={tab === 'rooms' ? 'active' : ''}
          onClick={() => setTab('rooms')}
        >
          Manage Rooms
        </button>
        <button
          className={tab === 'products' ? 'active' : ''}
          onClick={() => setTab('products')}
        >
          Manage Products
        </button>
      </div>

      <div className="bills-content">
        {tab === 'bills' && !editingBillId && (
          <BillsList session={session} onEdit={handleEdit} />
        )}
        {tab === 'bills' && editingBillId && (
          <BillEditor key={editingBillId} session={session} billId={editingBillId} onBack={handleBack} />
        )}
        {tab === 'rooms' && <ManageRooms session={session} />}
        {tab === 'products' && <ManageProducts session={session} />}
      </div>
    </div>
  )
}

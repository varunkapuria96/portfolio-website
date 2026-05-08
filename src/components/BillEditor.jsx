import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import BillPrint from './BillPrint'
import BillImportModal from './BillImportModal'

function fmt(n) {
  return (n || 0).toLocaleString('en-IN')
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result.split(',')[1])
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}

export default function BillEditor({ session, billId, onBack }) {
  const [bill, setBill] = useState(null)
  const [rooms, setRooms] = useState([])
  const [availableRooms, setAvailableRooms] = useState([])
  const [availableProducts, setAvailableProducts] = useState([])
  const [company, setCompany] = useState(null)

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importStatus, setImportStatus] = useState('loading')
  const [importExtracted, setImportExtracted] = useState([])
  const [importError, setImportError] = useState('')
  const [importFileError, setImportFileError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    async function load() {
      const [{ data: billData }, { data: roomsData }, { data: avRooms }, { data: avProducts }, { data: companyData }] =
        await Promise.all([
          supabase.from('bills').select('*').eq('id', billId).single(),
          supabase.from('bill_rooms').select('*, bill_items(*)').eq('bill_id', billId).order('sort_order'),
          supabase.from('rooms').select('*').order('created_at', { ascending: true }),
          supabase.from('products').select('*').order('created_at', { ascending: true }),
          supabase.from('company_info').select('*').eq('user_id', session.user.id).maybeSingle(),
        ])
      if (billData) setBill(billData)
      if (roomsData) setRooms(roomsData.map(({ bill_items, ...r }) => ({ ...r, items: bill_items || [] })))
      if (avRooms) setAvailableRooms(avRooms)
      if (avProducts) setAvailableProducts(avProducts)
      setCompany(companyData || { header: '', subheader: '' })
    }
    load()
  }, [billId])

  const roomsSubtotal = rooms.reduce(
    (sum, room) => sum + room.items.reduce((s, item) => s + (item.total || 0), 0),
    0
  )
  const grandTotal = roomsSubtotal + (bill?.cartage || 0) + (bill?.labor_charges || 0)
  const balanceDue = grandTotal - (bill?.advance_payment || 0)

  async function saveBillField(field, value) {
    await supabase.from('bills').update({ [field]: value }).eq('id', billId)
    setBill(prev => ({ ...prev, [field]: value }))
  }

  function updateItemLocally(billRoomId, itemId, updates) {
    setRooms(prev => prev.map(r =>
      r.id === billRoomId
        ? { ...r, items: r.items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
        : r
    ))
  }

  async function addRoom(roomId) {
    if (!roomId) return
    const room = availableRooms.find(r => r.id === roomId)
    if (!room) return
    const { data } = await supabase
      .from('bill_rooms')
      .insert({ bill_id: billId, room_id: roomId, room_name: room.name, sort_order: rooms.length })
      .select()
      .single()
    if (data) setRooms(prev => [...prev, { ...data, items: [] }])
  }

  async function deleteRoom(billRoomId) {
    if (!window.confirm('Remove this room from the bill?')) return
    await supabase.from('bill_rooms').delete().eq('id', billRoomId)
    setRooms(prev => prev.filter(r => r.id !== billRoomId))
  }

  async function addItem(billRoomId) {
    const { data } = await supabase
      .from('bill_items')
      .insert({ bill_room_id: billRoomId, product_name: '', unit: '', quantity: 0, price: 0, total: 0 })
      .select()
      .single()
    if (data) {
      setRooms(prev => prev.map(r =>
        r.id === billRoomId ? { ...r, items: [...r.items, data] } : r
      ))
    }
  }

  async function deleteItem(billRoomId, itemId) {
    await supabase.from('bill_items').delete().eq('id', itemId)
    setRooms(prev => prev.map(r =>
      r.id === billRoomId ? { ...r, items: r.items.filter(i => i.id !== itemId) } : r
    ))
  }

  async function selectProduct(billRoomId, itemId, productId) {
    const product = availableProducts.find(p => p.id === productId)
    if (!product) return
    const room = rooms.find(r => r.id === billRoomId)
    const item = room?.items.find(i => i.id === itemId)
    const quantity = item?.quantity || 0
    const total = quantity * product.price

    await supabase.from('bill_items').update({
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      price: product.price,
      total,
    }).eq('id', itemId)

    updateItemLocally(billRoomId, itemId, {
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      price: product.price,
      total,
    })
  }

  async function handleImageFile(file) {
    if (file.size > 5 * 1024 * 1024) {
      setImportFileError('Image must be under 5MB')
      return
    }
    setImportFileError('')
    setImportModalOpen(true)
    setImportStatus('loading')
    setImportError('')
    setImportExtracted([])

    let base64
    try {
      base64 = await fileToBase64(file)
    } catch {
      setImportStatus('error')
      setImportError('Could not read the image file. Please try again.')
      return
    }
    const { data, error } = await supabase.functions.invoke('extract-bill-image', {
      body: {
        image_base64: base64,
        media_type: file.type,
        products: availableProducts.map(p => ({ name: p.name, unit: p.unit, price: p.price })),
      },
    })

    if (error || data?.error || !Array.isArray(data?.rooms)) {
      setImportStatus('error')
      setImportError(data?.error || 'Failed to process image')
      return
    }

    setImportExtracted(data.rooms)
    setImportStatus('review')
  }

  async function addImportedRooms(extractedRooms) {
    if (!extractedRooms.length) {
      setImportModalOpen(false)
      return
    }
    let nextSortOrder = rooms.length
    let insertedCount = 0

    for (const extracted of extractedRooms) {
      const matchedRoom = availableRooms.find(
        r => r.name.toLowerCase() === extracted.name.toLowerCase()
      )
      const { data: billRoom, error: roomError } = await supabase
        .from('bill_rooms')
        .insert({
          bill_id: billId,
          room_id: matchedRoom?.id || null,
          room_name: extracted.name,
          sort_order: nextSortOrder,
        })
        .select()
        .single()

      if (roomError || !billRoom) {
        console.error('Failed to insert room:', extracted.name, roomError)
        continue
      }
      nextSortOrder++
      insertedCount++

      const items = []
      for (const item of extracted.items) {
        const matchedProduct = availableProducts.find(
          p => p.name.toLowerCase() === item.product_name.toLowerCase()
        )
        const { data: billItem, error: itemError } = await supabase
          .from('bill_items')
          .insert({
            bill_room_id: billRoom.id,
            product_id: matchedProduct?.id || null,
            product_name: item.product_name,
            unit: item.unit,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
          })
          .select()
          .single()
        if (itemError) console.error('Failed to insert item:', item.product_name, itemError)
        if (billItem) items.push(billItem)
      }

      setRooms(prev => [...prev, { ...billRoom, items }])
    }

    if (insertedCount < extractedRooms.length) {
      setImportStatus('error')
      setImportError(`${extractedRooms.length - insertedCount} room(s) failed to save. Check your connection and try again.`)
      return
    }
    setImportModalOpen(false)
  }

  if (!bill) return null

  return (
    <>
      <div className="bill-editor">
        <div className="bill-editor-nav">
          <button className="back-btn" onClick={onBack}>← Bills</button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div>
              <button
                className="import-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Import from image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); e.target.value = '' }}
              />
              {importFileError && <div className="import-file-error">{importFileError}</div>}
            </div>
            <button className="print-btn" onClick={() => window.print()}>Print / Save PDF</button>
          </div>
        </div>

        <div className="bill-header-fields">
          <input
            className="bill-customer-input"
            placeholder="Customer Name"
            defaultValue={bill.customer_name}
            onBlur={e => saveBillField('customer_name', e.target.value)}
          />
          <input
            type="date"
            className="bill-date-input"
            defaultValue={bill.date}
            onBlur={e => saveBillField('date', e.target.value)}
          />
        </div>

        {rooms.map(room => (
          <div key={room.id} className="bill-room">
            <div className="bill-room-header">
              <span className="bill-room-name">{room.room_name}</span>
              <button className="room-delete-btn" onClick={() => deleteRoom(room.id)}>
                Remove room
              </button>
            </div>

            <table className="bill-items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {room.items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <select
                        value={item.product_id || ''}
                        onChange={e => selectProduct(room.id, item.id, e.target.value)}
                      >
                        <option value="">Select product</option>
                        {availableProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => {
                          const qty = parseFloat(e.target.value) || 0
                          updateItemLocally(room.id, item.id, { quantity: qty, total: qty * item.price })
                        }}
                        onBlur={async e => {
                          const qty = parseFloat(e.target.value) || 0
                          const total = qty * item.price
                          await supabase.from('bill_items').update({ quantity: qty, total }).eq('id', item.id)
                        }}
                      />
                    </td>
                    <td><span className="item-unit">{item.unit || '—'}</span></td>
                    <td>
                      <input
                        type="number"
                        value={item.price}
                        onChange={e => {
                          const rate = parseFloat(e.target.value) || 0
                          updateItemLocally(room.id, item.id, { price: rate, total: item.quantity * rate })
                        }}
                        onBlur={async e => {
                          const rate = parseFloat(e.target.value) || 0
                          const total = item.quantity * rate
                          await supabase.from('bill_items').update({ price: rate, total }).eq('id', item.id)
                        }}
                      />
                    </td>
                    <td className="item-total">₹{fmt(item.total)}</td>
                    <td>
                      <button
                        className="item-delete-btn"
                        onClick={() => deleteItem(room.id, item.id)}
                        aria-label="Remove item"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="room-footer">
              <button className="add-item-btn" onClick={() => addItem(room.id)}>+ Add Item</button>
              <span className="room-subtotal">
                Room: ₹{fmt(room.items.reduce((s, i) => s + (i.total || 0), 0))}
              </span>
            </div>
          </div>
        ))}

        <div className="add-room-section">
          <select
            className="add-room-select"
            value=""
            onChange={e => { addRoom(e.target.value); e.target.value = '' }}
          >
            <option value="">+ Add Room</option>
            {availableRooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="grand-total-section">
          <div className="total-row">
            <span>Rooms Subtotal</span>
            <span>₹{fmt(roomsSubtotal)}</span>
          </div>
          <div className="total-row">
            <span>+ Cartage</span>
            <input
              type="number"
              defaultValue={bill.cartage}
              onBlur={e => saveBillField('cartage', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="total-row">
            <span>+ Labour Charges</span>
            <input
              type="number"
              defaultValue={bill.labor_charges}
              onBlur={e => saveBillField('labor_charges', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="total-row grand-total">
            <span>Grand Total</span>
            <span>₹{fmt(grandTotal)}</span>
          </div>
          <div className="total-row">
            <span>− Advance Paid</span>
            <input
              type="number"
              defaultValue={bill.advance_payment}
              onBlur={e => saveBillField('advance_payment', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="total-row balance-due">
            <span>Balance Due</span>
            <span>₹{fmt(balanceDue)}</span>
          </div>
        </div>
      </div>

      <BillPrint
        bill={bill}
        rooms={rooms}
        roomsSubtotal={roomsSubtotal}
        grandTotal={grandTotal}
        balanceDue={balanceDue}
        company={company}
      />

      {importModalOpen && (
        <BillImportModal
          status={importStatus}
          extractedRooms={importExtracted}
          errorMessage={importError}
          onConfirm={addImportedRooms}
          onClose={() => setImportModalOpen(false)}
          onRetry={() => fileInputRef.current?.click()}
        />
      )}
    </>
  )
}

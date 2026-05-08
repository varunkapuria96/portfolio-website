import { useState, useEffect, Fragment } from 'react'

function withKeys(rooms) {
  return (rooms || []).map(r => ({
    ...r,
    _key: r._key || crypto.randomUUID(),
    items: (r.items || []).map(item => ({
      ...item,
      _key: item._key || crypto.randomUUID(),
    })),
  }))
}

export default function BillImportModal({ status, extractedRooms, errorMessage, onConfirm, onClose, onRetry, availableRooms = [], availableProducts = [], onAddRoom, onAddProduct }) {
  const [rooms, setRooms] = useState(() => withKeys(extractedRooms))
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setRooms(withKeys(extractedRooms))
  }, [extractedRooms])

  function updateRoomName(roomIdx, value) {
    setRooms(prev => prev.map((r, i) => i === roomIdx ? { ...r, name: value } : r))
  }

  function removeRoom(roomIdx) {
    setRooms(prev => prev.filter((_, i) => i !== roomIdx))
  }

  function updateItem(roomIdx, itemIdx, field, value) {
    setRooms(prev => prev.map((r, i) =>
      i === roomIdx
        ? { ...r, items: r.items.map((item, j) => j === itemIdx ? { ...item, [field]: value } : item) }
        : r
    ))
  }

  function removeItem(roomIdx, itemIdx) {
    setRooms(prev => prev.map((r, i) =>
      i === roomIdx ? { ...r, items: r.items.filter((_, j) => j !== itemIdx) } : r
    ))
  }

  function addItem(roomIdx) {
    setRooms(prev => prev.map((r, i) =>
      i === roomIdx
        ? { ...r, items: [...r.items, { product_name: '', quantity: 0, unit: '', price: 0, matched: true, _key: crypto.randomUUID() }] }
        : r
    ))
  }

  async function handleConfirm() {
    setIsSubmitting(true)
    try {
      await onConfirm(rooms)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="import-modal-backdrop" onClick={onClose}>
      <div className="import-modal" onClick={e => e.stopPropagation()}>
        <div className="import-modal-header">
          <span>Import from image</span>
          <button className="import-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="import-modal-body">
          {status === 'loading' && (
            <div className="import-loading">
              <div className="import-spinner" />
              <div>Reading your note…</div>
              <div className="import-loading-sub">This takes a few seconds</div>
            </div>
          )}

          {status === 'error' && (
            <div className="import-error">
              <div>{errorMessage || "Couldn't read this image — try a clearer photo"}</div>
              <button className="import-retry-btn" onClick={onRetry}>Retry</button>
            </div>
          )}

          {status === 'review' && (
            rooms.length === 0 ? (
              <div className="import-no-rooms">No rooms found — try a clearer photo</div>
            ) : (
              <>
                <p className="import-hint">
                  Review and edit before adding to bill. Highlighted items weren't matched to your catalogue.
                </p>
                {rooms.map((room, roomIdx) => {
                  const roomInCatalogue = availableRooms.some(r => r.name.toLowerCase() === room.name.toLowerCase())
                  return (
                  <div key={room._key} className="import-room">
                    <div className="import-room-header">
                      <input
                        className="import-room-name"
                        value={room.name}
                        onChange={e => updateRoomName(roomIdx, e.target.value)}
                        aria-label="Room name"
                      />
                      <button className="import-remove-room" onClick={() => removeRoom(roomIdx)}>
                        Remove room
                      </button>
                    </div>
                    {!roomInCatalogue && room.name && (
                      <div className="import-unmatched-hint import-unmatched-room">
                        ⚠ "{room.name}" isn't in your rooms catalogue —{' '}
                        {onAddRoom && (
                          <button className="import-add-to-catalogue-btn" onClick={() => onAddRoom(room.name)}>
                            Add room to catalogue
                          </button>
                        )}
                      </div>
                    )}
                    <div className="import-item-grid">
                      <span className="import-col-header">Product</span>
                      <span className="import-col-header">Qty</span>
                      <span className="import-col-header">Unit</span>
                      <span className="import-col-header">Rate</span>
                      <span />
                      {room.items.map((item, itemIdx) => {
                        const productInCatalogue = availableProducts.some(p => p.name.toLowerCase() === item.product_name.toLowerCase())
                        return (
                        <Fragment key={item._key}>
                          <div>
                            <input
                              className={`import-item-input${!productInCatalogue && item.product_name ? ' unmatched' : ''}`}
                              value={item.product_name}
                              onChange={e => updateItem(roomIdx, itemIdx, 'product_name', e.target.value)}
                              aria-label="Product name"
                            />
                            {!productInCatalogue && item.product_name && (
                              <div className="import-unmatched-hint">
                                ⚠ Not in catalogue —{' '}
                                {onAddProduct && (
                                  <button
                                    className="import-add-to-catalogue-btn"
                                    onClick={() => onAddProduct(item.product_name, item.unit, item.price)}
                                  >
                                    Add to catalogue
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <input
                            className="import-item-input"
                            type="number"
                            value={item.quantity}
                            onChange={e => updateItem(roomIdx, itemIdx, 'quantity', parseFloat(e.target.value) || 0)}
                            aria-label="Quantity"
                          />
                          <input
                            className="import-item-input"
                            value={item.unit}
                            onChange={e => updateItem(roomIdx, itemIdx, 'unit', e.target.value)}
                            aria-label="Unit"
                          />
                          <input
                            className="import-item-input"
                            type="number"
                            value={item.price}
                            onChange={e => updateItem(roomIdx, itemIdx, 'price', parseFloat(e.target.value) || 0)}
                            aria-label="Rate"
                          />
                          <button
                            className="import-remove-item"
                            onClick={() => removeItem(roomIdx, itemIdx)}
                            aria-label="Remove item"
                          >×</button>
                        </Fragment>
                        )})}
                    </div>
                    <button className="import-add-item" onClick={() => addItem(roomIdx)}>+ Add item</button>
                  </div>
                  )
                })}
              </>
            )
          )}
        </div>

        <div className="import-modal-footer">
          <button className="import-cancel-btn" onClick={onClose}>Cancel</button>
          <button
            className="import-add-btn"
            onClick={handleConfirm}
            disabled={status !== 'review' || isSubmitting}
          >
            Add to Bill
          </button>
        </div>
      </div>
    </div>
  )
}

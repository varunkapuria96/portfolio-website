function fmt(n) {
  return (n || 0).toLocaleString('en-IN')
}

export default function BillPrint({ bill, rooms, roomsSubtotal, grandTotal, balanceDue, company }) {
  if (!bill) return null

  return (
    <div className="bill-print">
      <div className="print-doc">
        {company?.header && (
          <div className="print-company">
            <div className="print-company-header">{company.header}</div>
            {company.subheader && (
              <div className="print-company-subheader">{company.subheader}</div>
            )}
          </div>
        )}
        <div className="print-doc-title">Estimate</div>
        <div className="print-doc-meta">
          <span><strong>{bill.customer_name || 'Customer'}</strong></span>
          <span>{bill.date}</span>
        </div>

        {rooms.map(room => (
          <div key={room.id} className="print-room">
            <div className="print-room-name">{room.room_name}</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {room.items.map(item => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{fmt(item.price)}</td>
                    <td>{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="print-room-subtotal">
              ₹{fmt(room.items.reduce((s, i) => s + i.total, 0))}
            </div>
          </div>
        ))}

        <div className="print-totals">
          <div className="print-total-row">
            <span>Rooms Subtotal</span>
            <span>₹{fmt(roomsSubtotal)}</span>
          </div>
          {bill.cartage > 0 && (
            <div className="print-total-row">
              <span>Cartage</span>
              <span>₹{fmt(bill.cartage)}</span>
            </div>
          )}
          {bill.labor_charges > 0 && (
            <div className="print-total-row">
              <span>Labour Charges</span>
              <span>₹{fmt(bill.labor_charges)}</span>
            </div>
          )}
          <div className="print-total-row grand">
            <span>Grand Total</span>
            <span>₹{fmt(grandTotal)}</span>
          </div>
          {bill.advance_payment > 0 && (
            <div className="print-total-row">
              <span>Advance Paid</span>
              <span>₹{fmt(bill.advance_payment)}</span>
            </div>
          )}
          <div className="print-total-row balance">
            <span>Balance Due</span>
            <span>₹{fmt(balanceDue)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

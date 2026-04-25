import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const UNITS = ['sqft', 'mts', 'rn ft', 'piece', 'on ft']

export default function ManageProducts({ session }) {
  const [products, setProducts] = useState([])
  const [newProduct, setNewProduct] = useState({ name: '', unit: 'sqft', price: '' })

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setProducts(data) })
  }, [])

  async function addProduct(e) {
    e.preventDefault()
    if (!newProduct.name.trim()) return
    const { data } = await supabase
      .from('products')
      .insert({
        name: newProduct.name.trim(),
        unit: newProduct.unit,
        price: parseFloat(newProduct.price) || 0,
        user_id: session.user.id,
      })
      .select()
      .single()
    if (data) setProducts(prev => [...prev, data])
    setNewProduct({ name: '', unit: 'sqft', price: '' })
  }

  async function saveField(id, field, value) {
    await supabase.from('products').update({ [field]: value }).eq('id', id)
    setProducts(prev =>
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    )
  }

  async function deleteProduct(id) {
    if (!window.confirm('Delete this product? It will not affect existing bills.')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="manage-section">
      <h2>Products</h2>
      <table className="products-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Unit</th>
            <th>Default Price (₹)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td>
                <input
                  defaultValue={product.name}
                  onBlur={e => saveField(product.id, 'name', e.target.value.trim())}
                  placeholder="Product name"
                />
              </td>
              <td>
                <select
                  defaultValue={product.unit}
                  onChange={e => saveField(product.id, 'unit', e.target.value)}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </td>
              <td>
                <input
                  type="number"
                  defaultValue={product.price}
                  onBlur={e => saveField(product.id, 'price', parseFloat(e.target.value) || 0)}
                />
              </td>
              <td>
                <button
                  className="manage-delete"
                  onClick={() => deleteProduct(product.id)}
                  aria-label={`Delete ${product.name}`}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={addProduct} className="manage-add-form" style={{ gap: '8px', flexWrap: 'wrap' }}>
        <input
          className="manage-input"
          placeholder="Product name"
          value={newProduct.name}
          onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))}
        />
        <select
          className="manage-input"
          style={{ flex: 'none', width: '90px' }}
          value={newProduct.unit}
          onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))}
        >
          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <input
          className="manage-input"
          type="number"
          placeholder="Price"
          style={{ flex: 'none', width: '90px' }}
          value={newProduct.price}
          onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))}
        />
        <button type="submit" className="manage-add-btn">Add Product</button>
      </form>
    </div>
  )
}

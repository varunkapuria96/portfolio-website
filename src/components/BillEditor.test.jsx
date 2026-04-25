import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BillEditor from './BillEditor'

const mockBill = {
  id: 'b1', customer_name: 'Tanay Mehta', date: '2026-07-28',
  cartage: 0, labor_charges: 0, advance_payment: 0,
}

const mockRoomsWithItems = [
  {
    id: 'br1', bill_id: 'b1', room_id: 'r1', room_name: 'Living Room', sort_order: 0,
    bill_items: [
      { id: 'bi1', bill_room_id: 'br1', product_id: 'p1', product_name: 'Roman Blind', unit: 'sqft', quantity: 192, price: 210, total: 40320 },
    ],
  },
]

const mockAvailableRooms = [
  { id: 'r1', name: 'Living Room' },
  { id: 'r2', name: 'Dining' },
]

const mockAvailableProducts = [
  { id: 'p1', name: 'Roman Blind', unit: 'sqft', price: 210 },
  { id: 'p2', name: 'Blackout', unit: 'mts', price: 290 },
]

vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from '../supabase'

function makeChain(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [] }),
    single: vi.fn().mockResolvedValue({ data: null }),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  supabase.from.mockImplementation((table) => {
    if (table === 'bills') {
      return makeChain({ single: vi.fn().mockResolvedValue({ data: mockBill }) })
    }
    if (table === 'bill_rooms') {
      return makeChain({ order: vi.fn().mockResolvedValue({ data: mockRoomsWithItems }) })
    }
    if (table === 'rooms') {
      return makeChain({ order: vi.fn().mockResolvedValue({ data: mockAvailableRooms }) })
    }
    if (table === 'products') {
      return makeChain({ order: vi.fn().mockResolvedValue({ data: mockAvailableProducts }) })
    }
    return makeChain()
  })
})

const mockSession = { user: { id: 'u1' } }

describe('BillEditor', () => {
  it('loads and displays the bill customer name', async () => {
    render(<BillEditor session={mockSession} billId="b1" onBack={vi.fn()} />)
    const input = await screen.findByDisplayValue('Tanay Mehta')
    expect(input).toBeInTheDocument()
  })

  it('displays existing room name', async () => {
    render(<BillEditor session={mockSession} billId="b1" onBack={vi.fn()} />)
    const matches = await screen.findAllByText('Living Room')
    expect(matches.length).toBeGreaterThan(0)
  })

  it('displays computed room subtotal', async () => {
    render(<BillEditor session={mockSession} billId="b1" onBack={vi.fn()} />)
    const matches = await screen.findAllByText(/40,320/)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('calls onBack when back button clicked', async () => {
    const onBack = vi.fn()
    render(<BillEditor session={mockSession} billId="b1" onBack={onBack} />)
    await screen.findByDisplayValue('Tanay Mehta')
    await userEvent.click(screen.getByRole('button', { name: /← bills/i }))
    expect(onBack).toHaveBeenCalled()
  })
})

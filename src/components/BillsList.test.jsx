import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BillsList from './BillsList'

vi.mock('../supabase', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [
        { id: 'b1', customer_name: 'Tanay Mehta', date: '2026-07-28', cartage: 0, labor_charges: 0, advance_payment: 0, created_at: '2026-07-28' },
        { id: 'b2', customer_name: 'Mr. Sharma', date: '2026-07-20', cartage: 500, labor_charges: 0, advance_payment: 10000, created_at: '2026-07-20' },
      ]
    }),
    single: vi.fn().mockResolvedValue({
      data: { id: 'b3', customer_name: '', date: '2026-04-25', cartage: 0, labor_charges: 0, advance_payment: 0, created_at: '2026-04-25' },
    }),
  }
  return { supabase: { from: vi.fn(() => ({ ...chain })) } }
})

import { supabase } from '../supabase'

const mockBills = [
  { id: 'b1', customer_name: 'Tanay Mehta', date: '2026-07-28', cartage: 0, labor_charges: 0, advance_payment: 0, created_at: '2026-07-28' },
  { id: 'b2', customer_name: 'Mr. Sharma', date: '2026-07-20', cartage: 500, labor_charges: 0, advance_payment: 10000, created_at: '2026-07-20' },
]

beforeEach(() => {
  vi.clearAllMocks()
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockBills }),
    single: vi.fn().mockResolvedValue({
      data: { id: 'b3', customer_name: '', date: '2026-04-25', cartage: 0, labor_charges: 0, advance_payment: 0, created_at: '2026-04-25' },
    }),
  }
  supabase.from.mockImplementation(() => ({ ...chain }))
})

const mockSession = { user: { id: 'u1' } }

describe('BillsList', () => {
  it('loads and displays bills on mount', async () => {
    render(<BillsList session={mockSession} onEdit={vi.fn()} />)
    expect(await screen.findByText('Tanay Mehta')).toBeInTheDocument()
    expect(screen.getByText('Mr. Sharma')).toBeInTheDocument()
  })

  it('calls onEdit with the new bill id when New Bill clicked', async () => {
    const onEdit = vi.fn()
    render(<BillsList session={mockSession} onEdit={onEdit} />)
    await screen.findByText('Tanay Mehta')
    await userEvent.click(screen.getByRole('button', { name: /new bill/i }))
    await waitFor(() => expect(onEdit).toHaveBeenCalledWith('b3'))
  })

  it('shows empty state when no bills exist', async () => {
    supabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [] }),
    }))
    render(<BillsList session={mockSession} onEdit={vi.fn()} />)
    expect(await screen.findByText(/no bills yet/i)).toBeInTheDocument()
  })
})

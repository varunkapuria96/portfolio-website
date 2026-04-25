import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ManageProducts from './ManageProducts'

vi.mock('../supabase', () => {
  const mockProducts = [
    { id: 'p1', name: 'Roman Blind', unit: 'sqft', price: 210, user_id: 'u1', created_at: '2026-01-01' },
    { id: 'p2', name: 'Blackout', unit: 'mts', price: 290, user_id: 'u1', created_at: '2026-01-02' },
  ]
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockProducts }),
    single: vi.fn().mockResolvedValue({
      data: { id: 'p3', name: 'Sheer Curtain', unit: 'piece', price: 450, user_id: 'u1', created_at: '2026-01-03' },
    }),
  }
  return { supabase: { from: vi.fn(() => ({ ...chain })) } }
})

import { supabase } from '../supabase'

const mockProducts = [
  { id: 'p1', name: 'Roman Blind', unit: 'sqft', price: 210, user_id: 'u1', created_at: '2026-01-01' },
  { id: 'p2', name: 'Blackout', unit: 'mts', price: 290, user_id: 'u1', created_at: '2026-01-02' },
]

beforeEach(() => {
  vi.clearAllMocks()
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockProducts }),
    single: vi.fn().mockResolvedValue({
      data: { id: 'p3', name: 'Sheer Curtain', unit: 'piece', price: 450, user_id: 'u1', created_at: '2026-01-03' },
    }),
  }
  supabase.from.mockImplementation(() => ({ ...chain }))
})

const mockSession = { user: { id: 'u1' } }

describe('ManageProducts', () => {
  it('loads and displays products on mount', async () => {
    render(<ManageProducts session={mockSession} />)
    expect(await screen.findByDisplayValue('Roman Blind')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Blackout')).toBeInTheDocument()
  })

  it('adds a new product when form submitted', async () => {
    render(<ManageProducts session={mockSession} />)
    await screen.findByDisplayValue('Roman Blind')
    const inputs = screen.getAllByPlaceholderText(/product name/i)
    const formInput = inputs[inputs.length - 1] // Last one is in the form
    await userEvent.type(formInput, 'Sheer Curtain')
    await userEvent.click(screen.getByRole('button', { name: /^add product$/i }))
    expect(await screen.findByDisplayValue('Sheer Curtain')).toBeInTheDocument()
  })

  it('does not add a product when name is empty', async () => {
    render(<ManageProducts session={mockSession} />)
    await screen.findByDisplayValue('Roman Blind')
    const callsBefore = supabase.from.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: /^add product$/i }))
    expect(supabase.from.mock.calls.length).toBe(callsBefore)
  })
})

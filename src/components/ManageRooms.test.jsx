import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ManageRooms from './ManageRooms'

vi.mock('../supabase', () => {
  const mockRooms = [
    { id: 'r1', name: 'Living Room', user_id: 'u1', created_at: '2026-01-01' },
    { id: 'r2', name: 'Dining', user_id: 'u1', created_at: '2026-01-02' },
  ]
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockRooms }),
    single: vi.fn().mockResolvedValue({ data: { id: 'r3', name: 'Den', user_id: 'u1', created_at: '2026-01-03' } }),
  }
  return { supabase: { from: vi.fn(() => ({ ...chain })) } }
})

import { supabase } from '../supabase'

const mockRooms = [
  { id: 'r1', name: 'Living Room', user_id: 'u1', created_at: '2026-01-01' },
  { id: 'r2', name: 'Dining', user_id: 'u1', created_at: '2026-01-02' },
]

beforeEach(() => {
  vi.clearAllMocks()
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockRooms }),
    single: vi.fn().mockResolvedValue({ data: { id: 'r3', name: 'Den', user_id: 'u1', created_at: '2026-01-03' } }),
  }
  supabase.from.mockImplementation(() => ({ ...chain }))
})

const mockSession = { user: { id: 'u1' } }

describe('ManageRooms', () => {
  it('loads and displays rooms on mount', async () => {
    render(<ManageRooms session={mockSession} />)
    expect(await screen.findByText('Living Room')).toBeInTheDocument()
    expect(screen.getByText('Dining')).toBeInTheDocument()
  })

  it('adds a new room when form submitted', async () => {
    render(<ManageRooms session={mockSession} />)
    await screen.findByText('Living Room')
    await userEvent.type(screen.getByPlaceholderText(/new room name/i), 'Den')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(await screen.findByText('Den')).toBeInTheDocument()
  })

  it('does not add a room when input is empty', async () => {
    render(<ManageRooms session={mockSession} />)
    await screen.findByText('Living Room')
    const callsBefore = supabase.from.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(supabase.from.mock.calls.length).toBe(callsBefore)
  })
})

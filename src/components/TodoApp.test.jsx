import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import TodoApp from './TodoApp'

const mockSession = { user: { id: 'user-123' } }

const mockTodos = [
  { id: '1', text: 'Buy milk', completed: false, created_at: '2026-01-01' },
  { id: '2', text: 'Walk dog', completed: true, created_at: '2026-01-02' },
]

vi.mock('../supabase', () => {
  const fromChain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({
      data: [
        { id: '1', text: 'Buy milk', completed: false, created_at: '2026-01-01' },
        { id: '2', text: 'Walk dog', completed: true, created_at: '2026-01-02' },
      ],
    }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: '3', text: 'New task', completed: false, created_at: '2026-01-03' },
    }),
  }

  return {
    supabase: {
      from: vi.fn(() => ({ ...fromChain })),
      auth: {
        signOut: vi.fn().mockResolvedValue({}),
      },
    },
  }
})

import { supabase } from '../supabase'

beforeEach(() => {
  vi.clearAllMocks()
  const fromChain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockTodos }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: '3', text: 'New task', completed: false, created_at: '2026-01-03' },
    }),
  }
  supabase.from.mockImplementation(() => ({ ...fromChain }))
})

describe('TodoApp', () => {
  it('renders fetched todos on mount', async () => {
    render(<TodoApp session={mockSession} />)
    expect(await screen.findByText('Buy milk')).toBeInTheDocument()
    expect(screen.getByText('Walk dog')).toBeInTheDocument()
  })

  it('calls signOut when sign out button clicked', async () => {
    render(<TodoApp session={mockSession} />)
    await screen.findByText('Buy milk')
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })

  it('adds a new todo when form submitted', async () => {
    render(<TodoApp session={mockSession} />)
    await screen.findByText('Buy milk')
    await userEvent.type(screen.getByPlaceholderText(/add a todo/i), 'New task')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(await screen.findByText('New task')).toBeInTheDocument()
  })

  it('does not add a todo when input is empty', async () => {
    render(<TodoApp session={mockSession} />)
    await screen.findByText('Buy milk')
    const callsBefore = supabase.from.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(supabase.from.mock.calls.length).toBe(callsBefore)
  })
})

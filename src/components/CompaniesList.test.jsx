import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CompaniesList from './CompaniesList'

const mockSession = { user: { id: 'user-123' } }

const mockCompanies = [
  { id: '1', name: 'Acme Corp', careers_url: 'https://acme.example/careers', priority: 'high', notes: 'Referral via Jane', created_at: '2026-01-01' },
]

vi.mock('../supabase', () => {
  return { supabase: { from: vi.fn() } }
})

import { supabase } from '../supabase'

function chain(overrides = {}) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockCompanies }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: '2', name: 'New Co', careers_url: '', priority: 'medium', notes: '', created_at: '2026-01-02' },
    }),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  supabase.from.mockImplementation(() => chain())
})

describe('CompaniesList', () => {
  it('renders fetched companies on mount', async () => {
    render(<CompaniesList session={mockSession} />)
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('high')).toBeInTheDocument()
  })

  it('adds a new company when form submitted', async () => {
    render(<CompaniesList session={mockSession} />)
    await screen.findByText('Acme Corp')
    await userEvent.type(screen.getByPlaceholderText(/company name/i), 'New Co')
    await userEvent.click(screen.getByRole('button', { name: /add company/i }))
    expect(await screen.findByText('New Co')).toBeInTheDocument()
  })

  it('does not add a company when name is empty', async () => {
    render(<CompaniesList session={mockSession} />)
    await screen.findByText('Acme Corp')
    const callsBefore = supabase.from.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: /add company/i }))
    expect(supabase.from.mock.calls.length).toBe(callsBefore)
  })

  it('deletes a company when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CompaniesList session={mockSession} />)
    await screen.findByText('Acme Corp')
    await userEvent.click(screen.getByRole('button', { name: /delete acme corp/i }))
    expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument()
  })
})

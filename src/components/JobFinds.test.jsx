import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import JobFinds from './JobFinds'

const mockSession = { user: { id: 'user-123' } }

const mockCompanies = [{ id: 'c1', name: 'Acme Corp' }]
const mockFinds = [
  { id: 'f1', company_id: 'c1', title: 'Backend Engineer', location: 'Remote', job_url: 'https://acme.example/jobs/1', status: 'pending', discovered_at: '2026-01-01' },
]

const invoke = vi.fn().mockResolvedValue({ data: { checked_companies: 1, new_finds: 1, errors: [] }, error: null })

vi.mock('../supabase', () => ({ supabase: { from: vi.fn(), functions: { invoke: (...args) => invoke(...args) } } }))
import { supabase } from '../supabase'

function chainFor(table) {
  if (table === 'companies') {
    return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: mockCompanies }) }
  }
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockFinds }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  invoke.mockResolvedValue({ data: { checked_companies: 1, new_finds: 1, errors: [] }, error: null })
  supabase.from.mockImplementation(table => chainFor(table))
})

describe('JobFinds', () => {
  it('renders pending finds with company name', async () => {
    render(<JobFinds session={mockSession} />)
    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument()
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument()
  })

  it('calls the refresh edge function and shows a summary', async () => {
    render(<JobFinds session={mockSession} />)
    await screen.findByText('Backend Engineer')
    await userEvent.click(screen.getByRole('button', { name: /refresh jobs/i }))
    expect(invoke).toHaveBeenCalledWith('refresh-company-jobs', { body: {} })
    expect(await screen.findByText(/Checked 1 company, found 1 new posting/)).toBeInTheDocument()
  })

  it('adds a find to jobs and removes it from the list', async () => {
    render(<JobFinds session={mockSession} />)
    await screen.findByText('Backend Engineer')
    await userEvent.click(screen.getByRole('button', { name: /add to jobs/i }))
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
  })

  it('dismisses a find and removes it from the list', async () => {
    render(<JobFinds session={mockSession} />)
    await screen.findByText('Backend Engineer')
    await userEvent.click(screen.getByRole('button', { name: /dismiss backend engineer/i }))
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
  })
})

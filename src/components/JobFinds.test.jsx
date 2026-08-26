import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import JobFinds from './JobFinds'

const mockSession = { user: { id: 'user-123' } }

const mockCompanies = [{ id: 'c1', name: 'Acme Corp' }]
let mockFinds = [
  { id: 'f1', company_id: 'c1', title: 'Backend Engineer', location: 'Remote', job_url: 'https://acme.example/jobs/1', status: 'pending', match_score: 85, match_reason: 'Strong fit on backend experience.' },
  { id: 'f2', company_id: 'c1', title: 'Sales Intern', location: 'Remote', job_url: 'https://acme.example/jobs/2', status: 'pending', match_score: 30, match_reason: 'Entry-level, not a fit.' },
]

const invoke = vi.fn().mockResolvedValue({ data: { checked_companies: 1, new_finds: 2, errors: [] }, error: null })

vi.mock('../supabase', () => ({ supabase: { from: vi.fn(), functions: { invoke: (...args) => invoke(...args) } } }))
import { supabase } from '../supabase'

function chainFor(table) {
  if (table === 'companies') {
    return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: mockCompanies }) }
  }
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(() => Promise.resolve({ data: mockFinds })),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFinds = [
    { id: 'f1', company_id: 'c1', title: 'Backend Engineer', location: 'Remote', job_url: 'https://acme.example/jobs/1', status: 'pending', match_score: 85, match_reason: 'Strong fit on backend experience.' },
    { id: 'f2', company_id: 'c1', title: 'Sales Intern', location: 'Remote', job_url: 'https://acme.example/jobs/2', status: 'pending', match_score: 30, match_reason: 'Entry-level, not a fit.' },
  ]
  invoke.mockResolvedValue({ data: { checked_companies: 1, new_finds: 2, errors: [] }, error: null })
  supabase.from.mockImplementation(table => chainFor(table))
})

describe('JobFinds', () => {
  it('renders pending finds with company name and score', async () => {
    render(<JobFinds session={mockSession} />)
    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument()
    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument()
    expect(screen.getByText('85 match')).toBeInTheDocument()
  })

  it('hides low-scoring finds by default and reveals them via the toggle', async () => {
    render(<JobFinds session={mockSession} />)
    await screen.findByText('Backend Engineer')
    expect(screen.queryByText('Sales Intern')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /show low-scoring finds/i }))
    expect(await screen.findByText('Sales Intern')).toBeInTheDocument()
  })

  it('calls the refresh edge function and shows a summary', async () => {
    render(<JobFinds session={mockSession} />)
    await screen.findByText('Backend Engineer')
    await userEvent.click(screen.getByRole('button', { name: /refresh jobs/i }))
    expect(invoke).toHaveBeenCalledWith('refresh-company-jobs', { body: {} })
    expect(await screen.findByText(/Checked 1 company, found 2 new postings/)).toBeInTheDocument()
  })

  it('adds a find to jobs and removes it from the list', async () => {
    render(<JobFinds session={mockSession} />)
    await screen.findByText('Backend Engineer')
    await userEvent.click(screen.getAllByRole('button', { name: /add to jobs/i })[0])
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
  })

  it('dismisses a find and removes it from the list', async () => {
    render(<JobFinds session={mockSession} />)
    await screen.findByText('Backend Engineer')
    await userEvent.click(screen.getByRole('button', { name: /dismiss backend engineer/i }))
    expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
  })
})

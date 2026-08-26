import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import JobsList from './JobsList'

const mockSession = { user: { id: 'user-123' } }

const mockCompanies = [{ id: 'c1', name: 'Acme Corp' }]
const mockJobs = [
  { id: 'j1', title: 'Staff Engineer', company_id: 'c1', location: 'Remote', job_url: '', source: 'linkedin', description: '', status: 'saved', applied_at: null, created_at: '2026-01-01' },
]

vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))
import { supabase } from '../supabase'

function chainFor(table) {
  if (table === 'companies') {
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockCompanies }),
    }
  }
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockJobs }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 'j2', title: 'New Job', company_id: null, location: '', job_url: '', source: 'linkedin', description: '', status: 'saved', applied_at: null, created_at: '2026-01-02' },
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  supabase.from.mockImplementation(table => chainFor(table))
})

describe('JobsList', () => {
  it('renders fetched jobs with company name', async () => {
    render(<JobsList session={mockSession} />)
    expect(await screen.findByText('Staff Engineer')).toBeInTheDocument()
    expect(screen.getByText(/Acme Corp · Remote/)).toBeInTheDocument()
  })

  it('adds a new job when form submitted', async () => {
    render(<JobsList session={mockSession} />)
    await screen.findByText('Staff Engineer')
    await userEvent.type(screen.getByPlaceholderText(/job title/i), 'New Job')
    await userEvent.click(screen.getByRole('button', { name: /add job/i }))
    expect(await screen.findByText('New Job')).toBeInTheDocument()
  })

  it('filters jobs by status', async () => {
    render(<JobsList session={mockSession} />)
    await screen.findByText('Staff Engineer')
    await userEvent.selectOptions(screen.getByDisplayValue('All statuses'), 'applied')
    expect(screen.queryByText('Staff Engineer')).not.toBeInTheDocument()
  })
})

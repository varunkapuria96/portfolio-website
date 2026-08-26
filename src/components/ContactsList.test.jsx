import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ContactsList from './ContactsList'

const mockSession = { user: { id: 'user-123' } }

const mockCompanies = [{ id: 'c1', name: 'Acme Corp' }]
const mockJobs = [{ id: 'j1', title: 'Staff Engineer', company_id: 'c1' }]
const mockContacts = [
  {
    id: 'p1', name: 'Jane Recruiter', company_id: 'c1', job_id: 'j1', role_title: 'Recruiter',
    linkedin_url: 'https://linkedin.com/in/jane', email: '', outreach_status: 'not_contacted',
    notes: '', last_contacted_at: null, created_at: '2026-01-01',
  },
]

vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))
import { supabase } from '../supabase'

function chainFor(table) {
  if (table === 'companies') {
    return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: mockCompanies }) }
  }
  if (table === 'jobs') {
    return { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: mockJobs }) }
  }
  let lastPatch = {}
  const c = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: mockContacts }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn(patch => { lastPatch = patch; return c }),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve({
      data: { ...mockContacts[0], ...lastPatch, id: 'p2', name: lastPatch.name || 'New Contact' },
    })),
  }
  return c
}

beforeEach(() => {
  vi.clearAllMocks()
  supabase.from.mockImplementation(table => chainFor(table))
})

describe('ContactsList', () => {
  it('renders fetched contacts with company and job', async () => {
    render(<ContactsList session={mockSession} />)
    expect(await screen.findByText('Jane Recruiter')).toBeInTheDocument()
    expect(screen.getByText(/Recruiter · Acme Corp · Staff Engineer/)).toBeInTheDocument()
  })

  it('adds a new contact when form submitted', async () => {
    render(<ContactsList session={mockSession} />)
    await screen.findByText('Jane Recruiter')
    await userEvent.type(screen.getByPlaceholderText(/^name$/i), 'New Contact')
    await userEvent.click(screen.getByRole('button', { name: /add contact/i }))
    expect(await screen.findByText('New Contact')).toBeInTheDocument()
  })

  it('marks a contact as contacted today', async () => {
    render(<ContactsList session={mockSession} />)
    await screen.findByText('Jane Recruiter')
    await userEvent.click(screen.getByRole('button', { name: /mark contacted today/i }))
    expect(await screen.findByText(/Last contacted/)).toBeInTheDocument()
  })
})

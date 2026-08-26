import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ResumeSettings from './ResumeSettings'

const mockSession = { user: { id: 'user-123' } }

const invoke = vi.fn()

vi.mock('../supabase', () => ({ supabase: { from: vi.fn(), functions: { invoke: (...args) => invoke(...args) } } }))
import { supabase } from '../supabase'

function chain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { filename: 'resume.pdf', updated_at: '2026-01-01T00:00:00.000Z', location_preference: null },
      error: null,
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  supabase.from.mockImplementation(() => chain())
  invoke.mockImplementation((name) => {
    if (name === 'parse-resume') return Promise.resolve({ data: { resume_text: 'Extracted resume text' }, error: null })
    if (name === 'refresh-company-jobs') return Promise.resolve({ data: { rescored: 2 }, error: null })
    return Promise.resolve({ data: null, error: null })
  })
})

describe('ResumeSettings', () => {
  it('shows no resume uploaded when none exists', async () => {
    render(<ResumeSettings session={mockSession} />)
    expect(await screen.findByText('No resume uploaded yet.')).toBeInTheDocument()
  })

  it('uploads a PDF, parses it, shows the saved resume, and triggers a rescore', async () => {
    render(<ResumeSettings session={mockSession} />)
    await screen.findByText('No resume uploaded yet.')

    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, file)

    expect(await screen.findByText(/Resume on file:/)).toBeInTheDocument()
    expect(invoke).toHaveBeenCalledWith('parse-resume', expect.objectContaining({ body: expect.objectContaining({ filename: 'resume.pdf' }) }))
    expect(await screen.findByText('Rescored 2 finds.')).toBeInTheDocument()
    expect(invoke).toHaveBeenCalledWith('refresh-company-jobs', { body: { rescore_all: true } })
  })

  it('saves a location preference once a resume exists and triggers a rescore', async () => {
    render(<ResumeSettings session={mockSession} />)
    await screen.findByText('No resume uploaded yet.')

    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, file)
    await screen.findByText(/Resume on file:/)

    await userEvent.type(screen.getByPlaceholderText(/India, preferred city Mumbai/i), 'India, preferred city Mumbai')
    await userEvent.click(screen.getByRole('button', { name: /save preference/i }))

    expect(invoke).toHaveBeenCalledWith('refresh-company-jobs', { body: { rescore_all: true } })
  })
})

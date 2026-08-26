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
    single: vi.fn().mockResolvedValue({
      data: { filename: 'resume.pdf', updated_at: '2026-01-01T00:00:00.000Z' },
      error: null,
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  supabase.from.mockImplementation(() => chain())
  invoke.mockResolvedValue({ data: { resume_text: 'Extracted resume text' }, error: null })
})

describe('ResumeSettings', () => {
  it('shows no resume uploaded when none exists', async () => {
    render(<ResumeSettings session={mockSession} />)
    expect(await screen.findByText('No resume uploaded yet.')).toBeInTheDocument()
  })

  it('uploads a PDF, parses it, and shows the saved resume', async () => {
    render(<ResumeSettings session={mockSession} />)
    await screen.findByText('No resume uploaded yet.')

    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    const input = document.querySelector('input[type="file"]')
    await userEvent.upload(input, file)

    expect(await screen.findByText(/Resume on file:/)).toBeInTheDocument()
    expect(invoke).toHaveBeenCalledWith('parse-resume', expect.objectContaining({ body: expect.objectContaining({ filename: 'resume.pdf' }) }))
  })
})

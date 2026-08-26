import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import JobsApp from './JobsApp'

vi.mock('./JobsList', () => ({ default: () => <div>Jobs List</div> }))
vi.mock('./CompaniesList', () => ({ default: () => <div>Companies List</div> }))
vi.mock('./ContactsList', () => ({ default: () => <div>Contacts List</div> }))
vi.mock('./JobFinds', () => ({ default: () => <div>Job Finds</div> }))
vi.mock('./ResumeSettings', () => ({ default: () => <div>Resume Settings</div> }))

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 0 }),
    })),
  },
}))

const mockSession = { user: { id: 'u1' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('JobsApp', () => {
  it('shows Jobs List by default', () => {
    const { container } = render(<JobsApp session={mockSession} />)
    const content = container.querySelector('.bills-content')
    expect(within(content).getByText('Jobs List')).toBeInTheDocument()
  })

  it('switches to Companies tab', async () => {
    const { container } = render(<JobsApp session={mockSession} />)
    await userEvent.click(screen.getByRole('button', { name: /companies/i }))
    const content = container.querySelector('.bills-content')
    expect(within(content).getByText('Companies List')).toBeInTheDocument()
  })

  it('switches to People tab', async () => {
    const { container } = render(<JobsApp session={mockSession} />)
    await userEvent.click(screen.getByRole('button', { name: /people/i }))
    const content = container.querySelector('.bills-content')
    expect(within(content).getByText('Contacts List')).toBeInTheDocument()
  })

  it('switches to New Finds tab', async () => {
    const { container } = render(<JobsApp session={mockSession} />)
    await userEvent.click(screen.getByRole('button', { name: /new finds/i }))
    const content = container.querySelector('.bills-content')
    expect(within(content).getByText('Job Finds')).toBeInTheDocument()
  })

  it('switches to Resume tab', async () => {
    const { container } = render(<JobsApp session={mockSession} />)
    await userEvent.click(screen.getByRole('button', { name: /resume/i }))
    const content = container.querySelector('.bills-content')
    expect(within(content).getByText('Resume Settings')).toBeInTheDocument()
  })
})

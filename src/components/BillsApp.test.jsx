import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import BillsApp from './BillsApp'

vi.mock('./BillsList', () => ({ default: () => <div>Bills List</div> }))
vi.mock('./ManageRooms', () => ({ default: () => <div>Manage Rooms</div> }))
vi.mock('./ManageProducts', () => ({ default: () => <div>Manage Products</div> }))

const mockSession = { user: { id: 'u1' } }

describe('BillsApp', () => {
  it('shows Bills List by default', () => {
    const { container } = render(<BillsApp session={mockSession} />)
    const content = container.querySelector('.bills-content')
    expect(within(content).getByText('Bills List')).toBeInTheDocument()
  })

  it('switches to Manage Rooms tab', async () => {
    const { container } = render(<BillsApp session={mockSession} />)
    await userEvent.click(screen.getByRole('button', { name: /manage rooms/i }))
    const content = container.querySelector('.bills-content')
    expect(within(content).getByText('Manage Rooms')).toBeInTheDocument()
  })

  it('switches to Manage Products tab', async () => {
    const { container } = render(<BillsApp session={mockSession} />)
    await userEvent.click(screen.getByRole('button', { name: /manage products/i }))
    const content = container.querySelector('.bills-content')
    expect(within(content).getByText('Manage Products')).toBeInTheDocument()
  })
})

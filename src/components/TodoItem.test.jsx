import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import TodoItem from './TodoItem'

const mockTodo = { id: '1', text: 'Buy milk', completed: false }

describe('TodoItem', () => {
  it('renders the todo text', () => {
    render(<TodoItem todo={mockTodo} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })

  it('renders an unchecked checkbox when not completed', () => {
    render(<TodoItem todo={mockTodo} onToggle={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('renders a checked checkbox when completed', () => {
    render(
      <TodoItem
        todo={{ ...mockTodo, completed: true }}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    expect(screen.getByRole('checkbox')).toBeChecked()
  })

  it('calls onToggle with id and new value when checkbox clicked', async () => {
    const onToggle = vi.fn()
    render(<TodoItem todo={mockTodo} onToggle={onToggle} onDelete={vi.fn()} />)
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onToggle).toHaveBeenCalledWith('1', true)
  })

  it('calls onDelete with id when delete button clicked', async () => {
    const onDelete = vi.fn()
    render(<TodoItem todo={mockTodo} onToggle={vi.fn()} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('strikes through text when completed', () => {
    render(
      <TodoItem
        todo={{ ...mockTodo, completed: true }}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    )
    const span = screen.getByText('Buy milk')
    expect(span).toHaveStyle({ textDecoration: 'line-through' })
  })
})

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import BillImportModal from './BillImportModal'

const sampleRooms = [
  {
    name: 'Living Room',
    items: [
      { product_name: 'Roman Blind', quantity: 3, unit: 'sqft', price: 850, matched: true },
      { product_name: 'blackout lining', quantity: 2, unit: '', price: 0, matched: false },
    ],
  },
]

describe('BillImportModal', () => {
  it('shows spinner and disabled Add button in loading state', () => {
    render(
      <BillImportModal
        status="loading"
        extractedRooms={[]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByText('Reading your note…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add to bill/i })).toBeDisabled()
  })

  it('shows error message and retry button in error state', async () => {
    const onRetry = vi.fn()
    render(
      <BillImportModal
        status="error"
        extractedRooms={[]}
        errorMessage="Couldn't read this image — try a clearer photo"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={onRetry}
      />
    )
    expect(screen.getByText("Couldn't read this image — try a clearer photo")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('renders room name and item names in review state', () => {
    render(
      <BillImportModal
        status="review"
        extractedRooms={sampleRooms}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('Living Room')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Roman Blind')).toBeInTheDocument()
    expect(screen.getByDisplayValue('blackout lining')).toBeInTheDocument()
  })

  it('applies unmatched class to items not in availableProducts', () => {
    render(
      <BillImportModal
        status="review"
        extractedRooms={sampleRooms}
        availableProducts={[{ id: 'p1', name: 'Roman Blind', unit: 'sqft', price: 850 }]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByDisplayValue('blackout lining')).toHaveClass('unmatched')
    expect(screen.getByDisplayValue('Roman Blind')).not.toHaveClass('unmatched')
  })

  it('calls onConfirm with current rooms when Add to Bill is clicked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <BillImportModal
        status="review"
        extractedRooms={sampleRooms}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /add to bill/i }))
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Living Room' }),
      ])
    )
  })

  it('passes edited room name to onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(
      <BillImportModal
        status="review"
        extractedRooms={sampleRooms}
        onConfirm={onConfirm}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    const roomInput = screen.getByDisplayValue('Living Room')
    await userEvent.clear(roomInput)
    await userEvent.type(roomInput, 'Master Bedroom')
    await userEvent.click(screen.getByRole('button', { name: /add to bill/i }))
    expect(onConfirm).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ name: 'Master Bedroom' })])
    )
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(
      <BillImportModal
        status="review"
        extractedRooms={sampleRooms}
        onConfirm={vi.fn()}
        onClose={onClose}
        onRetry={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows no-rooms message when review has empty rooms array', () => {
    render(
      <BillImportModal
        status="review"
        extractedRooms={[]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByText(/no rooms found/i)).toBeInTheDocument()
  })

  it('shows custom loadingMessage when provided', () => {
    render(
      <BillImportModal
        status="loading"
        extractedRooms={[]}
        loadingMessage="Reading image 2 of 3…"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByText('Reading image 2 of 3…')).toBeInTheDocument()
    expect(screen.queryByText('Reading your note…')).not.toBeInTheDocument()
  })

  it('falls back to default loading text when loadingMessage is not provided', () => {
    render(
      <BillImportModal
        status="loading"
        extractedRooms={[]}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByText('Reading your note…')).toBeInTheDocument()
  })

  it('shows warning banner in review state when warningMessage is provided', () => {
    render(
      <BillImportModal
        status="review"
        extractedRooms={sampleRooms}
        warningMessage="1 of 2 images couldn't be read — rooms below are from the others"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.getByText(/1 of 2 images couldn't be read/)).toBeInTheDocument()
  })

  it('does not show warningMessage when review has no rooms', () => {
    render(
      <BillImportModal
        status="review"
        extractedRooms={[]}
        warningMessage="Something failed"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
        onRetry={vi.fn()}
      />
    )
    expect(screen.queryByText('Something failed')).not.toBeInTheDocument()
  })
})

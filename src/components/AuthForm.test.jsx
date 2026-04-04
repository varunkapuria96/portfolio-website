import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AuthForm from './AuthForm'

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(() => ({ error: null })),
      signUp: vi.fn(() => ({ error: null })),
    },
  },
}))

import { supabase } from '../supabase'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthForm', () => {
  it('renders sign in mode by default', () => {
    render(<AuthForm />)
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /need an account/i })).toBeInTheDocument()
  })

  it('toggles to sign up mode when toggle button clicked', async () => {
    render(<AuthForm />)
    await userEvent.click(screen.getByRole('button', { name: /need an account/i }))
    expect(screen.getByRole('button', { name: /^sign up$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /have an account/i })).toBeInTheDocument()
  })

  it('calls signInWithPassword with email and password on sign in submit', async () => {
    render(<AuthForm />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    })
  })

  it('calls signUp with email and password on sign up submit', async () => {
    render(<AuthForm />)
    await userEvent.click(screen.getByRole('button', { name: /need an account/i }))
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /^sign up$/i }))
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'secret123',
    })
  })

  it('displays error message when auth fails', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    })
    render(<AuthForm />)
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'bad@example.com')
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App, { TodoRoute } from './App'

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

test('renders Nav and Portfolio at default route', () => {
  render(<App />)
  expect(screen.getByText('VK')).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Varun')
})

test('TodoRoute renders nothing while session is loading', async () => {
  const { supabase } = await import('./supabase')
  supabase.auth.getSession.mockImplementationOnce(() => new Promise(() => {}))
  const { container } = render(
    <MemoryRouter>
      <TodoRoute />
    </MemoryRouter>
  )
  expect(container).toBeEmptyDOMElement()
})

test('TodoRoute renders AuthForm when not logged in', async () => {
  render(
    <MemoryRouter>
      <TodoRoute />
    </MemoryRouter>
  )
  // After getSession resolves with null session, AuthForm should appear
  expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument()
})

test('TodoRoute unsubscribes on unmount', async () => {
  const unsubscribe = vi.fn()
  const { supabase } = await import('./supabase')
  supabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe } },
  })

  const { unmount } = render(
    <MemoryRouter>
      <TodoRoute />
    </MemoryRouter>
  )
  unmount()
  expect(unsubscribe).toHaveBeenCalled()
})

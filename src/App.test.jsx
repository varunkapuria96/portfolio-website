import { render, screen } from '@testing-library/react'
import App from './App'

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
  // Nav logo
  expect(screen.getByText('VK')).toBeInTheDocument()
  // Hero heading
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Varun')
})

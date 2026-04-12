import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Nav from './Nav'

function renderNav(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Nav />
    </MemoryRouter>
  )
}

test('renders VK. logo', () => {
  renderNav()
  expect(screen.getByText('VK')).toBeInTheDocument()
})

test('renders home link', () => {
  renderNav()
  expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument()
})

test('renders projects link', () => {
  renderNav()
  expect(screen.getByRole('link', { name: /^projects$/i })).toBeInTheDocument()
})

test('home link has active class on /', () => {
  renderNav('/')
  expect(screen.getByRole('link', { name: /^home$/i })).toHaveClass('active')
})

test('home link does not have active class on /projects/todo', () => {
  renderNav('/projects/todo')
  expect(screen.getByRole('link', { name: /^home$/i })).not.toHaveClass('active')
})

test('renders email contact link', () => {
  renderNav()
  expect(screen.getByRole('link', { name: /varunkapuria@arizona\.edu/i })).toBeInTheDocument()
})

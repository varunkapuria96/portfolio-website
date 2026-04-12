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

test('renders VK. logo as a link to /', () => {
  renderNav()
  const logo = screen.getByRole('link', { name: /vk/i })
  expect(logo).toBeInTheDocument()
  expect(logo).toHaveAttribute('href', '/')
})

test('renders home link', () => {
  renderNav()
  expect(screen.getByRole('link', { name: /^home$/i })).toBeInTheDocument()
})

test('renders projects link to experiments section', () => {
  renderNav()
  const link = screen.getByRole('link', { name: /^projects$/i })
  expect(link).toBeInTheDocument()
  expect(link).toHaveAttribute('href', '/#experiments')
})

test('home link has active class on /', () => {
  renderNav('/')
  expect(screen.getByRole('link', { name: /^home$/i })).toHaveClass('active')
})

test('home link does not have active class on /projects/todo', () => {
  renderNav('/projects/todo')
  expect(screen.getByRole('link', { name: /^home$/i })).not.toHaveClass('active')
})

test('renders email contact link with mailto href', () => {
  renderNav()
  const link = screen.getByRole('link', { name: /varunkapuria@arizona\.edu/i })
  expect(link).toBeInTheDocument()
  expect(link).toHaveAttribute('href', 'mailto:varunkapuria@arizona.edu')
})

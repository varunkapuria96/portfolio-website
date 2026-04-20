import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Portfolio from './Portfolio'

function renderPortfolio() {
  return render(
    <MemoryRouter>
      <Portfolio />
    </MemoryRouter>
  )
}

test('renders name in hero heading', () => {
  renderPortfolio()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Varun')
})

test('renders GitHub link with correct href', () => {
  renderPortfolio()
  expect(screen.getByRole('link', { name: /github/i })).toHaveAttribute(
    'href',
    'https://github.com/varunkapuria96'
  )
})

test('renders LinkedIn link with correct href', () => {
  renderPortfolio()
  const link = screen.getByRole('link', { name: /linkedin/i })
  expect(link).toBeInTheDocument()
  expect(link).toHaveAttribute('href', 'https://www.linkedin.com/in/varun-kapuria/')
})

test('renders all 6 project cards', () => {
  renderPortfolio()
  expect(screen.getByText('Todo App')).toBeInTheDocument()
  expect(screen.getByText('BTC Prediction')).toBeInTheDocument()
  expect(screen.getByText('CNN Image Classifier')).toBeInTheDocument()
  expect(screen.getByText('Employee Attrition')).toBeInTheDocument()
  expect(screen.getByText('Retail Website + SQL')).toBeInTheDocument()
  expect(screen.getByText('ETL Warehouse')).toBeInTheDocument()
})

test('Todo App card has LIVE badge', () => {
  renderPortfolio()
  expect(screen.getByText('LIVE')).toBeInTheDocument()
})

test('Todo App card links to /projects/todo', () => {
  renderPortfolio()
  const todoLink = screen.getByRole('link', { name: /todo app/i })
  expect(todoLink).toHaveAttribute('href', '/projects/todo')
})

test('non-live cards link to GitHub externally', () => {
  renderPortfolio()
  const btcLink = screen.getByRole('link', { name: /btc prediction/i })
  expect(btcLink).toHaveAttribute(
    'href',
    'https://github.com/varunkapuria96/btcprediction'
  )
  expect(btcLink).toHaveAttribute('target', '_blank')
})

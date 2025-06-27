import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
}

// Global test utilities
global.fetch = jest.fn()

// Suppress console.log in tests unless explicitly needed
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  console.log = jest.fn()
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterEach(() => {
  console.log = originalConsoleLog
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
  jest.clearAllMocks()
})
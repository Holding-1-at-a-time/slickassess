import { jest } from "@jest/globals"

// Mock Convex client
jest.mock("convex/browser", () => ({
  ConvexHttpClient: jest.fn(() => ({
    query: jest.fn(),
    mutation: jest.fn(),
  })),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_CONVEX_URL = "https://test.convex.cloud"
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"

// Global test timeout
jest.setTimeout(10000)

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

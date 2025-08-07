import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Text encoding/decoding for Node.js environment
;(global as any).TextEncoder = TextEncoder
;(global as any).TextDecoder = TextDecoder

// Request/Response polyfills for Next.js API routes
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    url: string
    method: string
    headers: Headers
    private _body: any

    constructor(input: string | Request, init?: RequestInit) {
      if (typeof input === 'string') {
        this.url = input
      } else {
        this.url = input.url
      }
      this.method = init?.method || 'GET'
      this.headers = new Headers(init?.headers)
      this._body = init?.body
    }

    async json() {
      if (typeof this._body === 'string') {
        return JSON.parse(this._body)
      }
      return this._body
    }

    async text() {
      if (typeof this._body === 'string') {
        return this._body
      }
      return JSON.stringify(this._body)
    }
  } as any
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    body: any
    status: number
    statusText: string
    headers: Headers

    constructor(body?: any, init?: ResponseInit) {
      this.body = body
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.headers = new Headers(init?.headers)
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body)
      }
      return this.body
    }

    async text() {
      if (typeof this.body === 'string') {
        return this.body
      }
      return JSON.stringify(this.body)
    }
  } as any
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    private headers: Map<string, string>

    constructor(init?: HeadersInit) {
      this.headers = new Map()
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => {
            this.headers.set(key.toLowerCase(), value)
          })
        } else if (init instanceof Headers) {
          init.forEach((value, key) => {
            this.headers.set(key.toLowerCase(), value)
          })
        } else {
          Object.entries(init).forEach(([key, value]) => {
            this.headers.set(key.toLowerCase(), value)
          })
        }
      }
    }

    get(key: string) {
      return this.headers.get(key.toLowerCase()) || null
    }

    set(key: string, value: string) {
      this.headers.set(key.toLowerCase(), value)
    }

    forEach(callback: (value: string, key: string) => void) {
      this.headers.forEach(callback)
    }
  } as any
}

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
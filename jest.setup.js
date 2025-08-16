import '@testing-library/jest-dom'
const { TextEncoder, TextDecoder } = require('util')

// Text encoding/decoding for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Request/Response polyfills for Next.js API routes
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
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
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
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
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
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

    get(key) {
      return this.headers.get(key.toLowerCase()) || null
    }

    set(key, value) {
      this.headers.set(key.toLowerCase(), value)
    }

    forEach(callback) {
      this.headers.forEach(callback)
    }
  }
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

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => {
      const response = new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers || {}),
        },
      })
      return response
    },
    redirect: (url, init) => {
      return new Response(null, {
        ...init,
        status: 307,
        headers: {
          Location: url.toString(),
          ...(init?.headers || {}),
        },
      })
    },
  },
  NextRequest: class NextRequest extends Request {},
}))

// Mock window.matchMedia only in jsdom environment
if (typeof window !== 'undefined') {
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
  });
}

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
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
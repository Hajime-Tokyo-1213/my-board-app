import { NextRequest, NextResponse } from 'next/server';

export function createMockNextRequest(url: string, options: RequestInit = {}): NextRequest {
  // Create a basic Request object
  const request = new Request(url, options);
  
  // Add NextRequest specific properties
  return Object.assign(request, {
    nextUrl: new URL(url),
    cookies: {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    },
    geo: {},
    ip: '127.0.0.1',
  }) as unknown as NextRequest;
}

export { NextResponse };

// Helper to create API test context
export function createApiContext(method: string = 'GET', body?: any) {
  const url = 'http://localhost:3000/api/test';
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  return createMockNextRequest(url, options);
}
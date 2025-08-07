import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '@/theme/theme';

// Mock providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Test data generators
export const generatePost = (overrides = {}) => ({
  _id: Math.random().toString(36).substr(2, 9),
  content: 'Test post content',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const generatePosts = (count: number, overrides = {}) => {
  return Array.from({ length: count }, (_, i) => 
    generatePost({
      content: `Test post ${i + 1}`,
      ...overrides,
    })
  );
};

// Common test helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 100));
};

// Mock API responses
export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  });
};

export const mockApiError = (message = 'API Error', status = 500) => {
  return Promise.resolve({
    ok: false,
    status,
    json: async () => ({ error: message }),
  });
};
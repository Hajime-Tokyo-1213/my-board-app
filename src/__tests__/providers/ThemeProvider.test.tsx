import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/providers/ThemeProvider';

// Mock Next themes
jest.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }: any) => {
    return <div data-testid="theme-provider" {...props}>{children}</div>;
  },
}));

describe('ThemeProvider', () => {
  it('renders children correctly', () => {
    render(
      <ThemeProvider>
        <div data-testid="child-component">Test Child</div>
      </ThemeProvider>
    );

    expect(screen.getByTestId('child-component')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('passes correct props to next-themes ThemeProvider', () => {
    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );

    const themeProvider = screen.getByTestId('theme-provider');
    expect(themeProvider).toHaveAttribute('attribute', 'class');
    expect(themeProvider).toHaveAttribute('defaultTheme', 'system');
    expect(themeProvider).toHaveAttribute('enableSystem', 'true');
    expect(themeProvider).toHaveAttribute('disableTransitionOnChange', 'true');
  });

  it('renders multiple children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </ThemeProvider>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('preserves child component props', () => {
    const ChildComponent = ({ message }: { message: string }) => (
      <div data-testid="test-child">{message}</div>
    );

    render(
      <ThemeProvider>
        <ChildComponent message="Hello World" />
      </ThemeProvider>
    );

    expect(screen.getByTestId('test-child')).toHaveTextContent('Hello World');
  });
});
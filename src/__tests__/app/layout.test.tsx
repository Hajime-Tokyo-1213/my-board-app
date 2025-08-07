import React from 'react';
import { render, screen } from '@testing-library/react';
import RootLayout from '@/app/layout';
import { Metadata } from 'next';

// Mock ThemeProvider
jest.mock('@/providers/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// Mock fonts
jest.mock('next/font/google', () => ({
  Inter: jest.fn(() => ({
    className: 'inter-font-class',
  })),
}));

describe('RootLayout', () => {
  it('renders children within the layout structure', () => {
    render(
      <RootLayout>
        <div data-testid="child-content">Test Content</div>
      </RootLayout>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('wraps content with ThemeProvider', () => {
    render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    const themeProvider = screen.getByTestId('theme-provider');
    expect(themeProvider).toBeInTheDocument();
    expect(themeProvider).toContainHTML('<div>Test Content</div>');
  });

  it('applies correct html attributes', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    const htmlElement = container.querySelector('html');
    expect(htmlElement).toHaveAttribute('lang', 'ja');
    expect(htmlElement).toHaveAttribute('suppressHydrationWarning');
  });

  it('applies Inter font class to body', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    const bodyElement = container.querySelector('body');
    expect(bodyElement).toHaveClass('inter-font-class');
  });

  it('renders multiple children correctly', () => {
    render(
      <RootLayout>
        <header data-testid="header">Header</header>
        <main data-testid="main">Main Content</main>
        <footer data-testid="footer">Footer</footer>
      </RootLayout>
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });

  it('maintains semantic HTML structure', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    );

    expect(container.querySelector('html')).toBeInTheDocument();
    expect(container.querySelector('body')).toBeInTheDocument();
    expect(container.querySelector('html > body')).toBeInTheDocument();
  });
});

// Test metadata export separately
describe('Layout Metadata', () => {
  it('exports correct metadata', async () => {
    const layoutModule = await import('@/app/layout');
    const metadata = layoutModule.metadata as Metadata;

    expect(metadata.title).toBe('匿名掲示板');
    expect(metadata.description).toBe('みんなの掲示板');
  });
});
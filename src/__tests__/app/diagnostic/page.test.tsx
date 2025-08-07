import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DiagnosticPage from '@/app/diagnostic/page';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock environment variable
const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('DiagnosticPage', () => {
  it('renders the diagnostic page with all sections', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    
    render(<DiagnosticPage />);

    expect(screen.getByText('システム診断')).toBeInTheDocument();
    expect(screen.getByText('環境変数')).toBeInTheDocument();
    expect(screen.getByText('システム情報')).toBeInTheDocument();
    expect(screen.getByText('Next.js アプリケーション診断ページ')).toBeInTheDocument();
  });

  it('displays environment variables correctly', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.NODE_ENV = 'test';
    
    render(<DiagnosticPage />);

    expect(screen.getByText('NODE_ENV:')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('masks MONGODB_URI when present', () => {
    process.env.MONGODB_URI = 'mongodb://user:password@localhost:27017/test';
    
    render(<DiagnosticPage />);

    expect(screen.getByText('MONGODB_URI:')).toBeInTheDocument();
    expect(screen.getByText('[設定済み]')).toBeInTheDocument();
    expect(screen.queryByText('mongodb://user:password@localhost:27017/test')).not.toBeInTheDocument();
  });

  it('shows not set for missing MONGODB_URI', () => {
    delete process.env.MONGODB_URI;
    
    render(<DiagnosticPage />);

    expect(screen.getByText('MONGODB_URI:')).toBeInTheDocument();
    expect(screen.getByText('[未設定]')).toBeInTheDocument();
  });

  it('displays system information', () => {
    render(<DiagnosticPage />);

    expect(screen.getByText(/Platform:/)).toBeInTheDocument();
    expect(screen.getByText(/Node Version:/)).toBeInTheDocument();
    expect(screen.getByText(/Current Time:/)).toBeInTheDocument();
  });

  it('updates time when refresh button is clicked', async () => {
    render(<DiagnosticPage />);

    const initialTime = screen.getByText(/Current Time:/).textContent;
    
    // Wait a bit to ensure time difference
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const refreshButton = screen.getByText('時刻を更新');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      const updatedTime = screen.getByText(/Current Time:/).textContent;
      expect(updatedTime).not.toBe(initialTime);
    });
  });

  it('renders all card components with proper styling', () => {
    render(<DiagnosticPage />);

    const cards = screen.getAllByRole('region');
    expect(cards.length).toBeGreaterThan(0);
    
    cards.forEach(card => {
      expect(card).toHaveClass('MuiPaper-root');
    });
  });

  it('displays Next.js logo', () => {
    render(<DiagnosticPage />);

    const logo = screen.getByAltText('Next.js Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/next.svg');
  });

  it('handles multiple environment variables', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    process.env.NODE_ENV = 'test';
    process.env.CUSTOM_VAR = 'custom-value';
    
    render(<DiagnosticPage />);

    const envSection = screen.getByText('環境変数').closest('div');
    expect(envSection).toBeInTheDocument();
    
    // Should display all env vars that start with standard prefixes
    expect(screen.getByText('NODE_ENV:')).toBeInTheDocument();
    expect(screen.getByText('MONGODB_URI:')).toBeInTheDocument();
  });

  it('uses Material-UI components correctly', () => {
    render(<DiagnosticPage />);

    // Check for Material-UI Grid v2 usage
    const container = screen.getByText('システム診断').closest('div');
    expect(container?.querySelector('.MuiGrid2-root')).toBeInTheDocument();
  });
});
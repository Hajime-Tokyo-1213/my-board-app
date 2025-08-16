import React from 'react';
import { render, screen } from '@testing-library/react';
import DiagnosticPage from '@/app/diagnostic/page';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

// Mock window.matchMedia for useMediaQuery hook
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

describe('DiagnosticPage', () => {
  beforeEach(() => {
    // Mock window properties
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
    Object.defineProperty(window, 'devicePixelRatio', { writable: true, configurable: true, value: 1 });
    Object.defineProperty(navigator, 'userAgent', { writable: true, configurable: true, value: 'Test Agent' });
  });

  it('renders the main title', () => {
    renderWithTheme(<DiagnosticPage />);
    expect(screen.getByText('画面診断ツール')).toBeInTheDocument();
  });

  it('renders all diagnostic cards', () => {
    renderWithTheme(<DiagnosticPage />);
    expect(screen.getByText('スクリーン情報')).toBeInTheDocument();
    expect(screen.getByText('Material UI 状態')).toBeInTheDocument();
    expect(screen.getByText('レスポンシブデザインテスト')).toBeInTheDocument();
    expect(screen.getByText('コンポーネントテスト')).toBeInTheDocument();
    expect(screen.getByText('パフォーマンス情報')).toBeInTheDocument();
    expect(screen.getByText('検出された問題と推奨事項')).toBeInTheDocument();
  });

  it('displays correct screen information', () => {
    renderWithTheme(<DiagnosticPage />);
    expect(screen.getByText(/画面幅: 1024px/)).toBeInTheDocument();
    expect(screen.getByText(/画面高さ: 768px/)).toBeInTheDocument();
    expect(screen.getByText(/デバイスピクセル比: 1/)).toBeInTheDocument();
  });

  it('displays Material UI status', () => {
    renderWithTheme(<DiagnosticPage />);
    expect(screen.getByText('テーマプロバイダー')).toBeInTheDocument();
    expect(screen.getByText('ライトモード')).toBeInTheDocument();
    expect(screen.getByText(/プライマリーカラー:/)).toBeInTheDocument();
  });

  it('renders the component test section with MUI components', () => {
    renderWithTheme(<DiagnosticPage />);
    expect(screen.getByRole('button', { name: 'Primary Button' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outlined Button' })).toBeInTheDocument();
    expect(screen.getByText('Success Alert')).toBeInTheDocument();
    expect(screen.getByText('Warning Alert')).toBeInTheDocument();
  });
  
  it('shows performance information availability message', () => {
    // Mock performance object without memory property
    Object.defineProperty(global, 'performance', {
      writable: true,
      value: { timing: {} },
    });
    renderWithTheme(<DiagnosticPage />);
    expect(screen.getByText('パフォーマンス情報は Chrome でのみ利用可能です')).toBeInTheDocument();
  });
});
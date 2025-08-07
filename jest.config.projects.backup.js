const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

// 共通設定
const commonConfig = {
  moduleNameMapper: {
    '^@/models/(.*)$': '<rootDir>/src/models/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(mongodb|bson)/)',
  ],
  setupFiles: ['<rootDir>/jest.env.js'],
}

// プロジェクト設定
const customJestConfig = {
  coverageProvider: 'v8',
  testTimeout: 10000,
  maxWorkers: '50%',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!app/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!app/layout.tsx',
    '!app/globals.css',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 50,
      statements: 50,
    },
  },
  projects: [
    {
      displayName: 'dom',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/**/*.test.{ts,tsx}',
        '<rootDir>/src/__tests__/**/*.{ts,tsx}',
        '!<rootDir>/src/**/*.api.test.{ts,tsx}',
        '!<rootDir>/src/**/*.route.test.{ts,tsx}',
        '!<rootDir>/src/__tests__/api-routes/**/*.{ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      ...commonConfig,
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/**/*.api.test.{ts,tsx}',
        '<rootDir>/src/**/*.route.test.{ts,tsx}',
        '<rootDir>/src/__tests__/api-routes/**/*.{ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.api.ts'],
      ...commonConfig,
    }
  ]
}

module.exports = createJestConfig(customJestConfig)
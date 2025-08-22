const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

// ベースとなる設定
const baseConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/models/(.*)$': '<rootDir>/models/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/e2e/'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  maxWorkers: '50%',
  setupFiles: ['<rootDir>/jest.env.js'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!app/**/*.d.ts',
    '!app/layout.tsx',
    '!app/globals.css',
    '!**/__tests__/**',
    '!**/*.test.{ts,tsx}',
    '!**/*.spec.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
};

const jestConfig = async () => {
  const nextJestConfig = await createJestConfig(baseConfig)();

  return {
    ...nextJestConfig,
    projects: [
      {
        ...nextJestConfig,
        displayName: 'jsdom',
        testEnvironment: 'jsdom',
        testMatch: [
          '**/__tests__/**/*.test.tsx',
          '**/__tests__/app/**/*.test.tsx',
          '**/__tests__/components/**/*.test.tsx',
        ],
        transform: nextJestConfig.transform,
      },
      {
        ...nextJestConfig,
        displayName: 'node',
        testEnvironment: 'node',
        testMatch: [
          '**/__tests__/**/*.test.ts',
          '**/__tests__/api/**/*.test.ts',
          '**/__tests__/api-routes/**/*.test.ts',
          '**/__tests__/lib/**/*.test.ts',
          '**/__tests__/models/**/*.test.ts',
        ],
        transform: nextJestConfig.transform,
      },
    ],
  };
};

module.exports = jestConfig;
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.config.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json', 'html', 'lcov'],
  testTimeout: 30000, // LLM calls can be slow
  testMatch: ['**/tests/**/*.test.ts'],
};

export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleNameMapper: {
      '\\.(css|less|sass|scss)$': '<rootDir>/__mocks__/styleMock.js',
    },
    transform: {
      '^.+\\.(ts|tsx)$': ['ts-jest', { 
         tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            module: 'commonjs',
            verbatimModuleSyntax: false
         } 
      }],
    },
};

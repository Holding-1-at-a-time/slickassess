module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  collectCoverageFrom: ["lib/**/*.ts", "convex/**/*.ts", "!**/*.d.ts", "!**/node_modules/**"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  moduleNameMapping: {
    "^@/(.*)$": "<rootDir>/$1",
  },
}

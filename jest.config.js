export default {
  testEnvironment: "jest-environment-jsdom",
  transform: {},
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  testMatch: ["<rootDir>/tests/**/*.test.js"],
};

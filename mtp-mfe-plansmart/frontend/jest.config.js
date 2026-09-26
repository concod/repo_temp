const path = require("path");

module.exports = {
  collectCoverage: true, // Enable coverage collection
  coverageDirectory: "coverage", // Directory where coverage reports will be saved
  collectCoverageFrom: [
    "src/**/*.{js,jsx}", // Include your source files for coverage
    "!src/**/*.test.{js,jsx}", // Exclude test files from coverage
    "!src/index.js", // Exclude index files if not needed
    "!src/serviceWorker.js" // Exclude service worker files if any
  ],
  coverageReporters: ["text", "lcov"], // Set reporters: text for console, lcov for HTML
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testTimeout: 20000,
  testEnvironment: "jsdom",
  moduleDirectories: [
    path.resolve(__dirname, "./src"), // Adjust this path as necessary
    path.resolve(__dirname, "./src/core"),
    "node_modules"
  ],
  moduleNameMapper: {
    "\\.(css|less|sass|scss)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)$":
      "<rootDir>/__mocks__/fileMock.js",
    "^process$": "process/browser",
    "^config$": path.resolve(__dirname, "./src/config/"),
    "^actions$": path.resolve(__dirname, "./src/core/actions/"),
    "^assets$": path.resolve(__dirname, "./src/assets"),
    "^modules$": path.resolve(__dirname, "./src/modules"),
    "^Styles$": path.resolve(__dirname, "./src/core/Styles"),
    "^store$": path.resolve(__dirname, "./src/store"),
    "^posthog$": path.resolve(__dirname, "./src/core/posthog"),
    "^core$": path.resolve(__dirname, "./src/core"),
    "^auth$": path.resolve(__dirname, "./src/auth"),
    "^reducers$": path.resolve(__dirname, "./src/core/reducers"),
    // For handling static assets
    "\\.(css|less|scss|sass|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less|sass|scss)$": "identity-obj-proxy"
  },
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest"
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/src/core" // Exclude the 'core' directory from test execution
  ]
};

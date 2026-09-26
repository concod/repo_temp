const { defineConfig } = require("cypress");

module.exports = defineConfig({
  viewportHeight: 1080,
  viewportWidth: 1920,
  video: false,
  env: {
    arhaus_domain: "https://arhaus.devs.impactsmartsuite.com"
  },
  retries: {
    runMode: 1
  },
  reporter: "cypress-mochawesome-reporter",
  e2e: {
    baseUrl: "http://localhost:8080/home",
    specPattern: "cypress/e2e/**/*.{js,jsx,ts,tsx}",
    excludeSpecPattern: ["**/1-getting-started", "**/2-advanced-examples"],
    setupNodeEvents(on, config) {
      // implement node event listeners here
      require("cypress-mochawesome-reporter/plugin")(on);
    }
  }
});

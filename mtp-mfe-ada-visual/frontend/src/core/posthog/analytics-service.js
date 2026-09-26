import PostHog from "posthog-js";

class AnalyticsService {
  constructor(apiKey, options = {}) {
    this.initialize(apiKey, options);
  }

  async initialize(apiKey, options) {
    const apiSuccess = await this.checkApiHealth(apiKey, options);
    if (apiSuccess) {
      this.posthog = PostHog.init(apiKey, options);
    }
  }

  /**
   *
   * @returns boolean value through which we will get to know
   * we were able to hit the api successfully or not
   */
  async checkApiHealth(apiKey, options) {
    try {
      const userId = localStorage.getItem("name");
      const headers = {
        "Content-Type": "application/json",
      };
      const payload = {
        api_key: apiKey,
        event: "api_testing",
        distinct_id: userId,
      };
      // referred this doc: https://posthog.com/docs/api/capture for below code
      const response = await fetch(`${options.api_host}/capture`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      return true;
    } catch (error) {
      return false;
    }
  }

  capture(event, properties) {
    if (this.isProduction) {
      this.posthog.capture(event, properties);
    }
  }

  identify(userId, properties) {
    if (this.isProduction) {
      this.posthog.identify(userId, properties);
    }
  }

  trackPageView(path, userInfo) {
    if (this.isProduction) {
      if (userInfo) {
        this.identify(userInfo.userId, userInfo.properties);
      }
      this.capture("$pageview", { path });
    }
  }

  reset() {
    if (this.isProduction) {
      this.posthog.reset();
    }
  }

  // Add any other methods you need from the PostHog API
}

export default AnalyticsService;

import PostHog from "posthog-js";
class AnalyticsService {
  constructor(apiKey, options = {}) {
    this.posthog = PostHog.init(apiKey, options);
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

import PostHog from "posthog-js";

class AnalyticsService {
  constructor(apiKey, options = {}) {
    this.isProduction = options.isProduction ?? false;
    this.initialize(apiKey, options);
  }

  async initialize(apiKey, options) {
    if (!this.isProduction) return;
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
      await response.json();
      return true;
    } catch (error) {
      return false;
    }
  }

  capture(event, properties) {
    if (this.isProduction && this.posthog) {
      this.posthog.capture(event, properties);
    }
  }

  identify(userId, properties) {
    if (this.isProduction && this.posthog) {
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
    if (this.isProduction && this.posthog) {
      this.posthog.reset();
    }
  }

  startRecording() {
    if (this.isProduction && this.posthog?.sessionRecording) {
      this.posthog.startSessionRecording();
    }
  }

  stopRecording() {
    if (this.isProduction && this.posthog?.sessionRecording) {
      this.posthog.stopSessionRecording();
    }
  }

  getPostHogInstance() {
    return this.posthog;
  }
}

export default AnalyticsService;

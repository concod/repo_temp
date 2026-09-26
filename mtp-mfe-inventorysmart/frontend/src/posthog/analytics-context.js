import React from "react";
import AnalyticsService from "./analytics-service";
import posthogConfig from "./config";

const { apiKey, apiHost, isProduction } = posthogConfig();

const options = {
  api_host: apiHost,
  isProduction,
  loaded: (posthog) => {
    const userId = localStorage.getItem("name");
    if (userId) {
      posthog.identify(userId);
    }
  },
  autocapture: true,
  capture_pageview: false,
  capture_pageleave: true,
  disable_session_recording: false,
  session_recording: {
    maskAllInputs: false,
    maskTextSelector: null,
    recordCanvas: true,
    recordCrossOriginIframes: true,
  },
  enable_recording_console_log: true,
};

const AnalyticsContext = React.createContext(
  new AnalyticsService(apiKey, options)
);

export default AnalyticsContext;

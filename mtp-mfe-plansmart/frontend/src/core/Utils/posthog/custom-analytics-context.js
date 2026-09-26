import React from "react";
import TrackedEvents from "./tracked-event";
import authConfig from "auth/config";
import { POSTHOG_API, POSTHOG_KEY } from "config/api";

const api_key = authConfig?.posthog_key;
const apiKey = api_key ? api_key : POSTHOG_KEY;
const api_host = authConfig?.posthog_api;
const options = {
  api_host: api_host ? api_host : POSTHOG_API,
};

const AnalyticsContext = React.createContext(
  new TrackedEvents(apiKey, options)
);

export default AnalyticsContext;

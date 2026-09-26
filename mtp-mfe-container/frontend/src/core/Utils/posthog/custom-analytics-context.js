import React from "react";
import TrackedEvents from "./tracked-event";
import authConfig from "auth/config";
import { POSTHOG_API, POSTHOG_KEY } from "config/api";
import { TENANT_ENV } from "config/api";
// import authKey from "../../../api_key.json";

let authKey = {} // TO be removed after scripts are added for other products as well
  
const api_key = authKey?.[TENANT_ENV]?.posthog_key || authConfig?.posthog_key;
const apiKey = api_key ? api_key : POSTHOG_KEY;
const api_host = authKey?.[TENANT_ENV]?.posthog_api || authConfig?.posthog_api;
const options = {
  api_host: api_host ? api_host : POSTHOG_API,
};

const AnalyticsContext = React.createContext(
  new TrackedEvents(apiKey, options)
);

export default AnalyticsContext;

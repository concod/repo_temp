import { appEnv } from "../../../../config/appEnv";

const env = appEnv();

const baseUrl = {
  dev: "https://agentic-studio.uat.impact-agents.ai/",
  uat: "https://agentic-studio.uat.impact-agents.ai/",
  prod: "https://impact-agents.ai/",
  local: "https://agentic-studio.uat.impact-agents.ai/",
};


export const BASE_URL = baseUrl[env]
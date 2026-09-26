import type { IBAgentConfig } from "../types/chat.types";

// TODO: Revert to environment-based baseUrl selection when needed
import { appEnv } from "../../../../config/appEnv";
const env = appEnv();
const baseUrl = {
  dev: 'https://agentic-studio.devs.impact-agents.ai/',
  uat: 'https://agentic-studio.uat.impact-agents.ai/',
  prod: "https://impact-agents.ai/",
  local: "https://agentic-studio.devs.impact-agents.ai/",
};

const agentId = {
  dev: "cffd4251-a159-458f-b6b7-4280027dc344",
  uat: "b4e20e90-6979-44fc-9fbb-969c77fbe401",
  prod: "fa2b2f03-52f2-4e9e-b3d6-e4fc3c4199d9",
  local: "b4e20e90-6979-44fc-9fbb-969c77fbe401",
}

/** Agent ID used to classify query type (simple vs complex) for Deep Research status */
export const DEEP_RESEARCH_CLASSIFIER_AGENT_ID =
  "33e7ac34-4da8-4b22-9d5e-e81217716caa";

/** Agent ID used for deep research processing when manually enabled */
export const DEEP_RESEARCH_AGENT_ID =
  "dbb4df48-a01a-4fd8-ae4a-4d380f63442f";

export const ibAgentConfig: IBAgentConfig = {
  name: "ib-bi-agent",
  title: "Interstate Batteries AI Assistant",
  baseUrl: baseUrl[env],
  description: "Conversational BI assistant for Interstate Batteries.",
  publicRoute: "/apps/ib-bi-agent",
  agentId: agentId[env],
  apiKey: "IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR",
  apiEndpoint: "api/agent/execute",
};


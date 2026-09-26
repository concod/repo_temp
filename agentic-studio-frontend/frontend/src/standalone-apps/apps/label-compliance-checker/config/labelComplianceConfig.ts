import type { LabelComplianceAgentConfigInterface } from "../types/chat.types";
import { appEnv } from "../../../../config/appEnv";

const env = appEnv();
const agentId = {
  dev: "9a7c4e2f-1b63-4f89-ae2c-6d4a1b8f3c52",
  uat: "9a7c4e2f-1b63-4f89-ae2c-6d4a1b8f3c52", // to update later using a placeholder for now
  prod: "9a7c4e2f-1b63-4f89-ae2c-6d4a1b8f3c52",
  local: "9a7c4e2f-1b63-4f89-ae2c-6d4a1b8f3c52", //This is for local development : Change this according to the branch being tested
};
const baseUrl = {
  dev: "https://agentic-studio.devs.impact-agents.ai/",
  uat: "https://agentic-studio.uat.impact-agents.ai/",
  prod: "https://impact-agents.ai/",
  local: "https://agentic-studio.uat.impact-agents.ai/", //This is for local development : Change this according to the branch being tested
};

const toolsBaseUrl = {
  dev: "https://tools-universe.devs.impact-agents.ai",
  uat: "https://tools-universe.devs.impact-agents.ai",
  prod: "https://tools.impact-agents.ai",
  local: "https://tools-universe.devs.impact-agents.ai", //This is for local development : Change this according to the branch being tested
};

//Dev Config
export const labelComplianceAgentConfig: LabelComplianceAgentConfigInterface = {
  name: "label-compliance-agent",
  title: "AI Powered Label Compliance Checker",
  baseUrl: baseUrl[env],
  toolsBaseUrl: toolsBaseUrl[env],
  description:
    "AI assistant to help you retrieve or view a detailed summary of the label compliance of a product/image based on guidelines",
  publicRoute: "/apps/label-compliance-agent",
  agentId: agentId[env],
  apiKey: "IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR",
  apiEndpoint: "api/agent/image-extraction/execute",
};

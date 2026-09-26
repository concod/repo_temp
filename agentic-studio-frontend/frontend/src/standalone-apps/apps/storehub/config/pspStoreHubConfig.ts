import { appEnv } from "../../../../config/appEnv";
import type { PspStoreHubConfig } from "../types/chat.types";

const env = appEnv();
const agentId = {
  dev: "c4f2b9a1-8e3a-4d6b-9d12-7a8a0f3d5d91",
  uat: "c4f2b9a1-8e3a-4d6b-9d12-7a8a0f3d5d91",
  prod: "c4f2b9a1-8e3a-4d6b-9d12-7a8a0f3d5d91",
  local: "c4f2b9a1-8e3a-4d6b-9d12-7a8a0f3d5d91", //This is for local development : Change this according to the branch being tested
};
const baseUrl = {
  dev: "https://agentic-studio.devs.impact-agents.ai/",
  uat: "https://agentic-studio.uat.impact-agents.ai/",
  prod: "https://impact-agents.ai/",
  local: "https://agentic-studio.uat.impact-agents.ai/", //This is for local development : Change this according to the branch being tested
};

export const pspStoreHubConfig: PspStoreHubConfig = {
  name: "storehub",
  title: "AI Powered StoreHub Navigator",
  baseUrl: baseUrl[env],
  description:
    "Your AI assistant to help you navigate through informations in StoreHub management and operations.",
  publicRoute: "/apps/storehub",
  agentId: agentId[env],
  apiKey: "IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR",
  apiEndpoint: "api/agent/langgraph/execute",
};

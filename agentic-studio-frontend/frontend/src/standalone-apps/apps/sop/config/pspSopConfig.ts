import { appEnv } from "../../../../config/appEnv";
import type { PspSopConfig } from "../types/chat.types";

const env = appEnv();
const agentId = {
  dev: "c36c4ecc-3b79-4182-ab1a-b277eb73e927",
  uat: "c36c4ecc-3b79-4182-ab1a-b277eb73e927",
  prod: "4bb0e6b3-7a6e-453a-9bb3-ee52e3c4f759",
  local: "c36c4ecc-3b79-4182-ab1a-b277eb73e927",
};
const baseUrl = {
  dev: "https://agentic-studio.uat.impact-agents.ai/",
  uat: "https://agentic-studio.uat.impact-agents.ai/",
  prod: "https://impact-agents.ai/",
  local: "https://agentic-studio.uat.impact-agents.ai/",
};

export const pspSopConfig: PspSopConfig = {
  name: "psp-sop",
  title: "AI Powered SOP Navigator",
  description:
    "Your AI assistant to help you navigate through informations in Standard Operating Procedures (SOPs).",
  publicRoute: "/apps/sop",
  agentId: agentId[env],
  apiKey: "IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR",
  apiEndpoint: "api/agent/execute",
  baseUrl: baseUrl[env],
};

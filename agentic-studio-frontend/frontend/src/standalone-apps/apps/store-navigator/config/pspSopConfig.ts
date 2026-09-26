import type { PspSopConfig } from "../types/chat.types";

//Dev Config
// export const pspSopConfig: PspSopConfig = {
//   name: 'psp-sop',
//   title: 'AI Powered SOP Navigator',
//   description: 'Your AI assistant to help you navigate through informations in Standard Operating Procedures (SOPs).',
//   publicRoute: '/apps/psp-sop',
//   agentId: '57962c83-6748-4b41-a5f9-82618950587f',
//   apiKey: 'IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR',
//   apiEndpoint: 'api/agent/execute'
// };

//Production Config
export const pspSopConfig: PspSopConfig = {
  name: "store-navigator",
  title: "AI Powered Store Navigator",
  description:
    "Your AI assistant to help you navigate through informations in Standard Operating Procedures (SOPs).",
  publicRoute: "/apps/navigator",
  agentId: "3fe88b76-8752-45ec-815c-4c9f1397d57e",
  apiKey: "IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR",
  apiEndpoint: "api/agent/execute",
};

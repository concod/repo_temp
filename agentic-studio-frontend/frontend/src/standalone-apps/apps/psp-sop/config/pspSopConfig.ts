import type { PspSopConfig } from '../types/chat.types';
import { appEnv } from '../../../../config/appEnv';


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
const env = appEnv();
const baseUrl = {
  dev: 'https://agentic-studio.devs.impact-agents.ai/',
  uat: 'https://agentic-studio.uat.impact-agents.ai/',
  prod: 'https://impact-agents.ai/',
  local: 'http://localhost:8001/',
}

const agentId = {
  dev: "00871730-19c6-4ed0-829f-6158a4870689",
  uat: "bb5829b9-49c8-46f6-8e44-d230c82acaef",
  prod: "bb5829b9-49c8-46f6-8e44-d230c82acaef",
  local: "00871730-19c6-4ed0-829f-6158a4870689",
}

export const pspSopConfig: PspSopConfig = {
  name: 'psp-sop',
  title: 'AI Powered SOP Navigator',
  description: 'Your AI assistant to help you navigate through informations in Standard Operating Procedures (SOPs).',
  publicRoute: '/apps/psp-sop',
  baseUrl: baseUrl[env],
  agentId: agentId[env],
  apiKey: 'IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR',
  apiEndpoint: 'api/agent/execute'
};

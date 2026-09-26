import { appEnv } from '../../../../config/appEnv';
import type { PspStoreHubConfig } from '../types/chat.types';

const env = appEnv();
const agentId = {
  dev: '48bf4dd0-85f9-4eb7-982c-6c1137cf37b6',
  uat: 'eeb24792-91a2-4a2a-b34a-0a351a5e7f1f',
  prod: 'eeb24792-91a2-4a2a-b34a-0a351a5e7f1f',
  local: '48bf4dd0-85f9-4eb7-982c-6c1137cf37b6', //This is for local development : Change this according to the branch being tested
}
const baseUrl = {
  dev: 'https://agentic-studio.devs.impact-agents.ai/',
  uat: 'https://agentic-studio.uat.impact-agents.ai/',
  prod: 'https://impact-agents.ai/',
  local: 'https://agentic-studio.devs.impact-agents.ai/', //This is for local development : Change this according to the branch being tested
}

export const pspStoreHubConfig: PspStoreHubConfig = {
  name: 'psp-storehub',
  title: 'AI Powered StoreHub Navigator',
  baseUrl: baseUrl[env],
  description: 'Your AI assistant to help you navigate through informations in StoreHub management and operations.',
  publicRoute: '/apps/psp-storehub',
  agentId: agentId[env],
  apiKey: 'IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR',
  apiEndpoint: 'api/agent/langgraph/execute'
};

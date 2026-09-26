import { appEnv } from '../../../../config/appEnv';
import type { LululemonTrendConfig } from '../types/chat.types';

const env = appEnv();
const agentId = {
  dev: 'c6808bd7-0695-4f96-86fc-b598f48b0f5c',
  uat: 'c6808bd7-0695-4f96-86fc-b598f48b0f5c',
  prod: 'c6808bd7-0695-4f96-86fc-b598f48b0f5c',
  local: 'c6808bd7-0695-4f96-86fc-b598f48b0f5c',
}
const baseUrl = {
  dev: 'https://agentic-studio.devs.impact-agents.ai/',
  uat: 'https://agentic-studio.uat.impact-agents.ai/',
  prod: 'https://impact-agents.ai/',
  local: 'http://localhost:8001/',
}


export const lululemonTrendConfig: LululemonTrendConfig = {
  name: 'lululemon-trendgenerator',
  title: 'Lululemon Trend Generator',
  baseUrl: baseUrl[env],
  description: 'Ask for product, customer and market trend insights.',
  publicRoute: '/apps/lululemon-trendgenerator',
  agentId: agentId[env],
  apiKey: 'IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR',
  apiEndpoint: 'api/agent/execute'
};

import { useState, useEffect } from 'react';
import { MultiAgentsService } from '../services/multiAgentsService';
import { AgentService } from '../services/agentService';
import type { MultiAgentResponse, AgentApiResponse } from '../types/api';

export interface UseMultiAgentsReturn {
  multiAgents: MultiAgentResponse[];
  loading: boolean;
  error: string | null;
  refreshMultiAgents: () => Promise<void>;
}

export const useMultiAgents = (): UseMultiAgentsReturn => {
  const [multiAgents, setMultiAgents] = useState<MultiAgentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMultiAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await MultiAgentsService.getMultiAgents();
      setMultiAgents(data);
    } catch (err) {
      console.error('Failed to fetch multi-agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch multi-agents');
    } finally {
      setLoading(false);
    }
  };

  const refreshMultiAgents = async () => {
    await fetchMultiAgents();
  };

  useEffect(() => {
    fetchMultiAgents();
  }, []);

  return {
    multiAgents,
    loading,
    error,
    refreshMultiAgents,
  };
};

export interface UseMultiAgentDetailsReturn {
  multiAgent: MultiAgentResponse | null;
  connectedAgents: AgentApiResponse[];
  loading: boolean;
  error: string | null;
  refreshMultiAgent: () => Promise<void>;
}

export const useMultiAgentDetails = (multiAgentId: string | null): UseMultiAgentDetailsReturn => {
  const [multiAgent, setMultiAgent] = useState<MultiAgentResponse | null>(null);
  const [connectedAgents, setConnectedAgents] = useState<AgentApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMultiAgentDetails = async () => {
    if (!multiAgentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch multi-agent details
      const multiAgentData = await MultiAgentsService.getMultiAgent(multiAgentId);
      setMultiAgent(multiAgentData);

      // Fetch connected agents details
      const agentPromises = multiAgentData.agent_ids.map(agentId => 
        AgentService.getAgent(agentId).catch(err => {
          console.warn(`Failed to fetch agent ${agentId}:`, err);
          return null;
        })
      );
      
      const agentsData = await Promise.all(agentPromises);
      const validAgents = agentsData.filter((agent): agent is AgentApiResponse => agent !== null);
      setConnectedAgents(validAgents);
    } catch (err) {
      console.error('Failed to fetch multi-agent details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch multi-agent details');
    } finally {
      setLoading(false);
    }
  };

  const refreshMultiAgent = async () => {
    await fetchMultiAgentDetails();
  };

  useEffect(() => {
    fetchMultiAgentDetails();
  }, [multiAgentId]);

  return {
    multiAgent,
    connectedAgents,
    loading,
    error,
    refreshMultiAgent,
  };
};

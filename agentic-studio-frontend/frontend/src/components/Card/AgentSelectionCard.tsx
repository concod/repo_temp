import React, { useState } from "react";
import { DefaultLabel } from "../Label";
import type { AgentResponse } from "../../types/api";
import { getAgentTagById, type AgentTagConfig, NoneTagWithIcon } from "../Tags";

interface AgentSelectionCardProps {
  agents?: AgentResponse[];
  loading?: boolean;
  onAgentSelect?: (agentId: string, selected: boolean) => void;
  selectedAgents?: string[];
}

const AgentSelectionCard: React.FC<AgentSelectionCardProps> = ({ 
  agents = [], 
  loading = false, 
  onAgentSelect,
  selectedAgents = []
}) => {
  const [localSelectedAgents, setLocalSelectedAgents] = useState<string[]>(selectedAgents);

  // Handle checkbox change
  const handleAgentSelect = (agentId: string, checked: boolean) => {
    const updatedSelection = checked 
      ? [...localSelectedAgents, agentId]
      : localSelectedAgents.filter(id => id !== agentId);
    
    setLocalSelectedAgents(updatedSelection);
    onAgentSelect?.(agentId, checked);
  };


  // Get category ID from agent name and role
  const getCategoryId = (agent: AgentResponse): string => {
    const name = agent.name?.toLowerCase() || '';
    const role = agent.role?.toLowerCase() || '';
    const combined = `${name} ${role}`;
    
    if (combined.includes('analyst') || combined.includes('analyzer')) return 'analytics-ml';
    if (combined.includes('marketing') || combined.includes('trend') || combined.includes('banner')) return 'generative-creative';
    if (combined.includes('support') || combined.includes('conversational')) return 'conversational-interactive';
    if (combined.includes('sales')) return 'strategic-decisioning';
    if (combined.includes('content') || combined.includes('document')) return 'document-content';
    if (combined.includes('data') || combined.includes('knowledge')) return 'data-access-knowledge';
    if (combined.includes('automation')) return 'foundation-automation';
    if (combined.includes('monitoring')) return 'proactive-monitoring';
    if (combined.includes('execution') || combined.includes('action')) return 'action-execution';
    if (combined.includes('utility') || combined.includes('core')) return 'utility-core';
    
    return 'generative-creative'; // default category
  };

  const renderCategoryTag = (agent: AgentResponse) => {
    const categoryId = getCategoryId(agent);
    const categoryTag: AgentTagConfig | undefined = getAgentTagById(categoryId);
    
    if (!categoryTag) {
      return <span className="body-small">Unknown Category</span>;
    }

    if (categoryTag.icon) {
      return (
        <NoneTagWithIcon icon={<img src={categoryTag.icon} alt={categoryTag.label} />}>
          {categoryTag.label}
        </NoneTagWithIcon>
      );
    }

    return <span className="body-small">{categoryTag.label}</span>;
  };

  // Loading state
  if (loading) {
    return (
      <div className="tools-card">
        <div className="tools-card__loading">
          <span className="body-medium">Loading agents...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (agents.length === 0) {
    return (
      <div className="tools-card">
        <div className="tools-card__empty">
          <span className="body-medium">No agents available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tools-card-container">
      {agents.map((agent) => (
        <div key={agent.id} className="tools-card">
          <div className="tools-card__header">
            <div className="tools-card__header-checkbox">
              <input 
                type="checkbox" 
                checked={localSelectedAgents.includes(agent.id)}
                onChange={(e) => handleAgentSelect(agent.id, e.target.checked)}
              />
            </div>
            <div className="tools-card__header-title">
              <span className="body-medium--medium">{agent.name}</span>
            </div>
          </div>
          <div className="tools-card__body">
            <div className="tools-card__body-category">
            <span className="body-small tools-card__body-category-text">Category - </span>
              {renderCategoryTag(agent)}
            </div>
            <div className="tools-card__body-description">
              <span className="body-medium">
                {agent.description}
              </span>
            </div>
            <div className="tools-card__body-footer">
              <div className="tools-card__body-footer-labels">
                <DefaultLabel>Model : <span>{agent.llmModel || 'N/A'}</span></DefaultLabel>
                <DefaultLabel>Tools : <span>{agent.tools?.length || 0}</span></DefaultLabel>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentSelectionCard;

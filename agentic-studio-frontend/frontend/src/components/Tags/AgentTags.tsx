import React from 'react';
import { FillTag, OutlineTagWithIcon } from "./TagFactory";
import faIcon from "../../assets/images/fa_gear.svg";
import pmIcon from "../../assets/images/pm_eye.svg"
import ciIcon from "../../assets/images/ci_chat.svg"
import sdmIcon from "../../assets/images/sd_chess.svg"
import gcIcon from "../../assets/images/gc_ai.svg";
import daIcon from "../../assets/images/db_data.svg";
import amIcon from "../../assets/images/am_analytics.svg";
import aeIcon from "../../assets/images/ae_rocket.svg";
import dcIcon from "../../assets/images/dc_puzzle.svg";
import ucIcon from "../../assets/images/uc_document.svg";

// Agent tag configuration
export interface AgentTagConfig {
  id: string;
  label: string;
  icon?: string;
  variant: 'fill' | 'outline';
  category?: string;
}

// Centralized agent tag configurations
export const AGENT_TAG_CONFIGS: AgentTagConfig[] = [
  {
    id: 'all',
    label: 'All',
    variant: 'fill'
  },
  {
    id: 'foundation-automation',
    label: 'Foundation Automation',
    icon: faIcon,
    variant: 'outline',
    category: 'automation'
  },
  {
    id: 'proactive-monitoring',
    label: 'Proactive & Monitoring',
    icon: pmIcon,
    variant: 'outline',
    category: 'monitoring'
  },
  {
    id: 'conversational-interactive',
    label: 'Conversational & Interactive',
    icon: ciIcon,
    variant: 'outline',
    category: 'interaction'
  },
  {
    id: 'strategic-decisioning',
    label: 'Strategic & Decisioning',
    icon: sdmIcon,
    variant: 'outline',
    category: 'strategy'
  },
  {
    id: 'generative-creative',
    label: 'Generative & Creative',
    icon: gcIcon,
    variant: 'outline',
    category: 'creative'
  },
  {
    id: 'data-access-knowledge',
    label: 'Data access & Knowledge',
    icon: daIcon,
    variant: 'outline',
    category: 'data'
  },
  {
    id: 'analytics-ml',
    label: 'Analytics & ML',
    icon: amIcon,
    variant: 'outline',
    category: 'analytics'
  },
  {
    id: 'action-execution',
    label: 'Action & Execution',
    icon: aeIcon,
    variant: 'outline',
    category: 'execution'
  },
  {
    id: 'document-content',
    label: 'Document & content',
    icon: dcIcon,
    variant: 'outline',
    category: 'content'
  },
  {
    id: 'utility-core',
    label: 'Utility & Core',
    icon: ucIcon,
    variant: 'outline',
    category: 'utility'
  }
];

// Dynamic AgentTag component
interface AgentTagProps {
  config: AgentTagConfig;
  onClick?: (tagId: string) => void;
  isActive?: boolean;
  className?: string;
}

export const AgentTag: React.FC<AgentTagProps> = ({ 
  config, 
  onClick, 
  isActive = false, 
  className = '' 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(config.id);
    }
  };

  const tagProps = {
    className: `${className} ${isActive ? 'agent-tag--active' : ''}`,
    onClick: onClick ? handleClick : undefined,
  };

  if (config.variant === 'fill') {
    return <FillTag {...tagProps}>{config.label}</FillTag>;
  }

  if (config.icon) {
    return (
      <OutlineTagWithIcon 
        icon={<img src={config.icon} alt={config.label} />}
        {...tagProps}
      >
        {config.label}
      </OutlineTagWithIcon>
    );
  }

  return <OutlineTagWithIcon {...tagProps}>{config.label}</OutlineTagWithIcon>;
};

// Utility functions
export const getAgentTagById = (id: string): AgentTagConfig | undefined => {
  return AGENT_TAG_CONFIGS.find(tag => tag.id === id);
};

export const getAgentTagsByCategory = (category: string): AgentTagConfig[] => {
  return AGENT_TAG_CONFIGS.filter(tag => tag.category === category);
};

export const getAllAgentTags = (): AgentTagConfig[] => {
  return AGENT_TAG_CONFIGS;
};

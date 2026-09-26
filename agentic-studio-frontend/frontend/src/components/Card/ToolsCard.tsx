import React, { useState } from "react";
import ToolsIcon from "../Icon/ToolsIcon";
import sheetsIcon from "../../assets/images/googlesheets-icon.svg";
import { DefaultLabel } from "../Label";
import type { ToolResponse } from "../../types/api";

interface ToolsCardProps {
  tools?: ToolResponse[];
  loading?: boolean;
  onToolSelect?: (toolId: string, selected: boolean) => void;
  selectedTools?: string[];
}

const ToolsCard: React.FC<ToolsCardProps> = ({ 
  tools = [], 
  loading = false, 
  onToolSelect,
  selectedTools = []
}) => {
  const [localSelectedTools, setLocalSelectedTools] = useState<string[]>(selectedTools);

  // Handle checkbox change
  const handleToolSelect = (toolId: string, checked: boolean) => {
    const updatedSelection = checked 
      ? [...localSelectedTools, toolId]
      : localSelectedTools.filter(id => id !== toolId);
    
    setLocalSelectedTools(updatedSelection);
    onToolSelect?.(toolId, checked);
  };

  // Get tool icon based on tags or name
  const getToolIcon = (tool: ToolResponse): string => {
    // You can customize this logic based on tool tags or names
    if (tool.tags.includes('Google') || tool.name.toLowerCase().includes('google')) {
      return sheetsIcon;
    }
    // Add more icon mappings as needed
    return sheetsIcon; // Default icon
  };

  // Get background gradient based on tool type
  const getToolGradient = (tool: ToolResponse): string => {
    // Customize gradients based on tool categories
    if (tool.tags.includes('Custom')) {
      return "linear-gradient(153deg, #FFF4E6 16.67%, #FFE0B3 100%);";
    }
    if (tool.tags.includes('RAG') || tool.tags.includes('Answer')) {
      return "linear-gradient(153deg, #F0F9FF 16.67%, #BAE6FD 100%);";
    }
    if (tool.tags.includes('Banner') || tool.tags.includes('Event')) {
      return "linear-gradient(153deg, #FDF4FF 16.67%, #F5D0FE 100%);";
    }
    // Default gradient
    return "linear-gradient(153deg, #EDFDFF 16.67%, #B4F7FF 100%);";
  };

  // Get primary tag for label
  const getPrimaryTag = (tool: ToolResponse): string => {
    return tool.tags[0] || 'Tool';
  };

  // Loading state
  if (loading) {
    return (
      <div className="tools-card">
        <div className="tools-card__loading">
          <span className="body-small">Loading tools...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (tools.length === 0) {
    return (
      <div className="tools-card">
        <div className="tools-card__empty">
          <span className="body-small">No tools available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="tools-card-container">
      {tools.map((tool) => (
        <div key={tool.id} className="tools-card">
          <div className="tools-card__header">
            <div className="tools-card__header-checkbox">
              <input 
                type="checkbox" 
                checked={localSelectedTools.includes(tool.id)}
                onChange={(e) => handleToolSelect(tool.id, e.target.checked)}
              />
            </div>
            <div className="tools-card__header-icon">
              <ToolsIcon 
                src={getToolIcon(tool)} 
                backgroundGradient={getToolGradient(tool)}
                alt={`${tool.name} Icon`} 
              />
            </div>
            <div className="tools-card__header-title">
              <span className="body-small--medium">{tool.name}</span>
            </div>
          </div>
          <div className="tools-card__body">
            <div className="tools-card__body-description">
              <span className="body-small">
                {tool.description}
              </span>
            </div>
            <div className="tools-card__body-label">
              <DefaultLabel>{getPrimaryTag(tool)}</DefaultLabel>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ToolsCard;
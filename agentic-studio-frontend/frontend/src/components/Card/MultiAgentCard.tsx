import React, { useState } from "react";
import { DefaultLabel } from "../Label";
import launchIcon from "../../assets/images/launch_rocket.svg";
import dots from "../../assets/images/three_dots.svg";
import closeIcon from "../../assets/images/close-icon.svg";
import editIcon from "../../assets/images/edit-agent.svg";
import deleteIcon from "../../assets/images/delete-agent.svg";
import viewIcon from "../../assets/images/view-agent.svg";
import cloneIcon from "../../assets/images/clone-agent.svg";
import statusIcon from "../../assets/images/status-active.svg";

export interface ConnectedAgent {
  id: string;
  name: string;
}

export interface MultiAgentCardProps {
  id: string;
  title: string;
  description: string;
  connectedAgents: ConnectedAgent[];
  status?: 'active' | 'inactive';
  onLaunch?: (id: string) => void;
  onEdit?: (id: string) => void;
  onManage?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClone?: (id: string) => void;
}

const MultiAgentCard: React.FC<MultiAgentCardProps> = ({
  id,
  title,
  description,
  connectedAgents,
//   status = 'active',
  onLaunch,
  onEdit,
  onManage,
  onDelete,
  onClone
}) => {
  // State for managing menu visibility
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  const handleLaunch = () => {
    onLaunch?.(id);
  };

  const handleEdit = () => {
    onEdit?.(id);
  };

  const handleManage = () => {
    onManage?.(id);
  };

  const handleDelete = () => {
    onDelete?.(id);
  };

  const handleClone = () => {
    onClone?.(id);
  };

  const handleDotsClick = () => {
    setIsMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setIsMenuVisible(false);
  };

  return (
    <div className="multi-agent-card">
      <div className="multi-agent-card__header">
        <div className="multi-agent-card__header-title">
          <span className="body-medium--medium">{title}</span>
          <img src={statusIcon} alt="status" />
        </div>
        <div 
          className="multi-agent-card__header-button"
          onClick={handleLaunch}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleLaunch();
            }
          }}
        >
          <img src={launchIcon} alt="Launch Agent" />
          <span className="body-small multi-agent-card__header-button-text">Launch Agent</span>
        </div>
      </div>

      <div className="multi-agent-card__body">
        <div className="multi-agent-card__body-description">
          <span className="body-small">{description}</span>
        </div>

        <div className="multi-agent-card__body-agents">
          <div className="multi-agent-card__body-agents-title">
            <span className="body-small--medium">
              Connected Agents: ({connectedAgents.length})
            </span>
          </div>
          <div className="multi-agent-card__body-agents-footer">
            <div className="multi-agent-card__body-agents-footer-labels">
              {connectedAgents.map((agent) => (
                <DefaultLabel key={agent.id}>
                  {agent.name}
                </DefaultLabel>
              ))}
            </div>
            <div className="multi-agent-card__body-agents-footer-dots">
              {!isMenuVisible ? (
                <img 
                  src={dots} 
                  alt="dots" 
                  className='multi-agent-card__body-agents-footer-dots-icon'
                  onClick={handleDotsClick}
                  style={{ cursor: 'pointer' }}
                />
              ) : (
                <div className="multi-agent-card__body-agents-footer-dots-menu">
                  <div className="multi-agent-card__body-agents-footer-dots-menu-items">
                    <img 
                      src={deleteIcon} 
                      alt="delete" 
                      onClick={handleDelete}
                      style={{ cursor: 'pointer' }}
                    />
                    <img 
                      src={viewIcon} 
                      alt="view" 
                      onClick={handleManage}
                      style={{ cursor: 'pointer' }}
                    />
                    <img 
                      src={editIcon} 
                      alt="edit" 
                      onClick={handleEdit} 
                      style={{ cursor: 'pointer' }}
                    />
                    <img 
                      src={cloneIcon} 
                      alt="clone" 
                      onClick={handleClone}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div className="multi-agent-card__body-agents-footer-dots-menu-close">
                    <img 
                      src={closeIcon} 
                      alt="close" 
                      onClick={handleCloseMenu}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiAgentCard;

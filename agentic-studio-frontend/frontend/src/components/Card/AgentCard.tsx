import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import launchIcon from "../../assets/images/launch_rocket.svg";
import { NoneTagWithIcon } from "../Tags";
import { getAgentTagById } from "../Tags";
import type { AgentTagConfig } from "../Tags";
import { DefaultLabel } from '../Label';
import { DeleteModal } from '../Modal';
import { AgentService } from '../../services/agentService';
import { showSuccess, showError } from '../../utils/toast';
import dots from "../../assets/images/three_dots.svg";
import closeIcon from "../../assets/images/close-icon.svg";
import editIcon from "../../assets/images/edit-agent.svg";
import deleteIcon from "../../assets/images/delete-agent.svg";
import viewIcon from "../../assets/images/view-agent.svg";
import cloneIcon from "../../assets/images/clone-agent.svg";
import type { AgentApiResponse, AgentCreate } from '../../types/api';

interface AgentCardProps {
  id?: string;
  title?: string;
  categoryId?: string;
  description?: string;
  onLaunch?: () => void;
  onDelete?: (id: string) => Promise<void>;
  onRefreshAgents?: () => Promise<void>;
  className?: string;
  model?: string;
  tools?: number;
}

const AgentCard: React.FC<AgentCardProps> = ({ 
  id,
  title = "Linkedin post generator",
  categoryId = "generative-creative",
  onLaunch,
  onDelete,
  onRefreshAgents,
  className = "",
  description = "You are a base pricing analyst agent with vast understanding of how to apply pricing rules and run data analyses.",
  model = "impact-storm-11",
  tools = 0
}) => {
  const navigate = useNavigate();
  
  // State for managing menu visibility
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  
  // State for managing delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for managing clone operation
  const [isCloning, setIsCloning] = useState(false);
  
  // Get the tag configuration dynamically
  const categoryTag: AgentTagConfig | undefined = getAgentTagById(categoryId);

  const handleLaunch = () => {
    if (onLaunch) {
      onLaunch();
    } else {
      console.log(`Launching agent: ${title}`);
    }
  };

  const handleDotsClick = () => {
    setIsMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setIsMenuVisible(false);
  };

  const handleManageAgent = () => {
    if (id) {
      navigate(`/agents/manage/${id}`);
    } else {
      console.warn('Agent ID is required to manage agent');
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
    setIsMenuVisible(false); // Close the menu when opening delete modal
  };

  const handleDeleteConfirm = async () => {
    if (!id) {
      console.warn('Agent ID is required to delete agent');
      return;
    }

    setIsDeleting(true);
    try {
      await AgentService.deleteAgent(id);
      setShowDeleteModal(false);
      
      // Show success toast
      showSuccess(`Agent "${title}" has been successfully deleted.`, 'Agent Deleted');
      
      // Call the onDelete prop if provided (for parent component to handle UI updates)
      if (onDelete) {
        await onDelete(id);
      }
      
      // Refresh the agents list
      if (onRefreshAgents) {
        await onRefreshAgents();
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
      
      // Show error toast
      showError(
        error instanceof Error ? error.message : 'An unexpected error occurred while deleting the agent.',
        'Delete Failed'
      );
      
      // Keep modal open on error so user can try again
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  const handleCloneAgent = async () => {
    if (!id) {
      console.warn('Agent ID is required to clone agent');
      return;
    }

    setIsCloning(true);
    try {
      // First, get the agent details
      const agentDetails: AgentApiResponse = await AgentService.getAgent(id);
      
      // Create a new agent with the same details but modified name
      const cloneData : AgentCreate = {
        name: `${agentDetails.name} (Copy)`,
        description: agentDetails.description,
        llmProvider: agentDetails.llmProvider,
        llmModel: agentDetails.llmModel,
        apiKey: agentDetails.apiKey,
        role: agentDetails.role,
        goal: agentDetails.goal,
        expectedOutput: agentDetails.expected_output,
        backstory: agentDetails.backstory,
        sample_user_input: agentDetails.sample_user_input,
        instructions: agentDetails.instructions,
        verbose: agentDetails.verbose,
        enable_memory: agentDetails.enable_memory,
        enable_planning: agentDetails.enable_planning,
        enable_short_term_memory: agentDetails.enable_short_term_memory,
        enable_long_term_memory: agentDetails.enable_long_term_memory,
        features: agentDetails.features,
        tools: agentDetails.tools || []
      };

      await AgentService.createAgent(cloneData);
      
      // Show success toast
      showSuccess(`Agent "${title}" has been successfully cloned.`, 'Agent Cloned');
      
      // Refresh the agents list
      if (onRefreshAgents) {
        await onRefreshAgents();
      }
    } catch (error) {
      console.error('Failed to clone agent:', error);
      
      // Show error toast
      showError(
        error instanceof Error ? error.message : 'An unexpected error occurred while cloning the agent.',
        'Clone Failed'
      );
    } finally {
      setIsCloning(false);
      setIsMenuVisible(false); // Close the menu after operation
    }
  };

  const renderCategoryTag = () => {
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

  return(
    <div className={`agent-card ${className}`}>
      <div className="agent-card__body">
        <div className="agent-card__body-header">
          <span className="agent-card__body-header-title body-medium--medium">{title}</span>
          <div 
            className="agent-card__body-header-button"
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
            <span className="body-small agent-card__body-header-button-text">Launch Agent</span>
          </div>
        </div>
        <div className="agent-card__body-category">
          <span className="body-small agent-card__body-category-text">Category - </span>
          {renderCategoryTag()}
        </div>
        <div className="agent-card__body-description body-small">
            <div className="agent-card__body-description-text">{description}</div>
            <div className="agent-card__body-description-footer">
                <div className="agent-card__body-description-footer-labels">
                    <DefaultLabel>Model : <span>{model}</span> </DefaultLabel>
                    <DefaultLabel>Tools : <span>{tools}</span> </DefaultLabel>
                </div>
                <div className="agent-card__body-description-footer-dots">
                    {!isMenuVisible ? (
                        <img 
                            src={dots} 
                            alt="dots" 
                            className='agent-card__body-description-footer-dots-icon'
                            onClick={handleDotsClick}
                            style={{ cursor: 'pointer' }}
                        />
                    ) : (
                        <div className="agent-card__body-description-footer-dots-menu">
                            <div className="agent-card__body-description-footer-dots-menu-items">
                                <img 
                                  src={deleteIcon} 
                                  alt="delete" 
                                  onClick={handleDeleteClick}
                                  style={{ cursor: 'pointer' }}
                                />
                                <img 
                                  src={viewIcon} 
                                  alt="view" 
                                  onClick={handleManageAgent}
                                  style={{ cursor: 'pointer' }}
                                />
                                <img src={editIcon} alt="edit" onClick={handleManageAgent} style={{ cursor: 'pointer' }}/>
                                <img 
                                  src={cloneIcon} 
                                  alt="clone" 
                                  onClick={handleCloneAgent}
                                  style={{ cursor: isCloning ? 'not-allowed' : 'pointer', opacity: isCloning ? 0.5 : 1 }}
                                />
                            </div>
                            <div className="agent-card__body-description-footer-dots-menu-close">
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
      
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <DeleteModal
            onClose={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
            title="Delete Agent, Are you sure?"
            itemName={title}
            itemType="agent"
            isDeleting={isDeleting}
          />
        </div>
      )}
    </div>
  );
};
export default AgentCard;
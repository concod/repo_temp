import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DefaultLabel } from '../Label';
import { DeleteModal } from '../Modal';
import { showSuccess, showError } from '../../utils/toast';
import { ToolsService } from '../../services/toolsService';
import dots from "../../assets/images/three_dots.svg";
import closeIcon from "../../assets/images/close-icon.svg";
import editIcon from "../../assets/images/edit-agent.svg";
import deleteIcon from "../../assets/images/delete-agent.svg";
import viewIcon from "../../assets/images/view-agent.svg";
import cloneIcon from "../../assets/images/clone-agent.svg";
import type { ToolCreate } from '../../types/api';

interface ToolCardProps {
  id?: string;
  title?: string;
  categoryId?: string;
  description?: string;
  onLaunch?: () => void;
  onDelete?: (id: string) => Promise<void>;
  onRefreshTools?: () => Promise<void>;
  className?: string;
  tags?: string[];
  isAdded?: boolean;
  isInternal?: boolean;
}

const ToolCard: React.FC<ToolCardProps> = ({ 
  id,
  title = "Data Collector Tool",
  onDelete,
  onRefreshTools,
  className = "",
  description = "A powerful tool for collecting and processing data from various sources with advanced filtering capabilities.",
  tags = [],
}) => {
  const navigate = useNavigate();
  
  // State for managing menu visibility
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  
  // State for managing delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // State for managing clone operation
  const [isCloning, setIsCloning] = useState(false);
  

  const handleDotsClick = () => {
    setIsMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setIsMenuVisible(false);
  };

  const handleManageTool = () => {
    if (id) {
      navigate(`/tools/manage/${id}`);
    } else {
      console.warn('Tool ID is required to manage tool');
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
    setIsMenuVisible(false); // Close the menu when opening delete modal
  };

  const handleDeleteConfirm = async () => {
    if (!id) {
      console.warn('Tool ID is required to delete tool');
      return;
    }

    setIsDeleting(true);
    try {
      // TODO: Implement ToolService.deleteTool when available
      // await ToolService.deleteTool(id);
      setShowDeleteModal(false);
      
      // Show success toast
      showSuccess(`Tool "${title}" has been successfully deleted.`, 'Tool Deleted');
      
      // Call the onDelete prop if provided (for parent component to handle UI updates)
      if (onDelete) {
        await onDelete(id);
      }
      
      // Refresh the tools list
      if (onRefreshTools) {
        await onRefreshTools();
      }
    } catch (error) {
      console.error('Failed to delete tool:', error);
      
      // Show error toast
      showError(
        error instanceof Error ? error.message : 'An unexpected error occurred while deleting the tool.',
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

  const handleCloneTool = async () => {
    if (!id) {
      console.warn('Tool ID is required to clone tool');
      return;
    }

    setIsCloning(true);
    try {
      // Fetch tool details and schema in parallel
      const [toolDetails, toolSchema] = await Promise.all([
        ToolsService.getTool(id),
        ToolsService.getToolSchema(id)
      ]);
      
      // Prepare clone data with "(Copy)" appended to name
      const cloneData: ToolCreate = {
        name: `${toolDetails.name} (Copy)`,
        description: toolDetails.description,
        tags: toolDetails.tags,
        schema: toolSchema,
        is_custom: true,
        data_connector_id: toolDetails.data_connector_id
      };
      
      // Create the cloned tool
      const clonedTool = await ToolsService.createCustomTool(cloneData);
      
      console.log('Tool cloned successfully:', clonedTool);
      
      // Show success toast
      showSuccess(`Tool "${toolDetails.name}" has been successfully cloned as "${clonedTool.name}".`, 'Tool Cloned');
      
      // Refresh the tools list
      if (onRefreshTools) {
        await onRefreshTools();
      }
    } catch (error) {
      console.error('Failed to clone tool:', error);
      
      // Show error toast
      showError(
        error instanceof Error ? error.message : 'An unexpected error occurred while cloning the tool.',
        'Clone Failed'
      );
    } finally {
      setIsCloning(false);
      setIsMenuVisible(false); // Close the menu after operation
    }
  };


  return(
    <div className={`tool-card ${className}`}>
      <div className="tool-card__body">
        <div className="tool-card__body-header">
          <span className="tool-card__body-header-title body-medium--medium">{title}</span>
        </div>
        <div className="tool-card__body-description body-small">
            <div className="tool-card__body-description-text">{description}</div>
            <div className="tool-card__body-description-footer">
                <div className="tool-card__body-description-footer-labels scrollbar-hidden">
                    {tags.map((tag) => (
                        <DefaultLabel key={tag} textClassName='body-small'>{tag}</DefaultLabel>
                    ))}
                </div>
                <div className="tool-card__body-description-footer-dots">
                    {!isMenuVisible ? (
                        <img 
                            src={dots} 
                            alt="dots" 
                            className='tool-card__body-description-footer-dots-icon'
                            onClick={handleDotsClick}
                            style={{ cursor: 'pointer' }}
                        />
                    ) : (
                        <div className="tool-card__body-description-footer-dots-menu">
                            <div className="tool-card__body-description-footer-dots-menu-items">
                                <img 
                                  src={deleteIcon} 
                                  alt="delete" 
                                  onClick={handleDeleteClick}
                                  style={{ cursor: 'pointer' }}
                                />
                                <img 
                                  src={viewIcon} 
                                  alt="view" 
                                  onClick={handleManageTool}
                                  style={{ cursor: 'pointer' }}
                                />
                                <img src={editIcon} alt="edit" onClick={handleManageTool} style={{ cursor: 'pointer' }}/>
                                <img 
                                  src={cloneIcon} 
                                  alt="clone" 
                                  onClick={handleCloneTool}
                                  style={{ cursor: isCloning ? 'not-allowed' : 'pointer', opacity: isCloning ? 0.5 : 1 }}
                                />
                            </div>
                            <div className="tool-card__body-description-footer-dots-menu-close">
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
            title="Delete Tool, Are you sure?"
            itemName={title}
            itemType="tool"
            isDeleting={isDeleting}
          />
        </div>
      )}
    </div>
  );
};

export default ToolCard;

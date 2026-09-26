import React, { useState } from 'react';
import { DefaultStrokeLabel } from '../Label';
import websiteIcon from "../../assets/images/website.svg";
import dots from "../../assets/images/three_dots.svg";
import closeIcon from "../../assets/images/close-icon.svg";
import editIcon from "../../assets/images/edit-agent.svg";
import deleteIcon from "../../assets/images/delete-agent.svg";

interface KnowledgeSource {
  id: string;
  type: 'text' | 'file' | 'url';
  title: string;
  content: string;
  filename?: string | null;
  path?: string | null;
}

interface KnowledgeCardProps {
  id: string;
  title: string;
  description: string;
  sources: KnowledgeSource[];
  className?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({
  id,
  title,
  sources,
  className = '',
  onEdit,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const getSourceIcon = (_type: string) => {
    // For now, using the same icon for all types
    // You can add different icons for different types later
    return websiteIcon;
  };

  const getSourceTitle = (source: KnowledgeSource) => {
    if (source.filename) {
      return source.filename;
    }
    return `${source.type.charAt(0).toUpperCase() + source.type.slice(1)} Source`;
  };

  const getSourceSubtext = (source: KnowledgeSource) => {
    switch (source.type) {
      case 'url':
        return source.content; // URL content
      case 'file':
        return source.path || source.content; // File path or content
      case 'text':
        return source.content; // Text content
      default:
        return source.content;
    }
  };

  return (
    <div className={`knowledge-card ${className}`}>
      {/* Header Section */}
      <div className="knowledge-card__header">
        <h3 className="knowledge-card__header-title body-medium--medium" title={title}>
          {title}
        </h3>
        <DefaultStrokeLabel>
          {sources.length} source{sources.length !== 1 ? 's' : ''}
        </DefaultStrokeLabel>
      </div>

      {/* Body Section - Scrollable Sources */}
      <div className="knowledge-card__body">
        {sources.length === 0 ? (
          <div className="knowledge-card__body-empty">
            <p className="body-small">No sources available</p>
          </div>
        ) : (
          <div className="knowledge-card__body-sources scrollbar-hidden">
            {sources.map((source) => (
              <div key={source.id} className="knowledge-card__source">
                <div className="knowledge-card__source-icon">
                  <img src={getSourceIcon(source.type)} alt={`${source.type} icon`} />
                </div>
                <div className="knowledge-card__source-content">
                  <h4 className="knowledge-card__source-title body-small--medium">
                    {getSourceTitle(source)}
                  </h4>
                  <div className="knowledge-card__source-subtext body-small">
                    <span className="knowledge-card__source-content-text">
                      {getSourceSubtext(source)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Three-dot menu at bottom right */}
      {(onEdit || onDelete) && (
        <div className="knowledge-card__menu">
          {!showMenu ? (
            <img 
              src={dots} 
              alt="actions" 
              className="knowledge-card__menu-dots"
              onClick={() => setShowMenu(true)}
            />
          ) : (
            <div className="knowledge-card__menu-actions">
              <div className="knowledge-card__menu-items">
                {onEdit && (
                  <img 
                    src={editIcon} 
                    alt="edit" 
                    onClick={() => {
                      onEdit(id);
                      setShowMenu(false);
                    }}
                  />
                )}
                {onDelete && (
                  <img 
                    src={deleteIcon} 
                    alt="delete" 
                    onClick={() => {
                      onDelete(id);
                      setShowMenu(false);
                    }}
                  />
                )}
              </div>
              <div className="knowledge-card__menu-close">
                <img 
                  src={closeIcon} 
                  alt="close" 
                  onClick={() => setShowMenu(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KnowledgeCard;

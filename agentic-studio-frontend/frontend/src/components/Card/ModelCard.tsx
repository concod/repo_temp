import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DefaultStrokeLabel } from "../Label";
import star from "../../assets/images/card-star-group.svg"

/**
 * Props interface for ModelCard component
 */
export interface ModelCardProps {
  /** Model provider name (e.g., "OPENAI", "GOOGLE", etc.) */
  provider: string;
  /** Provider description */
  description: string;
  /** Array of model names to display as tags */
  models: string[];
  /** Optional gradient index for background styling (0-based, cycles through 4 gradients) */
  gradientIndex?: number;
}

/**
 * ModelCard Component
 * Displays a card with AI model provider information, description, and available models
 */
const ModelCard: React.FC<ModelCardProps> = ({ 
  provider, 
  description, 
  models, 
  gradientIndex = 0
}) => {
  const navigate = useNavigate();

  /**
   * Get gradient background based on index (cycles through 4 gradients)
   */
  const getGradientBackground = () => {
    const gradientNumber = (gradientIndex % 4) + 1;
    return `var(--card-background-gradient-${gradientNumber})`;
  };

  /**
   * Handle label click to navigate to API keys page
   */
  const handleLabelClick = () => {
    navigate('/api-keys');
  };

  return (
    <div 
      className="model-card"
      style={{ 
        background: getGradientBackground()
      }}
    >
      <div className="model-card__body">
        <div className="model-card__body-header">
          <span className="model-card__body-header-title body-medium--medium" title={provider}>
            {provider}
          </span>
        </div>
        <div 
          className="model-card__body-desc body-small" 
          title={description}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minHeight: '48px',
          }}
        >
          {description}
        </div>
        <div className="model-card__body-models">
          {models.map((model, index) => (
            <div 
              key={index}
              onClick={handleLabelClick}
              style={{ cursor: 'pointer', display: 'inline-block' }}
            >
              <DefaultStrokeLabel textClassName="body-small">
                {model}
              </DefaultStrokeLabel>
            </div>
          ))}
        </div>
      </div>
      <div className="model-card__stars">
        <img src={star} alt="star" />
      </div>
    </div>
  );
};

export default ModelCard;

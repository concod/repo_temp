import React from 'react';

interface ToolsIconProps {
  /** Image source URL */
  src: string;
  /** Background gradient CSS value */
  backgroundGradient: string;
  /** Alternative text for accessibility */
  alt: string;
}

const ToolsIcon: React.FC<ToolsIconProps> = ({ src, backgroundGradient, alt }) => {
    return (
        <div 
            className="tools-icon"
            style={{ background: backgroundGradient }}
        >
            <img src={src} alt={alt} />
        </div>
    )
}

export default ToolsIcon;
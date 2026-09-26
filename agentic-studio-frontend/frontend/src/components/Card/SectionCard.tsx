import React from "react";
import { SecondarySmallButton } from "../Button";
import postgresIcon from "../../assets/images/postgres-icon.svg";
import sqlIcon from "../../assets/images/sql-icon.svg";
import bigqueryIcon from "../../assets/images/bigquery-icon.svg";

export interface DatabaseConnector {
  id: string;
  name: string;
  type: 'postgres' | 'mysql' | 'bigquery' | 'databricks' | 'snowflake';
  description: string;
  onConfigure?: () => void;
  onViewDocumentation?: () => void;
}

interface SectionCardProps {
  connectors: DatabaseConnector[];
  loading?: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({ 
  connectors = [], 
  loading = false 
}) => {

  // Get database icon based on type
  const getDatabaseIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'postgres':
        return postgresIcon;
      case 'mysql':
      case 'sql':
        return sqlIcon;
      case 'bigquery':
        return bigqueryIcon;
      default:
        return postgresIcon; // Default icon
    }
  };

  // Handle configure button click
  const handleConfigure = (connector: DatabaseConnector) => {
    connector.onConfigure?.();
  };

  // Handle documentation link click
  const handleDocumentation = (connector: DatabaseConnector) => {
    connector.onViewDocumentation?.();
  };

  // Loading state
  if (loading) {
    return (
      <div className="section-card-container">
        <div className="section-card__loading">
          <span className="body-medium">Loading connectors...</span>
        </div>
      </div>
    );
  }

  // Empty state
  if (connectors.length === 0) {
    return (
      <div className="section-card-container">
        <div className="section-card__empty">
          <span className="body-medium">No connectors available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card-container">
      {connectors.map((connector) => (
        <div key={connector.id} className="section-card">
          <div className="section-card__header">
            <div className="section-card__header-icon">
              {/* <ToolsIcon 
                src={getDatabaseIcon(connector.type)} 
                backgroundGradient={getDatabaseGradient(connector.type)}
                alt={`${connector.name} Icon`} 
              /> */}
              <img src={getDatabaseIcon(connector.type)} alt={`${connector.name} Icon`} />
            </div>
            <div className="section-card__header-title">
              <span className="body-small--medium">{connector.name}</span>
            </div>
          </div>
          <div className="section-card__body">
            <div className="section-card__body-description">
              <span className="body-small">
                {connector.description}
              </span>
            </div>
            <div className="section-card__body-actions">
              <button 
                className="documentation-link"
                onClick={() => handleDocumentation(connector)}
              >
                <span className="documentation-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="15" viewBox="0 0 16 17" fill="none">
  <g clip-path="url(#clip0_152_844)">
    <path d="M15 4.5V15.5H6V13.5H4V11.5H2V0.5H7.71094L9.71094 2.5H13V4.5H15ZM8 3.5H9.28906L8 2.21094V3.5ZM10 10.5V4.5H7V1.5H3V10.5H10ZM12 12.5V3.5H11V11.5H5V12.5H12ZM14.0078 5.5H13V13.5H7V14.5H14.0078V5.5Z" fill="#A93BFF"/>
  </g>
  <defs>
    <clipPath id="clip0_152_844">
      <rect width="16" height="16" fill="white" transform="translate(0 0.5)"/>
    </clipPath>
  </defs>
</svg></span>
                <span className="body-small--medium">Documentation</span>
              </button>
              <SecondarySmallButton onClick={() => handleConfigure(connector)}>Configure</SecondarySmallButton>
              {/* <button 
                className="configure-btn"
                onClick={() => handleConfigure(connector)}
              >
                Configure
              </button> */}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SectionCard;

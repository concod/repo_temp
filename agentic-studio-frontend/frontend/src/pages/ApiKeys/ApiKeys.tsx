import React from 'react';
import { PageHeader } from '../../components/Header';
import ApiKeyCard from '../../components/Card/ApiKeyCard';

/**
 * Hardcoded API keys data based on the provided screenshot
 */
const apiKeysData = [
  {
    title: 'Agent API Key',
    description: 'Use This Key To Authenticate Your API Requests',
    apiKey: 'IMPCTUNIWHEOPDSFGWBHKIOHWHEBSZXAPWQDUR',
    createdDate: 'March 31, 2025',
    neverExpires: true,
    iconColor: 'blue' as const
  },
  {
    title: 'Model API Key',
    description: 'Access Key For Model Inference And Training',
    apiKey: 'IMPCTMODELAPITOKENDDWWQAXXSDDEEU',
    createdDate: 'March 31, 2025',
    neverExpires: true,
    iconColor: 'purple' as const
  }
];

/**
 * ApiKeys Component
 * Displays and manages API keys for different services
 */
const ApiKeys: React.FC = () => {
  return (
    <div className="api-keys-page">
      <PageHeader 
        title="API Keys"
        description="Manage and copy your API keys for different services."
        onSearch={() => {}} // No search functionality needed for this page
        onResetSearch={() => {}} // No search functionality needed for this page
        buttons={[]} // No action buttons needed for this page
        showSearchBar={false}
        showResetButton={false}
      />
      
      <div className="api-keys-page__content">
        <div className="api-keys-page__grid">
          {apiKeysData.map((apiKey, index) => (
            <ApiKeyCard
              key={index}
              title={apiKey.title}
              description={apiKey.description}
              apiKey={apiKey.apiKey}
              createdDate={apiKey.createdDate}
              neverExpires={apiKey.neverExpires}
              iconColor={apiKey.iconColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApiKeys;

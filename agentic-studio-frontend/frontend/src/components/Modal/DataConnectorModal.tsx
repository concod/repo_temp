import React, { useState, useEffect } from 'react';
import { TextInput } from '../Input';
import { PrimaryLargeButton, SecondaryLargeButton, TertiaryLargeButton, TextLargeButton } from '../Button';
import { showSuccess, showError } from '../../utils/toast';
import { dcService } from '../../services/dcService';
import type { DataConnectorCreate } from '../../types/api';

interface DataConnectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DataConnectorCreate) => void;
  onCancel: () => void;
  connectorType?: 'postgres' | 'mysql' | 'bigquery';
  initialData?: Partial<DataConnectorCreate>;
  isLoading?: boolean;
  isEditing?: boolean;
}

const DataConnectorModal: React.FC<DataConnectorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onCancel,
  connectorType = 'postgres',
  initialData,
  isLoading = false,
  isEditing = false
}) => {
  // Form state - initialize based on connector type
  const [formData, setFormData] = useState<DataConnectorCreate>(() => {
    const baseData = {
      uniqueName: initialData?.uniqueName || '',
      connectorType: connectorType,
      id: '',
    };

    if (connectorType === 'postgres' || connectorType === 'mysql') {
      return {
        ...baseData,
        vectorStoreUser: initialData?.vectorStoreUser || '',
        vectorStoreHost: initialData?.vectorStoreHost || '',
        vectorStorePassword: initialData?.vectorStorePassword || '',
        vectorStorePort: initialData?.vectorStorePort || '5432',
        vectorStoreDBName: initialData?.vectorStoreDBName || '',
      };
    } else if (connectorType === 'bigquery') {
      return {
        ...baseData,
        projectId: initialData?.projectId || '',
        datasetId: initialData?.datasetId || '',
        serviceAccountKey: initialData?.serviceAccountKey || undefined,
      };
    }

    return baseData;
  });

  // Service account key as string for the textarea
  const [serviceAccountKeyString, setServiceAccountKeyString] = useState<string>(
    initialData?.serviceAccountKey
      ? (typeof initialData.serviceAccountKey === 'string'
        ? initialData.serviceAccountKey
        : JSON.stringify(initialData.serviceAccountKey, null, 2))
      : ''
  );

  // Reinitialize form data when initialData or connectorType changes
  useEffect(() => {
    const baseData = {
      uniqueName: initialData?.uniqueName || '',
      connectorType: connectorType,
      id: '',
    };

    if (connectorType === 'postgres' || connectorType === 'mysql') {
      setFormData({
        ...baseData,
        vectorStoreUser: initialData?.vectorStoreUser || '',
        vectorStoreHost: initialData?.vectorStoreHost || '',
        vectorStorePassword: initialData?.vectorStorePassword || '',
        vectorStorePort: initialData?.vectorStorePort || '5432',
        vectorStoreDBName: initialData?.vectorStoreDBName || '',
      });
    } else if (connectorType === 'bigquery') {
      setFormData({
        ...baseData,
        projectId: initialData?.projectId || '',
        datasetId: initialData?.datasetId || '',
        serviceAccountKey: initialData?.serviceAccountKey || undefined,
      });

      // Update service account key string for BigQuery
      setServiceAccountKeyString(
        initialData?.serviceAccountKey
          ? (typeof initialData.serviceAccountKey === 'string'
            ? initialData.serviceAccountKey
            : JSON.stringify(initialData.serviceAccountKey, null, 2))
          : ''
      );
    } else {
      setFormData(baseData);
    }
  }, [initialData, connectorType]);

  // State for test connection
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // State for collapsible service account key section (BigQuery)
  const [isServiceAccountKeyOpen, setIsServiceAccountKeyOpen] = useState(false);

  // Auto-expand the section if there is an existing key (e.g. when editing)
  useEffect(() => {
    if (serviceAccountKeyString?.trim()) {
      setIsServiceAccountKeyOpen(true);
    }
  }, [serviceAccountKeyString]);

  // Handle form field changes
  const handleFieldChange = (field: keyof DataConnectorCreate, value: string) => {
    if (field === 'serviceAccountKey') {
      setServiceAccountKeyString(value);
      // Try to parse JSON for the form data
      try {
        const parsedKey = JSON.parse(value);
        setFormData(prev => ({
          ...prev,
          serviceAccountKey: parsedKey
        }));
      } catch (error) {
        // Keep the serviceAccountKey as undefined if JSON is invalid
        setFormData(prev => ({
          ...prev,
          serviceAccountKey: undefined
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Validation function
  const isFormValid = (): boolean => {
    if (!formData.uniqueName?.trim()) return false;

    if (connectorType === 'postgres' || connectorType === 'mysql') {
      return !!(
        formData.vectorStoreUser?.trim() &&
        formData.vectorStoreHost?.trim() &&
        formData.vectorStorePassword?.trim() &&
        formData.vectorStorePort?.trim() &&
        formData.vectorStoreDBName?.trim()
      );
    } else if (connectorType === 'bigquery') {
      // Service account key is optional. If provided, it must be valid JSON.
      const keyValid = !serviceAccountKeyString?.trim() || isValidJSON(serviceAccountKeyString);
      return !!(
        formData.projectId?.trim() &&
        formData.datasetId?.trim() &&
        keyValid
      );
    }

    return false;
  };

  // JSON validation helper
  const isValidJSON = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  // Handle save
  const handleSave = () => {
    // Check if form is valid before proceeding
    if (!isFormValid()) {
      console.log('Form validation failed - cannot submit');
      return;
    }

    // Prepare the data according to API format - only include relevant fields
    let dataToSave: DataConnectorCreate;

    if (connectorType === 'postgres' || connectorType === 'mysql') {
      dataToSave = {
        id: '',
        uniqueName: formData.uniqueName,
        connectorType: connectorType,
        vectorStoreUser: formData.vectorStoreUser || '',
        vectorStoreHost: formData.vectorStoreHost || '',
        vectorStorePassword: formData.vectorStorePassword || '',
        vectorStorePort: formData.vectorStorePort || '5432',
        vectorStoreDBName: formData.vectorStoreDBName || '',
      };
    } else if (connectorType === 'bigquery') {
      // For BigQuery, ensure serviceAccountKey is properly formatted
      let parsedServiceAccountKey;
      if (serviceAccountKeyString) {
        try {
          parsedServiceAccountKey = JSON.parse(serviceAccountKeyString);
        } catch (error) {
          console.error('Invalid JSON in service account key');
          return;
        }
      }

      dataToSave = {
        id: '',
        uniqueName: formData.uniqueName,
        connectorType: connectorType,
        projectId: formData.projectId || '',
        datasetId: formData.datasetId || '',
        serviceAccountKey: parsedServiceAccountKey,
      };
    } else {
      // Fallback for other connector types
      dataToSave = {
        ...formData,
        id: '',
        connectorType: connectorType,
      };
    }

    console.log('Sending data to API:', dataToSave);
    onSave(dataToSave);
  };

  // Handle test connection
  const handleTestConnection = async () => {
    if (!isFormValid()) {
      showError('Please fill in all required fields before testing the connection.', 'Validation Error');
      return;
    }

    setIsTestingConnection(true);
    try {
      let config: any = {};

      if (connectorType === 'postgres' || connectorType === 'mysql') {
        config = {
          host: formData.vectorStoreHost,
          port: formData.vectorStorePort,
          database: formData.vectorStoreDBName,
          user: formData.vectorStoreUser,
          password: formData.vectorStorePassword
        };
      } else if (connectorType === 'bigquery') {
        let parsedServiceAccountKey;
        if (serviceAccountKeyString) {
          try {
            parsedServiceAccountKey = JSON.parse(serviceAccountKeyString);
          } catch (error) {
            showError('Invalid JSON in service account key. Please check the format.', 'JSON Error');
            return;
          }
        }

        config = {
          projectId: formData.projectId,
          datasetId: formData.datasetId,
          serviceAccountKey: parsedServiceAccountKey
        };
      }

      const response = await dcService.testConnection(connectorType, config);

      if (response.status === 'success') {
        let successMessage = response.message || 'Connection successful';
        if (response.details) {
          if (connectorType === 'bigquery' && response.details.project && response.details.dataset) {
            successMessage += ` - Project: ${response.details.project}, Dataset: ${response.details.dataset}`;
          }
        }
        showSuccess(successMessage, 'Connection Test Successful');
      } else {
        showError(response.message || 'Connection test failed', 'Connection Test Failed');
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      let errorMessage = 'Failed to test connection';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError(errorMessage, 'Connection Test Failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Handle overlay click to close
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle documentation link
  const handleViewDocumentation = () => {
    let docUrl = '';
    switch (connectorType) {
      case 'postgres':
        docUrl = 'https://www.postgresql.org/docs/';
        break;
      case 'mysql':
        docUrl = 'https://dev.mysql.com/doc/';
        break;
      case 'bigquery':
        docUrl = 'https://cloud.google.com/bigquery/docs';
        break;
      default:
        docUrl = 'https://www.postgresql.org/docs/';
    }
    window.open(docUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="data-connector-modal-overlay" onClick={handleOverlayClick}>
      <div className="data-connector-modal">
        {/* Header */}
        <div className="data-connector-modal__header">
          <div className="data-connector-modal__title">
            <span className="headline-5">
              {connectorType === 'postgres' && 'Connect Postgres Vector Store'}
              {connectorType === 'bigquery' && 'Connect BigQuery'}
              {connectorType === 'mysql' && 'Connect MySQL'}
            </span>
          </div>
          <button className="data-connector-modal__close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="data-connector-modal__content">
          <div className="data-connector-modal__form">
            {/* PostgreSQL Form */}
            {connectorType === 'postgres' && (
              <>
                {/* Row 1: Unique Name (full width) */}
                <div className="form-row single-field">
                  <div className="form-field">
                    <TextInput
                      label="Unique Name"
                      placeholder="Give this connection a name"
                      value={formData.uniqueName}
                      onChange={(value) => handleFieldChange('uniqueName', value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 2: User and Host */}
                <div className="form-row two-fields">
                  <div className="form-field">
                    <TextInput
                      label="User"
                      placeholder="Enter the Username"
                      value={formData.vectorStoreUser || ''}
                      onChange={(value) => handleFieldChange('vectorStoreUser', value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <TextInput
                      label="Host"
                      placeholder="Enter Host"
                      value={formData.vectorStoreHost || ''}
                      onChange={(value) => handleFieldChange('vectorStoreHost', value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 3: Password and Port */}
                <div className="form-row two-fields">
                  <div className="form-field">
                    <TextInput
                      label="Password"
                      type="password"
                      placeholder="Enter Password"
                      value={formData.vectorStorePassword || ''}
                      onChange={(value) => handleFieldChange('vectorStorePassword', value)}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <TextInput
                      label="Port"
                      placeholder="Enter Port"
                      value={formData.vectorStorePort || ''}
                      onChange={(value) => handleFieldChange('vectorStorePort', value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 4: DB Name (full width) */}
                <div className="form-row single-field">
                  <div className="form-field">
                    <TextInput
                      label="DB Name"
                      placeholder="Enter DB Name"
                      value={formData.vectorStoreDBName || ''}
                      onChange={(value) => handleFieldChange('vectorStoreDBName', value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* BigQuery Form */}
            {connectorType === 'bigquery' && (
              <>
                {/* Row 1: Unique Name (full width) */}
                <div className="form-row single-field">
                  <div className="form-field">
                    <TextInput
                      label="Unique Name"
                      placeholder="Give this connection a name"
                      value={formData.uniqueName}
                      onChange={(value) => handleFieldChange('uniqueName', value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 2: Project ID (full width) */}
                <div className="form-row single-field">
                  <div className="form-field">
                    <TextInput
                      label="Project ID"
                      placeholder="Enter your Google Cloud Project ID"
                      value={formData.projectId || ''}
                      onChange={(value) => handleFieldChange('projectId', value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 3: Dataset ID (full width) */}
                <div className="form-row single-field">
                  <div className="form-field">
                    <TextInput
                      label="Dataset ID"
                      placeholder="Enter your BigQuery Dataset ID"
                      value={formData.datasetId || ''}
                      onChange={(value) => handleFieldChange('datasetId', value)}
                      required
                    />
                  </div>
                </div>

                {/* Row 4: Service Account Key (optional, collapsible) */}
                <div className="form-row single-field">
                  <div className="form-field">
                    <div className={`service-account-collapsible ${isServiceAccountKeyOpen ? 'is-open' : ''}`}>
                      <button
                        type="button"
                        className="service-account-collapsible__header"
                        onClick={() => setIsServiceAccountKeyOpen(prev => !prev)}
                        aria-expanded={isServiceAccountKeyOpen}
                      >
                        <span className="service-account-collapsible__title">
                          <svg
                            className="service-account-collapsible__chevron"
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                          >
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Service Account Key
                        </span>
                        <span className="service-account-collapsible__hint">optional — click to add</span>
                      </button>

                      {isServiceAccountKeyOpen && (
                        <div className="service-account-collapsible__body">
                          <textarea
                            className="service-account-textarea"
                            placeholder="Paste your service account key JSON (optional)"
                            value={serviceAccountKeyString}
                            onChange={(e) => handleFieldChange('serviceAccountKey', e.target.value)}
                            rows={8}
                          />

                          <div className="service-account-instructions">
                            <div className="service-account-instructions__item">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                                <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" fill="#3B82F6" />
                                <path d="M10 6V10M10 14H10.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span>Optional. Paste the entire JSON content of your service account key file.</span>
                            </div>
                            <div className="service-account-instructions__item">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
                                <path d="M10 2L3 5V9.5C3 13.5 6 16.8 10 18C14 16.8 17 13.5 17 9.5V5L10 2Z" stroke="#6B7280" strokeWidth="1.5" strokeLinejoin="round" />
                              </svg>
                              <span>Leave empty to use ADC — works automatically when the host (Compute Engine, GKE, or Cloud Run) has an attached service account with BigQuery access.</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Disclaimer */}
            <div className="data-connector-modal__disclaimer">
              <div className="disclaimer-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" fill="#3B82F6" />
                  <path d="M10 6V10M10 14H10.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="disclaimer-text">
                <span className="body-small">
                  By using this service, you agree to take full responsibility for your actions and to protect Agentic Retail Automation Platform and its affiliates, officers, employees, and agents from any claims, losses, damages, liabilities, or legal costs that may arise due to your violation of this policy — including, but not limited to, uploading sensitive personal information without proper authorization.
                </span>
              </div>
            </div>

            {/* Documentation Link */}
            <div className="data-connector-modal__documentation">
              <TextLargeButton onClick={handleViewDocumentation}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="17" viewBox="0 0 16 17" fill="none">
                  <g clipPath="url(#clip0_152_844)">
                    <path d="M15 4.5V15.5H6V13.5H4V11.5H2V0.5H7.71094L9.71094 2.5H13V4.5H15ZM8 3.5H9.28906L8 2.21094V3.5ZM10 10.5V4.5H7V1.5H3V10.5H10ZM12 12.5V3.5H11V11.5H5V12.5H12ZM14.0078 5.5H13V13.5H7V14.5H14.0078V5.5Z" fill="#A93BFF" />
                  </g>
                  <defs>
                    <clipPath id="clip0_152_844">
                      <rect width="16" height="16" fill="white" transform="translate(0 0.5)" />
                    </clipPath>
                  </defs>
                </svg>
                View Documentation
              </TextLargeButton>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="data-connector-modal__footer">
          <div className="footer-left">
            <TertiaryLargeButton onClick={onCancel} disabled={isLoading}>
              Cancel
            </TertiaryLargeButton>
          </div>
          <div className="footer-right">
            {isEditing && (
              <SecondaryLargeButton
                onClick={handleTestConnection}
                disabled={isLoading || isTestingConnection || !isFormValid()}
              >
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </SecondaryLargeButton>
            )}
            <PrimaryLargeButton
              onClick={handleSave}
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </PrimaryLargeButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataConnectorModal;

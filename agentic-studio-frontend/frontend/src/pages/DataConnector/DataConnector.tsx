import React, { useState } from 'react';
import { SectionCard } from '../../components/Card';
import { DataConnectorModal, DeleteModal } from '../../components/Modal';
import { useDataConnectors } from '../../hooks/useDataConnectors';
import { dcService } from '../../services/dcService';
import { showSuccess, showError } from '../../utils/toast';
import type { DatabaseConnector } from '../../components/Card/SectionCard';
import type { DataConnectorCreate, DataConnector as DataConnectorType } from '../../types/api';
import dots from "../../assets/images/three_dots.svg";
import closeIcon from "../../assets/images/close-icon.svg";
import editIcon from "../../assets/images/edit-agent.svg";
import deleteIcon from "../../assets/images/delete-agent.svg";

const DataConnector: React.FC = () => {
  // Fetch data connectors from API
  const { dataConnectors, isLoading, error, refetch } = useDataConnectors();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConnectorType, setSelectedConnectorType] = useState<'postgres' | 'mysql' | 'bigquery'>('postgres');
  const [isCreating, setIsCreating] = useState(false);
  const [editingConnector, setEditingConnector] = useState<DataConnectorType | null>(null);
  
  // States for 3-dots menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // States for delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [connectorToDelete, setConnectorToDelete] = useState<DataConnectorType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle modal actions
  const handleOpenModal = (connectorType: 'postgres' | 'mysql' | 'bigquery') => {
    setSelectedConnectorType(connectorType);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsCreating(false);
    setEditingConnector(null);
  };

  const handleSaveConnector = async (data: DataConnectorCreate) => {
    setIsCreating(true);
    try {
      if (editingConnector) {
        // Update existing connector
        await dcService.updateDataConnector({ ...data, id: editingConnector.id });
        showSuccess(`Data connector "${data.uniqueName}" has been successfully updated.`, 'Connector Updated');
      } else {
        // Create new connector
        await dcService.createDataConnector(data);
        showSuccess(`Data connector "${data.uniqueName}" has been successfully created.`, 'Connector Created');
      }
      handleCloseModal();
      refetch(); // Refresh the list
    } catch (error) {
      console.error('Failed to save data connector:', error);
      showError(
        error instanceof Error ? error.message : 'An unexpected error occurred while saving the connector.',
        editingConnector ? 'Update Failed' : 'Create Failed'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditConnector = (connector: DataConnectorType) => {
    setActiveMenuId(null); // Close the menu
    
    // Use the connector data we already have from the table
    setEditingConnector(connector);
    setSelectedConnectorType(connector.connectorType as 'postgres' | 'mysql' | 'bigquery');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (connector: DataConnectorType) => {
    setConnectorToDelete(connector);
    setShowDeleteModal(true);
    setActiveMenuId(null); // Close the menu
  };

  const handleDeleteConfirm = async () => {
    if (!connectorToDelete) return;

    setIsDeleting(true);
    try {
      await dcService.deleteDataConnector(connectorToDelete.id);
      setShowDeleteModal(false);
      showSuccess(`Data connector "${connectorToDelete.uniqueName}" has been successfully deleted.`, 'Connector Deleted');
      refetch(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete data connector:', error);
      showError(
        error instanceof Error ? error.message : 'An unexpected error occurred while deleting the connector.',
        'Delete Failed'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setConnectorToDelete(null);
  };

  const handleDotsClick = (connectorId: string) => {
    setActiveMenuId(activeMenuId === connectorId ? null : connectorId);
  };

  const handleCloseMenu = () => {
    setActiveMenuId(null);
  };

  // Define database connectors data
  const databaseConnectors: DatabaseConnector[] = [
    {
      id: 'postgres',
      name: 'Postgres',
      type: 'postgres',
      description: 'An open source object-relational database system that uses and extends SQL.',
      onConfigure: () => {
        handleOpenModal('postgres');
      },
      onViewDocumentation: () => {
        console.log('View Postgres documentation');
        window.open('https://www.postgresql.org/docs/', '_blank');
      }
    },
    {
      id: 'mysql',
      name: 'My SQL',
      type: 'mysql',
      description: 'An Open-Source Relational Database Management System, Developed By Oracle.',
      onConfigure: () => {
        // MySQL modal is disabled - do not open modal
        console.log('MySQL configuration is not available yet');
      },
      onViewDocumentation: () => {
        console.log('View MySQL documentation');
        window.open('https://dev.mysql.com/doc/', '_blank');
      }
    },
    {
      id: 'bigquery',
      name: 'Big Query',
      type: 'bigquery',
      description: 'A Serverless And Scalable Multi-Cloud Data Warehouse Service, Provided By Google Cloud.',
      onConfigure: () => {
        handleOpenModal('bigquery');
      },
      onViewDocumentation: () => {
        console.log('View BigQuery documentation');
        window.open('https://cloud.google.com/bigquery/docs', '_blank');
      }
    },
    {
      id: 'databricks',
      name: 'Databricks',
      type: 'databricks',
      description: 'A Data Lakehouse Platform That Combines The Power Of Data Lakes And Data Warehouses.',
      onConfigure: () => {
        console.log('Databricks configuration is not available yet');
      },
      onViewDocumentation: () => {
        console.log('View Databricks documentation');
        window.open('https://docs.databricks.com/aws/en/', '_blank');
      }
    },
    {
      id: 'snowflake',
      name: 'Snowflake',
      type: 'snowflake',
      description: 'A Cloud-Based Data Warehouse That Provides A Unified Platform For Data Storage And Processing.',
      onConfigure: () => {
        console.log('Snowflake configuration is not available yet');
      },
      onViewDocumentation: () => {
        console.log('View Snowflake documentation');
        window.open('https://docs.snowflake.com/', '_blank');
      }
    }
  ];

  return (
    <div className="data-connector-page">
      <div className="page-header">
        <div className="header-content">
          <span className="headline-5 header-title">Data connectors list</span>
          <span className="body-small--medium header-description">
            Set up and manage connections to external data sources and services. Here is a quick guide on building a Data Query agent.
          </span>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="data-connector-content">
        {/* Configured connections section */}
        <div className="data-connector-content-configuration">
          <div className="data-connector-content-configuration-header">
            <span className="body-medium--medium section-title">Configured connections</span>
          </div>
          <div className="data-connector-content-configuration-body">
            {isLoading ? (
              <div className="table-loading">
                <span className="body-small">Loading configured connections...</span>
              </div>
            ) : error ? (
              <div className="table-error">
                <span className="body-small">Error loading connections: {error}</span>
              </div>
            ) : dataConnectors.length === 0 ? (
              <div className="table-empty">
                <span className="body-small">No configured connections found</span>
              </div>
            ) : (
              <div className="connections-table">
                <div className="table-header">
                  <div className="table-cell">Name</div>
                  <div className="table-cell">Type</div>
                  <div className="table-cell">Host/Project</div>
                  <div className="table-cell">Port</div>
                  <div className="table-cell">Database/Dataset</div>
                  <div className="table-cell">Actions</div>
                </div>
                {dataConnectors.map((connector) => (
                  <div key={connector.id} className="table-row">
                    <div className="table-cell">{connector.uniqueName}</div>
                    <div className="table-cell">{dcService.formatConnectorType(connector.connectorType)}</div>
                    <div className="table-cell">
                      {connector.connectorType === 'postgres' || connector.connectorType === 'mysql' 
                        ? connector.vectorStoreHost || 'N/A'
                        : connector.connectorType === 'bigquery'
                        ? connector.projectId || 'N/A'
                        : 'N/A'
                      }
                    </div>
                    <div className="table-cell">
                      {connector.connectorType === 'postgres' || connector.connectorType === 'mysql'
                        ? connector.vectorStorePort || 'N/A'
                        : 'N/A'
                      }
                    </div>
                    <div className="table-cell">
                      {connector.connectorType === 'postgres' || connector.connectorType === 'mysql'
                        ? connector.vectorStoreDBName || 'N/A'
                        : connector.connectorType === 'bigquery'
                        ? connector.datasetId || 'N/A'
                        : 'N/A'
                      }
                    </div>
                    <div className="table-cell actions-cell">
                      {activeMenuId !== connector.id ? (
                        <img 
                          src={dots} 
                          alt="actions" 
                          className="actions-dots"
                          onClick={() => handleDotsClick(connector.id)}
                        />
                      ) : (
                        <div className="actions-menu">
                          <div className="actions-menu-items">
                            <img 
                              src={editIcon} 
                              alt="edit" 
                              onClick={() => handleEditConnector(connector)}
                            />
                            <img 
                              src={deleteIcon} 
                              alt="delete" 
                              onClick={() => handleDeleteClick(connector)}
                            />
                          </div>
                          <div className="actions-menu-close">
                            <img 
                              src={closeIcon} 
                              alt="close" 
                              onClick={handleCloseMenu}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Add new connection section */}
        <div className="data-connector-content-addition">
          <div className="data-connector-content-addition-header">
          <span className="body-medium--medium section-title">Add new connection</span>
          </div>
          <div className="data-connector-content-addition-body">
            <SectionCard connectors={databaseConnectors} />
          </div>
        </div>
      </div>

      {/* Data Connector Modal */}
      <DataConnectorModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveConnector}
        onCancel={handleCloseModal}
        connectorType={selectedConnectorType}
        isLoading={isCreating}
        initialData={editingConnector || undefined}
        isEditing={!!editingConnector}
      />
      
      {/* Delete Modal */}
      {showDeleteModal && connectorToDelete && (
        <div className="modal-overlay">
          <DeleteModal
            onClose={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
            title="Delete Data Connector, Are you sure?"
            itemName={connectorToDelete.uniqueName}
            itemType="data connector"
            isDeleting={isDeleting}
          />
        </div>
      )}
    </div>
  );
};

export default DataConnector;

import { useState, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import tickIcon from "../../assets/images/blue-tick.svg";
import iIcon from "../../assets/images/i-icon.svg";
import { Toggle } from "../../components/Toggle";
import defaultIllustration from "../../assets/images/illustration-default.svg";
import { PrimaryMediumButton, TertiaryMediumButton } from "../../components/Button";
import { TextBox, TextInput } from "../../components/Input";
import { Dropdown } from "../../components/Dropdown";
import { showSuccess, showError } from "../../utils/toast";
import { useDataConnectors } from "../../hooks/useDataConnectors";
import { dcService } from "../../services/dcService";
import { ToolsService } from "../../services/toolsService";
import type { ToolResponse, ToolCreate, OpenAPISchema } from "../../types/api";
import Spinner from "../../components/Spinner/Spinner";

const ManageTool = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Tool data
  const [toolData, setToolData] = useState<ToolResponse | null>(null);
  
  // Tab management state (simplified to single tab)
  const [activeTab] = useState(0);
  
  // Data connector selection state
  const [selectedDataConnector, setSelectedDataConnector] = useState<string | number>('');
  
  // Data connectors hook
  const { dataConnectors, loading: dataConnectorsLoading, error: dataConnectorsError } = useDataConnectors();
  
  // Form field states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: '',
    openApiSchema: ''
  });
  
  // Feature toggles state
  const [featureStates, setFeatureStates] = useState({
    enableLogging: false,
    enableCaching: false
  });

  // Convert data connectors to dropdown options
  const dataConnectorOptions = [
    { value: '', label: 'None', disabled: false },
    ...dataConnectors.map(connector => ({
      value: connector.id,
      label: `${connector.uniqueName} (${dcService.formatConnectorType(connector.connectorType)})`,
      disabled: false
    }))
  ];

  // Handle data connectors error
  if (dataConnectorsError) {
    console.warn('[ManageTool] Data connectors error:', dataConnectorsError);
  }

  // Load tool data on component mount
  useEffect(() => {
    const loadToolData = async () => {
      if (!id) {
        showError('Tool ID is required', 'Error');
        navigate('/tools');
        return;
      }

      try {
        setLoading(true);
        
        // Fetch tool details and schema in parallel
        const [toolResponse, schemaResponse] = await Promise.all([
          ToolsService.getTool(id),
          ToolsService.getToolSchema(id)
        ]);
        
        setToolData(toolResponse);
        
        // Pre-fill form data
        setFormData({
          name: toolResponse.name,
          description: toolResponse.description,
          tags: toolResponse.tags.join(', '),
          openApiSchema: JSON.stringify(schemaResponse, null, 2)
        });
        
        // Set selected data connector
        setSelectedDataConnector(toolResponse.data_connector_id || '');
        
      } catch (error) {
        console.error('Failed to load tool data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load tool data';
        showError(`Error loading tool: ${errorMessage}`, 'Error');
        navigate('/tools');
      } finally {
        setLoading(false);
      }
    };

    loadToolData();
  }, [id, navigate]);

  // Handler for data connector selection
  const handleDataConnectorChange = (value: string | number) => {
    setSelectedDataConnector(value);
  };

  // Handler for form field changes
  const handleFormFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handler for feature toggles
  const handleFeatureToggle = (featureKey: 'enableLogging' | 'enableCaching', checked: boolean) => {
    setFeatureStates(prev => ({
      ...prev,
      [featureKey]: checked
    }));
  };

  // Navigation handlers
  const handleCancel = () => {
    navigate('/tools');
  };

  const handleUpdateTool = async () => {
    try {
      setIsUpdating(true);

      // Validate required fields
      if (!formData.name.trim()) {
        showError('Tool name is required');
        return;
      }
      if (!formData.description.trim()) {
        showError('Tool description is required');
        return;
      }
      if (!formData.openApiSchema.trim()) {
        showError('OpenAPI Schema is required');
        return;
      }

      // Parse and validate OpenAPI schema
      let parsedSchema: OpenAPISchema;
      try {
        parsedSchema = JSON.parse(formData.openApiSchema.trim());
      } catch (parseError) {
        showError('Invalid OpenAPI Schema format. Please provide valid JSON.');
        return;
      }

      // Prepare tool data for API
      const toolData: Partial<ToolCreate> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        tags: formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()) : [],
        schema: parsedSchema,
        data_connector_id: selectedDataConnector ? selectedDataConnector.toString() : null
      };

      console.log('Updating tool with data:', toolData);

      // Update the tool using the API
      await ToolsService.updateTool(id!, toolData);
      
      console.log('Tool updated successfully');
      showSuccess(`Tool "${formData.name}" updated successfully!`, 'Success!');
      
      // Navigate to tools page
      navigate('/tools');
      
    } catch (error) {
      console.error('Failed to update tool:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update tool';
      showError(`Error updating tool: ${errorMessage}`, 'Error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Tab configuration (simplified to single tab)
  const tabs = [
    {
      id: 0,
      title: "Tool settings",
      description: "Configure your tool's information and settings"
    }
  ];

  const items = [
    {
      title: "Define Tool & Set Type",
      description: "Choose the tool type and define its basic properties.",
    },
    {
      title: "Configure Settings",
      description: "Set up endpoints, authentication, and parameters.",
    },
    {
      title: "Enable Features",
      description: "Add advanced features like retry logic, caching, and validation.",
    }
  ];

  const features = [
    {
      key: 'enableLogging' as const,
      title: "Enable Logging", 
      checked: featureStates.enableLogging
    },
    {
      key: 'enableCaching' as const,
      title: "Enable Caching", 
      checked: featureStates.enableCaching
    }
  ];

  // Simplified footer buttons (no tab navigation needed)
  const renderFooterButtons = () => {
    return (
      <>
        <TertiaryMediumButton onClick={handleCancel}>Cancel</TertiaryMediumButton>
        <div className="create-tool__right-footer-buttons">
          <PrimaryMediumButton onClick={handleUpdateTool} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update'}
          </PrimaryMediumButton>
        </div>
      </>
    );
  };

  // Simplified single-tab content
  const renderTabContent = () => {
    return (
      <div className="create-tool__right-content-body">
        <div className="create-tool__right-content-body-section">
          {/* Basic Information */}
          <div className="create-tool__right-content-body-section-first">
            <TextInput 
              label="Name" 
              placeholder="Enter Tool name" 
              value={formData.name}
              onChange={(value) => handleFormFieldChange('name', value)}
            />
              <TextInput 
                label="Tags(Comma Separated)" 
                placeholder="Enter Tags (e.g., tag1, tag2, tag3)" 
                value={formData.tags}
                onChange={(value) => handleFormFieldChange('tags', value)}
              />
            <Dropdown 
              label="Data Connector (Optional)" 
              placeholder={dataConnectorsLoading ? "Loading..." : "Select"} 
              options={dataConnectorOptions}
              value={selectedDataConnector}
              onChange={handleDataConnectorChange}
              disabled={dataConnectorsLoading}
            />
          </div>
          
          {/* Description and Details */}
          <div className="create-tool__right-content-body-section-second">
            <TextBox 
              label="Description" 
              placeholder="Enter Tool description" 
              value={formData.description}
              onChange={(value) => handleFormFieldChange('description', value)}
            />
              <TextBox 
                label="Open API Schema" 
                placeholder="Enter OpenAPI schema (JSON/YAML format)" 
                value={formData.openApiSchema}
                onChange={(value) => handleFormFieldChange('openApiSchema', value)}
              />
          </div>
        </div>
      </div>
    );
  };

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="loading-overlay">
        <Spinner size={80} />
      </div>
    );
  }

  // Show error if tool data couldn't be loaded
  if (!toolData) {
    return (
      <div className="create-tool__error">
        <h2>Tool not found</h2>
        <p>The requested tool could not be found.</p>
        <button onClick={() => navigate('/tools')}>Back to Tools</button>
      </div>
    );
  }

  return (
    <div className="create-tool">
        <div className="create-tool__left">
            <div className="create-tool__left-title headline-5">Manage Tool</div>
            <div className="create-tool__left-illustration">
              <img src={defaultIllustration} alt="default illustration" />
            </div>
            <div className="create-tool__left-footer">
                <div className="create-tool__left-footer-content">
                    <div className="create-tool__left-footer-content-title">
                        <span className="body-medium--medium">Update Tool</span>
                    </div>
                    <div className="create-tool__left-footer-content-items">
                      {items.map((item, index) => (
                        <div key={index} className="create-tool__left-footer-content-items-item">
                          <div className="create-tool__left-footer-content-items-item-header">
                            <img src={tickIcon} alt="tick" />
                            <div className="create-tool__left-footer-content-items-item-header-title">
                              <span className="body-small--medium">{item.title}</span>
                            </div>
                          </div>
                          <div className="create-tool__left-footer-content-items-item-description">
                            <span className="body-small">{item.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
                <div className="create-tool__left-footer-seperator"></div>
                <div className="create-tool__left-footer-features">
                  <div className="create-tool__left-footer-features-title">
                    <span className="body-medium--medium">Additional Features</span>
                  </div>
                  <div className="create-tool__left-footer-features-list">
                    {
                      features.map((feature,index)=>(
                        <div key={index} className="create-tool__left-footer-features-list-item">
                          <div className="create-tool__left-footer-features-list-item-text">
                            <span className="body-small--medium">{feature.title}</span>
                            <img src={iIcon} alt="i" />
                          </div>
                          <div className="create-tool__left-footer-features-list-item-toggle">
                            <Toggle 
                              checked={feature.checked}
                              onChange={(checked) => handleFeatureToggle(feature.key, checked)}
                            />
                          </div>
                    </div>
                      ))
                    }
                  </div>
                </div>
            </div>
        </div>
        <div className="create-tool__right">
          <div className="create-tool__right-content">
            <div className="create-tool__right-content-header">
              <div className="create-tool__right-content-header-title">
                <span className="body-small--medium">{tabs[activeTab].title}</span>
              </div>
              {/* <div className="create-tool__right-content-header-buttons">
                <SecondaryLargeButton>Tool API</SecondaryLargeButton>
              </div> */}
            </div>
            {renderTabContent()}
          </div>
            <div className="create-tool__right-footer">
              {renderFooterButtons()}
            </div>
        </div>
    </div>
  );
};

export default ManageTool;

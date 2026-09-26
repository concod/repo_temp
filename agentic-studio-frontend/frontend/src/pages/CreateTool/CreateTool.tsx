import { useState } from "react";
import tickIcon from "../../assets/images/blue-tick.svg";
import iIcon from "../../assets/images/i-icon.svg";
import { Toggle } from "../../components/Toggle";
import defaultIllustration from "../../assets/images/illustration-default.svg";
import { PrimaryLargeButton, TertiaryLargeButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { TextBox, TextInput } from "../../components/Input";
import { Dropdown } from "../../components/Dropdown";
import { showSuccess, showError } from "../../utils/toast";
import { useDataConnectors } from "../../hooks/useDataConnectors";
import { dcService } from "../../services/dcService";
import { ToolsService } from "../../services/toolsService";
import type { ToolCreate, OpenAPISchema } from "../../types/api";

const CreateTool = () => {
  const navigate = useNavigate();
  
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

  // Removed unused state variables for simplified form

  // Creation loading state
  const [isCreating, setIsCreating] = useState(false);

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
    console.warn('[CreateTool] Data connectors error:', dataConnectorsError);
  }

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

  // Removed unused handlers for simplified form

  // Navigation handlers
  const handleCancel = () => {
    navigate('/tools');
  };

  const handleCreateTool = async () => {
    try {
      setIsCreating(true);

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
      const toolData: ToolCreate = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        tags: formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()) : [],
        schema: parsedSchema,
        is_custom: true,
        data_connector_id: selectedDataConnector ? selectedDataConnector.toString() : null
      };

      console.log('Creating tool with data:', toolData);

      // Create the tool using the API
      const createdTool = await ToolsService.createCustomTool(toolData);
      
      console.log('Tool created successfully:', createdTool);
      showSuccess(`Tool "${createdTool.name}" created successfully!`, 'Success!');
      
      // Navigate to tools page
      navigate('/tools');
      
    } catch (error) {
      console.error('Failed to create tool:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create tool';
      showError(`Error creating tool: ${errorMessage}`, 'Error');
    } finally {
      setIsCreating(false);
    }
  };

  // Removed tab navigation handlers since we only have one tab

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

  // Removed tab handlers since we only have one tab

  // Simplified footer buttons (no tab navigation needed)
  const renderFooterButtons = () => {
    return (
      <>
        <TertiaryLargeButton onClick={handleCancel}>Cancel</TertiaryLargeButton>
        <div className="create-tool__right-footer-buttons">
          <PrimaryLargeButton onClick={handleCreateTool} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create'}
          </PrimaryLargeButton>
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

  return (
    <div className="create-tool">
        <div className="create-tool__left">
            <div className="create-tool__left-title headline-4">Create New Tool</div>
            <div className="create-tool__left-illustration">
              <img src={defaultIllustration} alt="default illustration" />
            </div>
            <div className="create-tool__left-footer">
                <div className="create-tool__left-footer-content">
                    <div className="create-tool__left-footer-content-title">
                        <span className="body-large">Start Building</span>
                    </div>
                    <div className="create-tool__left-footer-content-items">
                      {items.map((item, index) => (
                        <div key={index} className="create-tool__left-footer-content-items-item">
                          <div className="create-tool__left-footer-content-items-item-header">
                            <img src={tickIcon} alt="tick" />
                            <div className="create-tool__left-footer-content-items-item-header-title">
                              <span className="body-medium--medium">{item.title}</span>
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
                    <span className="headline-5">Additional Features</span>
                  </div>
                  <div className="create-tool__left-footer-features-list">
                    {
                      features.map((feature,index)=>(
                        <div key={index} className="create-tool__left-footer-features-list-item">
                          <div className="create-tool__left-footer-features-list-item-text">
                            <span className="body-medium">{feature.title}</span>
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
                <span className="body-medium--medium">{tabs[activeTab].title}</span>
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

export default CreateTool;

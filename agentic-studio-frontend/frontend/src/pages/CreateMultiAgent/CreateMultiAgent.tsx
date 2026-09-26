import { useState, useEffect } from "react";
import tickIcon from "../../assets/images/blue-tick.svg";
import iIcon from "../../assets/images/i-icon.svg";
import { Toggle } from "../../components/Toggle";
import defaultIllustration from "../../assets/images/illustration-default.svg";
import { PrimaryLargeButton, TertiaryLargeButton } from "../../components/Button";
import { useNavigate, useParams } from "react-router-dom";
import { TextBox, TextInput } from "../../components/Input";
import AgentSelectionCard from "../../components/Card/AgentSelectionCard";
import { useAgents } from "../../hooks/useAgents";
import { MultiAgentsService } from "../../services/multiAgentsService";
import type { MultiAgentCreate, MultiAgentResponse } from "../../types/api";
import { showSuccess, showError } from "../../utils/toast";
import Spinner from "../../components/Spinner/Spinner";

const CreateMultiAgent = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  
  // Agents hook
  const { filteredAgents, isLoading: agentsLoading, error: agentsError } = useAgents();
  
  
  // Connected agents selection state
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Form field states
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    description: '',
    goal: '',
    expectedOutput: '',
    backstory: '',
    instructions: '',
    sampleUserInput: '',
    apiKey: ''
  });
  
  
  // Feature toggles state
  const [featureStates, setFeatureStates] = useState({
    taskRetry: false,
    taskLogs: false
  });



  // Creation/update loading state
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingMultiAgent, setIsLoadingMultiAgent] = useState(false);

  // Load existing multi-agent data when in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loadMultiAgent = async () => {
        try {
          setIsLoadingMultiAgent(true);
          const multiAgent = await MultiAgentsService.getMultiAgent(id);
          
          // Populate form data with existing values
          setFormData({
            name: multiAgent.name,
            description: multiAgent.description,
            role: multiAgent.role,
            goal: multiAgent.goal,
            backstory: multiAgent.backstory,
            expectedOutput: multiAgent.expected_output,
            instructions: '', // Multi-agent doesn't have instructions field
            sampleUserInput: '', // Multi-agent doesn't have sample input field
            apiKey: '' // Multi-agent doesn't have API key field
          });
          
          // Set selected agents
          setSelectedAgents(multiAgent.agent_ids);
          
        } catch (error) {
          console.error('Failed to load multi-agent:', error);
          showError('Failed to load multi-agent data', 'Load Error');
          navigate('/multi-agents'); // Redirect back if loading fails
        } finally {
          setIsLoadingMultiAgent(false);
        }
      };
      
      loadMultiAgent();
    }
  }, [isEditMode, id, navigate]);

  // Handle agents error
  if (agentsError) {
    console.warn('[CreateMultiAgent] Agents error:', agentsError);
  }


  // Handler for agent selection
  const handleAgentSelect = (agentId: string, selected: boolean) => {
    if (selected) {
      setSelectedAgents(prev => [...prev, agentId]);
    } else {
      setSelectedAgents(prev => prev.filter(id => id !== agentId));
    }
  };

  // Handler for form field changes
  const handleFormFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handler for feature toggles
  const handleFeatureToggle = (featureKey: 'taskRetry' | 'taskLogs', checked: boolean) => {
    setFeatureStates(prev => ({
      ...prev,
      [featureKey]: checked
    }));
  };



  // Navigation handlers
  const handleCancel = () => {
    navigate('/multi-agents');
  };

  const handleCreateMultiAgent = async () => {
    try {
      setIsCreating(true);

      // Validate required fields
      if (!formData.name.trim()) {
        showError('Multi-agent name is required');
        return;
      }
      if (!formData.description.trim()) {
        showError('Multi-agent description is required');
        return;
      }
      if (selectedAgents.length === 0) {
        showError('At least one agent must be selected');
        return;
      }

      // Prepare multi-agent data
      const multiAgentData: MultiAgentCreate = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        role: formData.role.trim() || 'Multi-Agent Orchestrator',
        goal: formData.goal.trim() || 'Coordinate multiple AI agents to complete complex tasks',
        backstory: formData.backstory.trim() || 'An advanced multi-agent system designed to orchestrate and coordinate multiple AI agents.',
        expected_output: formData.expectedOutput.trim() || 'Coordinated responses from multiple specialized agents',
        agent_ids: selectedAgents,
      };

      console.log(`${isEditMode ? 'Updating' : 'Creating'} multi-agent with data:`, multiAgentData);

      let result: MultiAgentResponse;
      
      if (isEditMode && id) {
        // Update existing multi-agent
        result = await MultiAgentsService.updateMultiAgent(id, multiAgentData);
        console.log('Multi-agent updated successfully:', result);
        showSuccess(`Multi-agent "${result.name}" updated successfully!`, 'Success!');
      } else {
        // Create new multi-agent
        result = await MultiAgentsService.createMultiAgent(multiAgentData);
        console.log('Multi-agent created successfully:', result);
        showSuccess(`Multi-agent "${result.name}" created successfully!`, 'Success!');
      }
      
      // Navigate to multi-agents page
      navigate('/multi-agents');
      
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} multi-agent:`, error);
      const errorMessage = error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} multi-agent`;
      showError(`Error ${isEditMode ? 'updating' : 'creating'} multi-agent: ${errorMessage}`, 'Error');
    } finally {
      setIsCreating(false);
    }
  };


  // Page configuration
  const pageTitle = "Multi-agent configuration";

  const items = [
    {
      title: "Configure Multi-Agent",
      description: "Set up the basic configuration for your multi-agent orchestration.",
    },
    {
      title: "Select Connected Agents",
      description: "Choose which agents will work together in this multi-agent setup.",
    },
    {
      title: "Deploy & Launch",
      description: "Create and deploy your multi-agent system for immediate use.",
    }
  ];

  const features = [
    {
      key: 'taskRetry' as const,
      title: "Enable Task retry", 
      checked: featureStates.taskRetry
    },
    {
      key: 'taskLogs' as const,
      title: "Save task logs", 
      checked: featureStates.taskLogs
    }
  ];


  // Render footer buttons based on active tab
  const renderFooterButtons = () => {
    return (
      <>
        <TertiaryLargeButton onClick={handleCancel}>Cancel</TertiaryLargeButton>
        <div className="create-agent__right-footer-buttons">
          <PrimaryLargeButton onClick={handleCreateMultiAgent} disabled={isCreating || isLoadingMultiAgent}>
            {isCreating ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Multi-Agent' : 'Create Multi-Agent')}
          </PrimaryLargeButton>
        </div>
      </>
    );
  };

  // Render content based on active tab
  const renderTabContent = () => {
    return (
      <div className="create-multi-agent__right-content-body">
        <div className="create-multi-agent__right-content-body-section">
          <div className="create-multi-agent__right-content-body-section-first">
            <TextInput 
              label="Name" 
              placeholder="Enter Multi-agent name" 
              value={formData.name}
              onChange={(value) => handleFormFieldChange('name', value)}
            />
            <TextInput 
              label="Role" 
              placeholder="Enter Role (optional)" 
              value={formData.role}
              onChange={(value) => handleFormFieldChange('role', value)}
            />
          </div>
          <div className="create-multi-agent__right-content-body-section-second">
            <div className="create-multi-agent__right-content-body-section-second-row">
              <TextBox 
                label="Description" 
                placeholder="Enter Multi-agent description" 
                value={formData.description}
                onChange={(value) => handleFormFieldChange('description', value)}
              />
              <TextBox 
                label="Goal" 
                placeholder="Enter Multi-agent goal (optional)" 
                value={formData.goal}
                onChange={(value) => handleFormFieldChange('goal', value)}
              />
            </div>
          </div>
          <div className="create-multi-agent__right-content-body-section-third">
            <div className="create-multi-agent__right-content-body-section-third-row">
              <TextBox 
                label="Backstory" 
                placeholder="Enter Multi-agent backstory" 
                value={formData.backstory}
                onChange={(value) => handleFormFieldChange('backstory', value)}
              />
              <TextBox 
                label="Expected Output" 
                placeholder="Enter expected output" 
                value={formData.expectedOutput}
                onChange={(value) => handleFormFieldChange('expectedOutput', value)}
              />
            </div>
          </div>
          <div className="create-multi-agent__right-content-body-section-agents">
            <div className="create-multi-agent__right-content-body-section-agents-header">
              <span className="body-medium--medium">Connected Agents</span>
              <div className="create-multi-agent__right-content-body-section-agents-header-info">
                <span className="body-small">Select at least one agent to connect to this multi-agent configuration.</span>
              </div>
            </div>
            <div className="create-multi-agent__right-content-body-section-agents-selection">
              <AgentSelectionCard 
                agents={filteredAgents}
                loading={agentsLoading}
                onAgentSelect={handleAgentSelect}
                selectedAgents={selectedAgents}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };
  // Show loading spinner while loading existing multi-agent data
  if (isLoadingMultiAgent) {
    return (
        <div className="loading-overlay">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="create-agent create-multi-agent">
        <div className="create-agent__left">
            <div className="create-agent__left-title headline-4">
              {isEditMode ? 'Edit Multi-Agent' : 'Create New Multi-Agent'}
            </div>
            <div className="create-agent__left-illustration">
              <img src={defaultIllustration} alt="default illustration" />
            </div>
            <div className="create-agent__left-footer">
                <div className="create-agent__left-footer-content">
                    <div className="create-agent__left-footer-content-title">
                        <span className="body-large">Start Building</span>
                    </div>
                    <div className="create-agent__left-footer-content-items">
                      {items.map((item, index) => (
                        <div key={index} className="create-agent__left-footer-content-items-item">
                          <div className="create-agent__left-footer-content-items-item-header">
                            <img src={tickIcon} alt="tick" />
                            <div className="create-agent__left-footer-content-items-item-header-title">
                              <span className="body-medium--medium">{item.title}</span>
                            </div>
                          </div>
                          <div className="create-agent__left-footer-content-items-item-description">
                            <span className="body-small">{item.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                </div>
                <div className="create-agent__left-footer-seperator"></div>
                <div className="create-agent__left-footer-features">
                  <div className="create-agent__left-footer-features-title">
                    <span className="headline-5">Additional Features</span>
                  </div>
                  <div className="create-agent__left-footer-features-list">
                    {
                      features.map((feature,index)=>(
                        <div key={index} className="create-agent__left-footer-features-list-item">
                          <div className="create-agent__left-footer-features-list-item-text">
                            <span className="body-medium">{feature.title}</span>
                            <img src={iIcon} alt="i" />
                          </div>
                          <div className="create-agent__left-footer-features-list-item-toggle">
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
        <div className="create-agent__right">
          <div className="create-agent__right-content" style={{marginTop: '0px'}}>
            <div className="create-agent__right-content-header">
              <div className="create-agent__right-content-header-title">
                <span className="body-medium--medium">{pageTitle}</span>
              </div>
              
            </div>
            {renderTabContent()}
          </div>
            <div className="create-agent__right-footer">
              {renderFooterButtons()}
            </div>
        </div>
    </div>
  );
};

export default CreateMultiAgent;

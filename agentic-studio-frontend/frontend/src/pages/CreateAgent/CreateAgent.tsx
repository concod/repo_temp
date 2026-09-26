import { useState } from "react";
import tickIcon from "../../assets/images/blue-tick.svg";
import iIcon from "../../assets/images/i-icon.svg";
import { Toggle } from "../../components/Toggle";
import defaultIllustration from "../../assets/images/illustration-default.svg";
import { PrimaryLargeButton, SecondaryLargeIconButton, TertiaryLargeButton, TertiaryLargeIconButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { SearchInput, TextBox, TextInput } from "../../components/Input";
import { Dropdown } from "../../components/Dropdown";
import { AGENT_TAG_CONFIGS } from "../../components/Tags/AgentTags";
import ToolsCard from "../../components/Card/ToolsCard";
import newFeatureIcon from "../../assets/images/new-features.svg";
import { useKnowledgeCards } from "../../hooks/useKnowledgeCards";
import { useTools } from "../../hooks/useTools";
import { AgentService } from "../../services";
import type { AgentCreate, McpServerPayload } from "../../types/api";
import { showSuccess, showError } from "../../utils/toast";
import McpServersField from "../../components/McpServersField/McpServersField";

const CreateAgent = () => {
  const navigate = useNavigate();
  
  // Knowledge cards hook
  const { knowledgeCards, loading: knowledgeCardsLoading, error: knowledgeCardsError } = useKnowledgeCards();
  
  // Tools hook
  const { tools, loading: toolsLoading, error: toolsError } = useTools();
  
  // Tab management state
  const [activeTab, setActiveTab] = useState(0);
  
  // Agent tag selection state
  const [selectedAgentTag, setSelectedAgentTag] = useState<string | number>('');
  
  // Knowledge Base selection state
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string | number>('');

  // AI Framework selection state
  const [selectedAiFramework, setSelectedAiFramework] = useState<string | number>('CrewAI');

  // MCP Servers configuration state
  const [mcpServersInput, setMcpServersInput] = useState('');
  const [parsedMcpServers, setParsedMcpServers] = useState<McpServerPayload[]>([]);
  const [mcpServersError, setMcpServersError] = useState<string | null>(null);
  const [isMcpServersApplied, setIsMcpServersApplied] = useState(false);
  
  // Tools selection state
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

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

  // More Features toggle states
  const [moreFeatureStates, setMoreFeatureStates] = useState({
    enableMemory: false,
    enablePlanning: false,
    directAnswerMode: false,
    shortTermMemory: false,
    longTermMemory: false,
    verbose: false,
    guardrailsReq: false
  });

  // LLM configuration state
  const [llmProvider, setLlmProvider] = useState<string | number>('impact');
  const [llmModel, setLlmModel] = useState<string | number>('impact-storm-11');

  // Creation loading state
  const [isCreating, setIsCreating] = useState(false);

  // LLM Provider options
  const llmProviderOptions = [
    { value: 'impact', label: 'Impact Analytics', disabled: false },
    { value: 'openai', label: 'OpenAI', disabled: false },
    { value: 'anthropic', label: 'Anthropic', disabled: false },
    { value: 'google', label: 'Google', disabled: false }
  ];

  // LLM Model options
  const llmModelOptions = [
    { value: 'impact-storm-11', label: 'impact-storm-11', disabled: false },
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini', disabled: false },
    { value: 'gpt-4', label: 'GPT-4', disabled: false },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', disabled: false }
  ];

  const aiFrameworkOptions = [
    { value: 'CrewAI', label: 'CrewAI', disabled: false },
    { value: 'LangGraph', label: 'LangGraph', disabled: false },
  ];

  // Convert agent tag configs to dropdown options (excluding "All" category)
  const agentTagOptions = AGENT_TAG_CONFIGS
    .filter(tag => tag.id !== 'all') // Remove the "All" category
    .map(tag => ({
      value: tag.id,
      label: tag.label,
      icon: tag.icon,
      disabled: false
    }));

  // Convert knowledge cards to dropdown options
  const knowledgeBaseOptions = [
    { value: '', label: 'None', disabled: false }, // Default option for no knowledge base
    ...knowledgeCards.map(card => ({
      value: card.id,
      label: card.title,
      disabled: false
    }))
  ];

  // Handle knowledge cards error
  if (knowledgeCardsError) {
    console.warn('[CreateAgent] Knowledge cards error:', knowledgeCardsError);
  }

  // Handle tools error
  if (toolsError) {
    console.warn('[CreateAgent] Tools error:', toolsError);
  }

  // Handler for agent tag selection
  const handleAgentTagChange = (value: string | number) => {
    setSelectedAgentTag(value);
  };

  // Handler for knowledge base selection
  const handleKnowledgeBaseChange = (value: string | number) => {
    setSelectedKnowledgeBase(value);
  };

  const handleAiFrameworkChange = (value: string | number) => {
    setSelectedAiFramework(value);
  };

  // Handler for tool selection
  const handleToolSelect = (toolId: string, selected: boolean) => {
    if (selected) {
      setSelectedTools(prev => [...prev, toolId]);
    } else {
      setSelectedTools(prev => prev.filter(id => id !== toolId));
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

  // Handler for more features toggles
  const handleMoreFeatureToggle = (featureKey: 'enableMemory' | 'enablePlanning' | 'directAnswerMode' | 'shortTermMemory' | 'longTermMemory' | 'verbose' | 'guardrailsReq', checked: boolean) => {
    setMoreFeatureStates(prev => ({
      ...prev,
      [featureKey]: checked
    }));
  };

  // Handler for LLM provider selection
  const handleLlmProviderChange = (value: string | number) => {
    setLlmProvider(value);
  };

  // Handler for LLM model selection
  const handleLlmModelChange = (value: string | number) => {
    setLlmModel(value);
  };

  // Navigation handlers
  const handleCancel = () => {
    navigate('/agents');
  };

  const handleCreateAgent = async () => {
    try {
      setIsCreating(true);

      // Validate required fields
      if (!formData.name.trim()) {
        showError('Agent name is required');
        return;
      }
      if (!formData.description.trim()) {
        showError('Agent description is required');
        return;
      }
      if (!formData.role.trim()) {
        showError('Agent role is required');
        return;
      }
      if (!formData.instructions.trim()) {
        showError('Agent instructions are required');
        return;
      }

      if (mcpServersInput.trim() && !isMcpServersApplied) {
        showError('Click Parse & Apply to validate MCP servers configuration.');
        return;
      }

      if (mcpServersError) {
        showError(mcpServersError);
        return;
      }

      // Prepare agent data
      const agentData: AgentCreate = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        llmProvider: llmProvider.toString(),
        llmModel: llmModel.toString(),
        apiKey: "***************", // Placeholder API key
        role: formData.role.trim(),
        goal: formData.goal.trim() || undefined,
        expectedOutput: formData.expectedOutput.trim() || undefined,
        backstory: formData.backstory.trim() || undefined,
        sample_user_input: formData.sampleUserInput.trim() || undefined,
        ai_framework: selectedAiFramework.toString(),
        instructions: formData.instructions.trim(),
        knowledge_base_id: selectedKnowledgeBase ? selectedKnowledgeBase.toString() : null,
        verbose: moreFeatureStates.verbose,
        enable_memory: moreFeatureStates.enableMemory,
        enable_planning: moreFeatureStates.enablePlanning,
        enable_short_term_memory: moreFeatureStates.shortTermMemory,
        enable_long_term_memory: moreFeatureStates.longTermMemory,
        guardrails_req: moreFeatureStates.guardrailsReq,
        raw_output: false, // Default value
        tools: selectedTools,
        advanced_tools: [], // Default empty array
        features: {
          knowledgeBase: !!selectedKnowledgeBase,
          dataQuery: false // Default value, can be enhanced later
        }
      };

      if (isMcpServersApplied) {
        agentData.mcp_servers = parsedMcpServers;
      }

      console.log('Creating agent with data:', agentData);

      // Create the agent
      const createdAgent = await AgentService.createAgent(agentData);
      
      console.log('Agent created successfully:', createdAgent);
      showSuccess(`Agent "${createdAgent.name}" created successfully!`, 'Success!');
      
      // Navigate to agents page
      navigate('/agents');
      
    } catch (error) {
      console.error('Failed to create agent:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create agent';
      showError(`Error creating agent: ${errorMessage}`, 'Error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGoToToolsConfiguration = () => {
    setActiveTab(1);
  };

  const handleGoToLLMConfiguration = () => {
    setActiveTab(2);
  };

  const handleBackToAgentConfiguration = () => {
    setActiveTab(0);
  };

  const handleBackToToolsConfiguration = () => {
    setActiveTab(1);
  };

  // Tab configuration
  const tabs = [
    {
      id: 0,
      title: "Agent configuration",
      description: "Configure your agent's basic settings"
    },
    {
      id: 1,
      title: "Tools configuration (optional)", 
      description: "Add tools and enhance capabilities"
    },
    {
      id: 2,
      title: "LLM configuration (optional)",
      description: "Review settings and deploy your agent"
    }
  ];

  const items = [
    {
      title: "Choose LLM & Define Role",
      description: "Choose the LLM model and define the role of the agent.",
    },
    {
      title: "Add Tools (Optional)",
      description: "Enhance your agent with external tools and capabilities.",
    },
    {
      title: "Enable Features (Optional)",
      description: "Add advanced features to boost your agent's internal powers.",
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

  // Tab click handler
  const handleTabClick = (tabId: number) => {
    setActiveTab(tabId);
  };

  // Helper function to determine tab state
  const getTabState = (tabId: number) => {
    if (tabId < activeTab) return 'completed';
    if (tabId === activeTab) return 'active';
    return 'pending';
  };

  // Render footer buttons based on active tab
  const renderFooterButtons = () => {
    switch (activeTab) {
      case 0:
        return (
          <>
            <TertiaryLargeButton onClick={handleCancel}>Cancel</TertiaryLargeButton>
            <div className="create-agent__right-footer-buttons">
              <SecondaryLargeIconButton 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M5.20599 3.19584C5.4797 2.93472 5.92099 2.93472 6.1947 3.19584L10.8366 7.6243C11.0545 7.83213 11.0545 8.16786 10.8366 8.3757L6.1947 12.8042C5.92099 13.0653 5.4797 13.0653 5.20599 12.8042C4.93228 12.543 4.93228 12.122 5.20599 11.8609L9.25021 7.99733L5.2004 4.13376C4.93228 3.87797 4.93228 3.45164 5.20599 3.19584Z" fill="#A93BFF"/>
                  </svg>
                }
                iconPosition="right"
                onClick={handleGoToToolsConfiguration}
              >
                Tools Configuration
              </SecondaryLargeIconButton>
              <PrimaryLargeButton onClick={handleCreateAgent} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </PrimaryLargeButton>
            </div>
          </>
        );
      case 1:
        return (
          <>
            <TertiaryLargeIconButton 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10.794 3.19584C10.5203 2.93472 10.079 2.93472 9.8053 3.19584L5.16339 7.6243C4.94554 7.83213 4.94554 8.16786 5.16339 8.3757L9.8053 12.8042C10.079 13.0653 10.5203 13.0653 10.794 12.8042C11.0677 12.543 11.0677 12.122 10.794 11.8609L6.74979 7.99733L10.7996 4.13376C11.0677 3.87797 11.0677 3.45164 10.794 3.19584Z" fill="#60697D"/>
                </svg>
              }
              iconPosition="left"
              onClick={handleBackToAgentConfiguration}
            >
              Back to agent configuration
            </TertiaryLargeIconButton>
            <div className="create-agent__right-footer-buttons">
              <SecondaryLargeIconButton 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M5.20599 3.19584C5.4797 2.93472 5.92099 2.93472 6.1947 3.19584L10.8366 7.6243C11.0545 7.83213 11.0545 8.16786 10.8366 8.3757L6.1947 12.8042C5.92099 13.0653 5.4797 13.0653 5.20599 12.8042C4.93228 12.543 4.93228 12.122 5.20599 11.8609L9.25021 7.99733L5.2004 4.13376C4.93228 3.87797 4.93228 3.45164 5.20599 3.19584Z" fill="#A93BFF"/>
                  </svg>
                }
                iconPosition="right"
                onClick={handleGoToLLMConfiguration}
              >
                LLM Configuration
              </SecondaryLargeIconButton>
              <PrimaryLargeButton onClick={handleCreateAgent} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </PrimaryLargeButton>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <TertiaryLargeIconButton 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10.794 3.19584C10.5203 2.93472 10.079 2.93472 9.8053 3.19584L5.16339 7.6243C4.94554 7.83213 4.94554 8.16786 5.16339 8.3757L9.8053 12.8042C10.079 13.0653 10.5203 13.0653 10.794 12.8042C11.0677 12.543 11.0677 12.122 10.794 11.8609L6.74979 7.99733L10.7996 4.13376C11.0677 3.87797 11.0677 3.45164 10.794 3.19584Z" fill="#60697D"/>
                </svg>
              }
              iconPosition="left"
              onClick={handleBackToToolsConfiguration}
            >
              Back to tools configuration
            </TertiaryLargeIconButton>
            <div className="create-agent__right-footer-buttons">
              <PrimaryLargeButton onClick={handleCreateAgent} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </PrimaryLargeButton>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="create-agent__right-content-body">
            <div className="create-agent__right-content-body-section">
              <div className="create-agent__right-content-body-section-first">
                <TextInput 
                  label="Name" 
                  placeholder="Enter Agent name" 
                  value={formData.name}
                  onChange={(value) => handleFormFieldChange('name', value)}
                />
                <TextInput 
                  label="Agent Role" 
                  placeholder="Enter Role" 
                  value={formData.role}
                  onChange={(value) => handleFormFieldChange('role', value)}
                />
              </div>
              <div className="create-agent__right-content-body-section-second">
                <TextBox 
                  label="Description" 
                  placeholder="Enter Agent description" 
                  value={formData.description}
                  onChange={(value) => handleFormFieldChange('description', value)}
                />
                <TextBox 
                  label="Goal" 
                  placeholder="Enter Agent goal" 
                  value={formData.goal}
                  onChange={(value) => handleFormFieldChange('goal', value)}
                />
                <TextBox 
                  label="Expected Output" 
                  placeholder="Enter output" 
                  value={formData.expectedOutput}
                  onChange={(value) => handleFormFieldChange('expectedOutput', value)}
                />
              </div>
              <div className="create-agent__right-content-body-section-fourth">
                <TextBox 
                  label="Backstory" 
                  placeholder="Enter Agent backstory" 
                  value={formData.backstory}
                  onChange={(value) => handleFormFieldChange('backstory', value)}
                />
                <TextBox 
                  label="Instructions" 
                  placeholder="Enter Agent instructions" 
                  value={formData.instructions}
                  onChange={(value) => handleFormFieldChange('instructions', value)}
                />
              </div>
              <div className="create-agent__right-content-body-section-third">
                <div className="create-agent__right-content-body-section-third-input">
                  <TextInput 
                    label="Sample user input" 
                    placeholder="Enter sample user query or instruction" 
                    value={formData.sampleUserInput}
                    onChange={(value) => handleFormFieldChange('sampleUserInput', value)}
                  />
                </div>
                <Dropdown
                  label="AI Framework"
                  placeholder="Select"
                  options={aiFrameworkOptions}
                  value={selectedAiFramework}
                  onChange={handleAiFrameworkChange}
                />
                <Dropdown 
                  label="Group by" 
                  placeholder="Select" 
                  options={agentTagOptions}
                  value={selectedAgentTag}
                  onChange={handleAgentTagChange}
                />
                 <Dropdown 
                   label="Knowledge Base" 
                   placeholder={knowledgeCardsLoading ? "Loading..." : "Select"} 
                   options={knowledgeBaseOptions}
                   value={selectedKnowledgeBase}
                   onChange={handleKnowledgeBaseChange}
                   disabled={knowledgeCardsLoading}
                 />
              </div>
              <div className="create-agent__right-content-body-section-mcp">
                <McpServersField
                  value={mcpServersInput}
                  onChange={setMcpServersInput}
                  parsedServers={parsedMcpServers}
                  onParsedServersChange={setParsedMcpServers}
                  error={mcpServersError}
                  onErrorChange={setMcpServersError}
                  onApplySuccess={() => setIsMcpServersApplied(true)}
                  onApplyReset={() => setIsMcpServersApplied(false)}
                />
              </div>
              <div className="create-agent__right-content-body-section-fifth">
                <div className="create-agent__right-content-body-section-fifth-content">
                  <div className="create-agent__right-content-body-section-fifth-content-header">
                    <span className="body-medium--medium" style={{display:'inline-flex', alignItems:'center', gap:'8px'}}><img src={newFeatureIcon} alt="new feature" /> More Features</span>
                  </div>
                  <div className="create-agent__right-content-body-section-fifth-content-toggles">
                    <div className="create-agent__right-content-body-section-fifth-content-toggles-left">
                      <div className="create-agent__right-content-body-section-third-input-toggle">
                        <img src={iIcon} alt="i" />
                        <div className="create-agent__right-content-body-section-third-input-toggle-text">
                          <span className="body-medium">Enable Memory</span>
                        </div>
                        <Toggle checked={moreFeatureStates.enableMemory} onChange={(checked) => handleMoreFeatureToggle('enableMemory', checked)} />
                      </div>
                      <div className="create-agent__right-content-body-section-third-input-toggle">
                        <img src={iIcon} alt="i" />
                        <div className="create-agent__right-content-body-section-third-input-toggle-text">
                          <span className="body-medium">Enable Planning</span>
                        </div>
                        <Toggle checked={moreFeatureStates.enablePlanning} onChange={(checked) => handleMoreFeatureToggle('enablePlanning', checked)} />
                      </div>
                      <div className="create-agent__right-content-body-section-third-input-toggle">
                        <img src={iIcon} alt="i" />
                        <div className="create-agent__right-content-body-section-third-input-toggle-text">
                          <span className="body-medium">Short Term Memory</span>
                        </div>
                        <Toggle checked={moreFeatureStates.shortTermMemory} onChange={(checked) => handleMoreFeatureToggle('shortTermMemory', checked)} />
                      </div>
                    </div>
                    <div className="create-agent__right-content-body-section-fifth-content-toggles-right">
                      <div className="create-agent__right-content-body-section-third-input-toggle">
                        <img src={iIcon} alt="i" />
                        <div className="create-agent__right-content-body-section-third-input-toggle-text">
                          <span className="body-medium">Direct Answer Mode</span>
                        </div>
                        <Toggle checked={moreFeatureStates.directAnswerMode} onChange={(checked) => handleMoreFeatureToggle('directAnswerMode', checked)} />
                      </div>
                      <div className="create-agent__right-content-body-section-third-input-toggle">
                        <img src={iIcon} alt="i" />
                        <div className="create-agent__right-content-body-section-third-input-toggle-text">
                          <span className="body-medium">Long Term Memory</span>
                        </div>
                        <Toggle checked={moreFeatureStates.longTermMemory} onChange={(checked) => handleMoreFeatureToggle('longTermMemory', checked)} />
                      </div>
                      <div className="create-agent__right-content-body-section-third-input-toggle">
                        <img src={iIcon} alt="i" />
                        <div className="create-agent__right-content-body-section-third-input-toggle-text">
                          <span className="body-medium">Verbose</span>
                        </div>
                        <Toggle checked={moreFeatureStates.verbose} onChange={(checked) => handleMoreFeatureToggle('verbose', checked)} />
                      </div>
                      <div className="create-agent__right-content-body-section-third-input-toggle">
                        <img src={iIcon} alt="i" />
                        <div className="create-agent__right-content-body-section-third-input-toggle-text">
                          <span className="body-medium">Guardrails Required</span>
                        </div>
                        <Toggle checked={moreFeatureStates.guardrailsReq} onChange={(checked) => handleMoreFeatureToggle('guardrailsReq', checked)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      case 1:
        return (
          <div className="create-agent__right-content-body">
            <div className="create-agent__right-content-body-section">
              <ToolsCard 
                tools={tools}
                loading={toolsLoading}
                onToolSelect={handleToolSelect}
                selectedTools={selectedTools}
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="create-agent__right-content-body">
            <div className="create-agent__right-content-body-section">
              <div className="create-agent__right-content-body-section-first">
                <Dropdown 
                  label="LLM Provider" 
                  placeholder="Select" 
                  options={llmProviderOptions} 
                  value={llmProvider} 
                  onChange={handleLlmProviderChange} 
                />
                <Dropdown 
                  label="LLM Model" 
                  placeholder="Select" 
                  options={llmModelOptions} 
                  value={llmModel} 
                  onChange={handleLlmModelChange} 
                />
                <TextInput 
                  label="API Key" 
                  placeholder="Enter API Key" 
                  type="password"
                  value="***************" 
                  disabled={true}
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  return (
    <div className="create-agent">
        <div className="create-agent__left">
            <div className="create-agent__left-title headline-4">Create New Agent</div>
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
          <div className="create-agent__right-breadcrumb">
            {tabs.map((tab, index) => (
              <div 
                key={tab.id}
                className={`create-agent__right-breadcrumb-item ${getTabState(tab.id)}`}
                onClick={() => handleTabClick(tab.id)}
                role="button"
                tabIndex={0}
                aria-label={`Tab ${index + 1}: ${tab.title}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTabClick(tab.id);
                  }
                }}
              >
              </div>
            ))}
          </div>
          <div className="create-agent__right-content">
            <div className="create-agent__right-content-header">
              <div className="create-agent__right-content-header-title">
                <span className="body-medium--medium">{tabs[activeTab].title}</span>
              </div>
              <div className="create-agent__right-content-header-buttons">
                {activeTab === 1 && (
                  <>
                    <SearchInput />
                  </>
                )}
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

export default CreateAgent;
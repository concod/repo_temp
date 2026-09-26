import { useState, useEffect } from 'react';
import { SecondaryLargeButton } from "../../components/Button";
import { SubtleGreenIconLabel, SubtleOrangeIconLabel } from '../../components/Label';
import { TextBox, TextInput } from '../../components/Input';
import { Toggle } from '../../components/Toggle';
import newFeatureIcon from "../../assets/images/new-features.svg";
import { AgentChatInterface } from '../../components/AgentChatInterface';
import type { Message } from '../../components/AgentChatInterface';
import { useParams } from 'react-router-dom';
import LaunchAgentSpinner from '../../components/Spinner/LaunchAgentSpinner';
import { MultiAgentsService, AgentService } from '../../services';
import type { MultiAgentCreate } from '../../types/api';
import { AgentSelectionCard } from '../../components/Card';
import { useAgents } from '../../hooks/useAgents';


// Basic Icon Component
const BasicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
        <path d="M12.168 10.333C12.168 11.073 11.5746 11.6663 10.8346 11.6663C10.0946 11.6663 9.5013 11.073 9.5013 10.333C9.5013 9.59301 10.1013 8.99967 10.8346 8.99967C11.568 8.99967 12.168 9.59968 12.168 10.333ZM6.16797 8.99967C5.43464 8.99967 4.83464 9.59968 4.83464 10.333C4.83464 11.0663 5.43464 11.6663 6.16797 11.6663C6.9013 11.6663 7.5013 11.073 7.5013 10.333C7.5013 9.59301 6.90797 8.99967 6.16797 8.99967ZM15.8346 9.99967V11.9997C15.8346 12.3663 15.5346 12.6663 15.168 12.6663H14.5013V13.333C14.5013 14.073 13.908 14.6663 13.168 14.6663H3.83464C3.48101 14.6663 3.14187 14.5259 2.89183 14.2758C2.64178 14.0258 2.5013 13.6866 2.5013 13.333V12.6663H1.83464C1.46797 12.6663 1.16797 12.3663 1.16797 11.9997V9.99967C1.16797 9.63301 1.46797 9.33301 1.83464 9.33301H2.5013C2.5013 6.75301 4.58797 4.66634 7.16797 4.66634H7.83463V3.81967C7.43464 3.59301 7.16797 3.15967 7.16797 2.66634C7.16797 1.93301 7.76797 1.33301 8.5013 1.33301C9.23464 1.33301 9.83463 1.93301 9.83463 2.66634C9.83463 3.15967 9.56797 3.59301 9.16797 3.81967V4.66634H9.83463C12.4146 4.66634 14.5013 6.75301 14.5013 9.33301H15.168C15.5346 9.33301 15.8346 9.63301 15.8346 9.99967ZM14.5013 10.6663H13.168V9.33301C13.168 7.49301 11.6746 5.99967 9.83463 5.99967H7.16797C5.32797 5.99967 3.83464 7.49301 3.83464 9.33301V10.6663H2.5013V11.333H3.83464V13.333H13.168V11.333H14.5013V10.6663Z" fill="currentColor"/>
    </svg>
);

const ConnectedAgentsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
  <path d="M2.66797 14.0003V12.667C2.66797 12.3003 2.79864 11.9865 3.05997 11.7257C3.3213 11.4648 3.63508 11.3341 4.0013 11.3337H4.33464V10.0003H4.0013C3.63464 10.0003 3.32086 9.86988 3.05997 9.60899C2.79908 9.3481 2.66841 9.0341 2.66797 8.66699V7.33366C2.66797 6.96699 2.79864 6.65321 3.05997 6.39233C3.3213 6.13144 3.63508 6.00077 4.0013 6.00033H4.33464V4.66699H4.0013C3.63464 4.66699 3.32086 4.53655 3.05997 4.27566C2.79908 4.01477 2.66841 3.70077 2.66797 3.33366V2.00033C2.66797 1.63366 2.79864 1.31988 3.05997 1.05899C3.3213 0.798103 3.63508 0.667437 4.0013 0.666992H6.0013C6.36797 0.666992 6.68197 0.797659 6.9433 1.05899C7.20464 1.32033 7.33508 1.6341 7.33464 2.00033V3.33366C7.33464 3.70033 7.20419 4.01433 6.9433 4.27566C6.68241 4.53699 6.36841 4.66744 6.0013 4.66699H5.66797V6.00033H6.0013C6.36797 6.00033 6.68197 6.13099 6.9433 6.39233C7.20464 6.65366 7.33508 6.96744 7.33464 7.33366H9.33464C9.33464 6.96699 9.4653 6.65321 9.72664 6.39233C9.98797 6.13144 10.3017 6.00077 10.668 6.00033H12.668C13.0346 6.00033 13.3486 6.13099 13.61 6.39233C13.8713 6.65366 14.0017 6.96744 14.0013 7.33366V8.66699C14.0013 9.03366 13.8709 9.34766 13.61 9.60899C13.3491 9.87033 13.0351 10.0008 12.668 10.0003H10.668C10.3013 10.0003 9.98752 9.86988 9.72664 9.60899C9.46575 9.3481 9.33508 9.0341 9.33464 8.66699H7.33464C7.33464 9.03366 7.20419 9.34766 6.9433 9.60899C6.68241 9.87033 6.36841 10.0008 6.0013 10.0003H5.66797V11.3337H6.0013C6.36797 11.3337 6.68197 11.4643 6.9433 11.7257C7.20464 11.987 7.33508 12.3008 7.33464 12.667V14.0003C7.33464 14.367 7.20419 14.681 6.9433 14.9423C6.68241 15.2037 6.36841 15.3341 6.0013 15.3337H4.0013C3.63464 15.3337 3.32086 15.2032 3.05997 14.9423C2.79908 14.6814 2.66841 14.3674 2.66797 14.0003ZM4.0013 14.0003H6.0013V12.667H4.0013V14.0003ZM4.0013 8.66699H6.0013V7.33366H4.0013V8.66699ZM10.668 8.66699H12.668V7.33366H10.668V8.66699ZM4.0013 3.33366H6.0013V2.00033H4.0013V3.33366Z" fill="currentColor"/>
</svg>
)

const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M8.82108 0.906869C9.24242 0.401536 10.0631 0.746869 9.99642 1.40154L9.52575 6.0002H13.3331C13.4598 6.00025 13.5838 6.03639 13.6907 6.10438C13.7976 6.17238 13.8829 6.26942 13.9366 6.38414C13.9903 6.49886 14.0102 6.62651 13.994 6.75215C13.9778 6.87778 13.9262 6.9962 13.8451 7.09354L7.17842 15.0935C6.75708 15.5989 5.93642 15.2535 6.00308 14.5989L6.47375 10.0002H2.66642C2.53974 10.0002 2.4157 9.96402 2.30882 9.89602C2.20194 9.82803 2.11664 9.73099 2.06292 9.61627C2.0092 9.50155 1.98927 9.37389 2.00548 9.24826C2.02168 9.12262 2.07334 9.0042 2.15442 8.90687L8.82108 0.906869ZM4.08975 8.66687H7.65508C7.69235 8.66687 7.72921 8.67468 7.76327 8.6898C7.79733 8.70492 7.82785 8.72701 7.85285 8.75465C7.87785 8.78229 7.89678 8.81486 7.90842 8.85027C7.92006 8.88567 7.92414 8.92312 7.92042 8.9602L7.55175 12.5635L11.9098 7.33354H8.34442C8.30715 7.33354 8.27029 7.32573 8.23623 7.31061C8.20217 7.29549 8.17165 7.2734 8.14665 7.24576C8.12165 7.21812 8.10272 7.18554 8.09108 7.15014C8.07944 7.11474 8.07536 7.07728 8.07908 7.0402L8.44775 3.43754L4.08975 8.66687Z" fill="currentColor"/>
    </svg>
)

type TabType = 'basic' | 'connected-agents' | 'settings';

const ManageMultiAgent = () => {
    const { id: multiAgentId } = useParams<{ id: string }>();
    
    const [activeTab, setActiveTab] = useState<TabType>('basic');
    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);
    
    // Fetch agents for the Connected Agents tab
    const { agents, isLoading: agentsLoading } = useAgents();
    
    // Form states for multi-agent
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        role: '',
        goal: '',
        backstory: '',
        expectedOutput: ''
    });
    
    // Chat/Conversation state
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false);
    
    // Spinner states
    const [spinnerState, setSpinnerState] = useState<number>(0);
    const spinnerTexts = [
        "Loading conversation interface...",
        "Initializing neural pathways...",
        "Preparing Multi-Agent for the best possible conversation experience...",
        "Processing your request...",
        "Response ready!"
    ];
    
  
    // Connected agents state
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

    // Settings state
    const [verboseLogging, setVerboseLogging] = useState<boolean>(false);
    const [autoAgentSelection, setAutoAgentSelection] = useState<boolean>(false);

    // Spinner control
    const [showLoadingSpinner, setShowLoadingSpinner] = useState(true);

    // Unsaved changes tracking
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const [originalData, setOriginalData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Tab configuration
    const tabs = [
        { id: 'basic' as TabType, label: 'Basic', icon: <BasicIcon /> },
        { id: 'connected-agents' as TabType, label: 'Connected Agents', icon: <ConnectedAgentsIcon /> },
        { id: 'settings' as TabType, label: 'Settings', icon: <SettingsIcon /> }
    ];


    // Load multi-agent data
    useEffect(() => {
        const loadMultiAgentData = async () => {
            if (!multiAgentId) return;

            try {
                setIsLoading(true);
                const data = await MultiAgentsService.getMultiAgent(multiAgentId);
                
                // Store original data for change detection
                setOriginalData(data);

                // Populate form data
                setFormData({
                    name: data.name || '',
                    description: data.description || '',
                    role: data.role || '',
                    goal: data.goal || '',
                    backstory: data.backstory || '',
                    expectedOutput: data.expected_output || ''
                });

                // Set connected agents
                setSelectedAgents(data.agent_ids || []);

                // Reset unsaved changes when data loads
                setHasUnsavedChanges(false);
            } catch (error) {
                console.error('Failed to load multi-agent data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadMultiAgentData();
    }, [multiAgentId]);

    // Hide spinner after full duration
    useEffect(() => {
        const totalSpinnerDuration = 7500; // 7.5 seconds
        const timer = setTimeout(() => {
            setShowLoadingSpinner(false);
        }, totalSpinnerDuration);

        return () => clearTimeout(timer);
    }, []);

    // Change detection effect
    useEffect(() => {
        if (!originalData) return;

        // Compare all form fields with original data
        const hasChanges = (
            formData.name !== (originalData.name || '') ||
            formData.description !== (originalData.description || '') ||
            formData.role !== (originalData.role || '') ||
            formData.goal !== (originalData.goal || '') ||
            formData.backstory !== (originalData.backstory || '') ||
            formData.expectedOutput !== (originalData.expected_output || '') ||
            JSON.stringify(selectedAgents.sort()) !== JSON.stringify((originalData.agent_ids || []).sort()) ||
            verboseLogging !== (originalData.verbose_logging || false) ||
            autoAgentSelection !== (originalData.auto_agent_selection || false)
        );

        setHasUnsavedChanges(hasChanges);
    }, [
        formData, selectedAgents, verboseLogging, autoAgentSelection, originalData
    ]);

    // Handler for form field changes
    const handleFormFieldChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handler for agent selection
    const handleAgentSelect = (agentId: string, selected: boolean) => {
        setSelectedAgents(prev => 
            selected 
                ? [...prev, agentId]
                : prev.filter(id => id !== agentId)
        );
    };

    // Settings toggle handlers
    const handleVerboseLoggingToggle = (checked: boolean) => {
        setVerboseLogging(checked);
    };

    const handleAutoAgentSelectionToggle = (checked: boolean) => {
        setAutoAgentSelection(checked);
    };

    // Save changes handler
    const handleSaveChanges = async () => {
        if (!multiAgentId) return;

        setIsSaving(true);

        try {
            const updateData: Partial<MultiAgentCreate> = {
                name: formData.name,
                description: formData.description,
                role: formData.role,
                goal: formData.goal,
                backstory: formData.backstory,
                expected_output: formData.expectedOutput,
                agent_ids: selectedAgents
            };

            await MultiAgentsService.updateMultiAgent(multiAgentId, updateData);
            setHasUnsavedChanges(false);

        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTabClick = (tabId: TabType) => {
        setActiveTab(tabId);
    };

    const handleRightPanelToggle = () => {
        setIsRightPanelCollapsed(!isRightPanelCollapsed);
    };

    // Chat/Message handlers
    const sendMessage = async (text: string) => {
        if (!text.trim() || !multiAgentId) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: text.trim(),
            type: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setCurrentMessage('');
        setIsTyping(true);
        setSpinnerState(3);
        
        try {
            // Call the real API (same as ManageAgent)
            const response = await AgentService.sendMessage({
                agentId: multiAgentId,
                userInput: text.trim()
            });

            // Handle different response types
            let messageText = '';
            if (response.type === 'error') {
                messageText = response.content.message || 'An error occurred while processing your request.';
            } else {
                messageText = response.content.text || 'No response received.';
            }

            // Create bot message from API response
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: messageText,
                type: 'bot',
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, botMessage]);
            
            setSpinnerState(4);
            setTimeout(() => {
                setIsTyping(false);
                setSpinnerState(0);
            }, 1500);
            
        } catch (error) {
            console.error('Failed to send message:', error);
            
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Sorry, I encountered an error while processing your message. Please try again.',
                type: 'bot',
                timestamp: new Date()
            };
            
            setMessages(prev => [...prev, errorMessage]);
            setIsTyping(false);
            setSpinnerState(0);
        }
    };

    const handleExampleClick = (example: string) => {
        sendMessage(example);
    };

    const handleMessageChange = (message: string) => {
        setCurrentMessage(message);
    };

    // Spinner state progression
    useEffect(() => {
        if (isTyping && spinnerState < 3) {
            let timeoutIds: ReturnType<typeof setTimeout>[] = [];
            
            if (spinnerState === 0) {
                timeoutIds.push(setTimeout(() => setSpinnerState(1), 1000));
            } else if (spinnerState === 1) {
                timeoutIds.push(setTimeout(() => setSpinnerState(2), 1000));
            } else if (spinnerState === 2) {
                timeoutIds.push(setTimeout(() => setSpinnerState(3), 1000));
            }
            
            return () => {
                timeoutIds.forEach(clearTimeout);
            };
        }
    }, [isTyping, spinnerState]);

    // Show loading spinner for full duration
    if (showLoadingSpinner || isLoading) {
        return (
            <div className="loading-overlay">
                <LaunchAgentSpinner />
            </div>
        );
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'basic':
                return (
                    <div className="manage-multi-agent__right-content-body-form">
                        <TextInput 
                            label='Multi-agent name' 
                            required={true}
                            value={formData.name}
                            onChange={(value) => handleFormFieldChange('name', value)}
                            disabled={isTyping}
                        />
                        <TextBox 
                            label='Description' 
                            required={true}
                            width="100%"
                            value={formData.description}
                            onChange={(value) => handleFormFieldChange('description', value)}
                            disabled={isTyping}
                        />
                        <TextInput 
                            label="Role" 
                            value={formData.role}
                            onChange={(value) => handleFormFieldChange('role', value)}
                            disabled={isTyping} 
                        />
                        <TextBox 
                            label="Goal" 
                            width="100%" 
                            value={formData.goal}
                            onChange={(value) => handleFormFieldChange('goal', value)}
                            disabled={isTyping} 
                        />
                        <TextBox 
                            label="Backstory" 
                            width="100%" 
                            value={formData.backstory}
                            onChange={(value) => handleFormFieldChange('backstory', value)}
                            disabled={isTyping} 
                        />
                        <TextBox 
                            label="Expected Output" 
                            width="100%" 
                            value={formData.expectedOutput}
                            onChange={(value) => handleFormFieldChange('expectedOutput', value)}
                            disabled={isTyping} 
                        />
                    </div>
                );
            case 'connected-agents':
                return (
                    <div className="manage-multi-agent__right-content-body-form">
                        <div className="manage-multi-agent__right-content-body-form-agents">
                            <div className="manage-multi-agent__right-content-body-form-agents-header">
                                <span className="body-medium--medium">Connected Agents</span>
                                <span className="body-small">Select agents to connect to this multi-agent configuration.</span>
                            </div>
                            <div className="manage-multi-agent__right-content-body-form-agents-selection">
                                <AgentSelectionCard 
                                    agents={agents}
                                    loading={agentsLoading}
                                    onAgentSelect={handleAgentSelect}
                                    selectedAgents={selectedAgents}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="manage-multi-agent__right-content-body-form">
                        <div className="manage-multi-agent__right-content-body-form-settings">
                            <div className="manage-multi-agent__right-content-body-form-settings-section">
                                <div className={`manage-multi-agent__right-content-body-form-settings-section-title ${isTyping ? 'disabled' : ''}`}>
                                    <img src={newFeatureIcon} alt="settings" />
                                    <span>Orchestration Settings</span>
                                </div>
                                <div className="manage-multi-agent__right-content-body-form-settings-section-toggles">
                                    <div className={`manage-multi-agent__right-content-body-form-settings-section-toggle ${isTyping ? 'disabled' : ''}`}>
                                        <span>Verbose Logging</span>
                                        <Toggle 
                                            checked={verboseLogging}
                                            onChange={handleVerboseLoggingToggle}
                                            disabled={isTyping}
                                        />
                                    </div>
                                    <div className={`manage-multi-agent__right-content-body-form-settings-section-toggle ${isTyping ? 'disabled' : ''}`}>
                                        <span>Auto Agent Selection</span>
                                        <Toggle 
                                            checked={autoAgentSelection}
                                            onChange={handleAutoAgentSelectionToggle}
                                            disabled={isTyping}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return(
        <div className={`manage-multi-agent ${isRightPanelCollapsed ? 'right-collapsed' : ''}`}>
            <AgentChatInterface
                agentId={multiAgentId || ''} // Using multiAgentId for multi-agent streaming
                messages={messages}
                currentMessage={currentMessage}
                isTyping={isTyping}
                spinnerState={spinnerState}
                spinnerTexts={spinnerTexts}
                onMessageChange={handleMessageChange}
                onExampleClick={handleExampleClick}
                backPath="/multi-agents"
                title="Test Multi-Agent Interface"
                description="See how your multi-agent talks before it meets your users"
            />
            {isRightPanelCollapsed && (
                <div className="manage-multi-agent__expand-button" onClick={handleRightPanelToggle}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <g clipPath="url(#clip0_3365_6080)">
                            <path d="M10.7627 0.833496C10.63 0.833496 10.5029 0.886175 10.4091 0.979943C10.3153 1.07371 10.2627 1.20089 10.2627 1.3335C10.2627 1.4661 10.3153 1.59328 10.4091 1.68705C10.5029 1.78082 10.63 1.8335 10.7627 1.8335H13.46L9.64665 5.64683C9.55561 5.74117 9.50528 5.8675 9.50648 5.9986C9.50768 6.12969 9.56032 6.25508 9.65307 6.34774C9.74582 6.4404 9.87125 6.49292 10.0023 6.494C10.1334 6.49508 10.2597 6.44462 10.354 6.3535L14.1673 2.54016V5.23816C14.1673 5.37077 14.22 5.49795 14.3138 5.59172C14.4075 5.68548 14.5347 5.73816 14.6673 5.73816C14.7999 5.73816 14.9271 5.68548 15.0209 5.59172C15.1146 5.49795 15.1673 5.37077 15.1673 5.23816V1.3335C15.1673 1.20089 15.1146 1.07371 15.0209 0.979943C14.9271 0.886175 14.7999 0.833496 14.6673 0.833496H10.7627ZM5.23865 15.1668C5.37126 15.1668 5.49844 15.1142 5.5922 15.0204C5.68597 14.9266 5.73865 14.7994 5.73865 14.6668C5.73865 14.5342 5.68597 14.407 5.5922 14.3133C5.49844 14.2195 5.37126 14.1668 5.23865 14.1668H2.54132L6.35465 10.3535C6.40238 10.3073 6.44045 10.2522 6.46662 10.1911C6.4928 10.1301 6.50656 10.0645 6.50711 9.99813C6.50765 9.93174 6.49497 9.8659 6.4698 9.80447C6.44463 9.74303 6.40748 9.68722 6.36051 9.6403C6.31354 9.59337 6.2577 9.55627 6.19624 9.53116C6.13478 9.50605 6.06893 9.49343 6.00254 9.49404C5.93615 9.49465 5.87055 9.50847 5.80956 9.5347C5.74857 9.56094 5.69342 9.59905 5.64732 9.64683L1.83398 13.4602V10.7622C1.83398 10.6965 1.82105 10.6315 1.79592 10.5708C1.7708 10.5102 1.73397 10.455 1.68754 10.4086C1.64111 10.3622 1.58599 10.3253 1.52533 10.3002C1.46466 10.2751 1.39965 10.2622 1.33398 10.2622C1.26832 10.2622 1.20331 10.2751 1.14264 10.3002C1.08198 10.3253 1.02686 10.3622 0.980431 10.4086C0.934002 10.455 0.897172 10.5102 0.872045 10.5708C0.846917 10.6315 0.833984 10.6965 0.833984 10.7622V14.6668C0.833984 14.9428 1.05798 15.1668 1.33398 15.1668H5.23865Z" fill="white"/>
                        </g>
                        <defs>
                            <clipPath id="clip0_3365_6080">
                            <rect width="16" height="16" fill="white"/>
                            </clipPath>
                        </defs>
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M7.50065 14.9989H12.5007C12.7368 14.9989 12.9348 14.9189 13.0948 14.7589C13.2543 14.5994 13.334 14.4016 13.334 14.1655C13.334 13.9294 13.2543 13.7316 13.0948 13.5722C12.9348 13.4122 12.7368 13.3322 12.5007 13.3322H7.50065C7.26454 13.3322 7.06676 13.4122 6.90732 13.5722C6.74732 13.7316 6.66732 13.9294 6.66732 14.1655C6.66732 14.4016 6.74732 14.5994 6.90732 14.7589C7.06676 14.9189 7.26454 14.9989 7.50065 14.9989ZM7.50065 11.6655H12.5007C12.7368 11.6655 12.9348 11.5855 13.0948 11.4255C13.2543 11.2661 13.334 11.0683 13.334 10.8322C13.334 10.5961 13.2543 10.398 13.0948 10.238C12.9348 10.0786 12.7368 9.99886 12.5007 9.99886H7.50065C7.26454 9.99886 7.06676 10.0786 6.90732 10.238C6.74732 10.398 6.66732 10.5961 6.66732 10.8322C6.66732 11.0683 6.74732 11.2661 6.90732 11.4255C7.06676 11.5855 7.26454 11.6655 7.50065 11.6655ZM5.00065 18.3322C4.54232 18.3322 4.1501 18.1691 3.82398 17.843C3.49732 17.5164 3.33398 17.1239 3.33398 16.6655V3.33219C3.33398 2.87386 3.49732 2.48136 3.82398 2.15469C4.1501 1.82858 4.54232 1.66553 5.00065 1.66553H10.9798C11.202 1.66553 11.414 1.70719 11.6157 1.79053C11.8168 1.87386 11.9937 1.99192 12.1465 2.14469L16.1882 6.18636C16.3409 6.33914 16.459 6.51608 16.5423 6.71719C16.6257 6.91886 16.6673 7.13081 16.6673 7.35303V16.6655C16.6673 17.1239 16.5043 17.5164 16.1782 17.843C15.8515 18.1691 15.459 18.3322 15.0007 18.3322H5.00065ZM10.834 6.66553V3.33219H5.00065V16.6655H15.0007V7.49886H11.6673C11.4312 7.49886 11.2334 7.41886 11.074 7.25886C10.914 7.09942 10.834 6.90164 10.834 6.66553Z" fill="white"/>
                    </svg>
                </div>
            )}
            <div className={`manage-multi-agent__right`}>
                <div className="manage-multi-agent__right-header">
                    <div className="manage-multi-agent__right-header-text">
                        <div className="manage-multi-agent__right-header-text-title">
                            <span>Manage Multi-Agent</span>
                        </div>
                        <div className="manage-multi-agent__right-header-text-desc">
                            <span>Configure your AI multi-agent's behavior and capabilities</span>
                        </div>
                    </div>
                    <div className="manage-multi-agent__right-header-icon" onClick={handleRightPanelToggle} style={{cursor: 'pointer'}}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none">
                        <path d="M20.8569 9.88605C21.0559 9.88605 21.2466 9.80703 21.3873 9.66638C21.5279 9.52572 21.6069 9.33496 21.6069 9.13605C21.6069 8.93713 21.5279 8.74637 21.3873 8.60572C21.2466 8.46506 21.0559 8.38605 20.8569 8.38605H16.8109L22.5309 2.66605C22.6675 2.52453 22.743 2.33504 22.7412 2.1384C22.7394 1.94175 22.6604 1.75367 22.5213 1.61468C22.3822 1.47569 22.194 1.3969 21.9974 1.39529C21.8007 1.39367 21.6113 1.46936 21.4699 1.60605L15.7499 7.32605V3.27805C15.7499 3.07913 15.6709 2.88837 15.5303 2.74772C15.3896 2.60706 15.1989 2.52805 14.9999 2.52805C14.801 2.52805 14.6103 2.60706 14.4696 2.74772C14.329 2.88837 14.2499 3.07913 14.2499 3.27805V9.13605C14.2499 9.55005 14.5859 9.88605 14.9999 9.88605H20.8569ZM3.14294 14.386C2.94403 14.386 2.75327 14.4651 2.61261 14.6057C2.47196 14.7464 2.39294 14.9371 2.39294 15.136C2.39294 15.335 2.47196 15.5257 2.61261 15.6664C2.75327 15.807 2.94403 15.886 3.14294 15.886H7.18894L1.46894 21.606C1.39734 21.6753 1.34025 21.7581 1.30098 21.8496C1.26172 21.9411 1.24108 22.0395 1.24026 22.1391C1.23944 22.2387 1.25846 22.3374 1.29622 22.4296C1.33397 22.5217 1.3897 22.6055 1.46015 22.6758C1.53061 22.7462 1.61437 22.8019 1.70656 22.8395C1.79875 22.8772 1.89752 22.8961 1.9971 22.8952C2.09669 22.8943 2.19509 22.8736 2.28658 22.8342C2.37806 22.7949 2.46079 22.7377 2.52994 22.666L8.24994 16.946V20.993C8.24994 21.192 8.32896 21.3827 8.46961 21.5234C8.61027 21.664 8.80103 21.743 8.99994 21.743C9.19885 21.743 9.38962 21.664 9.53027 21.5234C9.67093 21.3827 9.74994 21.192 9.74994 20.993V15.136C9.74994 14.9371 9.67093 14.7464 9.53027 14.6057C9.38962 14.4651 9.19885 14.386 8.99994 14.386H3.14294Z" fill="#4B5767"/>
                    </svg>
                    </div>
                </div>
                <div className="manage-multi-agent__right-content">
                    <div className="manage-multi-agent__right-content-body">
                        <div className="manage-multi-agent__right-content-body-header">
                            <div className="manage-multi-agent__right-content-body-header-tabs">
                                {tabs.map((tab) => (
                                    <div
                                        key={tab.id}
                                        className={`manage-multi-agent__tab ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => handleTabClick(tab.id)}
                                    >
                                        <div className="manage-multi-agent__tab-icon">
                                            {tab.icon}
                                        </div>
                                        <span className="manage-multi-agent__tab-text">
                                            {tab.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="manage-multi-agent__right-content-body-header-labels">
                                {hasUnsavedChanges && <SubtleOrangeIconLabel>Unsaved changes</SubtleOrangeIconLabel>}
                                <SubtleGreenIconLabel>Live preview</SubtleGreenIconLabel>
                            </div>
                        </div>
                        {renderTabContent()}
                    </div>
                    <SecondaryLargeButton 
                        width="100%" 
                        disabled={isTyping || isSaving || !hasUnsavedChanges}
                        onClick={handleSaveChanges}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </SecondaryLargeButton>
                </div>
            </div>
        </div>
    );
}

export default ManageMultiAgent;

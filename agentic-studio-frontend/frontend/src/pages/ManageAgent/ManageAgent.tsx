import { useState, useEffect, useRef } from 'react';
import { SecondaryLargeButton } from "../../components/Button";
import { SubtleGreenIconLabel, SubtleOrangeIconLabel } from '../../components/Label';
import { TextBox, TextInput } from '../../components/Input';
import { Dropdown } from '../../components/Dropdown';
import { Toggle } from '../../components/Toggle';
import newFeatureIcon from "../../assets/images/new-features.svg";
import { AgentChatInterface } from '../../components/AgentChatInterface';
import type { Message } from '../../components/AgentChatInterface';
import { useNavigate, useParams } from 'react-router-dom';
import { useManageAgent } from '../../hooks/useManageAgent';
import LaunchAgentSpinner from '../../components/Spinner/LaunchAgentSpinner';
import { AgentService } from '../../services';
import type { AgentCreate, AgentResponse, McpServerPayload } from '../../types/api';
import { useKnowledgeCards } from '../../hooks/useKnowledgeCards';
import ApiReferenceModal from "../../components/Modal/ApiReferenceModal";
import McpServersField from '../../components/McpServersField/McpServersField';
import {
  areMcpServersEqual,
  serializeMcpServersToJson,
  validateMcpServersJson,
} from '../../utils/mcpServersJson';
import { showError } from '../../utils/toast';

// Basic Icon Component
const BasicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="16" viewBox="0 0 17 16" fill="none">
        <path d="M12.168 10.333C12.168 11.073 11.5746 11.6663 10.8346 11.6663C10.0946 11.6663 9.5013 11.073 9.5013 10.333C9.5013 9.59301 10.1013 8.99967 10.8346 8.99967C11.568 8.99967 12.168 9.59968 12.168 10.333ZM6.16797 8.99967C5.43464 8.99967 4.83464 9.59968 4.83464 10.333C4.83464 11.0663 5.43464 11.6663 6.16797 11.6663C6.9013 11.6663 7.5013 11.073 7.5013 10.333C7.5013 9.59301 6.90797 8.99967 6.16797 8.99967ZM15.8346 9.99967V11.9997C15.8346 12.3663 15.5346 12.6663 15.168 12.6663H14.5013V13.333C14.5013 14.073 13.908 14.6663 13.168 14.6663H3.83464C3.48101 14.6663 3.14187 14.5259 2.89183 14.2758C2.64178 14.0258 2.5013 13.6866 2.5013 13.333V12.6663H1.83464C1.46797 12.6663 1.16797 12.3663 1.16797 11.9997V9.99967C1.16797 9.63301 1.46797 9.33301 1.83464 9.33301H2.5013C2.5013 6.75301 4.58797 4.66634 7.16797 4.66634H7.83463V3.81967C7.43464 3.59301 7.16797 3.15967 7.16797 2.66634C7.16797 1.93301 7.76797 1.33301 8.5013 1.33301C9.23464 1.33301 9.83463 1.93301 9.83463 2.66634C9.83463 3.15967 9.56797 3.59301 9.16797 3.81967V4.66634H9.83463C12.4146 4.66634 14.5013 6.75301 14.5013 9.33301H15.168C15.5346 9.33301 15.8346 9.63301 15.8346 9.99967ZM14.5013 10.6663H13.168V9.33301C13.168 7.49301 11.6746 5.99967 9.83463 5.99967H7.16797C5.32797 5.99967 3.83464 7.49301 3.83464 9.33301V10.6663H2.5013V11.333H3.83464V13.333H13.168V11.333H14.5013V10.6663Z" fill="currentColor"/>
    </svg>
);

const BehaviorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <g clipPath="url(#clip0_2431_6266)">
            <path d="M8 11.9998V3.3331M8 3.3331C7.99999 3.02631 8.07055 2.72364 8.20623 2.44849C8.3419 2.17334 8.53906 1.93309 8.78244 1.74633C9.02583 1.55956 9.30891 1.43129 9.6098 1.37144C9.91069 1.31159 10.2213 1.32176 10.5176 1.40116C10.814 1.48056 11.0881 1.62707 11.3187 1.82935C11.5494 2.03163 11.7304 2.28426 11.8478 2.56769C11.9652 2.85113 12.0158 3.15777 11.9957 3.46389C11.9756 3.77002 11.8854 4.06742 11.732 4.3331M8 3.3331C8.00001 3.02631 7.92945 2.72364 7.79377 2.44849C7.6581 2.17334 7.46094 1.93309 7.21756 1.74633C6.97417 1.55956 6.69109 1.43129 6.3902 1.37144C6.08931 1.31159 5.77868 1.32176 5.48236 1.40116C5.18603 1.48056 4.91193 1.62707 4.68129 1.82935C4.45064 2.03163 4.26961 2.28426 4.15222 2.56769C4.03483 2.85113 3.98421 3.15777 4.00429 3.46389C4.02436 3.77002 4.11459 4.06742 4.268 4.3331M10 8.66643C9.4232 8.49782 8.91656 8.14685 8.556 7.6661C8.19544 7.18534 8.00036 6.6007 8 5.99976C7.99964 6.6007 7.80456 7.18534 7.444 7.6661C7.08344 8.14685 6.5768 8.49782 6 8.66643" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11.998 3.41602C12.3899 3.51677 12.7537 3.70538 13.0619 3.96756C13.3701 4.22973 13.6146 4.5586 13.7768 4.92925C13.9391 5.2999 14.0149 5.70261 13.9985 6.10689C13.982 6.51117 13.8738 6.90641 13.682 7.26268" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 11.9994C12.587 11.9994 13.1576 11.8057 13.6233 11.4483C14.089 11.091 14.4238 10.59 14.5757 10.023C14.7276 9.45596 14.6882 8.85467 14.4636 8.31235C14.239 7.77002 13.8417 7.31696 13.3333 7.02344" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.3126 11.6553C13.3594 12.0168 13.3315 12.384 13.2307 12.7343C13.1299 13.0846 12.9584 13.4105 12.7268 13.6919C12.4951 13.9733 12.2082 14.2043 11.8838 14.3704C11.5594 14.5366 11.2044 14.6346 10.8406 14.6582C10.4769 14.6818 10.1122 14.6306 9.76904 14.5077C9.42588 14.3848 9.11155 14.1929 8.84546 13.9438C8.57937 13.6947 8.36718 13.3937 8.22199 13.0593C8.0768 12.725 8.00169 12.3644 8.0013 11.9999C8.00091 12.3644 7.9258 12.725 7.78061 13.0593C7.63542 13.3937 7.42323 13.6947 7.15714 13.9438C6.89105 14.1929 6.57672 14.3848 6.23356 14.5077C5.89039 14.6306 5.52568 14.6818 5.16195 14.6582C4.79822 14.6346 4.44319 14.5366 4.11878 14.3704C3.79437 14.2043 3.50748 13.9733 3.27582 13.6919C3.04416 13.4105 2.87266 13.0846 2.77189 12.7343C2.67113 12.384 2.64325 12.0168 2.68997 11.6553" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4.00053 11.9994C3.41353 11.9994 2.84294 11.8057 2.37725 11.4483C1.91155 11.091 1.57678 10.59 1.42485 10.023C1.27292 9.45596 1.31232 8.85467 1.53695 8.31235C1.76157 7.77002 2.15886 7.31696 2.6672 7.02344" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4.0026 3.41602C3.61074 3.51677 3.24694 3.70538 2.93876 3.96756C2.63058 4.22973 2.3861 4.5586 2.22383 4.92925C2.06157 5.2999 1.98578 5.70261 2.0022 6.10689C2.01862 6.51117 2.12682 6.90641 2.3186 7.26268" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        <defs>
            <clipPath id="clip0_2431_6266">
                <rect width="16" height="16" fill="white"/>
            </clipPath>
        </defs>
    </svg>
)

const AdvancedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path fillRule="evenodd" clipRule="evenodd" d="M8.82108 0.906869C9.24242 0.401536 10.0631 0.746869 9.99642 1.40154L9.52575 6.0002H13.3331C13.4598 6.00025 13.5838 6.03639 13.6907 6.10438C13.7976 6.17238 13.8829 6.26942 13.9366 6.38414C13.9903 6.49886 14.0102 6.62651 13.994 6.75215C13.9778 6.87778 13.9262 6.9962 13.8451 7.09354L7.17842 15.0935C6.75708 15.5989 5.93642 15.2535 6.00308 14.5989L6.47375 10.0002H2.66642C2.53974 10.0002 2.4157 9.96402 2.30882 9.89602C2.20194 9.82803 2.11664 9.73099 2.06292 9.61627C2.0092 9.50155 1.98927 9.37389 2.00548 9.24826C2.02168 9.12262 2.07334 9.0042 2.15442 8.90687L8.82108 0.906869ZM4.08975 8.66687H7.65508C7.69235 8.66687 7.72921 8.67468 7.76327 8.6898C7.79733 8.70492 7.82785 8.72701 7.85285 8.75465C7.87785 8.78229 7.89678 8.81486 7.90842 8.85027C7.92006 8.88567 7.92414 8.92312 7.92042 8.9602L7.55175 12.5635L11.9098 7.33354H8.34442C8.30715 7.33354 8.27029 7.32573 8.23623 7.31061C8.20217 7.29549 8.17165 7.2734 8.14665 7.24576C8.12165 7.21812 8.10272 7.18554 8.09108 7.15014C8.07944 7.11474 8.07536 7.07728 8.07908 7.0402L8.44775 3.43754L4.08975 8.66687Z" fill="currentColor"/>
    </svg>
)

type TabType = 'basic' | 'behaviour' | 'advanced';

const ManageAgent = () => {
    const { id: agentId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    // Use the manage agent hook
    const { agentData, toolsData, isLoading, error } = useManageAgent(agentId);
    
    // Knowledge cards hook
    const { knowledgeCards, loading: knowledgeCardsLoading, error: knowledgeCardsError } = useKnowledgeCards();
    
    const [activeTab, setActiveTab] = useState<TabType>('basic');
    const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);
    
    // Form states - will be populated from agentData
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        role: '',
        goal: '',
        expectedOutput: '',
        backstory: '',
        instructions: '',
        sampleUserInput: ''
    });
    
    const [llmProvider, setLlmProvider] = useState<string | number>('impact');
    const [llmModel, setLlmModel] = useState<string | number>('impact-storm-11');
    
    // Knowledge Base selection state
    const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string | number>('');

    // AI Framework selection state
    const [selectedAiFramework, setSelectedAiFramework] = useState<string | number>('');

    // MCP Servers configuration state
    const [mcpServersInput, setMcpServersInput] = useState('');
    const [parsedMcpServers, setParsedMcpServers] = useState<McpServerPayload[]>([]);
    const [mcpServersError, setMcpServersError] = useState<string | null>(null);
    
    // Chat/Conversation state
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentMessage, setCurrentMessage] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false); // Allow form editing during initial load
    
    // Spinner states
    const [spinnerState, setSpinnerState] = useState<number>(0);
    const spinnerTexts = [
        "Loading conversation interface...",
        "Initializing neural pathways...",
        "Preparing Agent for the best possible conversation experience...",
        "Processing your request...",
        "Response ready!"
    ];

    // Modal state
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);
    
  
  // Multi-select tools state
  const [selectedTools, setSelectedTools] = useState<(string | number)[]>([]);

  // Core Features state
  const [knowledgeBase, setKnowledgeBase] = useState<boolean>(false);
  const [dataQuery, setDataQuery] = useState<boolean>(false);
  const [memory, setMemory] = useState<boolean>(false);

  // Advanced Features state
  const [verbose, setVerbose] = useState<boolean>(false);
  const [longTermMemory, setLongTermMemory] = useState<boolean>(false);
  const [shortTermMemory, setShortTermMemory] = useState<boolean>(false);
  const [planning, setPlanning] = useState<boolean>(false);
  const [guardrailsReq, setGuardrailsReq] = useState<boolean>(false);

    // Spinner control - ensure it runs full cycle regardless of API completion
    const [showLoadingSpinner, setShowLoadingSpinner] = useState(true);

    // Unsaved changes tracking
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const [originalData, setOriginalData] = useState<AgentResponse | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Track component mount state for cleanup
    const isMountedRef = useRef<boolean>(true);


  // Tools options from API data - ensure we have valid data before mapping
  const toolsOptions = Array.isArray(toolsData) && toolsData.length > 0 
    ? toolsData.map(tool => ({
        value: tool.id,
        label: tool.name,
        disabled: false
      }))
    : [];

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
    console.warn('[ManageAgent] Knowledge cards error:', knowledgeCardsError);
  }

    // Tab configuration
    const tabs = [
        { id: 'basic' as TabType, label: 'Basic', icon: <BasicIcon /> },
        { id: 'behaviour' as TabType, label: 'Behaviour', icon: <BehaviorIcon /> },
        { id: 'advanced' as TabType, label: 'Advanced', icon: <AdvancedIcon /> }
    ];


    // Cleanup effect to handle component unmounting during streaming
    useEffect(() => {
        isMountedRef.current = true;
        
        return () => {
            isMountedRef.current = false;
            // Component is unmounting - any ongoing streams will be cleaned up by useAgentStreaming
            console.log('[ManageAgent] Component unmounting, streams will be cleaned up gracefully');
        };
    }, []);

    // Effect to populate form data when agentData is loaded
    useEffect(() => {
        if (agentData) {
            // Store original data for change detection
            setOriginalData(agentData);

            // Basic Tab data
            setFormData({
                name: agentData.name || '',
                description: agentData.description || '',
                role: agentData.role || '',
                goal: agentData.goal || '',
                expectedOutput: agentData.expectedOutput || '',
                backstory: agentData.backstory || '',
                instructions: agentData.instructions || '',
                sampleUserInput: agentData.sample_user_input || ''
            });

            // LLM Configuration
            setLlmProvider(agentData.llmProvider || 'impact');
            setLlmModel(agentData.llmModel || 'impact-storm-11');

            // Knowledge Base selection
            setSelectedKnowledgeBase(agentData.knowledge_base_id || '');

            // AI Framework selection
            setSelectedAiFramework(agentData.ai_framework || '');

            const loadedMcpServers = agentData.mcp_servers ?? [];
            setParsedMcpServers(loadedMcpServers);
            setMcpServersInput(serializeMcpServersToJson(loadedMcpServers));
            setMcpServersError(null);

            // Selected Tools (map tool IDs from agentData.tools)
            setSelectedTools(agentData.tools || []);

            // Advanced Features
            setKnowledgeBase(agentData.features?.knowledgeBase || false);
            setDataQuery(agentData.features?.dataQuery || false);
            setMemory(agentData.enable_memory || false);
            setVerbose(agentData.verbose || false);
            setLongTermMemory(agentData.enable_long_term_memory || false);
            setShortTermMemory(agentData.enable_short_term_memory || false);
            setPlanning(agentData.enable_planning || false);
            setGuardrailsReq(agentData.guardrails_req || false);

            // Reset unsaved changes when data loads
            setHasUnsavedChanges(false);
        }
    }, [agentData]);


    // Hide spinner after full duration (7.5 seconds total: 4 stages * 1.5s + 1.5s completion)
    useEffect(() => {
        const totalSpinnerDuration = 7500; // 7.5 seconds
        const timer = setTimeout(() => {
            setShowLoadingSpinner(false);
        }, totalSpinnerDuration);

        return () => clearTimeout(timer);
    }, []); // Empty dependency array - runs once on mount

    // Change detection effect
    useEffect(() => {
        if (!originalData) return;

        // Compare all form fields with original data
        const hasChanges = (
            formData.name !== (originalData.name || '') ||
            formData.description !== (originalData.description || '') ||
            formData.role !== (originalData.role || '') ||
            formData.goal !== (originalData.goal || '') ||
            formData.expectedOutput !== (originalData.expectedOutput || '') ||
            formData.backstory !== (originalData.backstory || '') ||
            formData.instructions !== (originalData.instructions || '') ||
            formData.sampleUserInput !== (originalData.sample_user_input || '') ||
            llmProvider !== (originalData.llmProvider || 'impact') ||
            llmModel !== (originalData.llmModel || 'impact-storm-11') ||
            selectedKnowledgeBase !== (originalData.knowledge_base_id || '') ||
            selectedAiFramework !== (originalData.ai_framework || '') ||
            !areMcpServersEqual(parsedMcpServers, originalData.mcp_servers) ||
            mcpServersInput !== serializeMcpServersToJson(originalData.mcp_servers) ||
            JSON.stringify(selectedTools.sort()) !== JSON.stringify((originalData.tools || []).sort()) ||
            knowledgeBase !== (originalData.features?.knowledgeBase || false) ||
            dataQuery !== (originalData.features?.dataQuery || false) ||
            memory !== (originalData.enable_memory || false) ||
            verbose !== (originalData.verbose || false) ||
            longTermMemory !== (originalData.enable_long_term_memory || false) ||
            shortTermMemory !== (originalData.enable_short_term_memory || false) ||
            planning !== (originalData.enable_planning || false) ||
            guardrailsReq !== (originalData.guardrails_req || false)
        );

        setHasUnsavedChanges(hasChanges);
    }, [
        formData, llmProvider, llmModel, selectedKnowledgeBase, selectedAiFramework,
        mcpServersInput, parsedMcpServers, selectedTools, 
        knowledgeBase, dataQuery, memory, verbose, 
        longTermMemory, shortTermMemory, planning, guardrailsReq, originalData
    ]);

    // Handler for form field changes
    const handleFormFieldChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Handler for tools multi-selection
    const handleToolsChange = (values: (string | number)[]) => {
        setSelectedTools(values);
    };

    // Handler for LLM provider selection
    const handleLlmProviderChange = (value: string | number) => {
        setLlmProvider(value);
    };

    // Handler for LLM model selection
    const handleLlmModelChange = (value: string | number) => {
        setLlmModel(value);
    };

    // Handler for knowledge base selection
    const handleKnowledgeBaseChange = (value: string | number) => {
        setSelectedKnowledgeBase(value);
    };

    const handleAiFrameworkChange = (value: string | number) => {
        setSelectedAiFramework(value);
    };

    // Core Features toggle handlers
    const handleKnowledgeBaseToggle = (checked: boolean) => {
        setKnowledgeBase(checked);
    };

    const handleDataQueryToggle = (checked: boolean) => {
        setDataQuery(checked);
    };

    const handleMemoryToggle = (checked: boolean) => {
        setMemory(checked);
    };

    // Advanced Features toggle handlers
    const handleVerboseToggle = (checked: boolean) => {
        setVerbose(checked);
    };

    const handleLongTermMemoryToggle = (checked: boolean) => {
        setLongTermMemory(checked);
    };

    const handleShortTermMemoryToggle = (checked: boolean) => {
        setShortTermMemory(checked);
    };

    const handlePlanningToggle = (checked: boolean) => {
        setPlanning(checked);
    };

    const handleGuardrailsReqToggle = (checked: boolean) => {
        setGuardrailsReq(checked);
    };

    // Parse sample_user_input into examples array
    const getExamplesFromSampleInput = (sampleInput: string): string[] => {
        if (!sampleInput || !sampleInput.trim()) {
            return [];
        }
        
        // Try to parse as JSON array first
        try {
            const parsed = JSON.parse(sampleInput);
            if (Array.isArray(parsed)) {
                return parsed.filter(item => typeof item === 'string' && item.trim().length > 0);
            }
        } catch {
            // Not JSON, continue with other parsing methods
        }
        
        // Split by common delimiters and clean up
        const delimiters = /[,;|\n]/;
        const examples = sampleInput
            .split(delimiters)
            .map(item => item.trim())
            .filter(item => item.length > 0);
            
        return examples.length > 0 ? examples : [sampleInput.trim()];
    };

    // Save changes handler
    const handleSaveChanges = async () => {
        if (!agentId) return;

        setIsSaving(true);

        try {
            const mcpServersResult = validateMcpServersJson(mcpServersInput);
            if (!mcpServersResult.valid) {
                setMcpServersError(mcpServersResult.error);
                showError(mcpServersResult.error);
                return;
            }

            // Take all current field values and send them
            const updateData: AgentCreate = {
                name: formData.name,
                description: formData.description,
                llmProvider: llmProvider as string,
                llmModel: llmModel as string,
                apiKey: "***************", // Keep existing
                role: formData.role,
                goal: formData.goal,
                expectedOutput: formData.expectedOutput,
                backstory: formData.backstory,
                instructions: formData.instructions,
                sample_user_input: formData.sampleUserInput,
                ai_framework: selectedAiFramework ? selectedAiFramework.toString() : undefined,
                mcp_servers: mcpServersResult.servers,
                knowledge_base_id: selectedKnowledgeBase ? selectedKnowledgeBase.toString() : null,
                tools: selectedTools as string[],
                features: {
                    knowledgeBase,
                    dataQuery
                },
                verbose,
                enable_memory: memory,
                enable_planning: planning,
                enable_short_term_memory: shortTermMemory,
                enable_long_term_memory: longTermMemory,
                guardrails_req: guardrailsReq,
                raw_output: false,
                advanced_tools: []
            };

            await AgentService.updateAgent(agentId, updateData);

            setParsedMcpServers(mcpServersResult.servers);
            setMcpServersInput(mcpServersResult.formatted || serializeMcpServersToJson(mcpServersResult.servers));
            setMcpServersError(null);
            
            // Update original data to reflect saved changes
            if (agentData) {
                const updatedData = {
                    ...agentData,
                    ...updateData,
                    expectedOutput: updateData.expectedOutput,
                    sample_user_input: updateData.sample_user_input,
                    ai_framework: updateData.ai_framework,
                    mcp_servers: updateData.mcp_servers,
                    guardrails_req: updateData.guardrails_req
                };
                setOriginalData(updatedData as AgentResponse);
            }
            
            setHasUnsavedChanges(false);

        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Agent API modal handler
    const handleOpenApiModal = () => {
        setIsApiModalOpen(true);
    };

    const handleCloseApiModal = () => {
        setIsApiModalOpen(false);
      };

    const handleTabClick = (tabId: TabType) => {
        setActiveTab(tabId);
    };

    const handleRightPanelToggle = () => {
        setIsRightPanelCollapsed(!isRightPanelCollapsed);
    };

    // Chat/Message handlers
    const sendMessage = async (text: string) => {
        if (!text.trim() || !agentId) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: text.trim(),
            type: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setCurrentMessage('');
        setIsTyping(true);
        setSpinnerState(3); // Keep spinner at stage 3 during API call
        
        try {
            // Call the real API
            const response = await AgentService.sendMessage({
                agentId: agentId,
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
            
            // Complete the spinner (move to final stage)
            setSpinnerState(4);
            setTimeout(() => {
                setIsTyping(false);
                setSpinnerState(0);
            }, 1500); // Show completion for 1.5s
            
        } catch (error) {
            console.error('Failed to send message:', error);
            
            // Show error message
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

    // Spinner state progression: Start at 0, go to 1, 2, then stay at 3 until API responds
    useEffect(() => {
        if (isTyping && spinnerState < 3) {
            // Only auto-progress to stage 3, then wait for API
            const timeoutIds: ReturnType<typeof setTimeout>[] = [];
            
            if (spinnerState === 0) {
                // State 0 → 1 (after 1 second)
                timeoutIds.push(setTimeout(() => setSpinnerState(1), 1000));
            } else if (spinnerState === 1) {
                // State 1 → 2 (after 1 second)
                timeoutIds.push(setTimeout(() => setSpinnerState(2), 1000));
            } else if (spinnerState === 2) {
                // State 2 → 3 (after 1 second) - then stay at 3 until API responds
                timeoutIds.push(setTimeout(() => setSpinnerState(3), 1000));
            }
            
            // Cleanup function to clear all timeouts
            return () => {
                timeoutIds.forEach(clearTimeout);
            };
        }
    }, [isTyping, spinnerState]);

    // Show error state if there's an error (overrides spinner)
    if (error) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2>Error Loading Agent</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/agents')}>Back to Agents</button>
            </div>
        );
    }

    // Show loading spinner for full duration regardless of API completion
    if (showLoadingSpinner) {
        return (
            <div className="loading-overlay">
                <LaunchAgentSpinner />
            </div>
        );
    }

    // Additional check - if APIs still loading but spinner finished, wait for data
    if (isLoading || !agentData) {
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
                    <div className="manage-agent__right-content-body-form scrollbar-hidden">
                        <TextInput 
                            label='Agent name' 
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
                        <div className="manage-agent__right-content-body-form-tools">
                            <Dropdown 
                                key={`tools-dropdown-${toolsOptions.length}`}
                                label="Tools" 
                                placeholder="Select tools for your agent" 
                                multiSelect={true}
                                options={toolsOptions} 
                                selectedValues={selectedTools} 
                                onMultiChange={handleToolsChange}
                                maxVisibleTags={3}
                            />
                        </div>
                        <div className="manage-agent__right-content-body-form-knowledge">
                            <Dropdown 
                                label="Knowledge Base" 
                                placeholder={knowledgeCardsLoading ? "Loading..." : "Select"} 
                                options={knowledgeBaseOptions}
                                value={selectedKnowledgeBase}
                                onChange={handleKnowledgeBaseChange}
                                disabled={knowledgeCardsLoading || isTyping}
                            />
                        </div>
                        <div className="manage-agent__right-content-body-form-llmfields">
                            <Dropdown
                                label="AI Framework"
                                placeholder="Select"
                                options={aiFrameworkOptions}
                                value={selectedAiFramework}
                                onChange={handleAiFrameworkChange}
                                disabled={isTyping}
                            />
                            <Dropdown 
                                label="LLM Provider" 
                                placeholder="Select" 
                                options={llmProviderOptions} 
                                value={llmProvider} 
                                onChange={handleLlmProviderChange} 
                                disabled={isTyping}
                            />
                            <Dropdown 
                                label="LLM Model" 
                                placeholder="Select" 
                                options={llmModelOptions} 
                                value={llmModel} 
                                onChange={handleLlmModelChange} 
                                disabled={isTyping}
                            />
                        </div>
                        <div className="manage-agent__right-content-body-form-mcp">
                            <McpServersField
                                value={mcpServersInput}
                                onChange={setMcpServersInput}
                                parsedServers={parsedMcpServers}
                                onParsedServersChange={setParsedMcpServers}
                                error={mcpServersError}
                                onErrorChange={setMcpServersError}
                            />
                        </div>
                    </div>
                );
            case 'behaviour':
                return (
                    <div className="manage-agent__right-content-body-form scrollbar-hidden">
                        <TextInput 
                            label="Agent role" 
                            value={formData.role}
                            onChange={(value) => handleFormFieldChange('role', value)}
                            disabled={isTyping} 
                        />
                        <TextBox 
                            label="Agent goal" 
                            width="100%" 
                            value={formData.goal}
                            onChange={(value) => handleFormFieldChange('goal', value)}
                            disabled={isTyping} 
                        />
                        <TextBox 
                            label="Expected output" 
                            width="100%" 
                            value={formData.expectedOutput}
                            onChange={(value) => handleFormFieldChange('expectedOutput', value)}
                            disabled={isTyping} 
                        />
                        <TextBox 
                            label="Agent backstory" 
                            width="100%" 
                            value={formData.backstory}
                            onChange={(value) => handleFormFieldChange('backstory', value)}
                            disabled={isTyping} 
                        />
                        <TextBox 
                            label="Agent instructions" 
                            width="100%" 
                            value={formData.instructions}
                            onChange={(value) => handleFormFieldChange('instructions', value)}
                            disabled={isTyping} 
                        />
                        <TextInput 
                            label="Sample user input" 
                            value={formData.sampleUserInput}
                            onChange={(value) => handleFormFieldChange('sampleUserInput', value)}
                            disabled={isTyping} 
                        />
                    </div>
                );
            case 'advanced':
                return (
                    <div className="manage-agent__right-content-body-form scrollbar-hidden">
                        <div className="manage-agent__right-content-body-form-advanced">
                            <div className="manage-agent__right-content-body-form-advanced-features">
                                <div className={`manage-agent__right-content-body-form-advanced-features-title ${isTyping ? 'disabled' : ''}`}>
                                    <img src={newFeatureIcon} alt="new feature" />
                                    <span>Core Features</span>
                                </div>
                                <div className="manage-agent__right-content-body-form-advanced-features-toggles">
                                    <div className={`manage-agent__right-content-body-form-advanced-features-toggle ${isTyping ? 'disabled' : ''}`}>
                                        <span>Knowledge Base</span>
                                        <Toggle 
                                            checked={knowledgeBase}
                                            onChange={handleKnowledgeBaseToggle}
                                            disabled={isTyping}
                                        />
                                    </div>
                                    <div className={`manage-agent__right-content-body-form-advanced-features-toggle ${isTyping ? 'disabled' : ''}`}>
                                        <span>Data Query</span>
                                        <Toggle 
                                            checked={dataQuery}
                                            onChange={handleDataQueryToggle}
                                            disabled={isTyping}
                                        />
                                    </div>
                                    <div className={`manage-agent__right-content-body-form-advanced-features-toggle ${isTyping ? 'disabled' : ''}`}>
                                        <span>Memory</span>
                                        <Toggle 
                                            checked={memory}
                                            onChange={handleMemoryToggle}
                                            disabled={isTyping}
                                        />
                                    </div>
                                    <div className={`manage-agent__right-content-body-form-advanced-features-toggle ${isTyping ? 'disabled' : ''}`}>
                                        <span>Verbose</span>
                                        <Toggle 
                                            checked={verbose}
                                            onChange={handleVerboseToggle}
                                            disabled={isTyping}
                                        />
                                    </div>
                                    <div className={`manage-agent__right-content-body-form-advanced-features-toggle ${isTyping ? 'disabled' : ''}`}>
                                        <span>Guardrails Required</span>
                                        <Toggle 
                                            checked={guardrailsReq}
                                            onChange={handleGuardrailsReqToggle}
                                            disabled={isTyping}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="manage-agent__right-content-body-form-advanced-features">
                                <div className={`manage-agent__right-content-body-form-advanced-features-title ${isTyping ? 'disabled' : ''}`}>
                                    <img src={newFeatureIcon} alt="new feature" />
                                    <span>Memory Features</span>
                                </div>
                                <div className="manage-agent__right-content-body-form-advanced-features-toggles">
                                    <div className={`manage-agent__right-content-body-form-advanced-features-toggle ${isTyping ? 'disabled' : ''}`}>
                                        <span>Long Term Memory</span>
                                        <Toggle 
                                            checked={longTermMemory}
                                            onChange={handleLongTermMemoryToggle}
                                            disabled={isTyping}
                                        />
                                    </div>
                                    <div className={`manage-agent__right-content-body-form-advanced-features-toggle ${isTyping ? 'disabled' : ''}`}>
                                        <span>Short Term Memory</span>
                                        <Toggle 
                                            checked={shortTermMemory}
                                            onChange={handleShortTermMemoryToggle}
                                            disabled={isTyping}
                                        />
                                    </div>
                                    <div className={`manage-agent__right-content-body-form-advanced-features-toggle ${isTyping ? 'disabled' : ''}`}>
                                        <span>Planning</span>
                                        <Toggle 
                                            checked={planning}
                                            onChange={handlePlanningToggle}
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
        <div className={`manage-agent ${isRightPanelCollapsed ? 'right-collapsed' : ''}`}>
            <AgentChatInterface
                agentId={agentId || ''} // Required for streaming API calls
                guardrailsReq={guardrailsReq}
                messages={messages}
                currentMessage={currentMessage}
                isTyping={isTyping}
                spinnerState={spinnerState}
                spinnerTexts={spinnerTexts}
                onMessageChange={handleMessageChange}
                onExampleClick={handleExampleClick}
                backPath="/agents"
                title="Test Agent Interface"
                description="See how your agent talks before it meets your users"
                examples={getExamplesFromSampleInput(formData.sampleUserInput)}
            />
            {isRightPanelCollapsed && (
                <div className="manage-agent__expand-button" onClick={handleRightPanelToggle}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <g clip-path="url(#clip0_3365_6080)">
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
            <div className={`manage-agent__right`}>
                <div className="manage-agent__right-header">
                    <div className="manage-agent__right-header-text">
                        <div className="manage-agent__right-header-text-title">
                            <span>Manage Agent</span>
                        </div>
                        <div className="manage-agent__right-header-text-desc">
                            <span>Configure your AI agent's behavior and capabilities</span>
                        </div>
                    </div>
                    <div className="manage-agent__right-header-icon" onClick={handleRightPanelToggle} style={{cursor: 'pointer'}}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none">
                        <path d="M20.8569 9.88605C21.0559 9.88605 21.2466 9.80703 21.3873 9.66638C21.5279 9.52572 21.6069 9.33496 21.6069 9.13605C21.6069 8.93713 21.5279 8.74637 21.3873 8.60572C21.2466 8.46506 21.0559 8.38605 20.8569 8.38605H16.8109L22.5309 2.66605C22.6675 2.52453 22.743 2.33504 22.7412 2.1384C22.7394 1.94175 22.6604 1.75367 22.5213 1.61468C22.3822 1.47569 22.194 1.3969 21.9974 1.39529C21.8007 1.39367 21.6113 1.46936 21.4699 1.60605L15.7499 7.32605V3.27805C15.7499 3.07913 15.6709 2.88837 15.5303 2.74772C15.3896 2.60706 15.1989 2.52805 14.9999 2.52805C14.801 2.52805 14.6103 2.60706 14.4696 2.74772C14.329 2.88837 14.2499 3.07913 14.2499 3.27805V9.13605C14.2499 9.55005 14.5859 9.88605 14.9999 9.88605H20.8569ZM3.14294 14.386C2.94403 14.386 2.75327 14.4651 2.61261 14.6057C2.47196 14.7464 2.39294 14.9371 2.39294 15.136C2.39294 15.335 2.47196 15.5257 2.61261 15.6664C2.75327 15.807 2.94403 15.886 3.14294 15.886H7.18894L1.46894 21.606C1.39734 21.6753 1.34025 21.7581 1.30098 21.8496C1.26172 21.9411 1.24108 22.0395 1.24026 22.1391C1.23944 22.2387 1.25846 22.3374 1.29622 22.4296C1.33397 22.5217 1.3897 22.6055 1.46015 22.6758C1.53061 22.7462 1.61437 22.8019 1.70656 22.8395C1.79875 22.8772 1.89752 22.8961 1.9971 22.8952C2.09669 22.8943 2.19509 22.8736 2.28658 22.8342C2.37806 22.7949 2.46079 22.7377 2.52994 22.666L8.24994 16.946V20.993C8.24994 21.192 8.32896 21.3827 8.46961 21.5234C8.61027 21.664 8.80103 21.743 8.99994 21.743C9.19885 21.743 9.38962 21.664 9.53027 21.5234C9.67093 21.3827 9.74994 21.192 9.74994 20.993V15.136C9.74994 14.9371 9.67093 14.7464 9.53027 14.6057C9.38962 14.4651 9.19885 14.386 8.99994 14.386H3.14294Z" fill="#4B5767"/>
                    </svg>
                    </div>
                </div>
                <div className="manage-agent__right-content">
                    <div className="manage-agent__right-content-body">
                        <div className="manage-agent__right-content-body-header">
                            <div className="manage-agent__right-content-body-header-tabs">
                                {tabs.map((tab) => (
                                    <div
                                        key={tab.id}
                                        className={`manage-agent__tab ${activeTab === tab.id ? 'active' : ''}`}
                                        onClick={() => handleTabClick(tab.id)}
                                    >
                                        <div className="manage-agent__tab-icon">
                                            {tab.icon}
                                        </div>
                                        <span className="manage-agent__tab-text">
                                            {tab.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="manage-agent__right-content-body-header-labels">
                                {hasUnsavedChanges && <SubtleOrangeIconLabel>Unsaved Changes</SubtleOrangeIconLabel>}
                                <SubtleGreenIconLabel>Live Changes</SubtleGreenIconLabel>
                            </div>
                        </div>
                        {renderTabContent()}
                    </div>
                    <div className="manage-agent__right-content-buttons">
                        <SecondaryLargeButton 
                            width="100%" 
                            disabled={isTyping || isSaving || !hasUnsavedChanges}
                            onClick={handleSaveChanges}
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </SecondaryLargeButton>
                        <SecondaryLargeButton 
                            width="100%" 
                            onClick={handleOpenApiModal}
                        >
                            Agent API
                        </SecondaryLargeButton>
                    </div>
                </div>
            </div>
            {isApiModalOpen && (
                <div className="modal-overlay" onClick={handleCloseApiModal}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <ApiReferenceModal onClose={handleCloseApiModal} agentId={agentId || ''} userInput={formData.sampleUserInput} />
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageAgent;
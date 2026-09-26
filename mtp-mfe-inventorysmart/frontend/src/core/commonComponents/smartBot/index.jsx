import { cloneDeep, isEmpty, throttle } from "lodash";
import { useEffect, useState, useCallback, useRef } from "react";
import ChatFooter from "./components/ChatFooter";
import SavedChat from "./components/SavedChat";
import ChatLayout from "./components/ChatLayout";
import MessageTemplate from "./components/message-template";
import ModuleSelection from "./components/ModuleSelection";
import { useBotConfiguration } from "./hooks/useBotConfiguration";
import { useChatFlow } from "./hooks/useChatFlow";
import { useChatSession } from "./hooks/useChatSession";
import { useChatState } from "./hooks/useChatState";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import ConfirmationDialog from "./impact-ui-components/ConfirmationDialog";
import ChatPlaceholder from "./components/ChatPlaceholder";
import { useAgentFlow } from "./hooks/useAgentFlow";
import { getDynamicFunction } from "./utlis";
import { ChatBotComponent, Modal } from "impact-ui-v3";
import { handleMessageLike } from "./utlis";
import BotMessage from "./components/message-template/components/message-types/BotMessage";
import AgentIcon from "coreAssets/chatbot/agent_icon.svg";
import SavedFiltersIcon from "coreAssets/chatbot/saveFilterTab.svg";
import NavigationIcon from "coreAssets/chatbot/navigation_icon.svg";
import GenericModuleIcon from "coreAssets/chatbot/genericModuleIcon.svg";
import { fetchScreensForModule, getAgentExceptionUserList, getAgentVisibilityData } from "./services/chatbot-services";
import { useSelector } from "react-redux";
import { setChatbotContext, setHierarchyKeyValue, setThinkingContext, setCurrentAgentChatId, setSavedFilterSets as setSavedFilterSetsAction, clearPersistedFormValues, setStepFormStreamData, setMinimizedStreamData, setChatbotFilterOptions } from "core/actions/smartBotActions";
import { fetchLegacyAgentScreen } from "core/Utils/functions/utils";
import MemoryModal from "./components/memory-modal";
import UploadModal from "./components/upload-modal";
import SettingsIcon from "coreAssets/chatbot/settings_icon.svg";
import UploadIcon from "coreAssets/chatbot/upload_icon.svg";
import RefreshIcon from "coreAssets/chatbot/refresh_icon.svg";
import { getFormattedApplicationName } from "core/Utils/functions/utils";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { triggerRefresh, fetchChatbotFilterConfig } from "./services/chatbot-services";
import { getFilterUserConfiguration } from "core/actions/filterAction";
import ChatbotInput from "./components/chatbot-input";
import { chatbotFilterCustomConfig } from "./temp.js";
import { useConversationManagement } from './hooks/useConversationManagement';
import ChatbotSaveFilterComponent from "./components/chatbot-save-filter-component/ChatbotSaveFilterComponent";
import { stepFormStreamControl } from "./components/message-template/components/message-content/ButtonContent";
import MinimizedChatWidget from "./components/MinimizedChatWidget";
import { resetActiveTabularInstance } from "./components/message-template/components/message-content/tabular-content/index.js";
import moment from "moment";
import { dateFormat } from "./components/message-template/utils";
import { getApplicationCodeFromURL } from "core/Utils/utils";




const SmartBot = (props) => {
  const { userName, partialClose, setPartialClose, forceOpen, customBaseUrl = "", displayQuestions, questions = [] } = props;
  const {
    showModal,
    setShowModal,
    minimizedMode,
    setMinimizedMode,
    userInput,
    setUserInput,
    position,
    setPosition,
    flowType,
    setFlowType,
    screenName,
    setScreenName,
    questionIndex,
    setQuestionIndex,
    currentAppLink,
    setCurrentAppLink,
    loader,
    setLoader,
    enableRefreshAction,
    setEnableRefreshAction,
    refreshLoader,
    setRefreshLoader,
    chatDataState,
    setChatDataState,
    showExtendedContent,
    setShowExtendedContent,
    currentMode,
    setCurrentMode,
    selectedModule,
    setSelectedModule,
    isCardVisible,
    setIsCardVisible,
    templateData,
    setTemplateData,
    showAlert,
    setShowAlert,
    grabPositionRef,
    chatDataRef,
    chatBodyRef,
    minimizedBtnRef,
    chatDataScreenLinkRef,
    navigate,
    location,
    dispatch,
    globalClasses,
    classes,
    dateFormat,
    filterReducerState,
    activeConversationId,
    setActiveConversationId,
    isModuleChanged,
    setIsModuleChanged,
    showChatPlaceholder,
    setShowChatPlaceholder,
    currentAgentId,
    setCurrentAgentId,
    baseUrl = customBaseUrl,
    setBaseUrl,
    currentSessionId,
    setCurrentSessionId,
    notificationData,
    agentTaskCompleted,
    setAgentTaskCompleted,
    customChatConfig,
    setCustomChatConfig,
    setMiddleWareFunction,
    chatBotInfoRef,
    chatDataInfoRef,
    initValue,
    setInitValue,
    sessionId,
    setSessionId,
    thinkingContent,
    setThinkingContent,
    isThinking,
    setIsThinking,
    chatId,
    setChatId,
    isStop,
    setIsStop,
    functionsRef,
    functionsState,
    setFunctionsState,
    thinkingHeaderMessage,
    setThinkingHeaderMessage,
    legacyAgentScreen,
    setLegacyAgentScreen,
    uniqueChatId,
    setUniqueChatId,
    fieldNumber,
    setFieldNumber,
    thinkingContext,
    isModalOpen,
    setIsModalOpen,
    utilityList,
    setUtilityList,
    isUploadModalOpen,
    setIsUploadModalOpen,
    isRefreshTriggered,
    setIsRefreshTriggered,
    additionalArgs,
    setAdditionalArgs,
    showSavedFilters,
    setShowSavedFilters,
    navSessionId,
    setNavSessionId,
  } = useChatState();

  // Helper function to create a clean copy without circular references
  const createCleanCopy = (obj, maxDepth = Infinity, currentDepth = 0) => {
    try {
      if (currentDepth > maxDepth) return "[Max Depth Reached]";
      if (obj === null || typeof obj !== "object") return obj;
      if (obj instanceof Date) return obj.toISOString();
      if (obj instanceof Array) {
        return obj.map(item => createCleanCopy(item, maxDepth, currentDepth + 1));
      }
      
      const copy = {};
      const seenObjects = new WeakSet(); // Handle circular references
      
      for (const key in obj) {
        try {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            
            // Check for circular reference
            // if (typeof value === 'object' && value !== null) {
            //   if (seenObjects.has(value)) {
            //     copy[key] = "[Circular Reference]";
            //     continue;
            //   }
            //   seenObjects.add(value);
            // }
            if (currentMode === "navigation") {
              if (
                typeof value === "function" ||
                key === "jsx" ||
                key.includes("Ref") ||
                key === "thinkingContent"
              ) {
                continue;
              }
            }
            // Skip only functions and Ref properties, but keep jsx
            if (typeof value === "function" || key === "jsx" || key.includes("Ref")) {
              continue;
            }
            
            copy[key] = createCleanCopy(value, maxDepth, currentDepth + 1);
          }
        } catch (propertyError) {
          // copy[key] = "[Error: Unable to copy property]";
          console.warn(`Error copying property ${key}:`, propertyError);
        }
      }
      return copy;
    } catch (error) {
      console.error("Error in createCleanCopy:", error);
      displaySnackMessages("Something went wrong", "error");
      return obj === null || obj === undefined ? obj : "[Error: Unable to create clean copy]";
    }
  };

  // Add state for confirmation dialogs
  const [showModeConfirmDialog, setShowModeConfirmDialog] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);
  const [showCloseConfirmDialog, setShowCloseConfirmDialog] = useState(false);
  const [showAgentModeDialog, setShowAgentModeDialog] = useState(false);
  const [conversation, setConversation] = useState({});
  const { chatbotContext, currentAgentChatId, minimizedStreamData } = useSelector((state) => state.smartBotReducer);
  const savedFilterDashboard = useSelector((state) => state.filterReducer?.savedFilterDashboard);
  // Per-mode conversation ID tracking — prevents cross-mode contamination when
  // switching tabs while streams are pending.
  const modeConversationIdRef = useRef({});
  const activeConversationIdRef = useRef(activeConversationId);
  const activeTab = useRef({
    activeTab: "dashboard",
  });
  const [loadingState, setLoadingState] = useState({
    like: null,
    dislike: null,
  });
  const [newChatScreen, setNewChatScreen] = useState(false);
  const [hideMenu, setHideMenu] = useState(true);
  const { handleMouseDown, isDraggingRef } = useDragAndDrop(
    minimizedBtnRef,
    setPosition
  );
  const [applicationCode, setApplicationCode] = useState(1);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modules, setModules] = useState([]);
  const [isLandingScreen, setIsLandingScreen] = useState(true);
  const [showSuggestionBanner, setShowSuggestionBanner] = useState(true);
  const [filterOptions, setFilterOptions] = useState([]);
  const [savedFilterSets, setSavedFilterSets] = useState([]);
  const [selectedFilterSet, setSelectedFilterSet] = useState(null);
  const [answerMode, setAnswerMode] = useState("auto");
  const [chatBotWidth, setChatBotWidth] = useState(null);
  const [tabList, setTabList] = useState([]);
  const conversationIdRef = useRef(0);



  const {
    setUserFlow,
    setUserScreenAndFlow,
    fetchUserResultsFromQuery,
    getCurrentDateTimeString,
    setLink,
  } = useChatFlow(
    chatDataRef,
    setLoader,
    setFlowType,
    setScreenName,
    setUserInput,
    setQuestionIndex,
    setCurrentAppLink,
    flowType,
    screenName,
    questionIndex,
    userInput,
    dateFormat,
    currentMode,
    activeConversationId,
    setIsModuleChanged,
    chatBodyRef,
    filterReducerState,
    dispatch,
    navigate,
    setShowChatPlaceholder,
    baseUrl,
    setChatDataState,
    setCurrentSessionId,
    customChatConfig,
    chatDataInfoRef,
    chatbotContext,
    setInitValue,
    setSessionId,
    thinkingContent,
    setThinkingContent,
    isThinking,
    setIsThinking,
    chatId,
    setChatId,
    isStop,
    setIsStop,
    functionsRef,
    functionsState,
    setFunctionsState,
    thinkingHeaderMessage,
    setThinkingHeaderMessage,
    uniqueChatId,
    initValue,
    sessionId,
    fieldNumber,
    setFieldNumber,
    additionalArgs,
    setActiveConversationId,
    navSessionId,
    setNavSessionId
  );

  const {
    parseSavedFlow,
    saveCurrentChanges,
    endCurrentSession,
    clearChatSession,
    initiateNewChat,
    hasUnsavedChanges,
  } = useChatSession(
    chatDataRef,
    setFlowType,
    setScreenName,
    setUserInput,
    setTemplateData,
    chatDataScreenLinkRef,
    setShowModal,
    setMinimizedMode,
    setSelectedModule,
    setChatDataState,
    currentMode,
    setUserFlow,
    getCurrentDateTimeString,
    setCurrentAppLink,
    selectedModule,
    fetchUserResultsFromQuery,
    props.closeBot,
    activeConversationId,
    setActiveConversationId,
    setShowChatPlaceholder
  );

  const {
    refreshAndUpdateUserManual,
    configureBotActions,
    displaySnackMessages,
  } = useBotConfiguration(setRefreshLoader, setEnableRefreshAction, dispatch);

  const { prepareDataAndSendToAgent, processResponse } = useAgentFlow(
    dateFormat,
    chatDataRef,
    currentMode,
    setShowChatPlaceholder,
    setLoader,
    baseUrl,
    setCurrentSessionId,
    customChatConfig,
    chatDataInfoRef,
    {
      setChatDataState,
      activeConversationId,
      setActiveConversationId,
      chatBodyRef,
      runStreaming: true,
      chatbotContext,
      setInitValue,
      setSessionId,
      thinkingContent: thinkingContext?.thinkingContent,
      setThinkingContent,
      isThinking,
      setIsThinking,
      chatId,
      setChatId,
      isStop,
      setIsStop,
      functionsRef,
      functionsState,
      setFunctionsState,
      thinkingHeaderMessage: thinkingContext?.thinkingHeaderMessage,
      setThinkingHeaderMessage,
      uniqueChatId,
      setUniqueChatId,
      fieldNumber,
      setFieldNumber,
      setAdditionalArgs,
    }
  );

  // Keep activeConversationIdRef in sync so event handlers with [] deps can access the latest value
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Show/hide stop icon when step-form restream (second init API from ButtonContent) starts/ends.
  // Must live here (SmartBot) because StreamedContent unmounts after the first stream completes.
  useEffect(() => {
    const handleStepFormStreamStart = () => {
      setIsStop(true);
      const abortStepFormStream = () => {
        if (stepFormStreamControl.abort) {
          stepFormStreamControl.abort();
        }
        setIsStop(false);
      };
      setFunctionsState((prev) => ({
        ...prev,
        abortStreaming: abortStepFormStream,
      }));
      if (functionsRef?.current) {
        functionsRef.current.abortStreaming = abortStepFormStream;
      }
    };

    const handleStepFormStreamEnd = () => {
      setIsStop(false);
      // Update the timestamp on the last bot message to reflect when the restream completed
      try {
        const mode = localStorage.getItem("currentModeData") || "agent";
        const convId = activeConversationIdRef.current;
        const messages = chatDataInfoRef?.current?.[mode]?.conversations?.[convId]?.messages;
        if (messages && messages.length > 0) {
          const lastBotIdx = messages.reduce((lastIdx, msg, idx) => 
            msg.userType === "bot" ? idx : lastIdx, -1);
          if (lastBotIdx !== -1) {
            messages[lastBotIdx].timeStamp = moment().format(dateFormat);
            // Trigger re-render so the UI reflects the updated timestamp
            setChatDataState((prev) => ({ ...prev }));
          }
        }
      } catch (e) {
        console.error("Error updating timestamp after step form stream:", e);
      }
    };

    // Update SmartBot-level initValue/sessionId when ButtonContent's stream receives completed/follow-up
    const handleStepFormInitStateUpdate = (e) => {
      const { initValue: newInitValue, sessionId: newSessionId, uniqueChatId: newChatId } = e.detail || {};
      if (newInitValue !== undefined) setInitValue(newInitValue);
      if (newSessionId !== undefined) {
        setSessionId(newSessionId);
        setCurrentSessionId(newSessionId);
      }
      if (newChatId !== undefined) setUniqueChatId(newChatId);
    };

    window.addEventListener("stepFormStreamStart", handleStepFormStreamStart);
    window.addEventListener("stepFormStreamEnd", handleStepFormStreamEnd);
    window.addEventListener("stepFormInitStateUpdate", handleStepFormInitStateUpdate);
    return () => {
      window.removeEventListener("stepFormStreamStart", handleStepFormStreamStart);
      window.removeEventListener("stepFormStreamEnd", handleStepFormStreamEnd);
      window.removeEventListener("stepFormInitStateUpdate", handleStepFormInitStateUpdate);
    };
  }, []);

  const fetchCustomBotConfigurations = async () => {
    try {
      // const response = await fetchCustomBotConfig(baseUrl);
      // if (response?.data?.data?.custom_config) {
      //   setCustomChatConfig(response.data.data.custom_config);
      // }
      let dummyData = {
        parserPath: "chatbot/customSmartBotParser",
        parserFunctionName: "customParseResponse",
        rendererPath: "chatbot/customSmartBotRenderer",
        rendererFunctionName: "customRender",
        middleWareFunctionName: "middleWareFunction",
        middleWareFunctionPath: "chatbot/middleware",
        useMiddleware: false,
      };
      let middleWareFunction = await getDynamicFunction(
        dummyData.middleWareFunctionPath,
        dummyData.middleWareFunctionName
      );
      setCustomChatConfig(dummyData);
      setMiddleWareFunction(middleWareFunction);
    } catch (error) {
      console.error("fetchCustomBotConfigurations error", error);
    }
  };

  // Handle mode change with confirmation if needed
  const handleModeChange = (newMode) => {
    if (newMode === currentMode) return;
    
    // Check if switching to agent mode and saved chat is open
    if (newMode === "agent" && showExtendedContent) {
      setShowAgentModeDialog(true);
      setPendingMode(newMode);
      return;
    }
    
    if (hasUnsavedChanges()) {
      // Show confirmation dialog and store the pending mode
      setShowModeConfirmDialog(true);
      setPendingMode(newMode);
    } else {
      // No unsaved changes, switch immediately
      switchToMode(newMode);
    }
  };
  
  // Function to handle the actual mode switch
  const switchToMode = (newMode) => {
    // If switching to agent mode, ensure extended content is closed
    if (newMode === "agent") {
      setShowExtendedContent(false);
    }

    // Save the current mode's conversation ID so we can restore it later
    if (currentMode && activeConversationId) {
      modeConversationIdRef.current[currentMode] = activeConversationId;
    }

    setCurrentMode(newMode);
    localStorage.setItem("currentModeData", newMode);

    // Restore the target mode's saved conversation ID (if any).
    // This ensures the useEffect at line 731+ finds the correct conversation
    // data for the mode we're switching TO, instead of using the previous
    // mode's conversation ID.
    const savedConvId = modeConversationIdRef.current[newMode];
    if (savedConvId) {
      setActiveConversationId(savedConvId);
    }
  };
  
  // Handle confirmation dialog actions
  const handleConfirmModeSwitch = () => {
    switchToMode(pendingMode);
    setShowModeConfirmDialog(false);
    setPendingMode(null);
  };
  
  const handleCancelModeSwitch = () => {
    setShowModeConfirmDialog(false);
    setPendingMode(null);
  };

  // Handle agent mode dialog actions
  const handleAgentModeConfirm = () => {
    setShowAgentModeDialog(false);
    switchToMode(pendingMode);
    setPendingMode(null);
  };

  const handleAgentModeCancel = () => {
    setShowAgentModeDialog(false);
    setPendingMode(null);
  };

  // Handle bot closing with confirmation if needed
  const handleCloseBot = () => {
    // if (hasUnsavedChanges()) {
    //   // Show confirmation dialog
    //   setShowCloseConfirmDialog(true);
    // } else {
      // No unsaved changes, close immediately
      closeBotImmediately();
    // }
  };

  // Function to handle the actual closing
  const closeBotImmediately = () => {
    setShowModal(false);
    setIsLandingScreen(true);
    setShowSuggestionBanner(true);
    setMinimizedMode(false);
    props.closeBot(false);
  };

  // Handle confirmation dialog actions
  const handleConfirmClose = () => {
    closeBotImmediately();
    setShowCloseConfirmDialog(false);
  };

  const handleCancelClose = () => {
    setShowCloseConfirmDialog(false);
  };

  const triggerRefreshAction = async () => {
    try {
      setIsRefreshTriggered(true);
      let response = await triggerRefresh(baseUrl);
      if (response?.data?.message) {
        displaySnackMessages(response?.data?.message, "success");
      }
    }
    catch(error) {
      console.error("triggerRefreshAction error", error);
      displaySnackMessages("Refresh Failed", "error");
    }
    finally {
      setIsRefreshTriggered(false);
    }
  };

  const handleUploadAccess = async () => {
    try {
      let applicationURL = window.location.pathname.split("/")?.[1];
      let applicationName = getFormattedApplicationName(
        applicationURL
      ).toLowerCase();
      let accessDataResponse = await getModuleLevelAccessUtility({
        app: applicationName,
        module: ["Chatbot Upload"],
        skipHierarchyCall: true,
      })();
      if (!isEmpty(accessDataResponse)) {
        setUtilityList([
          ...utilityList,
          {
            key: "Upload Document",
            onClick: () => {
              setIsUploadModalOpen(true);
            },
            icon: (
              <div
                className={classes.memoryModalIconDiv}
              >
                <UploadIcon style={{ width: 20, height: 20 }} />
              </div>
            ),
          },
          {
            key: "Trigger Refresh",
            onClick: () => {
              triggerRefreshAction();
            },
            icon: (
              <div
                className={`${classes.refreshIconDiv} ${isRefreshTriggered ? classes.refreshIconDivLoading : ""}`}
              >
                <RefreshIcon style={{ width: 20, height: 20 }} />
              </div>
            ),
          },
        ]);
      }
      const response = await fetchChatbotFilterConfig();
      const responseData = response?.data?.data || {};
      const combinedOptions = [
        ...Object.values(responseData).flat(),
        ...(chatbotFilterCustomConfig?.data || []) // Add custom filter config for testing
      ];
      
      // Create hierarchy key-value pairs object
      const hierarchyKeyValuePairs = {};
      combinedOptions.forEach(option => {
        if (option.column_name && option.label) {
          hierarchyKeyValuePairs[option.column_name] = option.label;
        }
      });
      
      // Dispatch hierarchy key-value pairs to store
      dispatch(setHierarchyKeyValue(hierarchyKeyValuePairs));
      
      setFilterOptions(combinedOptions);
      dispatch(setChatbotFilterOptions(combinedOptions));

      // Fetch saved filter sets for the plus-button menu
      fetchSavedFilterSets();
    } catch (error) {
      console.error("handleUploadAccess error", error);
    }
  };

  const handleAgentAccess = async () => {
    try {
      let applicationURL = window.location.pathname.split("/")?.[1];
      let applicationName = getFormattedApplicationName(
        applicationURL
      ).toLowerCase();
      let accessDataResponse = await getModuleLevelAccessUtility({
        app: applicationName,
        module: ["ChatbotAgent"],
        skipHierarchyCall: true,
      })();
      let showAgentIcon = await getAgentVisibilityData();
      if (!isEmpty(accessDataResponse) && showAgentIcon?.data?.data[0]?.attribute_value?.value) {
        let appCode = getApplicationCodeFromURL(applicationName);
        let list = await getAgentExceptionUserList(appCode);
        let isWhitelisted = false;
        if (list?.data?.data[0]?.attribute_value?.allow_all) {
          isWhitelisted = true;
        } else if (list?.data?.data[0]?.attribute_value?.allow_patterns) {
          const allowedPatterns = list?.data?.data[0]?.attribute_value?.allow_patterns;
          const currentUserEmail = localStorage.getItem("name");
          isWhitelisted = allowedPatterns.some((pattern) => currentUserEmail.includes(pattern));
        }
        else if (list?.data?.data[0]?.attribute_value?.allowed_mail_list) {
          const allowedMailList = list?.data?.data[0]?.attribute_value?.allowed_mail_list;
          const currentUserEmail = localStorage.getItem("name");
          isWhitelisted = allowedMailList.includes(currentUserEmail);
        }
        let tabListData = isWhitelisted
          ? [
            {
              name: "Agent",
              // isActive: activeTab.current.activeTab === "agent",
              initialClick: true,
              onClick: (params) => {
                // if (localStorage.getItem("isStreaming") === "true") {
                //   displaySnackMessages(
                //     "Please wait till the current request is completed",
                //     "warning"
                //   );
                //   return;
                // } else {
                setShowSavedFilters(false);
                const agentConversations = chatDataInfoRef?.current[params?.name?.toLowerCase()]?.conversations;
                const firstConversationId = agentConversations ? Object.keys(agentConversations)[0] : undefined;
                if (params?.name?.toLowerCase() === "agent") {
                  if (
                    !isEmpty(
                      agentConversations?.[firstConversationId]?.messages
                    )
                  ) {
                    setShowChatPlaceholder(false);
                  } else {
                    setShowChatPlaceholder(true);
                  }
                }
                setCurrentMode(params?.name?.toLowerCase());
                if (firstConversationId) {
                  setActiveConversationId(firstConversationId);
                }
                localStorage.setItem(
                  "currentModeData",
                  params?.name?.toLowerCase()
                );
                setNewChatScreen(false);
                activeTab.current.activeTab = "agent";
                setIsStop(false);
                // }

                // setConversation([]);
                // chatDataInfoRef.current[currentMode] = [];
              },
              icon: <AgentIcon />,
            },
            {
              name: "Navigation",
              // isActive: activeTab.current.activeTab === "navigation",
              // initialClick: true,
              onClick: (params) => {
                // if (localStorage.getItem("isStreaming") === "true") {
                //   displaySnackMessages(
                //     "Please wait till the current request is completed",
                //     "warning"
                //   );
                //   return;
                // } else {
                setShowSavedFilters(false);
                let currentModeValue = params?.name?.toLowerCase();
                const modeConversations = chatDataInfoRef?.current[currentModeValue]?.conversations;
                const firstConversationId = modeConversations ? Object.keys(modeConversations)[0] : undefined;
                if (!isEmpty(modeConversations?.[firstConversationId]?.messages)) {
                  setNewChatScreen(false);
                } else {
                  setNewChatScreen(true);
                }
                localStorage.setItem(
                  "currentModeData",
                  params?.name?.toLowerCase()
                );
                setShowChatPlaceholder(false);
                // setConversation({});
                setLoader(false);
                activeTab.current.activeTab = "navigation";
                setHideMenu(false);
                let chatDataForReference = localStorage.getItem(
                  "chatDataForReference"
                );
                let currentModeData = localStorage.getItem("currentModeData");
                if (chatDataForReference && currentModeData === "navigation") {
                  let parsedData = JSON.parse(chatDataForReference);
                  chatDataInfoRef.current = cloneDeep(parsedData);
                }
                // setNewChatScreen(true);
                setIsStop(false);
                setCurrentMode(params?.name?.toLowerCase());
                if (firstConversationId) {
                  setActiveConversationId(firstConversationId);
                }
                // setConversation([]);
                // chatDataInfoRef.current[currentMode] = [];
                // }
              },
              icon: <NavigationIcon />,
            },
            {
              name: "Saved Filters",
              // isActive: activeTab.current.activeTab === "agent",
              // initialClick: true,
              onClick: (params) => {
                // if (localStorage.getItem("isStreaming") === "true") {
                //   displaySnackMessages(
                //     "Please wait till the current request is completed",
                //     "warning"
                //   );
                //   return;
                // } else {
                // const agentConversations = chatDataInfoRef?.current[params?.name?.toLowerCase()]?.conversations;
                // const firstConversationId = agentConversations ? Object.keys(agentConversations)[0] : undefined;
                if (params?.name?.toLowerCase() === "saved filters") {
                  setNewChatScreen(false);
                  setShowChatPlaceholder(false);
                  setShowSavedFilters(true);
                  // if (
                  //   !isEmpty(
                  //     agentConversations?.[firstConversationId]?.messages
                  //   )
                  // ) {
                  //   setShowChatPlaceholder(false);
                  // } else {
                  //   setShowChatPlaceholder(true);
                  // }
                }
                // setCurrentMode(params?.name?.toLowerCase());
                // if (firstConversationId) {
                //   setActiveConversationId(firstConversationId);
                // }
                // localStorage.setItem(
                //   "currentModeData",
                //   params?.name?.toLowerCase()
                // );
                // setNewChatScreen(false);
                // activeTab.current.activeTab = "agent";
                // setIsStop(false);
                // }

                // setConversation([]);
                // chatDataInfoRef.current[currentMode] = [];
              },
              icon: <SavedFiltersIcon />,
            },
          ] : [
            {
              name: "Navigation",
              // isActive: activeTab.current.activeTab === "navigation",
              initialClick: true,
              onClick: (params) => {
                // if (localStorage.getItem("isStreaming") === "true") {
                //   displaySnackMessages(
                //     "Please wait till the current request is completed",
                //     "warning"
                //   );
                //   return;
                // } else {
                setShowSavedFilters(false);
                let currentModeValue = params?.name?.toLowerCase();
                const modeConversations = chatDataInfoRef?.current[currentModeValue]?.conversations;
                const firstConversationId = modeConversations ? Object.keys(modeConversations)[0] : undefined;
                if (!isEmpty(modeConversations?.[firstConversationId]?.messages)) {
                  setNewChatScreen(false);
                } else {
                  setNewChatScreen(true);
                }
                localStorage.setItem(
                  "currentModeData",
                  params?.name?.toLowerCase()
                );
                setShowChatPlaceholder(false);
                // setConversation({});
                setLoader(false);
                activeTab.current.activeTab = "navigation";
                setHideMenu(false);
                let chatDataForReference = localStorage.getItem(
                  "chatDataForReference"
                );
                let currentModeData = localStorage.getItem("currentModeData");
                if (chatDataForReference && currentModeData === "navigation") {
                  let parsedData = JSON.parse(chatDataForReference);
                  chatDataInfoRef.current = cloneDeep(parsedData);
                }
                // setNewChatScreen(true);
                setIsStop(false);
                setCurrentMode(params?.name?.toLowerCase());
                if (firstConversationId) {
                  setActiveConversationId(firstConversationId);
                }
                // setConversation([]);
                // chatDataInfoRef.current[currentMode] = [];
                // }
              },
              icon: <NavigationIcon />,
            }
          ];
        setTabList(tabListData);
      } else {
        setCurrentMode("navigation");
        setNewChatScreen(true);
        setShowChatPlaceholder(false);
        setTabList([
          {
            name: "Navigation",
            // isActive: activeTab.current.activeTab === "navigation",
            initialClick: true,
            onClick: (params) => {
              // if (localStorage.getItem("isStreaming") === "true") {
              //   displaySnackMessages(
              //     "Please wait till the current request is completed",
              //     "warning"
              //   );
              //   return;
              // } else {
              setShowSavedFilters(false);
              let currentModeValue = params?.name?.toLowerCase();
              const modeConversations = chatDataInfoRef?.current[currentModeValue]?.conversations;
              const firstConversationId = modeConversations ? Object.keys(modeConversations)[0] : undefined;
              if (!isEmpty(modeConversations?.[firstConversationId]?.messages)) {
                setNewChatScreen(false);
              } else {
                setNewChatScreen(true);
              }
              localStorage.setItem(
                "currentModeData",
                params?.name?.toLowerCase()
              );
              setShowChatPlaceholder(false);
              // setConversation({});
              setLoader(false);
              activeTab.current.activeTab = "navigation";
              setHideMenu(false);
              let chatDataForReference = localStorage.getItem(
                "chatDataForReference"
              );
              let currentModeData = localStorage.getItem("currentModeData");
              if (chatDataForReference && currentModeData === "navigation") {
                let parsedData = JSON.parse(chatDataForReference);
                chatDataInfoRef.current = cloneDeep(parsedData);
              }
              // setNewChatScreen(true);
              setIsStop(false);
              setCurrentMode(params?.name?.toLowerCase());
              if (firstConversationId) {
                setActiveConversationId(firstConversationId);
              }
              // setConversation([]);
              // chatDataInfoRef.current[currentMode] = [];
              // }
            },
            icon: <NavigationIcon />,
          }
        ]);
      }
    } catch (error) {
      console.error("handleAgentAccess error", error);
    }
  };

  const fetchSavedFilterSets = async () => {
    try {
      const savedFilters = await getFilterUserConfiguration("Chatbot");
      setSavedFilterSets(savedFilters || []);
      dispatch(setSavedFilterSetsAction(savedFilters || []));
    } catch (error) {
      console.error("fetchSavedFilterSets error", error);
      setSavedFilterSets([]);
      dispatch(setSavedFilterSetsAction([]));
    }
  };

  // Re-fetch saved filter sets when:
  // 1. savedFilterDashboard changes in Redux (e.g. filter deleted)
  // 2. User leaves the "Saved Filters" screen (showSavedFilters goes false after saving a filter)
  useEffect(() => {
    fetchSavedFilterSets();
  }, [savedFilterDashboard]);

  useEffect(() => {
    if (!showSavedFilters && showModal) {
      fetchSavedFilterSets();
    }
  }, [showSavedFilters, showModal]);


  const handleLikeDislike = useCallback(
    throttle(
      (key, isLike, answer, chatIndex) => {
        setLoadingState({
          ...loadingState,
          [isLike ? "like" : "dislike"]: key,
        });
        handleMessageLike(
          key,
          isLike,
          setLoadingState,
          displaySnackMessages,
          templateData,
          activeConversationId,
          answer,
          chatDataInfoRef.current,
          chatIndex,
          setChatDataState,
          baseUrl,
          sessionId
        );
      },
      5000,
      { trailing: false }
    ),
    [loadingState, templateData, displaySnackMessages, activeConversationId, sessionId, baseUrl]
  );

  useEffect(() => {
    handleUploadAccess();
    handleAgentAccess();
  }, []);

  useEffect(() => {
    configureBotActions();
  }, []);

  useEffect(() => {
    fetchCustomBotConfigurations();
  }, [baseUrl]);

  useEffect(() => {
    if (props.invokeBot) {
      setMinimizedMode(!props.invokeBot);
      setShowModal(props.invokeBot);
    }
  }, [props.invokeBot]);

  useEffect(() => {
    let screenNameStored = localStorage.getItem("smartBotScreenName");
    let currentAppLinkStored = localStorage.getItem("smartBotCurrentAppLink");
    if (screenNameStored) {
      setScreenName(screenNameStored);
    }
    if (currentAppLinkStored) {
      setCurrentAppLink(currentAppLinkStored);
    }
  }, [location]);

  useEffect(() => {
    if (showModal) {
      const data = localStorage.getItem("chatData");
      let chatData = JSON.parse(data);
      if (
        chatData &&
        !isEmpty(
          chatData?.[currentMode]?.conversations?.[activeConversationId]
            ?.messages
        ) && activeConversationId
      ) {
        chatDataRef.current = chatData;
        let messages = cloneDeep(
          chatData?.[currentMode]?.conversations?.[activeConversationId]
            ?.messages
        );
        if (Array.isArray(messages) && messages.length > 0) {
          parseSavedFlow(messages);
        }
      } else {
        initiateNewChat(currentMode);
        localStorage.setItem("currentModeData", currentMode);
      }
    }
  }, [showModal, activeConversationId]);

  useEffect(() => {
    if (showModal) {
      const currentModeData = localStorage.getItem("currentModeData");
      const currentSelectedModuleData = JSON.parse(
        localStorage.getItem("currentSelectedModuleData")
      );
      const chatScreenLinkData = localStorage.getItem("chatDataScreenLinkRef");
      let chatDataScreenLinkData = JSON.parse(chatScreenLinkData);
      if (chatDataScreenLinkData) {
        chatDataScreenLinkRef.current = chatDataScreenLinkData;
      }
      if (currentModeData) {
        setCurrentMode(currentModeData);
      }
      if (currentSelectedModuleData) {
        setSelectedModule(currentSelectedModuleData);
      }
    }
  }, [showModal, activeConversationId]);

  useEffect(() => {
    if (
      chatDataRef.current?.[currentMode]?.conversations?.[activeConversationId]
        ?.messages?.length > 0 ||
      chatDataRef.current[currentMode]?.length > 0
    ) {
      // saveCurrentChanges();
      const scrollToPosition = Number(
        chatBodyRef.current?.lastElementChild?.offsetTop
      );
      chatBodyRef.current?.scrollTo &&
        chatBodyRef.current?.scrollTo({
          top: scrollToPosition,
          behavior: "smooth",
        });
    }
  }, [
    chatDataRef.current?.[currentMode]?.conversations?.[activeConversationId]
      ?.messages,
    chatDataRef.current?.[currentMode],
    currentMode,
    activeConversationId,
  ]);

  useEffect(() => {
    if (!isEmpty(screenName) && !isEmpty(currentAppLink) && showModal) {
      chatDataScreenLinkRef.current[currentMode].screenName = screenName;
      chatDataScreenLinkRef.current[
        currentMode
      ].currentAppLink = currentAppLink;
      localStorage.setItem(
        "chatDataScreenLinkRef",
        JSON.stringify(chatDataScreenLinkRef.current)
      );
    }
  }, [screenName, currentAppLink]);

  useEffect(() => {
    if (
      !isEmpty(currentAgentId) &&
      !isEmpty(currentSessionId) &&
      notificationData.length > 0
    ) {
      let isAgentTaskCompleted =
        notificationData?.[notificationData.length - 1]?.extra_attributes
          ?.extra_attributes?.agent_task_completed
          ? true
          : false;
      if (isAgentTaskCompleted && !agentTaskCompleted) {
        let agentInput =
          notificationData?.[notificationData.length - 1]?.extra_attributes
            ?.extra_attributes?.user_input;
        let data = {
          agentId: currentAgentId,
          userInput: agentInput,
          sessionId: currentSessionId,
          baseUrl: baseUrl,
        };
        prepareDataAndSendToAgent(data);
        setAgentTaskCompleted(true);
      }
    }
  }, [notificationData, baseUrl, currentAgentId, currentSessionId]);

  useEffect(() => {
    // Continue with current mode specific logic
    if (
      chatDataInfoRef?.current[currentMode]?.conversations?.[activeConversationId]?.messages
        ?.length > 0
    ) {
      // setConversation(chatDataInfoRef?.current[currentMode]?.conversations?.[1]?.messages);
      let chatDataInfoRefLength =
        chatDataInfoRef?.current[currentMode]?.conversations?.[activeConversationId]?.messages
          ?.length;
      let chatDataInfoRefLastMessage =
        chatDataInfoRef?.current[currentMode]?.conversations?.[activeConversationId]?.messages[
          chatDataInfoRefLength - 1
        ];
      if (chatDataInfoRefLastMessage?.bodyType === "stream") {
        let newChatData =
        chatDataState?.[currentMode]?.conversations?.[activeConversationId]?.messages;
        let newChatDataLength = newChatData?.length - 1;
        if (newChatDataLength) {
          chatDataInfoRef.current[currentMode].conversations[activeConversationId].messages[
            chatDataInfoRefLength - 1
          ] = { ...newChatData?.[newChatDataLength] };
        }
      }
      // let chatDataForReference = JSON.stringify(
      //   createCleanCopy(chatDataInfoRef.current) // Limit depth to 10 levels
      // );
      // localStorage.setItem("chatDataForReference", chatDataForReference);

      let properties = {
        templateData: chatDataRef.current,
        chatMode: currentMode,
        activeConversationId: activeConversationId,
        clearChatSession: clearChatSession,
        endCurrentSession: endCurrentSession,
        setUserFlow: setUserFlow,
        setUserScreenAndFlow: setUserScreenAndFlow,
        screenName: screenName,
        currentAppLink: currentAppLink,
        screenLinkData: chatDataScreenLinkRef.current,
        selectedModule: selectedModule,
        displaySnackMessages: displaySnackMessages,
        customChatConfig: customChatConfig,
        loader: loader,
      };
      const allMessages = chatDataInfoRef?.current[
        currentMode
      ]?.conversations?.[activeConversationId]?.messages || [];
      const lastBotMessageIndex = allMessages.reduce((lastIdx, msg, idx) => 
        msg.userType === "bot" ? idx : lastIdx, -1);
      allMessages.forEach((message, index) => {
        if (message.userType === "bot") {
          // let BotMessageJsx =
          //   <BotMessage
          //     botData={message}
          //     state={loadingState}
          //     handleLikeDislike={handleLikeDislike}
          //     props={properties}
          //   />
          // ;
          message.isFormDisabled = index !== lastBotMessageIndex;
          message.messageIndex = index;
          // Shallow copy — avoids cloneDeep which causes OOM on large
          // bodyText (images, widget data, meta objects).
          // utilityObject, thinkingResponse, and bodyText are preserved
          // by reference since child components only read them.
          let newMessage = { ...message };
          message.jsx = (
            <BotMessage
              botData={newMessage}
              state={loadingState}
              handleLikeDislike={handleLikeDislike}
              props={properties}
            />
          );
          let actualProps = {
            botData: newMessage,
            state: loadingState,
            handleLikeDislike: handleLikeDislike,
            props: properties,
          }
          message.actualProps = actualProps;
         message.firstMessage = true;
          // message.enableLikes = true;
        }
      });

      // Shallow-clone the conversation structure to trigger React re-render
      // without deep-cloning large message payloads (which caused OOM crashes).
      const modeData = chatDataInfoRef?.current[currentMode];
      const convMessages = modeData?.conversations?.[activeConversationId]?.messages || [];
      let newChat = {
        ...modeData,
        conversations: {
          ...modeData?.conversations,
          [activeConversationId]: {
            ...modeData?.conversations?.[activeConversationId],
            messages: convMessages.map(msg => ({ ...msg })),
          },
        },
      };
      setConversation(newChat);
    } else if (showModal) {
      // Current mode has no messages — clear conversation so the previous
      // mode's components (including any active StreamedContent) unmount.
      // Without this, switching from agent→navigation while agent is streaming
      // would keep the agent's StreamedContent mounted and its response would
      // render in the navigation tab.
      setConversation({});
    }
  }, [chatDataState, currentMode, activeConversationId]);

  const fetchLegacyAgentInfo = async () => {
    try {
      let legacyAgentScreenData = await fetchLegacyAgentScreen();
      setLegacyAgentScreen(legacyAgentScreenData);
    }
    catch(error) {
      console.error("fetchLegacyAgentInfo error", error);
    }
  }
  useEffect(() => {
    if(location.pathname !== "/home"){
      fetchLegacyAgentInfo(); //Disabled temporarily since this was causing issue on homepage first render
    }
  }, [location]);




  const isInputValid = (input) => {
    try {
      if (isEmpty(input.trim())) {
        setUserInput("");
        return false;
      }
      return true;
    } catch (error) {
      console.error("isInputValid error", error);
      return false;
    }
  };

  const handleSendMessage = async (userInput, userExplicitInput = {}, textWithColumnNames = "") => {
    try {
      // if (localStorage.getItem("isStreaming") === "true") {
      //   displaySnackMessages(
      //     "Iris is processing request in another tab, This request can be processed once Iris is available",
      //     "warning"
      //   );
      //   return;
      // }
      if (isStop) {
        displaySnackMessages(
          "Please wait until the processing is complete",
          "warning"
        );
        return;
      }
      if (currentMode !== "agent") {
        fetchUserResultsFromQuery({}, false, userInput, activeConversationId);
      } else if (customChatConfig?.useMiddleware) {
        let middleWareFunction = await getDynamicFunction(
          customChatConfig.middleWareFunctionPath,
          customChatConfig.middleWareFunctionName
        );
        let data = {
          agentId: currentAgentId,
          userInput: userInput,
          sessionId: currentSessionId,
          baseUrl: baseUrl,
          uniqueChatId: uniqueChatId,
        };
        let middleWareResponse = await middleWareFunction(data, chatBotInfoRef);
        if (middleWareResponse) {
          prepareDataAndSendToAgent(middleWareResponse);
          setUserInput("");
        }
      } else {
        let notValid = false;
        if (!chatbotContext?.__fromSavedFilter) {
          if (
            !initValue &&
            isEmpty(userInput) &&
            (isEmpty(chatbotContext) ||
              fieldNumber !== Object.keys(chatbotContext).length)
          ) {
            notValid = true;
          } else if (!isEmpty(chatbotContext)) {
            for (const key in chatbotContext) {
              if (
                typeof chatbotContext[key][key] === "number" ||
                typeof chatbotContext[key][key] === "boolean"
              ) {
                continue;
              }
              if (isEmpty(chatbotContext[key][key])) {
                notValid = true;
              }
            }
          }
          if (notValid) {
            displaySnackMessages("Please fill all the fields", "warning");
            return;
          }
        }
        let data = {
          agentId: currentAgentId,
          userInput: cloneDeep(userInput),
          sessionId: isEmpty(userInput) ? currentSessionId : "",
          baseUrl: baseUrl,
          userExplicitInput: userExplicitInput,
          textWithColumnNames: textWithColumnNames,
          answerMode: answerMode,
        };
        // if(!isEmpty(userInput)) {
          dispatch(setThinkingContext({
            thinkingContent: "",
            thinkingHeaderMessage: "Working for 0m:00s",
            streamStartTime: Date.now(),
            isStreamCompleted: false,
            finalElapsedSeconds: null,
          }));
        // }
        prepareDataAndSendToAgent(data, true, {
          chatbotContext: chatbotContext,
          setChatbotContext: setChatbotContext,
          dispatch: dispatch,
          initValue: isEmpty(userInput) ? initValue : true,
          sessionId: isEmpty(userInput) ? sessionId : "",
          setSessionId: setSessionId,
          setInitValue: setInitValue,
          uniqueChatId: uniqueChatId,
          currentAgentChatId: currentAgentChatId,
          additionalArgs: isEmpty(userInput) ? additionalArgs : {},
          activeConversationId: activeConversationId,
        });
        setUserInput("");
      }
      setNewChatScreen(false)
    } catch (error) {
      console.error("handleSendMessage error", error);
    }
  };

  const onSendIconClick = (params, params2) => {
    try {
      // Reset step form stream state so old TabularContent instances don't process new data
      dispatch(setStepFormStreamData(null));
      resetActiveTabularInstance();
      // Reset stepFormStreamControl so stale session_id doesn't leak into new prompts
      stepFormStreamControl.sessionId = "";
      stepFormStreamControl.chatId = "";
      stepFormStreamControl.initValue = false;
      stepFormStreamControl.uniqueChatId = "";
      sessionStorage.removeItem("stepForm_sessionId");
      sessionStorage.removeItem("stepForm_chatId");
      // dispatch(setChatbotContext({}));
      setUserInput(params?.text);
      handleSendMessage(params?.text, params?.userExplicitInput, params?.textWithColumnNames);
    } catch (error) {
      console.error("onSendIconClick error", error);
    }
  };

  const onStopIconClick = (params) => {
    try {
      setIsStop(false);
      functionsState.abortStreaming();
    } catch (error) {
      console.error("onStopIconClick error", error);
    }
  };


  const getAllModulesForScreen = async () => {
    try {
      setModulesLoading(true);
      const response = await fetchScreensForModule("navigation");
      const allScreens = response?.data?.data?.screen_name;
      let modulesData = [];
      allScreens?.forEach((screen, index) => {
        modulesData.push({
          id: index + 1,
          name: screen.screen_name,
          icon: <GenericModuleIcon />,
          description: `${screen.screen_name} is a module`,
        });
        if (isEmpty(applicationCode)) {
          setApplicationCode(screen.application_code);
        }
      });
      setModules(modulesData);
      localStorage.setItem("currentModulesData", JSON.stringify(modulesData));
      setModulesLoading(false);
    } catch (error) {
      console.error("getAllModulesForScreen error", error);
      setModulesLoading(false);
    }
  };

  const handleModuleSelect = (option) => {
    setNewChatScreen(false)
    let newSelectedModule = { ...selectedModule, [activeConversationId]: option };
    setSelectedModule(newSelectedModule);
    setIsCardVisible(false);
    let dataObject = {
      actionName: "setUserScreenAndFlow",
      actionType: "direct",
      application_code: applicationCode,
      displayText: option,
      flow_type: currentMode,
      interactable: true,
      screen_name: option,
    };
    const selectedModuleData = JSON.stringify(newSelectedModule);
    localStorage.setItem("currentSelectedModuleData", selectedModuleData);
    fetchUserResultsFromQuery(dataObject, true);
    setScreenName(option);
    setLink(option);
    setIsModuleChanged(true);
    let obj = {
      isInitialClickPresent: true,
    }
  };

  useEffect(() => {
    if (showModal){
      getAllModulesForScreen();
    }
  }, [showModal]);

  // useEffect(() => {
  //   if (showModal) {
  //     let chatDataForReference = localStorage.getItem("chatDataForReference");
  //     let currentModeData = localStorage.getItem("currentModeData");
  //     let chatDataIds = localStorage.getItem("chatDataIds");
  //     if (chatDataForReference && currentModeData) {
  //       let parsedData = JSON.parse(chatDataForReference);
  //       if (chatDataIds) {
  //         let ids = JSON.parse(chatDataIds);
  //         setSessionId(ids?.sessionId);
  //         setUniqueChatId(ids?.uniqueChatId);
  //         setCurrentAgentId(ids?.currentAgentId);
  //         setInitValue(ids?.initValue);
  //         setFieldNumber(ids?.fieldNumber);
  //       }
  //       chatDataInfoRef.current = cloneDeep(parsedData);
  //       if (currentModeData === "agent") {
  //         if (!isEmpty(chatDataInfoRef?.current[currentModeData])) {
  //           setShowChatPlaceholder(false);
  //         } else {
  //           setShowChatPlaceholder(true);
  //           setConversation([]);
  //         }
  //       }
  //       if (currentModeData === "navigation") {
  //         if (!isEmpty(chatDataInfoRef?.current[currentModeData])) {
  //           setNewChatScreen(false);
  //         } else {
  //           setNewChatScreen(true);
  //           setConversation([]);
  //         }
  //       }

  //       setCurrentMode(currentModeData);
  //       setChatDataState({ ...chatDataRef.current });
  //     }
  //   }
  // }, [showModal]);

  // useEffect(() => {
  //   if (!initValue) {
  //     let ids = {
  //       initValue: initValue,
  //       sessionId: sessionId,
  //       uniqueChatId: uniqueChatId,
  //       currentAgentId: currentAgentId,
  //       fieldNumber: fieldNumber,
  //     };
  //     localStorage.setItem("chatDataIds", JSON.stringify(ids));
  //   }
  // }, [initValue, sessionId, uniqueChatId, currentAgentId, chatDataState, fieldNumber]);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => {
        setIsLandingScreen(false);
        // setIsModalOpen(true);
      }, 1000);
    }
  }, [showModal]);

  useEffect(() => {
    if (forceOpen && !showModal && !partialClose) {
      setShowModal(true);
      setPartialClose(false);
      setCurrentMode("agent");
      setShowChatPlaceholder(true);
    }
    if(customBaseUrl) {
      setBaseUrl(customBaseUrl);
    }
  }, [forceOpen])

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const tempHistoryData = [
		{
			"group_name": "today",
			"max_days_diff": 1,
			"conversation_list": [
				{
					"conversation_id": 6,
					"module_name": "Grouping",
					"name": "Conversation 78",
					"pinned": true,
				},
				{
					"conversation_id": 7,
					"module_name": "Configurations",
					"name": "Conversation 9"
				},
				{
					"conversation_id": 8,
					"module_name": "Grouping",
					"name": "Conversation 11"
				},
				{
					"conversation_id": 9,
					"module_name": "Allocation",
					"name": "Conversation 13"
				}
			]
		},
		{
			"group_name": "November -2025",
			"max_days_diff": 39,
			"conversation_list": [
				{
					"conversation_id": 5,
					"module_name": "Grouping",
					"name": "Conversation 2"
				}
			]
		},
		{
			"group_name": "October  -2025",
			"max_days_diff": 71,
			"conversation_list": [
				{
					"conversation_id": 4,
					"module_name": "Dashboard",
					"name": "test conversation"
				}
			]
		},
		{
			"group_name": "July     -2025",
			"max_days_diff": 182,
			"conversation_list": [
				{
					"conversation_id": 3,
					"module_name": "Dashboard",
					"name": "Conversation 4"
				}
			]
		},
		{
			"group_name": "May      -2025",
			"max_days_diff": 231,
			"conversation_list": [
				{
					"conversation_id": 2,
					"module_name": "Allocation",
					"name": "Conversation 34"
				},
				{
					"conversation_id": 1,
					"module_name": "Configurations",
					"name": "Conversation 2334234"
				},
				{
					"conversation_id": 1,
					"module_name": "Configurations",
					"name": "Conversation 2334234"
				},
				{
					"conversation_id": 1,
					"module_name": "Configurations",
					"name": "Conversation 2334234"
				},
				{
					"conversation_id": 1,
					"module_name": "Configurations",
					"name": "Conversation 2334234"
				},
			]
		}
	];

  const [historyPanelData, setHistoryPanelData] = useState([]);

  const {
    fetchConversations,
    saveCurrentChat,
    renameConversation,
    deleteConversation,
    fetchConversationChats,
  } = useConversationManagement(
    chatDataRef,
    currentMode,
    activeConversationId,
    setActiveConversationId,
    setChatDataState,
    selectedModule,
    setSelectedModule,
    isModuleChanged,
    setIsModuleChanged,
    undefined,
    undefined,
    chatDataInfoRef,
    setHistoryPanelData,
    processResponse
  );

  const handleHistoryMenuAction = useCallback(async (action, conversationData, renamedConversation="") => {
    const conversationId = conversationData?.conversation_id;
    if (action === "rename") {
      await renameConversation(conversationId, renamedConversation, "agent");
    } else if (action === "delete") {
      await deleteConversation(conversationId, "agent");
    }
    fetchConversations(null, "agent");
  }, [renameConversation, deleteConversation, fetchConversations]);


  return (
    <>
    {partialClose && (minimizedStreamData?.isStreaming || minimizedStreamData?.stepStatus === "step_form") && (
      <MinimizedChatWidget
        onExpand={() => {
          setShowModal(true);
          setPartialClose(false);
        }}
      />
    )}
    <div
      className={`${classes.agentStyleOverride} ${
        partialClose ? classes.hideBotStyle : ""
      } `}
    >
      <MemoryModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        displaySnackMessages={displaySnackMessages}
      />
      <UploadModal
        isUploadModalOpen={isUploadModalOpen}
        setIsUploadModalOpen={setIsUploadModalOpen}
        displaySnackMessages={displaySnackMessages}
      />
      <ChatBotComponent
        isFullWidth={forceOpen}
        userName={userName}
        showHistoryPanel={false}
        customInputComponent={
          currentMode === "agent" && !showSavedFilters ? (
            <ChatbotInput
              newChatScreen={newChatScreen}
              inputValue={userInput}
              setInputValue={setUserInput}
              isStopIcon={isStop}
              onSendIconClick={onSendIconClick}
              onStopIconClick={onStopIconClick}
              currentMode={currentMode}
              filterOptions={filterOptions}
              // onSaveClick={saveCurrentChat}
              savedFilterSets={savedFilterSets}
              selectedFilterSet={selectedFilterSet}
              onFilterSetSelect={(filterSet) => setSelectedFilterSet(filterSet)}
              onClearFilterSet={() => setSelectedFilterSet(null)}
              onTriggerRefresh={triggerRefreshAction}
              answerMode={answerMode}
              setAnswerMode={setAnswerMode}
            />
          ) : showSavedFilters ? <></> : null
        }
        isChatBotOpen={showModal || forceOpen}
        historyPanelData={historyPanelData}
        onHistorySearchChange={(params) => {console.log("History Search Change", params);}}
				onHistorySelectConversation={(params) => {
					console.log("History Select Conversation", params);
          setNewChatScreen(false);
          setShowChatPlaceholder(false);
					fetchConversationChats(params?.conversation_id, "agent");
				}}
        onHistoryPanelClick={(p1, p2) => {
					console.log("History", p1, p2);
					fetchConversations(null, "agent");
				}}
        onHistoryMenuAction={(action, conversationData, renamedConversation) => {
          console.log("History Menu Action", action, conversationData);
          handleHistoryMenuAction(action, conversationData, renamedConversation);
        }}
        // landingScreen={true}
        handleNewChatClick={() => {
          localStorage.setItem("isStreaming", "false");
          dispatch(setChatbotContext({}));
          dispatch(clearPersistedFormValues());
          dispatch(setStepFormStreamData(null));
          dispatch(setMinimizedStreamData(null));
          resetActiveTabularInstance();
          setConversation([]);
          chatDataInfoRef.current[currentMode] = {
            conversations: {},
          };
          setChatDataState({});
          if (currentMode === "agent") {
            setShowChatPlaceholder(true);
            // Abort FIRST so its setThinkingContext(isStreamCompleted:true) fires
            // before our reset below overwrites it with isStreamCompleted:false.
            functionsState?.abortStreaming();
            dispatch(
              setThinkingContext({
                thinkingContent: "",
                thinkingHeaderMessage: "Working for 0m:00s",
                streamStartTime: null,
                isStreamCompleted: false,
                finalElapsedSeconds: null,
              })
            );
            setInitValue(true);
            setSessionId("");
            setAdditionalArgs({});
            setIsStop(false);
            setUserInput("");
            setUniqueChatId("");
            chatDataRef.current[currentMode] = [];
            dispatch(setCurrentAgentChatId(""));
            return {
              tabName: currentMode,
              isInitialClickPresent: true,
            };
          } else {
            chatDataRef.current[currentMode] = {
              conversations: {},
            };
            setNavSessionId("");
            setNewChatScreen(true);
            return {
              tabName: currentMode,
              isInitialClickPresent: false,
            };
          }
        }}
        setIsChatBotOpen={(params) => {
          if (params) {
            setShowModal(true);
            setPartialClose(false);
            setCurrentMode("agent");
            setShowChatPlaceholder(true);
          } else {
            // If streaming is not active, clear minimized data so widget won't show
            if (localStorage.getItem("isStreaming") !== "true") {
              dispatch(setMinimizedStreamData(null));
            }
            setPartialClose(true);
          }
        }}
        // assistantChats={assistantChats}
        onSendIconClick={onSendIconClick}
        conversation={conversation}
        onModuleClick={(id, name, param) => {
          // activeTab.current.activeTab = name.toLowerCase();
          handleModuleSelect(name);
        }}
        moduleList={modules}
        tabList={tabList}
        utilityList={utilityList}
        isAssistantThinking={false}
        isCustomScreen={showChatPlaceholder ? showChatPlaceholder : showSavedFilters}
        customScreenJsx={
          showChatPlaceholder ?
          <ChatPlaceholder
            dateFormat={dateFormat}
            chatDataRef={chatDataRef}
            currentMode={currentMode}
            setShowChatPlaceholder={setShowChatPlaceholder}
            setLoader={setLoader}
            setCurrentAgentId={setCurrentAgentId}
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            setCurrentSessionId={setCurrentSessionId}
            customChatConfig={customChatConfig}
            chatDataInfoRef={chatDataInfoRef}
            setChatDataState={setChatDataState}
            userInput={userInput}
            legacyAgentScreen={legacyAgentScreen}
            activeConversationId={activeConversationId}
            chatBodyRef={chatBodyRef}
            chatbotContext={chatbotContext}
            setInitValue={setInitValue}
            setSessionId={setSessionId}
            thinkingContent={thinkingContext?.thinkingContent}
            setThinkingContent={setThinkingContent}
            isThinking={isThinking}
            setIsThinking={setIsThinking}
            chatId={chatId}
            setChatId={setChatId}
            isStop={isStop}
            setIsStop={setIsStop}
            functionsRef={functionsRef}
            functionsState={functionsState}
            setFunctionsState={setFunctionsState}
            thinkingHeaderMessage={thinkingContext?.thinkingHeaderMessage}
            setThinkingHeaderMessage={setThinkingHeaderMessage}
            uniqueChatId={uniqueChatId}
            setUniqueChatId={setUniqueChatId}
            fieldNumber={fieldNumber}
            setFieldNumber={setFieldNumber}
            setAdditionalArgs={setAdditionalArgs}
            displayQuestions={displayQuestions}
            questions={questions}
            setActiveConversationId={setActiveConversationId}
            selectedFilterSet={selectedFilterSet}
            answerMode={answerMode}
          />
          :
          <ChatbotSaveFilterComponent savedFilterSets={savedFilterSets} partialClose={partialClose} chatBotWidth={chatBotWidth} />
        }
        inputText={userInput}
        threadList={["Home"]}
        hideMenuArrow={hideMenu}
        newChatScreen={newChatScreen}
        isModuleListLoading={modulesLoading}
        suggestionBanner={{
          freeTextHeading: "Try adding more details :",
          freeTextContent:
            "Iris works better when you provide more context and pointed questions",
        }}
        isStopIcon={isStop}
        onStopIconClick={onStopIconClick}
        footerText="AI-generated responses may contain errors—please verify important information"
        showSuggestionBanner={showSavedFilters ? false : showSuggestionBanner}
        onCloseSuggestionBanner={() => {
          setShowSuggestionBanner(false);
        }}
        landingScreen={isLandingScreen}
        onLikeClick={(params, params2) => {
          if(params?.extra?.status === "liked") {
            return;
          }
          const likeDislikeKey = `${
            params?.response_heading || params?.screen_name
          }_${params?.timeStamp}`;
          handleLikeDislike(likeDislikeKey, true, params?.bodyText, params2);
        }}
        onDislikeClick={(params, params2) => {
          if(params?.extra?.status === "disliked") {
            return;
          }
          const likeDislikeKey = `${
            params?.response_heading || params?.screen_name
          }_${params?.timeStamp}`;
          handleLikeDislike(likeDislikeKey, false, params?.bodyText, params2);
        }}
        handleSaveChat={null}
        onChatBotResize={(params) => {
          setChatBotWidth(params);
        }}
        onMinimiseChatBot={() => {
          setPartialClose(true);
        }}
      />
    </div>
    </>
  );
};

    {/* <ChatLayout
      classes={classes}
      globalClasses={globalClasses}
      showModal={showModal}
      minimizedMode={minimizedMode}
      handleMouseDown={handleMouseDown}
      isDraggingRef={isDraggingRef}
      minimizedBtnRef={minimizedBtnRef}
      setShowModal={setShowModal}
      setMinimizedMode={setMinimizedMode}
      closeBot={handleCloseBot}  // Use our new close handler
      showExtendedContent={showExtendedContent}
      setShowExtendedContent={setShowExtendedContent}
      currentMode={currentMode}
      activeConversationId={activeConversationId}
      setCurrentMode={setCurrentMode}  // Use our new mode change handler
      enableRefreshAction={enableRefreshAction}
      refreshLoader={refreshLoader}
      refreshAndUpdateUserManual={refreshAndUpdateUserManual}
      chatData={chatDataRef.current}
      setActiveConversationId={setActiveConversationId}
    >
      {/* Mode Switch Confirmation Dialog */}
      // <ConfirmationDialog
      //   open={showModeConfirmDialog}
      //   title="Unsaved Changes"
      //   message="You have unsaved changes in the current conversation. Would you like to switch tabs without saving?"
      //   onConfirm={handleConfirmModeSwitch}
      //   onCancel={handleCancelModeSwitch}
      //   confirmText="Switch"
      //   cancelText="Cancel"
      // />
      
      // {/* Agent Mode Warning Dialog */}
      // <ConfirmationDialog
      //   open={showAgentModeDialog}
      //   title="Agent Mode"
      //   message="Agent mode cannot have different conversations. The saved chat panel will be closed."
      //   onConfirm={handleAgentModeConfirm}
      //   onCancel={handleAgentModeCancel}
      //   confirmText="Continue"
      //   cancelText="Cancel"
      // />
      
      // {/* Close Confirmation Dialog */}
      // <ConfirmationDialog
      //   open={showCloseConfirmDialog}
      //   title="Unsaved Changes"
      //   message="You have unsaved changes in the current conversation. Would you like to close without saving?"
      //   onConfirm={handleConfirmClose}
      //   onCancel={handleCancelClose}
      //   confirmText="Close"
      //   cancelText="Cancel"
      // />
      
      // {showExtendedContent && (
      //   <div className={classes.extendedContent}>
      //     <SavedChat
      //       mode={currentMode}
      //       activeConversationId={activeConversationId}
      //       setActiveConversationId={setActiveConversationId}
      //       saveCurrentChanges={saveCurrentChanges}
      //       chatDataRef={chatDataRef}
      //       setChatDataState={setChatDataState}
      //       hasUnsavedChanges={hasUnsavedChanges}
      //       chatDataState={chatDataState}
      //       selectedModule={selectedModule}
      //       setSelectedModule={setSelectedModule}
      //       isModuleChanged={isModuleChanged}
      //       setIsModuleChanged={setIsModuleChanged}
      //       showExtendedContent={showExtendedContent}
      //     />
      //   </div>
      // )}
      // <div
      //   ref={chatBodyRef}
      //   className={`${classes.modalBody} ${classes.pb10} ${
      //     globalClasses.flexRow
      //   } ${globalClasses.flexColumn}
      //   ${
      //     showExtendedContent ? classes.expandedMargin : classes.collapsedMargin
      //   }`}
      // >
      //   {showAlert && (
      //     <div
      //       style={{
      //         position: "absolute",
      //         top: "10px",
      //         right: "10px",
      //         zIndex: 1000,
      //       }}
      //       className={classes.disableUndoButton}
      //     >
      //       <Alert
      //         actionName="Undo"
      //         onAction={() => {
      //           setShowAlert(false);
      //         }}
      //         onClose={() => {
      //           setShowAlert(false);
      //         }}
      //         title="Chat cleared successfully"
      //         severity="success"
      //       />
      //     </div>
      //   )}
      //   {currentMode === "navigation" && (
      //     <ModuleSelection
      //       classes={classes}
      //       selectedModule={selectedModule}
      //       isCardVisible={isCardVisible}
      //       setIsCardVisible={setIsCardVisible}
      //       currentMode={currentMode}
      //       activeConversationId={activeConversationId}
      //       setSelectedModule={setSelectedModule}
      //       fetchUserResultsFromQuery={fetchUserResultsFromQuery}
      //       setScreenName={setScreenName}
      //       setLink={setLink}
      //       setIsModuleChanged={setIsModuleChanged}
      //     />
      //   )}
      //   {currentMode === "agent" && showChatPlaceholder ? (
      //     <ChatPlaceholder
      //       dateFormat={dateFormat}
      //       chatDataRef={chatDataRef}
      //       currentMode={currentMode}
      //       setShowChatPlaceholder={setShowChatPlaceholder}
      //       setLoader={setLoader}
      //       setCurrentAgentId={setCurrentAgentId}
      //       baseUrl={baseUrl}
      //       setBaseUrl={setBaseUrl}
      //       setCurrentSessionId={setCurrentSessionId}
      //       customChatConfig={customChatConfig}
      //     />
      //   ) : (
      //     <MessageTemplate
      //       templateData={chatDataRef.current}
      //       chatMode={currentMode}
      //       activeConversationId={activeConversationId}
      //       clearChatSession={clearChatSession}
      //       endCurrentSession={endCurrentSession}
      //       setUserFlow={setUserFlow}
      //       setUserScreenAndFlow={setUserScreenAndFlow}
      //       screenName={screenName}
      //       currentAppLink={currentAppLink}
      //       screenLinkData={chatDataScreenLinkRef.current}
      //       selectedModule={selectedModule}
      //       displaySnackMessages={displaySnackMessages}
      //       customChatConfig={customChatConfig}
      //       loader={loader}
      //     />
      //   )}
      // </div>
      // <ChatFooter
      //   classes={classes}
      //   globalClasses={globalClasses}
      //   showExtendedContent={showExtendedContent}
      //   endCurrentSession={endCurrentSession}
      //   setShowExtendedContent={setShowExtendedContent}
      //   userInput={userInput}
      //   setUserInput={setUserInput}
      //   fetchUserResultsFromQuery={fetchUserResultsFromQuery}
      //   loader={loader}
      //   currentMode={currentMode}
      //   selectedModule={selectedModule}
      //   setSelectedModule={setSelectedModule}
      //   chatDataRef={chatDataRef}
      //   chatDataScreenLinkRef={chatDataScreenLinkRef}
      //   initiateNewChat={initiateNewChat}
      //   setShowAlert={setShowAlert}
      //   activeConversationId={activeConversationId}
      //   setActiveConversationId={setActiveConversationId}
      //   setChatDataState={setChatDataState}
      //   isModuleChanged={isModuleChanged}
      //   setIsModuleChanged={setIsModuleChanged}
      //   prepareDataAndSendToAgent={prepareDataAndSendToAgent}
      //   currentAgentId={currentAgentId}
      //   currentSessionId={currentSessionId}
      //   baseUrl={baseUrl}
      //   customChatConfig={customChatConfig}
      //   chatBotInfoRef={chatBotInfoRef}
      // />
    // </ChatLayout> */}

export default SmartBot;

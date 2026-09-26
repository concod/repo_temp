import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { useDispatch, useSelector } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import SettingsIcon from "coreAssets/chatbot/settings_icon.svg";
import { useStyles } from "../styling";

export const useChatState = () => {
  // All useState declarations
  const [showModal, setShowModal] = useState(false);
  const [minimizedMode, setMinimizedMode] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [position, setPosition] = useState(null);
  const [flowType, setFlowType] = useState(null);
  const [screenName, setScreenName] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentAppLink, setCurrentAppLink] = useState("");
  const [loader, setLoader] = useState(false);
  const [enableRefreshAction, setEnableRefreshAction] = useState(false);
  const [refreshLoader, setRefreshLoader] = useState(false);
  const [chatDataState, setChatDataState] = useState({});
  const [showExtendedContent, setShowExtendedContent] = useState(false);
  const [currentMode, setCurrentMode] = useState("agent");
  const [selectedModule, setSelectedModule] = useState({});
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [templateData, setTemplateData] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [showChatPlaceholder, setShowChatPlaceholder] = useState(true);
  const [currentAgentId, setCurrentAgentId] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [agentTaskCompleted, setAgentTaskCompleted] = useState(false);
  const [customChatConfig, setCustomChatConfig] = useState(null);
  const [isModuleChanged, setIsModuleChanged] = useState(false);
  const [initValue, setInitValue] = useState(true);
  const [sessionId, setSessionId] = useState("");
  const [thinkingContent, setThinkingContent] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [chatId, setChatId] = useState("");
  const [isStop, setIsStop] = useState(false);
  const [functionsState, setFunctionsState] = useState({});
  const [thinkingHeaderMessage, setThinkingHeaderMessage] = useState("Working… 0m:00s");
  const [legacyAgentScreen, setLegacyAgentScreen] = useState(false);
  const [uniqueChatId, setUniqueChatId] = useState("");
  const [fieldNumber, setFieldNumber] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isRefreshTriggered, setIsRefreshTriggered] = useState(false);
  const [middleWareFunction, setMiddleWareFunction] = useState(null);
  const [additionalArgs, setAdditionalArgs] = useState({});
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [navSessionId, setNavSessionId] = useState("");

  // Selectors
  const filterReducerState = useSelector((state) => state.filterReducer);
  const notificationData = useSelector((state) => state.notificationReducer.notificationData);
  const chatbotContext = useSelector((state) => state.smartBotReducer.chatbotContext);
  const thinkingContext = useSelector((state) => state.smartBotReducer.thinkingContext);


  // All useRef declarations
  const grabPositionRef = useRef(null);
  const chatDataRef = useRef({
    insights: {
      conversations: {}
    },
    navigation: {
      conversations: {}
    },
    agent: []
  });
  const chatDataInfoRef = useRef({
    insights: {},
    navigation: {
      conversations: {},
    },
    agent: {
      conversations: {},
    }
  });
  const chatBodyRef = useRef({});
  const isDraggingRef = useRef(null);
  const minimizedBtnRef = useRef(null);
  const chatDataScreenLinkRef = useRef({
    insights: {
      screenName: "",
      currentAppLink: "",
    },
    navigation: {
      screenName: "",
      currentAppLink: "",
    },
    agent: {
      screenName: "",
      currentAppLink: "",
    },
  });
  const functionsRef = useRef({
  });
  const chatBotInfoRef = useRef(chatbotContext);


  // Hooks
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const globalClasses = globalStyles();
  const classes = useStyles({ position, minimizedBtnRef });

  // Constants
  const dateFormat = "DD-MM-YYYY HH:mm:ss";

  const [utilityList, setUtilityList] = useState([]);

  // const [utilityList, setUtilityList] = useState([
  //   {
  //     key: "Memory",
  //     onClick: () => {
  //       setIsModalOpen(true);
  //     },
  //     icon: (
  //       <div
  //         className={classes.memoryModalIconDiv}
  //       >
  //         <SettingsIcon style={{ width: 20, height: 20 }} />
  //       </div>
  //     ),
  //   },
  // ]);

  return {
    // States
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
    activeConversationId,
    setActiveConversationId,
    showChatPlaceholder,
    setShowChatPlaceholder,
    currentAgentId,
    setCurrentAgentId,
    baseUrl,
    setBaseUrl,
    currentSessionId,
    setCurrentSessionId,
    notificationData,
    agentTaskCompleted,
    setAgentTaskCompleted,
    customChatConfig,
    setCustomChatConfig,
    middleWareFunction,
    setMiddleWareFunction,
    isModuleChanged,
    setIsModuleChanged,
    filterReducerState,
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
    // Refs
    grabPositionRef,
    chatDataRef,
    chatBodyRef,
    isDraggingRef,
    minimizedBtnRef,
    chatDataScreenLinkRef,
    chatDataInfoRef,
    functionsRef,
    // Hooks and utilities
    navigate,
    location,
    dispatch,
    globalClasses,
    classes,
    dateFormat,
  };
};

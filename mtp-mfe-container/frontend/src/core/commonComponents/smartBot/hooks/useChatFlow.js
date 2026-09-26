import { useCallback, useRef, useEffect } from "react";
import { ensureConversationExists, parseResponse, transformValues } from "../utlis";
import {
  fetchRelatedQuestions,
  resolveChatQuery,
  fetchScreensForModule,
} from "../services/chatbot-services";
import { isNull, isEmpty } from "lodash";
import moment from "moment";
import { navigationOptions, insightsOptions, screenOptions } from "../constants";
import { useAgentFlow } from "./useAgentFlow";
import { fetchIntentApiResponse } from "../services/chatbot-services";
import { setSelectedFilters } from "core/actions/filterAction";
import { setFilterConfiguration } from "core/actions/filterAction";
import { generateConversationObject } from "../utlis";
import { setChatbotContext, setThinkingContext } from "core/actions/smartBotActions";
import { generateConversationId } from "../utlis";


export const useChatFlow = (
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
  setNavSessionId,
  setUniqueChatId,
  setAdditionalArgs
) => {

  const navSessionIdRef = useRef(navSessionId);
  useEffect(() => {
    navSessionIdRef.current = navSessionId;
  }, [navSessionId]);

  // Keep a fresh reference to uniqueChatId so callbacks memoized with narrow
  // deps (e.g. handleUserAction) don't send a stale/empty chat_id on follow-ups.
  const uniqueChatIdRef = useRef(uniqueChatId);
  useEffect(() => {
    uniqueChatIdRef.current = uniqueChatId;
  }, [uniqueChatId]);

  const {
    prepareDataAndSendToAgent,
    setAgentFlow,
    processResponse,
  } = useAgentFlow(
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
      chatBodyRef,
      runStreaming: true,
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
      setUniqueChatId,
      fieldNumber,
      setFieldNumber,
      setAdditionalArgs: setAdditionalArgs || (() => { }),
    }
  );

  const getCurrentDateTimeString = () => {
    return moment().format(dateFormat);
  };

  const setScreens = useCallback((screens, headerTitle, timeString, mode) => {
    return {
      timeStamp: timeString,
      userType: "bot",
      userName: "Iris",
      headerTitle: headerTitle,
      bodyType: "chips",
      bodyText: screens.map((screen) => ({
        displayText: screen.screen_name,
        interactable: true,
        actionType: "direct",
        actionName: "setUserScreenAndFlow",
        screen_name: screen.screen_name,
        flow_type: mode,
        application_code: screen.application_code,
      })),
    };
  }, []);

  const setLink = useCallback(
    (screenNameInfo) => {
      try {
        let link;
        const typeOptions =
          currentMode === "navigation"
            ? [...navigationOptions]
            : [...insightsOptions];
        typeOptions.forEach((option) => {
          if (option.screen_name === screenNameInfo) {
            link = option.link;
          }
        });
        if (link) {
          setCurrentAppLink(link);
          localStorage.setItem("smartBotCurrentAppLink", link);
        } else {
          setCurrentAppLink(null);
          localStorage.removeItem("smartBotCurrentAppLink");
        }
      } catch (error) {
        console.error("setLink error: ", error);
      }
    },
    [currentMode, activeConversationId, setCurrentAppLink]
  );

  const setUserFlow = useCallback(
    async (data) => {
      setLoader(true);
      let flowType = data.flow_type ? data.flow_type : currentMode;
      ensureConversationExists(flowType, activeConversationId, chatDataRef);
      const currentTimeString = getCurrentDateTimeString();
      let headerTitle;
      let screenOptions = {};
      const userChat = {
        timeStamp: currentTimeString,
        userType: "user",
        bodyText: data.displayUserText
          ? data.displayUserText
          : data.displayText,
        flow_type: flowType,
      };
      const loaderData = {
        userName: "Iris",
        timeStamp: currentTimeString,
        userType: "loader",
      };
      if (data.skipUserChat) {
        chatDataRef.current[flowType].conversations[
          activeConversationId
        ].messages = [
          ...chatDataRef.current[flowType].conversations[
            activeConversationId
          ].messages,
          loaderData,
        ];
      } else {
        chatDataRef.current[flowType].conversations[
          activeConversationId
        ].messages = [
          ...chatDataRef.current[flowType].conversations[
            activeConversationId
          ].messages,
          userChat,
          loaderData,
        ];
      }
      try {
        // Fetch options based on the current mode
        const options = await fetchScreensForModule(flowType);
        if (options.data.data.screen_name?.length) {
          headerTitle = `Please select for which Modules you ${
            data?.flow_type === "navigation"
              ? "need help for."
              : "want insights for."
          }`;
          screenOptions = setScreens(
            options.data.data.screen_name,
            headerTitle,
            currentTimeString,
            flowType
          );
          chatDataRef.current[flowType].conversations[
            activeConversationId
          ].messages = [
            ...chatDataRef.current[flowType].conversations[
              activeConversationId
            ].messages?.filter((data) => data.userType !== "loader"),
            screenOptions,
          ];
        } else {
          const failResponseText = {
            timeStamp: getCurrentDateTimeString(),
            userType: "bot",
            userName: "Iris",
            bodyText: options.data.data.message,
            enableLikes: false,
            headerTitle: "",
            noShowHeaderTitle: true,
            bodyType: "text",
          };
          chatDataRef.current[flowType].conversations[
            activeConversationId
          ].messages = [
            ...chatDataRef.current[flowType].conversations[
              activeConversationId
            ].messages?.filter((data) => data.userType !== "loader"),
            failResponseText,
          ];
        }
        setFlowType(data?.flow_type);
        setLoader(false);
      } catch (error) {
        const failResponseText = {
          timeStamp: getCurrentDateTimeString(),
          userType: "bot",
          userName: "Iris",
          bodyText: "Failed to fetch user screens. Please try again later.",
          headerTitle: "",
          enableLikes: false,
          noShowHeaderTitle: true,
          bodyType: "text",
        };
        chatDataRef.current[flowType].conversations[
          activeConversationId
        ].messages = [
          ...chatDataRef.current[flowType].conversations[
            activeConversationId
          ].messages?.filter((data) => data.userType !== "loader"),
          failResponseText,
        ];
        setLoader(false);
        console.error("error", error);
      }
    },
    [
      chatDataRef,
      setLoader,
      setFlowType,
      currentMode,
      getCurrentDateTimeString,
      activeConversationId,
    ]
  );

  const setUserScreenAndFlow = useCallback(
    (data) => {
      setFlowType(data?.flow_type);
      setScreenName(data?.screen_name);
      if (data?.screen_name) {
        localStorage.setItem("smartBotScreenName", data.screen_name);
        setIsModuleChanged(true);
      }
      setQuestionIndex(data?.question_index);
      if (data?.link) {
        setCurrentAppLink(data?.link);
        localStorage.setItem("smartBotCurrentAppLink", data?.link);
      } else {
        setLink(data?.screen_name);
      }
      if (data.flow_type === "agent" && data.actionType === "direct") {
        data.baseUrl = baseUrl;
        // Reset the timer before the request goes out (same as index.jsx
        // handleSendMessage). Without this the new ThinkinHeaderInfo mounts while
        // the previous response's "completed" state is still in Redux and freezes
        // itself on that stale elapsed time.
        // streamStartTime stays null here: processStream sets it, so a question
        // has exactly one start time (two would make the new header look like a
        // superseded one and freeze it at 0m:00s).
        dispatch(setThinkingContext({
          thinkingContent: "",
          thinkingHeaderMessage: "Working for 0m:00s",
          streamStartTime: null,
          isStreamCompleted: false,
          finalElapsedSeconds: null,
        }));
        prepareDataAndSendToAgent(data, false, {
          chatbotContext: chatbotContext,
          setChatbotContext: setChatbotContext,
          dispatch: dispatch,
          initValue: initValue,
          sessionId: sessionId,
          setSessionId: setSessionId,
          setInitValue: setInitValue,
          uniqueChatId: uniqueChatIdRef.current,
          additionalArgs: additionalArgs,
        });
      } else if (data.actionType === "indirect") {
        setUserInput(data.displayText);
      } else {
        fetchUserResultsFromQuery(data, true, "", activeConversationId);
      }
    },
    [activeConversationId, baseUrl]
  );

  const handleChunkedData = async (response) => {
    try {
      // Initialize an empty bot response
      const initialBotResponse = {
        timeStamp: getCurrentDateTimeString(),
        userType: "bot",
        userName: "Iris",
        bodyText: "",
        headerTitle: "",
        noShowHeaderTitle: true,
        bodyType: "text",
        isStreaming: true,
      };

      // Replace loader with initial bot message
      chatDataRef.current[currentMode].conversations[activeConversationId].messages = [
        ...chatDataRef.current[currentMode].conversations[activeConversationId].messages?.filter(
          (data) => data?.userType !== "loader"
        ),
        initialBotResponse,
      ];

      // Process each chunk with a delay to simulate streaming
      const chunks = response.data;
      setLoader(false);

      for (const chunk of chunks) {
        const messages = chatDataRef.current[currentMode].conversations[activeConversationId].messages;
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage && lastMessage.userType === "bot") {
          lastMessage.bodyText += chunk.text;
          if (chunk.last_chunk) {
            lastMessage.isStreaming = false;
          }
          
          // Update messages array with new content
          chatDataRef.current[currentMode].conversations[activeConversationId].messages = [
            ...messages.slice(0, -1),
            {...lastMessage} // Create new reference to trigger update
          ];
        }
        
        // Add small delay between chunks
        await new Promise(resolve => setTimeout(resolve, 50));
      }

    } catch (error) {
      console.error("Error handling chunked data:", error);
      const errorMessage = {
        timeStamp: getCurrentDateTimeString(),
        userType: "bot",
        userName: "Iris",
        bodyText: "Sorry, there was an error processing the streaming response.",
        headerTitle: "",
        noShowHeaderTitle: true,
        bodyType: "text",
      };

      chatDataRef.current[currentMode].conversations[activeConversationId].messages = [
        ...chatDataRef.current[currentMode].conversations[activeConversationId].messages?.filter(
          (data) => data?.userType !== "loader" && data?.userType !== "bot"
        ),
        errorMessage,
      ];
    }
  };

  const fetchUserResultsFromQuery = useCallback(
    async (refObject, fetchQuestions = false, inputValue = userInput, conversationId = activeConversationId) => {
      let flowType = refObject?.flow_type ? refObject?.flow_type : currentMode
      const currentTimeString = getCurrentDateTimeString();
      const input = fetchQuestions ? refObject?.screen_name : inputValue;
      setUserInput("");
      const userChat = {
        timeStamp: currentTimeString,
        userType: "user",
        bodyText: input,
        screen_name: fetchQuestions ? refObject?.screen_name : screenName,
        flow_type: fetchQuestions ? refObject?.flow_type : flowType,
        hasDirectActionType: fetchQuestions,
      };
      const loaderData = {
        userName: "Iris",
        timeStamp: currentTimeString,
        userType: "loader",
      };
      if (!conversationId || isEmpty(chatDataInfoRef.current[currentMode].conversations[conversationId])) {
        conversationId = generateConversationId();
        setActiveConversationId(conversationId);
        chatDataInfoRef.current[
          currentMode
        ].conversations[conversationId] = generateConversationObject(conversationId);
      }
      // Ensure chatDataRef conversation entry exists for the (potentially new) conversationId.
      // Must be called AFTER the ID check above so it uses the correct ID.
      ensureConversationExists(flowType, conversationId, chatDataRef);
      chatDataRef.current[flowType].conversations[conversationId].messages = [
        ...chatDataRef.current[flowType].conversations[conversationId].messages,
        userChat,
        loaderData,
      ];
      chatDataInfoRef.current[currentMode].conversations[conversationId].messages = [
        ...chatDataInfoRef.current[currentMode].conversations[conversationId].messages,
        userChat,
      ];
      setLoader(true);
      try {
        let queryResponse;
        let getUpdatedChat;
        let inCaseOfNoDataObject = {
          response_heading: "",
          response:
            "Sorry, but I can't help you with that. It's out of the scope of my knowledge base.",
        };

        if (fetchQuestions) {
          queryResponse = await fetchRelatedQuestions(
            refObject?.flow_type,
            refObject?.screen_name
          );
          if (isNull(queryResponse?.data?.data)) {
            getUpdatedChat = parseResponse(inCaseOfNoDataObject, "text");
          } else {
            // getUpdatedChat = parseResponse(
            //   { ...queryResponse?.data?.data, enableLikes: true },
            //   "questions"
            // );
            getUpdatedChat = parseResponse(
              { ...queryResponse?.data?.data },
              "questions"
            );
          }
          chatDataRef.current[flowType].conversations[conversationId].messages = [
            ...chatDataRef.current[flowType].conversations[conversationId].messages?.filter(
              (data) => data?.userType !== "loader"
            ),
            getUpdatedChat,
          ];
          let chatDataMessages = chatDataInfoRef.current[currentMode].conversations[conversationId].messages;
          chatDataMessages = [...chatDataMessages, getUpdatedChat];
          chatDataInfoRef.current[currentMode].conversations[conversationId].messages = chatDataMessages;
          
          // Trigger re-render by updating chatDataState
          setChatDataState({ ...chatDataRef.current });
        } else {
          let body = {};
          if (currentMode === "insights") {
            body = {
              question_index: questionIndex,
              screen_name: screenName,
              question: input,
            };
          } else {
            body = {
              query: input,
              ...(navSessionIdRef.current && { session_id: navSessionIdRef.current }),
            };
          }
          let utitlityObject = {
            activeConversationId: conversationId,
            currentMode,
            chatDataRef,
            chatBodyRef,
            setChatDataState,
            chatDataInfoRef,
            processResponse,
            isStop,
            setIsStop,
            functionsRef,
            functionsState,
            setFunctionsState,
            setNavSessionId,
          };
          let response;
          if (input.indexOf("@") > -1) {
            let response = await fetchIntentApiResponse(input);
            updateTheFilterConfigurationAndApply(response?.data?.data);
            // updateTheFilterConfigurationAndApply(dummyIntentResponse);
            // redirectToTheScreen(response.data);
          } 
          else if (currentMode === "navigation") {
            getUpdatedChat = await parseResponse(
              null,
              "stream",
              "",
              currentMode,
              false,
              "",
              {},
              body,
              utitlityObject
            );
          } 
          else {
            // Regular response handling
            queryResponse = await resolveChatQuery(body, currentMode);
            if (isNull(queryResponse?.data?.data)) {
              getUpdatedChat = parseResponse(inCaseOfNoDataObject, "text");
            } else if (response?.data?.message) {
              getUpdatedChat = parseResponse(
                { response: response?.data?.message, enableLikes: true },
                "text"
              );
            } else {
              let responseData = queryResponse?.data?.data
                ? queryResponse?.data?.data
                : response?.data?.message;
              getUpdatedChat = parseResponse(
                { ...responseData, enableLikes: true },
                "text"
              );
            }
          }

          chatDataRef.current[currentMode].conversations[conversationId].messages = [
            ...chatDataRef.current[currentMode].conversations[conversationId].messages?.filter(
              (data) => data?.userType !== "loader"
            ),
            getUpdatedChat,
          ];
          let chatDataMessages = chatDataInfoRef.current[currentMode].conversations[conversationId].messages;
          chatDataMessages = [...chatDataMessages, getUpdatedChat];
          chatDataInfoRef.current[currentMode].conversations[conversationId].messages = chatDataMessages;
        }
        setChatDataState({ ...chatDataRef.current });
        setLoader(false);
      } catch (error) {
        const failResponseText = {
          timeStamp: getCurrentDateTimeString(),
          userType: "bot",
          userName: "Iris",
          bodyText: error?.response?.data?.data?.error?.response
            ? error?.response?.data?.data?.error?.response
            : "Sorry, chatbot is not available now",
          headerTitle: "",
          noShowHeaderTitle: true,
          bodyType: "text",
        };
        chatDataRef.current[currentMode].conversations[conversationId].messages = [
          ...chatDataRef.current[currentMode].conversations[conversationId].messages?.filter(
            (data) => data.userType !== "loader"
          ),
          failResponseText,
        ];
        let chatDataMessages = chatDataInfoRef.current[
          currentMode
        ].conversations[conversationId].messages;
        chatDataMessages = [...chatDataMessages, failResponseText];
        chatDataInfoRef.current[
          currentMode
        ].conversations[conversationId].messages = chatDataMessages; 
        
        // Trigger re-render by updating chatDataState
        setChatDataState({ ...chatDataRef.current });
        
        setLoader(false);
        console.error("error", error);
      }
    },
    [
      chatDataRef,
      setLoader,
      flowType,
      screenName,
      questionIndex,
      userInput,
      currentMode,
      activeConversationId,
    ]
  );

  const redirectToTheScreen = (data) => {
    try {
      let navigateTo = data?.navigationLink; // will be extracting navigateTo properly when the response changes 
      let searchParams = window.location.search;
      let currentLink = window.location.pathname + searchParams;
      if (currentLink !== navigateTo) {
        navigate(navigateTo);
      }
    }
    catch(error) {
      console.error("redirectToTheScreen error", error);
    }
  }

  const updateTheFilterConfigurationAndApply = (data) => {
    try {
      let currentScreenName = localStorage.getItem("currentScreenName");
      let filterConfigName;
      screenOptions.forEach((screen) => {
        if (screen.screen_name === currentScreenName && !filterConfigName) {
          filterConfigName = screen.filterCongfigurationName;
        }
      });
      let filterClassificationConfig =
        filterReducerState?.filterDashboardConfiguration[filterConfigName]
          ?.filterConfig[0]?.filterDashboardClassification;
      let filterDashBoardInfo =
        filterReducerState?.filterDashboardConfiguration[filterConfigName]
          ?.filterConfig[0]?.filterDashboardData;
      let appliedFilterData =
        filterReducerState?.filterDashboardConfiguration[filterConfigName]
          ?.appliedFilterData;
      let updateFilterConfigData =
        filterReducerState?.filterDashboardConfiguration[filterConfigName]
          ?.filterConfig;
      let dimensionFilterMapping = {};
      filterClassificationConfig?.forEach((filter) => {
        dimensionFilterMapping[filter.dimension] = filter.screenName;
      });
      let intentActionResponse = data[1][1][0]?.intent_action[0];
      let preSelectedFilters = {};
      for (const property in intentActionResponse) {
        filterDashBoardInfo.forEach((filterInfo, index) => {
          if (filterInfo?.filter_keyword === property) {
            let filterData =
              preSelectedFilters[
                dimensionFilterMapping[filterInfo.dimension]
              ] || [];
            preSelectedFilters[dimensionFilterMapping[filterInfo.dimension]] = [
              ...filterData,
              {
                check_configuration: [],
                dimension: filterInfo?.dimension,
                display_type: filterInfo?.display_type,
                extra: {},
                filter_id: filterInfo?.filter_keyword,
                filter_name: filterInfo?.label,
                filter_type: filterInfo?.type,
                is_mandatory: filterInfo?.is_mandatory,
                attribute_name: filterInfo?.filter_keyword,
                values: transformValues(intentActionResponse[property]),
              },
            ];
          }
        });
      }

      for (const key in preSelectedFilters) {
        dispatch(setSelectedFilters({ [key]: preSelectedFilters[key] }));
      }

      for (const key in preSelectedFilters) {
        preSelectedFilters[key].forEach((selectedFilter) => {
          filterDashBoardInfo.forEach((filter) => {
            if (selectedFilter.attribute_name === filter.column_name) {
              filter.initialData = selectedFilter?.values;
              filter.is_disabled = false;
            }
          });
        });
      }

      updateFilterConfigData[0].filterDashboardData = filterDashBoardInfo;

      let obj = {};
      obj[filterConfigName] = {
        filterConfig: updateFilterConfigData,
        appliedFilterData: appliedFilterData,
      };
      dispatch(setFilterConfiguration(obj));

      const applyFilterBtn = document.getElementById("filterBtn");

      setTimeout(() => {
        applyFilterBtn.click();
      }, 1000);
    } catch (error) {
      console.error("updateTheFilterConfigurationAndApply error", error);
    }
  };

  return {
    setUserFlow,
    setUserScreenAndFlow,
    fetchUserResultsFromQuery,
    getCurrentDateTimeString,
    setScreens,
    setLink,
    updateTheFilterConfigurationAndApply,
  };
};

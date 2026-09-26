import { useCallback } from "react";
import { cloneDeep, isEmpty, isNull } from "lodash";
import { getUserName } from "core/Utils/functions/utils";
import { ensureConversationExists } from "../utlis";

export const useChatSession = (
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
  closeBot,
  activeConversationId,
  setActiveConversationId,
  setShowChatPlaceholder
) => {
  const parseSavedFlow = useCallback(
    (savedChatSession) => {
      try {
        ensureConversationExists(currentMode, activeConversationId, chatDataRef);
        
        if (
          !savedChatSession?.length ||
          savedChatSession[savedChatSession?.length - 1].userType === "bot"
        ) {
          chatDataRef.current[currentMode].conversations[
            activeConversationId
          ].messages = savedChatSession;
        } else {
          const userType =
            savedChatSession[savedChatSession?.length - 1].userType;
          const lastIndex = userType === "loader" ? 2 : 1;
          const savedUserInput =
            savedChatSession[savedChatSession?.length - lastIndex];
          chatDataRef.current[currentMode].conversations[
            activeConversationId
          ].messages = savedChatSession.slice(
            0,
            savedChatSession?.length - lastIndex
          );
          if (
            !savedUserInput?.hasDirectActionType &&
            currentMode === "insights"
          ) {
            initiateNewChat(currentMode);
            return;
          }
          if (savedUserInput?.hasDirectActionType) {
            fetchUserResultsFromQuery(savedUserInput, true);
          } else {
            setFlowType(savedUserInput?.flow_type);
            setScreenName(savedUserInput?.screen_name);
            setUserInput(savedUserInput?.screen_name);
          }
        }
        setChatDataState(chatDataRef.current);
      } catch (error) {
        console.error("parseSavedFlow error:", error);
      }
    },
    [currentMode, activeConversationId]
  );

  const saveCurrentChanges = useCallback((moduleSelected = {}) => {
    const chatData = JSON.stringify(chatDataRef.current);
    localStorage.setItem("chatData", chatData);
    localStorage.setItem("currentModeData", currentMode);
    const selectedModuleData = !isEmpty(moduleSelected) ? JSON.stringify(moduleSelected) : JSON.stringify(selectedModule);
    localStorage.setItem("currentSelectedModuleData", selectedModuleData);
  }, [currentMode, selectedModule, chatDataRef, activeConversationId]);

  const endCurrentSession = useCallback(() => {
    // Reset states to initial values
    setFlowType(null);
    setUserInput("");
    setScreenName("");
    setTemplateData([]);
    setActiveConversationId(null);
    setShowChatPlaceholder(true);
    ensureConversationExists(currentMode, activeConversationId, chatDataRef);
    if (currentMode !== "agent") {
      chatDataRef.current[currentMode].conversations[
        activeConversationId
      ].messages = [];
    } else {
      chatDataRef.current[currentMode] = [];
    }
    chatDataScreenLinkRef.current[currentMode] = {
      screenName: "",
      currentAppLink: "",
    };
    const chatData = JSON.stringify(chatDataRef.current);
    localStorage.setItem("chatData", chatData);
    localStorage.setItem(
      "chatDataScreenLinkRef",
      JSON.stringify(chatDataScreenLinkRef.current)
    );
    // Close modal
    setShowModal(false);
    setMinimizedMode(false);
    if (currentMode === "navigation") {
      setSelectedModule({});
      localStorage.setItem("currentSelectedModuleData", JSON.stringify({}));
    }
    initiateNewChat(currentMode);
    closeBot(false);
  }, [
    currentMode,
    closeBot,
    activeConversationId
  ]);

  const clearChatSession = useCallback(() => {
    setFlowType(null);
    setUserInput("");
    setScreenName("");
    setCurrentAppLink("");
    initiateNewChat();
  }, []);

  const initiateNewChat = useCallback(
    (mode) => {
      try {
        let chatDataInfo = cloneDeep(chatDataRef.current);
        delete chatDataInfo.agent;

        for (const property in chatDataInfo) {
          if (isEmpty(chatDataRef.current[property].conversations) || !chatDataRef.current[property].conversations[activeConversationId]) {
            ensureConversationExists(
              property,
              activeConversationId,
              chatDataRef
            );
          }
        }

        const initialGreet = [
          {
            timeStamp: getCurrentDateTimeString(),
            userType: "bot",
            userName: "Alan",
            headerTitle: `Hi ${getUserName()}!`,
            bodyType: "text",
            bodyText: `I am Alan, your virtual assistant. I am here to help you on anything you are looking for in IA Smart Platform`,
          },
        ];
          // chatDataRef.current[currentMode].conversations[
          //   activeConversationId
          // ].messages = cloneDeep(initialGreet);
          for (const property in chatDataInfo) {
              initialGreet[0].flowType = property;

              if (
                isEmpty(
                  chatDataRef.current[property].conversations[
                    activeConversationId
                  ]?.messages
                )
              ) {
                chatDataRef.current[property].conversations[
                  activeConversationId
                ].messages = cloneDeep(initialGreet);
                if(property === "insights") {
                  let data = {
                    actionType: "direct",
                    displayText: "Get Insights",
                    displayUserText: "Getting Insights",
                    flow_type: "insights",
                    skipUserChat: true,
                  };
                  setUserFlow(data);
                }
              }
          }
        if (isEmpty(chatDataRef.current?.["agent"])) {
          chatDataRef.current["agent"] = cloneDeep(initialGreet);
        }
        setChatDataState(chatDataRef.current);
        // if (mode === "insights" && !messagePresent) {
        //   let data = {
        //     actionType: "direct",
        //     displayText: "Get Insights",
        //     displayUserText: "Getting Insights",
        //     flow_type: "insights",
        //     skipUserChat: true,
        //   };
        //   setUserFlow(data);
        // }
      } catch (error) {
        console.error("initiateNewChat error", error);
      }
    },
    [currentMode, getCurrentDateTimeString, activeConversationId]
  );

  const hasUnsavedChanges = useCallback(() => {
    // Check if there are messages in the current conversation
    if (!chatDataRef.current?.[currentMode]?.conversations?.[activeConversationId]) {
      return false;
    }
    
    const currentMessages = chatDataRef.current[currentMode].conversations[activeConversationId].messages;
    
    // Get the latest saved version from localStorage
    const savedData = localStorage.getItem("chatData");
    if (!savedData) return true;  // If no saved data, consider this as unsaved
    
    try {
      const parsedSavedData = JSON.parse(savedData);
      const savedMessages = parsedSavedData?.[currentMode]?.conversations?.[activeConversationId]?.messages;
      
      // If saved messages doesn't exist or lengths differ, there are unsaved changes
      if (!savedMessages || savedMessages.length !== currentMessages.length) {
        return true;
      }
      
      // Deep comparison of messages array to detect changes
      const currentStr = JSON.stringify(currentMessages);
      const savedStr = JSON.stringify(savedMessages);
      
      return currentStr !== savedStr;
    } catch (error) {
      console.error("Error checking for unsaved changes:", error);
      return false;
    }
  }, [currentMode, activeConversationId]);

  return {
    parseSavedFlow,
    saveCurrentChanges,
    endCurrentSession,
    clearChatSession,
    initiateNewChat,
    hasUnsavedChanges,
  };
};

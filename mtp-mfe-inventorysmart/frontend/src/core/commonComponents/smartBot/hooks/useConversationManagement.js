import { useCallback, useState } from 'react';
import * as conversationService from '../services/conversation-service';
import { getCurrentUserId } from 'core/Utils/functions/utils';
import isEmpty from 'lodash/isEmpty';
import moment from 'moment';
import { singleConversationNewData } from '../temp';
import { generateConversationId, generateConversationObject } from '../utlis';

export const useConversationManagement = (
  chatDataRef,
  currentMode,
  activeConversationId,
  setActiveConversationId,
  setChatDataState,
  selectedModule,
  setSelectedModule,
  isModuleChanged,
  setIsModuleChanged,
  setActiveChatId = () => { },
  saveCurrentChanges = () => { },
  chatDataInfoRef = null,
  setHistoryPanelData = (_data) => { },
  processResponse = null
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConversations = useCallback(async (activeChatId = null, mode = null) => {
    try {
      setLoading(true);
      const effectiveMode = mode || currentMode;
      const response = await conversationService.fetchConversations(effectiveMode);
      // const response = {
      //   status: true,
      //   data: {
      //     data: [
      //       {
      //         conversation_id: 1,
      //         name: "Getting Started Guide",
      //         created_at: new Date().toISOString(),
      //         updated_at: new Date().toISOString(),
      //       },
      //       {
      //         conversation_id: 2,
      //         name: "Product Features Discussion",
      //         created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      //         updated_at: new Date(Date.now() - 86400000).toISOString(),
      //       },
      //       {
      //         conversation_id: 3,
      //         name: "Troubleshooting Help",
      //         created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      //         updated_at: new Date(Date.now() - 172800000).toISOString(),
      //       },
      //       {
      //         conversation_id: 4,
      //         name: "Project Discussion",
      //         created_at: new Date(Date.now() - 948220200000).toISOString(), // 2 days ago
      //         updated_at: new Date(Date.now() - 948220200000).toISOString(),
      //       },
      //     ],
      //   },
      // };

      if (response?.data?.status) {
        const conversationsList = response.data.data.data;

        chatDataRef.current[effectiveMode].conversationsList = conversationsList;
        // Process conversations from each time group
        conversationsList.forEach(group => {
          group.conversation_list.forEach(conversation => {
            // chatDataRef.current[currentMode].conversations[conversation.conversation_id] = {
            //   id: conversation.conversation_id,
            //   name: conversation.name,
            //   idGenerated: true,
            //   timestamp: conversation.created_at || new Date().toISOString(),
            //   messages: []
            // };
            if (chatDataInfoRef?.current[effectiveMode]?.conversations?.[conversation.conversation_id]?.messages) {
              chatDataInfoRef.current[effectiveMode].conversations[conversation.conversation_id] = {
                id: conversation.conversation_id,
                name: conversation.name,
                idGenerated: true,
                timestamp: conversation.created_at || new Date().toISOString(),
                messages: chatDataInfoRef.current[effectiveMode].conversations[conversation.conversation_id].messages
              };
            }
          });
        });
        setHistoryPanelData(conversationsList);
        setChatDataState({ ...chatDataRef.current });
        if (activeChatId) {
          setActiveChatId(activeChatId);
        }
        // Set first conversation as active if none selected
        // if (!activeConversationId && Object.keys(conversations).length > 0) {
        //   setActiveConversationId(Object.keys(conversations)[0]);
        // }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentMode]);

  const fetchConversationChats = useCallback(
    async (conversationId, mode = null) => {
      const effectiveMode = mode || currentMode;
      try {
        setLoading(true);

        // --- Use hardcoded test data for now ---
        const savedData = singleConversationNewData;

        // Generate a conversation ID for the saved chat
        const savedConvId = conversationId || generateConversationId();

        // Ensure a conversation slot exists in chatDataInfoRef
        if (chatDataInfoRef) {
          if (!chatDataInfoRef.current[effectiveMode]?.conversations) {
            chatDataInfoRef.current[effectiveMode] = { conversations: {} };
          }
          chatDataInfoRef.current[effectiveMode].conversations[savedConvId] =
            generateConversationObject(savedConvId);
        }
        setActiveConversationId(savedConvId);

        // Build combined bot entries from the saved data
        // Collect thinking, steps, and agent response into a single combined message
        let thinkingResponse = {};
        let steps = [];
        const agentDataItems = [];
        let userMessage = null;

        savedData.forEach((item) => {
          if (item.userType === "user") {
            userMessage = {
              timeStamp: moment().format("DD-MM-YYYY HH:mm:ss"),
              userType: "user",
              bodyText: item.data,
              bodyType: "text",
            };
          } else if (item.chatType === "thinking") {
            thinkingResponse = {
              thinkingStream: item.data,
              thinkingContent: item.data,
              thinkingTime: 1,
              thinkingHeading: "Completed in 0m:00s",
            };
          } else if (item.chatType === "steps") {
            steps = item.data;
          } else if (item.chatType === "agent") {
            // Agent response items (widgets, selects, etc.)
            if (Array.isArray(item.data)) {
              agentDataItems.push(...item.data);
            } else {
              agentDataItems.push(item.data);
            }
          }
        });

        // Add user message to conversation
        if (userMessage && chatDataInfoRef) {
          chatDataInfoRef.current[effectiveMode].conversations[savedConvId].messages.push(userMessage);
          chatDataRef.current[effectiveMode] = [
            ...(chatDataRef.current[effectiveMode] || []),
            userMessage,
          ];
        }

        // Build the response in the shape processResponse expects:
        // response.data.data.data = array of items
        const textItem = {
          type: "text",
          response: "",
          response_heading: "",
          thinkingResponse,
        };
        const responseData = [textItem, ...agentDataItems];

        const fakeResponse = {
          data: {
            data: {
              data: responseData,
              session_id: "",
            },
          },
        };

        // Call processResponse with steps/tabs context
        if (processResponse) {
          await processResponse(
            fakeResponse,
            {},
            effectiveMode,
            null,
            {
              isTabEnabled: true,
              steps,
              currentTabValue: "agent_response",
              questions: [],
              questionsStepsMap: {},
            },
            savedConvId
          );
        }

        setChatDataState({ ...chatDataRef.current });
      } catch (err) {
        setError(err.message);
        console.error("fetchConversationChats error:", err);
      } finally {
        setLoading(false);
      }
    },
    [currentMode, processResponse]
  );

  const createNewConversation = useCallback(async (name) => {
    try {
      setLoading(true);
      const payload = {
        module_name: currentMode.toUpperCase(),
        flow_type: currentMode,
        name: name,
        application_code: 1,
        user_id: 251, // This should come from your auth context
      };

      const response = await conversationService.createConversation(payload);
      if (response.status) {
        await fetchConversations();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentMode]);

  const renameConversation = useCallback(async (conversationId, newName, mode = null) => {
    const effectiveMode = mode || currentMode;
    try {
      setLoading(true);
      const payload = {
        conversation_id: conversationId,
        name: newName
      };

      const response = await conversationService.updateConversation(conversationId, payload);
      // const response = {
      //   status: true,
      //   message: "Conversation updated successfully"
      // };
      if (response?.data?.status) {
        // chatDataRef.current[currentMode].conversations[conversationId].name = newName;
        if (chatDataInfoRef) {
          chatDataInfoRef.current[effectiveMode].conversations[conversationId].name = newName;
        }
        setChatDataState({ ...chatDataRef.current });
        return true;
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      console.error("renameConversation error:", err);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }, [currentMode]);

  const deleteConversation = useCallback(async (conversationId, mode = null) => {
    const effectiveMode = mode || currentMode;
    try {
      setLoading(true);
      const response = await conversationService.deleteConversation(conversationId);
      // const response = {
      //   status: true,
      //   message: "Conversation deleted successfully"
      // };
      if (response?.data?.status) {
        // delete chatDataRef.current[currentMode].conversations[conversationId];
        if (chatDataInfoRef) {
          delete chatDataInfoRef.current[effectiveMode].conversations[conversationId];
        }
        setChatDataState({ ...chatDataRef.current });

        // If deleted conversation was active, select another one
        if (activeConversationId === conversationId) {
          const remainingConversations = Object.keys(chatDataRef.current[effectiveMode].conversations);
          setActiveConversationId(remainingConversations[0] || null);
        }
        return true;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentMode, activeConversationId]);

  const saveCurrentChat = useCallback(async () => {
    try {
      setLoading(true);
      let userId = await getCurrentUserId();
      let isNewConversation = false;
      let newConversationName = "New Conversation";
      const dataRef = chatDataInfoRef || chatDataRef;
      // If no active conversation is selected, create a new one
      if (!activeConversationId) {
        isNewConversation = true;
        const conversationCount = Object.keys(dataRef.current[currentMode].conversations).length;
        const newConversationId = Date.now(); // Using timestamp as unique ID
        newConversationName = `Conversation ${conversationCount + 1}`;

        // Create new conversation object
        dataRef.current[currentMode].conversations[newConversationId] = {
          id: newConversationId,
          name: newConversationName,
          timestamp: new Date().toISOString(),
          messages: dataRef.current[currentMode].conversations[activeConversationId]?.messages || []
        };

        // Update active conversation
        setActiveConversationId(newConversationId);
        setChatDataState({ ...chatDataRef.current });
      }

      const currentChat = dataRef.current[currentMode].conversations[activeConversationId];
      let currentSelectedModuleData = JSON.parse(localStorage.getItem("currentSelectedModuleData"));
      let currentSelectedModuleForInsights = localStorage.getItem("smartBotScreenName");
      // if (currentMode === "insights") {
      //   currentSelectedModuleData = JSON.parse(
      //     localStorage.getItem("smartBotScreenName")
      //   );
      // }

      const payload = {
        conversation_id: currentChat?.idGenerated ? currentChat.id : null,
        module_name: currentMode === "insights" ? currentSelectedModuleForInsights : currentSelectedModuleData ? currentSelectedModuleData[activeConversationId] : "",
        flow_type: currentMode,
        name: isNewConversation ? newConversationName : currentChat.name,
        is_module_changed: isModuleChanged,
        chats: currentChat.messages.map(msg => ({
          chat_id: null, // null for new chat messages
          chat_object: {
            bodyText: msg.bodyText,
            bodyType: msg.bodyType === "stream" ? "text" : (msg.bodyType || 'text'),
            userName: msg.userName,
            userType: msg.userType,
            timeStamp: msg.timeStamp,
            headerTitle: msg.headerTitle,
            thinkingResponse: msg.thinkingResponse ? {
              thinkingStream: msg.thinkingResponse.thinkingStream,
              thinkingTime: msg.thinkingResponse.thinkingTime,
              thinkingHeading: typeof msg.thinkingResponse.thinkingHeading === 'string'
                ? msg.thinkingResponse.thinkingHeading
                : "Completed in 0m:00s",
            } : undefined,
          }
        }))
      };

      setIsModuleChanged(false);

      const response = await conversationService.saveChat(payload);
      let newConversationId = null;

      if (response && response?.data?.status) {
        // Extract the new conversation data from the response
        const newConversationData = response?.data?.data?.data[0];

        if (newConversationData) {
          // Get the new conversation ID
          newConversationId = newConversationData.conversation_id;

          // Preserve the existing rich in-memory messages (they contain
          // thinkingResponse, combined bodyText arrays, JSX, etc. that
          // the server response does not return).  Only update metadata.
          const existingMessages = currentChat.messages;

          // Map server-assigned chat_ids back onto existing messages
          if (newConversationData.chats) {
            newConversationData.chats.forEach((chat, index) => {
              if (existingMessages[index]) {
                existingMessages[index].id = chat.chat_id;
              }
            });
          }

          // Update conversation with server metadata but keep existing messages
          dataRef.current[currentMode].conversations[newConversationId] = {
            id: newConversationId,
            name: newConversationData.name,
            idGenerated: true,
            timestamp: newConversationData.created_at,
            messages: existingMessages,
          };

          // Keep chatDataRef in sync as well. Many parts of the UI re-render
          // based on setChatDataState({...chatDataRef.current}). If we only
          // update chatDataInfoRef, the UI can temporarily see an empty chat
          // and clear the conversation.
          if (chatDataInfoRef) {
            chatDataInfoRef.current[currentMode].conversations[newConversationId] = {
              id: newConversationId,
              name: newConversationData.name,
              idGenerated: true,
              timestamp: newConversationData.created_at,
              messages: existingMessages,
            };
          }

          // Update active conversation ID to the server-provided one
          setActiveConversationId(newConversationId);
          // Update the chat data state
          setChatDataState({ ...chatDataInfoRef.current });

          // Refresh the conversation list to show the new conversation
          await fetchConversations(newConversationId, "agent");
        }
      }
    } catch (err) {
      setError(err.message);
      console.error("saveCurrentChat error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentMode, activeConversationId, isModuleChanged]);

  return {
    loading,
    error,
    fetchConversations,
    fetchConversationChats,
    createNewConversation,
    renameConversation,
    deleteConversation,
    saveCurrentChat
  };
}; 
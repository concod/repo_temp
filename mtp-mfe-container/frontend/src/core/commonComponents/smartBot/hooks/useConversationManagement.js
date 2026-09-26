import { useCallback, useRef, useState } from 'react';
import * as conversationService from '../services/conversation-service';
import { getCurrentUserId } from 'core/Utils/functions/utils';
import isEmpty from 'lodash/isEmpty';
import moment from 'moment';
import { generateConversationId, generateConversationObject } from '../utlis';

// Format a duration in milliseconds into the "Completed in Xm:Ys" heading
// (e.g. 117839 -> "Completed in 1m:58s").
const formatDuration = (durationMs) => {
  const totalSeconds = Math.max(0, Math.round(Number(durationMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `Completed in ${minutes}m:${String(seconds).padStart(2, "0")}s`;
};

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
  // Lazily-resolved & cached current user id for the multi-chat history APIs.
  const userIdRef = useRef(null);

  const resolveUserId = useCallback(async () => {
    // eslint-disable-next-line no-unreachable
    if (userIdRef.current == null) {
      userIdRef.current = await getCurrentUserId();
    }
    return userIdRef.current;
  }, []);

  // ---------------------------------------------------------------------------
  // Multi-chat history listing (MULTI_CHAT_API_CONTRACT.md).
  // These sit alongside the legacy `core/chatbot/conversation/*` methods below
  // and drive the impact-ui history panel. Responses have no `status` flag, so
  // success is based on presence of `response.data.data` (HTTP 200).
  // ---------------------------------------------------------------------------
  const fetchChatHistory = useCallback(async () => {
    try {
      setLoading(true);
      const userId = await resolveUserId();
      const response = await conversationService.fetchChatList(userId);
      const groups = response?.data?.data?.data;
      if (Array.isArray(groups)) {
        setHistoryPanelData(groups);
      }
      return groups;
    } catch (err) {
      setError(err.message);
      console.error("fetchChatHistory error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const renameChat = useCallback(async (chatId, chatName) => {
    try {
      setLoading(true);
      const response = await conversationService.updateChat(chatId, { chatName });
      if (response?.data?.data) {
        await fetchChatHistory();
        return true;
      }
      return false;
    } catch (err) {
      setError(err.message);
      console.error("renameChat error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const pinChat = useCallback(async (chatId, isPinned) => {
    try {
      setLoading(true);
      const response = await conversationService.updateChat(chatId, { isPinned });
      if (response?.data?.data) {
        await fetchChatHistory();
        return true;
      }
      return false;
    } catch (err) {
      setError(err.message);
      console.error("pinChat error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteChatById = useCallback(async (chatId) => {
    try {
      setLoading(true);
      const response = await conversationService.deleteChat(chatId);
      if (response?.data?.data) {
        await fetchChatHistory();
        return true;
      }
      return false;
    } catch (err) {
      setError(err.message);
      console.error("deleteChatById error:", err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Replays a saved conversation's full transcript via
  // GET /chats/{chat_id}/questions (MULTI_CHAT_API_CONTRACT.md).
  // The response body IS the session-keyed map (oldest -> newest); each value is
  // [ userBubble, botBubble, { timing }, { feedback } ]. We render user + bot
  // through the same processResponse renderer used by the live flow. Timing
  // (index 2): start_time -> user bubble time, end_time -> bot bubble time,
  // duration -> the bot "Completed in" line. Feedback (index 3): is_liked ->
  // the highlighted thumbs (via the bot message's extra.status).
  const fetchConversationChats = useCallback(
    async (conversationId, mode = null) => {
      const effectiveMode = mode || currentMode;
      try {
        setLoading(true);

        const savedConvId = conversationId || generateConversationId();

        // Reset the conversation fresh so re-opening / switching conversations
        // never appends onto stale messages.
        chatDataRef.current[effectiveMode] = [];
        if (chatDataInfoRef) {
          if (!chatDataInfoRef.current[effectiveMode]?.conversations) {
            chatDataInfoRef.current[effectiveMode] = { conversations: {} };
          }
          chatDataInfoRef.current[effectiveMode].conversations[savedConvId] =
            generateConversationObject(savedConvId);
        }
        setActiveConversationId(savedConvId);

        const response = await conversationService.fetchChatQuestions(conversationId);
        // The body itself is the session-keyed map (no `data` wrapper).
        const turns = response?.data;

        // Response shape (GET /chats/{chat_id}/questions):
        //   {
        //     "<session_id>": [
        //       { userType: "user", chatType: "text",  data: "<question text>" }, // items[0]
        //       { userType: "bot",  chatType: "agent", data: [ ...widgets ] },     // items[1]
        //       { timing:   { start_time, end_time, duration } },                  // items[2]
        //       { feedback: { is_liked, feedback_text } | null }                   // items[3]
        //     ],
        //     ... // one entry per turn, oldest -> newest
        //   }
        // How we render each turn:
        //   - items[0] -> push a user message bubble.
        //   - items[1].data -> feed the widget list through processResponse (same
        //     renderer as the live stream) so text/table/html/etc. render identically.
        //   - items[2].timing -> start_time on the user bubble, duration -> the bot
        //     "Completed in" heading.
        //   - items[3].feedback.is_liked -> highlighted thumbs (extra.status).
        if (turns && typeof turns === "object") {
          // Object.entries preserves insertion order (oldest -> newest); do not sort.
          for (const [sessionId, items] of Object.entries(turns)) {
            if (!Array.isArray(items)) continue;
            const userItem = items[0];
            const botItem = items[1];
            const timing = items[2]?.timing;
            const feedback = items[3]?.feedback;

            // User bubble — start_time is shown as the question timestamp.
            // Left undefined when null so the UI hides it.
            if (userItem?.userType === "user" && chatDataInfoRef) {
              const userMessage = {
                timeStamp: timing?.start_time
                  ? moment(timing.start_time).format("DD-MM-YYYY HH:mm:ss")
                  : null,
                userType: "user",
                bodyText: userItem.data,
                bodyType: "text",
              };
              chatDataInfoRef.current[effectiveMode].conversations[savedConvId].messages.push(userMessage);
              chatDataRef.current[effectiveMode] = [
                ...(chatDataRef.current[effectiveMode] || []),
                userMessage,
              ];
            }

            // Bot bubble — render the widget list through processResponse.
            // `data` can be [] when a turn has no saved answer yet.
            if (
              botItem?.userType === "bot" &&
              Array.isArray(botItem.data) &&
              botItem.data.length &&
              processResponse
            ) {
              // Wrap the saved widget list into `historyResponse` — the exact
              // response shape `processResponse` expects from a live stream
              // (response.data.data.data) — so a history turn renders
              // identically to a live answer.
              const historyResponse = {
                data: {
                  data: {
                    data: botItem.data,
                    session_id: sessionId,
                  },
                },
              };
              await processResponse(
                historyResponse,
                {},
                effectiveMode,
                null,
                {
                  isTabEnabled: true,
                  currentTabValue: "agent_response",
                },
                savedConvId
              );

              // Tag the just-rendered bot message with its session id and the
              // saved timing. impact-ui's ConversationScreen renders these
              // directly: `timeStamp` -> the message time (via its own 12h
              // formatter) and `thinkingResponse.thinkingHeading` -> the
              // "Completed in" line. Left unset when null so the UI hides them.
              const messages =
                chatDataInfoRef?.current?.[effectiveMode]?.conversations?.[savedConvId]?.messages;
              if (messages?.length) {
                const botMessage = messages[messages.length - 1];
                botMessage.chatSessionId = sessionId;
                if (timing?.end_time) {
                  botMessage.timeStamp = moment(timing.end_time).format("DD-MM-YYYY HH:mm:ss");
                }
                if (timing?.duration != null) {
                  botMessage.thinkingResponse = {
                    ...(botMessage.thinkingResponse || {}),
                    thinkingHeading: formatDuration(timing.duration),
                  };
                }
                // Reflect saved feedback so the thumbs render highlighted.
                // impact-ui highlights based on `extra.status`.
                if (feedback?.is_liked != null) {
                  botMessage.extra = {
                    ...(botMessage.extra || {}),
                    status: feedback.is_liked ? "liked" : "disliked",
                  };
                }
              }
            }
          }
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
    saveCurrentChat,
    // Multi-chat history listing (new contract)
    fetchChatHistory,
    renameChat,
    pinChat,
    deleteChatById,
  };
}; 
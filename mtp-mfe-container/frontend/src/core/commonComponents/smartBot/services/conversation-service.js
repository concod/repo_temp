import axiosInstance from "core/Utils/axios";
import axios from "axios";
import { isUndefined } from "lodash";

// ---------------------------------------------------------------------------
// Multi-chat history service (MULTI_CHAT_API_CONTRACT.md)
// NOTE: This service lives on a different domain than the core/agent APIs and
// requires no auth. It is intentionally called with a bare `axios` instance so
// the core `axiosInstance` interceptors (Authorization/CSRF/HMAC headers and
// `withCredentials`) are NOT applied — those would break CORS / be rejected.
//
// Base URL resolves per client + environment from the `agent_multi_chat_cf_url`
// tenant config (see chatbot-services.getMultiChatCfUrl). It is pushed in via
// setChatHistoryBaseUrl() during agent init. Until/unless that config resolves
// (or it is empty), we fall back to the tapestry test deployment.
// ---------------------------------------------------------------------------
const CHAT_HISTORY_FALLBACK_URL =
  "https://us-central1-tapestry-10052024.cloudfunctions.net/inventorysmart-tapestry-agent-services-test";

let chatHistoryBaseUrl = CHAT_HISTORY_FALLBACK_URL;

// Called once during agent init with the client+env CF URL from tenant config.
// Empty/undefined values are ignored so the fallback is retained. Any trailing
// slash is stripped since callers append paths like `/chats/list`.
export const setChatHistoryBaseUrl = (url) => {
  if (url) chatHistoryBaseUrl = url.replace(/\/+$/, "");
};

const getChatHistoryBaseUrl = () => chatHistoryBaseUrl;

// GET /chats/list?user_id=&limit=
export const fetchChatList = async (userId, limit = 50) => {
  try {
    return axios({
      url: `${getChatHistoryBaseUrl()}/chats/list`,
      method: "GET",
      params: { user_id: userId, limit },
    });
  } catch (error) {
    console.error("fetchChatList error", error);
    return null;
  }
};

// PATCH /chats/{chat_id} — rename (chat_name) and/or pin (is_pinned).
// Only the provided fields are sent (extra keys are rejected with 400).
export const updateChat = async (chatId, { chatName, isPinned } = {}) => {
  try {
    const data = {};
    if (!isUndefined(chatName)) data.chat_name = chatName;
    if (!isUndefined(isPinned)) data.is_pinned = isPinned;
    return axios({
      url: `${getChatHistoryBaseUrl()}/chats/${chatId}`,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      data,
    });
  } catch (error) {
    console.error("updateChat error", error);
    return null;
  }
};

// DELETE /chats/{chat_id} — soft delete (no body, no query).
export const deleteChat = async (chatId) => {
  try {
    return axios({
      url: `${getChatHistoryBaseUrl()}/chats/${chatId}`,
      method: "DELETE",
    });
  } catch (error) {
    console.error("deleteChat error", error);
    return null;
  }
};

// GET /chats/{chat_id}/questions — full transcript for one chat.
// The response body IS the session-keyed map (no `data` wrapper); the caller
// reads it from `response.data`.
export const fetchChatQuestions = async (chatId) => {
  try {
    return axios({
      url: `${getChatHistoryBaseUrl()}/chats/${chatId}/questions`,
      method: "GET",
    });
  } catch (error) {
    console.error("fetchChatQuestions error", error);
    return null;
  }
};

// PUT /questions/{session_id}/feedback — save thumbs up/down for a turn.
// feedback_text is intentionally omitted (no comment).
export const updateQuestionFeedback = async (sessionId, isLiked) => {
  try {
    return axios({
      url: `${getChatHistoryBaseUrl()}/questions/${sessionId}/feedback`,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: { is_liked: isLiked },
    });
  } catch (error) {
    console.error("updateQuestionFeedback error", error);
    return null;
  }
};

// PATCH /questions/{session_id} — persist how long a turn took.
// All three fields are required; `duration` is an integer in milliseconds.
export const updateQuestionTiming = async (
  sessionId,
  { startTime, endTime, duration } = {}
) => {
  try {
    return axios({
      url: `${getChatHistoryBaseUrl()}/questions/${sessionId}`,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      data: {
        start_time: startTime,
        end_time: endTime,
        duration,
      },
    });
  } catch (error) {
    console.error("updateQuestionTiming error", error);
    return null;
  }
};

export const fetchConversations = async (currentMode) => {
  try {
    // Will be replaced with actual API call
    return axiosInstance({
      url: `core/chatbot/conversation/${currentMode}`,
      method: "GET"
    });
    // return {
    //   status: true,
    //   data: {
    //     data: [
    //       {
    //         conversation_id: 10,
    //         module_name: moduleType.toUpperCase(),
    //         flow_type: moduleType.toUpperCase(),
    //         name: "test chatbot's name",
    //         created_at: new Date().toISOString(),
    //         updated_at: new Date().toISOString(),
    //       }
    //     ]
    //   }
    // };
  } catch (error) {
    console.error("fetchConversations error", error);
    return null;
  }
};

export const fetchConversationChats = async (conversationId) => {
  try {
    return axiosInstance({
      url: `core/chatbot/conversation/${conversationId}/chats`,
      method: "GET"
    });
  } catch (error) {
    console.error("fetchConversationChats error", error);
    return null;
  }
};

export const createConversation = async (payload) => {
  try {
    return axiosInstance({
      url: `core/chatbot/conversation`,
      method: "POST",
      data: payload
    });
  } catch (error) {
    console.error("createConversation error", error);
    return null;
  }
};

export const updateConversation = async (conversationId, payload) => {
  try {
    return axiosInstance({
      url: `core/chatbot/conversation/update`,
      method: "POST",
      data: payload
    });
  } catch (error) {
    console.error("updateConversation error", error);
    return null;
  }
};

export const deleteConversation = async (conversationId) => {
  try {
    return axiosInstance({
      url: `core/chatbot/conversation/${conversationId}`,
      method: "DELETE"
    });
  } catch (error) {
    console.error("deleteConversation error", error);
    return null;
  }
};

export const saveChat = async (payload) => {
  try {
    return axiosInstance({
      url: `core/chatbot/conversation`,
      method: "POST",
      data: payload
    });
  } catch (error) {
    console.error("saveChat error", error);
    return null;
  }
}; 
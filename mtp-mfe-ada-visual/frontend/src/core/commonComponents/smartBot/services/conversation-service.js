import axiosInstance from "core/Utils/axios";

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
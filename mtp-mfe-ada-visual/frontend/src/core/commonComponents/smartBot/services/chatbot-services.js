import { COMBINED_CROSS_DIMENSIONAL_API } from "config/api";
import axiosInstance from "core/Utils/axios";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import { COMBINED_CROSS_DIMENSIONAL_API_V4 } from "core/constants";

export const resolveChatQuery = (body, flowType) => {
  try {
    return axiosInstance({
      url: `/core/chatbot/${flowType}`,
      method: "PUT",
      data: body,
    });
  } catch (error) {
    console.error("resolveChatQuery error", error);
    return null;
  }
};

export const fetchRelatedQuestions = (flowType, screen_name) => {
  try {
    return axiosInstance({
      url: `/core/chatbot/${flowType}/question/${screen_name}`,
      method: "GET",
    });
  } catch (error) {
    console.error("fetchRelatedQuestions error", error);
    return null;
  }
};

export const getSmartBotVisibilityData = () => {
  try {
    return tenantConfigApiCache(3, {
      attribute_name: "show_chatgpt_icon",
    })();
  } catch (error) {
    console.error("getSmartBotVisibilityData error", error);
  }
};

export const refreshAndUpdateUserManualApi = async (body) => {
  try {
    return axiosInstance({
      url: `core/chatbot/manualdoc`,
      method: "PUT",
      data: body,
    });
  } catch (error) {
    console.error("refreshAndUpdateUserManualApi error", error);
    return null;
  }
};

export const fetchScreensForModule = async (flowType) => {
  try {
    return axiosInstance({
      url: `core/chatbot/${flowType}/screen`,
      method: "GET",
    });
  } catch (error) {
    console.error("fetchScreensForModule error", error);
    return null;
  }
};

// Like/Dislike Messages
export const likeDislikeComment = async (payload) => {
  try {
    return axiosInstance({
      url: `core/chatbot/analytics/like`,
      data: payload,
      method: "POST",
    });
  } catch (error) {
    console.error("likeDislikeComment error", error);
    return false;
  }
};

// Like/Dislike Messages for agent
export const likeDislikeCommentForAgent = async (payload, baseUrl) => {
  try {
    return axiosInstance({
      url: `${baseUrl}/chatbot/agent/analytics/like`,
      data: payload,
      method: "POST",
    });
  } catch (error) {
    console.error("likeDislikeComment error", error);
    return false;
  }
};

export const fetchIntentApiResponse = async (input = "@apply_filter What is sales discount in cabezon mtd?") => {
  try {
    return axiosInstance({
      url: `core/chatbot/intent`,
      method: "POST",
      data: {
        query: input
      },
    });
  }
  catch (error) {
    console.error("fetchIntentApiResponse error", error);
  }
}

export const fetchAgentsInfo = async (baseUrl) => {
  try {
    return axiosInstance({
      url: `${baseUrl}/chatbot/agent/info`,
      method: 'GET'
    });
  } catch (error) {
    console.error('fetchAgentsInfo error:', error);
    return null;
  }
};

export const initiateAgent = async (payload, baseUrl) => {
  try {
    return axiosInstance({
      url: `${baseUrl}/chatbot/agent/init`,
      method: 'POST',
      data: payload,
    });
  } catch (error) {
    console.error('initiateAgent error:', error);
    return null;
  }
};

export const fetchCustomBotConfig = async (baseUrl) => {
  try {
    return axiosInstance({
      url: `${baseUrl}/chatbot/agent/custom-config`,
      method: 'GET'
    });
  } catch (error) {
    console.error('fetchAgentsInfo error:', error);
    return null;
  }
};

export const uploadFile = async (payload) => {
  try {
    return axiosInstance({
      url: `core/chatbot/upload/signed-url`,
      method: 'POST',
      data: payload,
    });
  } catch (error) {
    console.error('uploadFile error:', error);
    return null;
  }
};

export const triggerRefresh = async (baseUrl) => {
  try {
    return axiosInstance({
      url: `core/chatbot/trigger-refresh`,
      method: 'GET'
    });
  } catch (error) {
    console.error('fetchAgentsInfo error:', error);
    return null;
  }
};

export const fetchChatbotFilterConfig = async (dimension = "product") => {
  try {
    return axiosInstance({
      url: `core/filter/generic-schema-mapping?dimension=${dimension}&screen_name=Chatbot`,
      method: "GET",
    });
  } catch (error) {
    console.error("fetchChatbotFilterConfig error", error);
    return null;
  }
};

export const getFilterOptions = (postBody) => async () => {
  return axiosInstance({
    url:
      sessionStorage.getItem("crossFilterVersion") === "cross-filter-v4"
        ? COMBINED_CROSS_DIMENSIONAL_API_V4
        : COMBINED_CROSS_DIMENSIONAL_API,
    method: "POST",
    data: postBody,
  });
};

export const stopAgentFlow = async (payload, baseUrl) => {
  try {
    return axiosInstance({
      url: `${baseUrl}/chatbot/agent/stop`,
      method: 'POST',
      data: payload,
    });
  } catch (error) {
    console.error('stopAgentFlow error:', error);
    return null;
  }
};

export const getTableRecords = async (baseUrl, tableName, page, pageSize) => {
  try {
    return axiosInstance({
      url: `${baseUrl}/chatbot/agent/tabular-data/${tableName}?page=${page}&page_size=${pageSize}`,
      method: 'GET',
    });
  } catch (error) {
    console.error('getTableRecords error:', error);
    return null;
  }
};

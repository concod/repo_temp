import axios from "axios";
import axiosInstance from "core/Utils/axios";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";

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

// export const getSmartBotVisibilityData = () => {
//   try {
//     return tenantConfigApiCache(3, {
//       attribute_name: "show_chatgpt_icon",
//     })();
//   } catch (error) {
//     console.error("getSmartBotVisibilityData error", error);
//   }
// };

export const getSmartBotVisibilityData = () => {
  try {
    return getTenantConfigApplicationLevel(3, {
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

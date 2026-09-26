import axiosInstance from "core/Utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { arrageChatConversationData } from "../utils";
import { isEmpty } from "lodash";
import { sanitizePayloadFields } from "core/Utils/functions/utils";

export const commonChatCoversationServices = createSlice({
  name: "commonChatCoversationServices",
  initialState: {
    openChat: false,
    openChatWithEvents: false,
    chatLoading: false,
    eventsData: {
      tableName: "",
      uniqueRowId: "",
      selectedRowsIDs: [],
      currentUser: {},
      chatList: {},
      starredList: {},
      resolvedList: {},
      eventsCreated: {},
    },
    appDetails: {
      applicationCode: "",
      screenCode: "",
    },
  },
  reducers: {
    setChatConversationOpenOrNot: (state, action) => {
      state.openChat = action.payload;
    },
    setChatConversationOpenWithEvents: (state, action) => {
      state.openChat = action.payload;
      state.openChatWithEvents = action.payload;
    },
    setChatEventsData: (state, action) => {
      state.eventsData = {
        ...state.eventsData,
        ...action.payload,
      };
    },
    setCommonApplicationCode: (state, action) => {
      state.appDetails.applicationCode = action.payload;
    },
    setCommonScreenCode: (state, action) => {
      state.appDetails.screenCode = action.payload;
    },
    setChatLoading: (state, action) => {
      state.chatLoading = action.payload;
    },
    setTableName: (state, action) => {
      state.eventsData.tableName = action.payload
    }
  },
});

export const {
  setTableName,
  setChatLoading,
  setChatEventsData,
  setCommonScreenCode,
  setCommonApplicationCode,
  setChatConversationOpenOrNot,
  setChatConversationOpenWithEvents,
} = commonChatCoversationServices.actions;

export const createEventandChatConversation = async (data) => {
  // Sanitize comment field to prevent XSS attacks before sending to backend
  const sanitizedData = sanitizePayloadFields(data, 'comment');
  
  const response = await axiosInstance({
    url: "commenting/comments",
    method: "POST",
    data: sanitizedData,
  });
  return response.data;
};

export const getEventsForParticularRow = async (data) => {
  const response = await axiosInstance({
    url: `commenting/events`,
    method: "POST",
    data: data,
  });
  return response.data;
};

export const editCommentAndMakeStarred = async (commentId, data) => {
  // Sanitize comment field to prevent XSS attacks before sending to backend
  const sanitizedData = sanitizePayloadFields(data, 'comment');
  
  const response = await axiosInstance({
    url: `commenting/comment/${commentId}`,
    method: "PATCH",
    data: sanitizedData,
  });
  return response.data;
};

export const deleteComment = async (commentId, data) => {
  const response = await axiosInstance({
    url: `commenting/comment/${commentId}`,
    method: "DELETE",
    data,
  });

  return response.data;
};

export const updateEventNameandResolveEventandPinEvent = async (
  eventId,
  data
) => {
  const response = await axiosInstance({
    url: `commenting/event/${eventId}`,
    method: "PATCH",
    data,
  });
  return response.data;
};

export const deleteEvent = async (data) => {
  const response = await axiosInstance({
    url: "commenting/event",
    method: "DELETE",
    data,
  });
  return response.data;
};

export const getConversationCount = async (data) => {
  const response = await axiosInstance({
    url: "commenting/landing-page",
    method: "POST",
    data,
  });
  return response.data;
};

export const addUserOrRemoveUserFromEvent = async (data) => {
  const response = await axiosInstance({
    url: "commenting/event/user",
    method: "POST",
    data,
  });

  return response.data;
};

export const fetchSingleEventData = async (eventId, filter) => {
  const response = await axiosInstance({
    url: `commenting/event/${eventId}/comments${filter ? `?${filter}` : ""}`,
    method: "GET",
  });
  return response.data;
};

export const getEventsData = async (
  data,
  tableName,
  uniqueRowId,
  selectedRowsIDs,
  displaySnackMessages,
  dispatch
) => {
  try {
    const response = await getEventsForParticularRow(data);
    let eventData = {};
    if (response.status) {
      const {
        chatList,
        starredList,
        resolvedList,
      } = arrageChatConversationData(response.data);

      eventData = {
        tableName,
        uniqueRowId,
        selectedRowsIDs: selectedRowsIDs,
        chatList,
        starredList,
        resolvedList,
      };
    }
    displaySnackMessages(response.message, "success", dispatch);
    dispatch(setChatEventsData(eventData));
  } catch (err) {
    const errMsg = !isEmpty(err.response?.data.message)
      ? err.response.data.message
      : "Something went wrong";
    displaySnackMessages(errMsg, "error", dispatch);
    dispatch(setChatEventsData({}));
  }
};

export const clearChatForUser = async (eventId) => {
  const response = await axiosInstance({
    url: `commenting/clear_chat/${eventId}`,
    method: "DELETE",
  });
  return response.data;
};

export const toggleChatNotifications = async (reqBody) => {
  const response = await axiosInstance({
    url: `commenting/event/snooze`,
    method: "POST",
    data: reqBody
  });
  return response.data;
}

export default commonChatCoversationServices.reducer;

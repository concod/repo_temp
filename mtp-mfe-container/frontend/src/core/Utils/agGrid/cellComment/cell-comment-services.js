import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import { sanitizePayloadFields } from "core/Utils/functions/utils";

export const cellCommentService = createSlice({
  name: "cellCommentService",
  initialState: {
    isPanelOpen: false,
    isAddCommentPopupOpen: false,
    threadPopupInfo: {
      open: false,
      eventId: null,
      isPanelRedirect: false,
    },
    activeTableInfo: {
      tableId: null,
      rowId: null,
      columnName: null,
      requestUrl: null,
      filters: [],
    },
    activeApplicationInfo: {},
    tableCommentsData: {},
  },
  reducers: {
    setIsPanelOpen: (state, action) => {
      state.isPanelOpen = action.payload;
    },
    setIsAddCommentPopupOpen: (state, action) => {
      state.isAddCommentPopupOpen = action.payload;
    },
    setThreadPopupInfo: (state, action) => {
      state.threadPopupInfo = {
        open: action.payload.open,
        eventId: action?.payload?.eventId,
        isPanelRedirect: action?.payload?.isPanelRedirect,
      };
    },
    setActiveTableInfo: (state, action) => {
      state.activeTableInfo = {
        tableId: action.payload.tableId,
        rowId: action.payload.rowId,
        columnName: action.payload.columnName,
        requestUrl: action.payload.requestUrl,
        filters: action.payload.appliedFilters,
      };
    },
    setActiveApplicationInfo: (state, action) => {
      state.activeApplicationInfo = action.payload;
    },
    setTableCommentsData: (state, action) => {
      state.tableCommentsData = {
        ...state.tableCommentsData,
        ...action.payload,
      };
    },
    resetThreadPopupInfo: (state, action) => {
      state.threadPopupInfo = {
        open: false,
        eventId: null,
        isPanelRedirect: false,
      };
    },
  },
});
export const {
  setIsPanelOpen,
  setIsAddCommentPopupOpen,
  setThreadPopupInfo,
  setActiveTableInfo,
  setActiveApplicationInfo,
  setTableCommentsData,
  resetThreadPopupInfo,
} = cellCommentService.actions;

// API for getting all table comments of the rows currently visible on the screen
export const getAllTableComments = (reqBody) => {
  return axiosInstance({
    url: "/commenting/landing-page",
    method: "POST",
    data: reqBody,
  });
};

// API for click of cellCommentBadge
export const getActiveCellComments = (eventId) => {
  return axiosInstance({
    url: `/commenting/event/${eventId}/comments`,
    method: "GET",
  });
};

export const createComment = (reqBody) => {
  // Sanitize comment/html_msg fields to prevent XSS attacks before sending to backend
  const sanitizedBody = sanitizePayloadFields(reqBody, ['comment', 'html_msg']);
  
  return axiosInstance({
    url: "/commenting/comments",
    method: "POST",
    data: sanitizedBody,
  });
};
export const updateComment = (reqBody, commentId) => {
  // Sanitize comment/html_msg fields to prevent XSS attacks before sending to backend
  const sanitizedBody = sanitizePayloadFields(reqBody, ['comment', 'html_msg']);
  
  return axiosInstance({
    url: `/commenting/comment/${commentId}`,
    method: "PATCH",
    data: sanitizedBody,
  });
};
export const deleteComment = (commentId, reqBody) => {
  return axiosInstance({
    url: `/commenting/comment/${commentId}`,
    method: "DELETE",
    data: reqBody,
  });
};

// API for getting the comments in the sidepanel
export const getPanelComments = (reqBody) => {
  return axiosInstance({
    url: `/commenting/cell_comments`,
    method: "POST",
    data: reqBody,
  });
};

// API to get the row for server side table when rows are not present in the currect page
export const getRowForComments = (eventId, serverSideRedirect = true) => {
  return axiosInstance({
    url: `/core/redirect/${eventId}`,
    method: "POST",
    data: {
      server_side_redirect: serverSideRedirect,
    },
  });
};
export default cellCommentService.reducer;

import { CREATE_COMMENT, GET_COMMENT, GET_SCREEN_MASTER } from "config/api";
import axiosInstance from "core/Utils/axios";
import { sanitizePayloadFields } from "core/Utils/functions/utils";

export const fetchComment = (postBody) => async () => {
  return axiosInstance({
    url: GET_COMMENT,
    method: "POST",
    data: postBody,
  });
};

export const createComment = (postBody) => async () => {
  // Sanitize comment/html_msg fields to prevent XSS attacks before sending to backend
  const sanitizedBody = sanitizePayloadFields(postBody, ['comment', 'html_msg']);
  
  return axiosInstance({
    url: CREATE_COMMENT,
    method: "POST",
    data: sanitizedBody,
  });
};

export const deleteComment = (params) => async () => {
  return axiosInstance({
    url: `${CREATE_COMMENT}/${params}`,
    method: "DELETE",
  });
};

export const editComment = (payload) => async () => {
  // Sanitize comment/html_msg fields to prevent XSS attacks before sending to backend
  const sanitizedPayload = sanitizePayloadFields(payload, ['comment', 'html_msg']);
  
  return axiosInstance({
    url: CREATE_COMMENT,
    method: "PATCH",
    data: sanitizedPayload,
  });
};

export const getScreenMaster = (payload) => async () => {
  return axiosInstance({
    url: GET_SCREEN_MASTER,
    method: "POST",
    data: payload,
  });
};
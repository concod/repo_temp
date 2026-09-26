import { CREATE_COMMENT, GET_COMMENT, GET_SCREEN_MASTER } from "config/api";
import { SET_COMMENT_BAR } from "../actions/types";
import axiosInstance from "core/Utils/axios";

export const fetchComment = (postBody) => async () => {
  return axiosInstance({
    url: GET_COMMENT,
    method: "POST",
    data: postBody,
  });
};

export const createComment = (postBody) => async () => {
  return axiosInstance({
    url: CREATE_COMMENT,
    method: "POST",
    data: postBody,
  });
};

export const deleteComment = (params) => async () => {
  return axiosInstance({
    url: `${CREATE_COMMENT}/${params}`,
    method: "DELETE",
  });
};

export const editComment = (payload) => async () => {
  return axiosInstance({
    url: CREATE_COMMENT,
    method: "PATCH",
    data: payload,
  });
};

export const getScreenMaster = (payload) => async () => {
  return axiosInstance({
    url: GET_SCREEN_MASTER,
    method: "POST",
    data: payload,
  });
};

export const setcommentBarActive = (commentBarActive) => {
  return {
    type: SET_COMMENT_BAR,
    payload: commentBarActive,
  };
};
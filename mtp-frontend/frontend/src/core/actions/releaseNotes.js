import axiosInstance from "core/Utils/axios";

import { GET_RELEASE_NOTES } from "config/api";

export const getReleaseNotes = () => {
  return axiosInstance({
    url: GET_RELEASE_NOTES,
    method: "GET",
  });
};

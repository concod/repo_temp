import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  MARKSMART_FILES_BROWSE_API,
  MARKSMART_GENERATE_FILE_DOWNLOAD_LINK_API,
  MARKSMART_UPLOAD_FILE_API,
} from "modules/marksmart/constants-marksmart/apiConstants";
export const marksmartDashboardService = createSlice({
  name: "marksmartDashboardService",
  initialState: {},
  reducers: {},
});

// Action creators are generated for each case reducer function
export const {} = marksmartDashboardService.actions;

export const fetchFoldersInBucketAPI = (path) => () => {
  return axiosInstance({
    url: `${MARKSMART_FILES_BROWSE_API}` + path,
    method: "GET",
  });
};

export const generateDownloadLink = (filePath) => () => {
  return axiosInstance({
    url: `${MARKSMART_GENERATE_FILE_DOWNLOAD_LINK_API}?path=${filePath}`,
    method: "GET",
  });
};

export const uploadSkuFile = (body, filePath) => () => {
  return axiosInstance({
    url: `${MARKSMART_UPLOAD_FILE_API}`,
    method: "POST",
    data: body,
  });
};

export default marksmartDashboardService.reducer;

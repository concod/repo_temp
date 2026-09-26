import { createSlice } from "@reduxjs/toolkit";

import axiosInstance from "core/Utils/axios";

import {NEW_STORE_DASHBOARD_LIST} from "modules/assortsmart/constants-assortsmart/apiConstants"

export const fetchNewStoreDashboardList = (
  body,
  endpoint,
  page = 0,
  limit = 10
) => () => {
  return axiosInstance({
    url: `${NEW_STORE_DASHBOARD_LIST}?page=${page + 1}&limit=${limit}`,
    method: "POST",
    data: body,
  });
};


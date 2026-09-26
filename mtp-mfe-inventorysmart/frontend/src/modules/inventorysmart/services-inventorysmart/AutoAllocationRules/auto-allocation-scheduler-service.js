import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";
import {
  CREATE_ALLOCATION_SCHEDULER,
  DELETE_ALLOCATION_SCHEDULER,
  DELETE_AUTO_ALLOCATION_RULE,
  GET_ALLOCATION_RULES_LIST,
  GET_ALLOCATION_SCHEDULER_LIST,
  GET_SELECTED_ALLOCATION_SCHEDULER,
  UPDATE_ALLOCATION_SCHEDULER,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";

export const autoAllocationSchedulerService = createSlice({
  name: "autoAllocationSchedulerService",
  initialState: {
    tableData: {},
    tableLoader: false,
    formData: {},
    schedulerLoader: false,
    editId: "",
    editName: "",
  },
  reducers: {
    setAutoAllocationSchedulerTableData: (state, action) => {
      state.tableData = action.payload;
    },
    setAutoAllocationSchedulerTableLoader: (state, action) => {
      state.tableLoader = action.payload;
    },
    setSchedulerFormData: (state, action) => {
      state.formData = action.payload;
    },
    setSchedulerLoader: (state, action) => {
      state.schedulerLoader = action.payload;
    },
    setEditId: (state, action) => {
      state.editId = action.payload;
    },
    setEditRuleName: (state, action) => {
      state.editName = action.payload;
    },
  },
});

export const getAllocatioSchedulerListTableData = (postbody) => () => {
  return axiosInstance({
    url: GET_ALLOCATION_SCHEDULER_LIST,
    method: "POST",
    data: postbody,
  });
};

export const deleteAllocationScheduler = (deleteId) => () => {
  return axiosInstance({
    url: `${DELETE_ALLOCATION_SCHEDULER}/${deleteId}`,
    method: "DELETE",
  });
};
export const createNewAutoAllocationScheduler = (postbody) => () => {
  return axiosInstance({
    url: CREATE_ALLOCATION_SCHEDULER,
    method: "POST",
    data: postbody,
  });
};

export const getSelectedSchedulerDetails = (selectedId) => () => {
  return axiosInstance({
    url: `${GET_SELECTED_ALLOCATION_SCHEDULER}/${selectedId}`,
    method: "GET",
  });
};

export const updateSchedulerDetails = (postbody) => () => {
  return axiosInstance({
    url: UPDATE_ALLOCATION_SCHEDULER,
    method: "POST",
    data: postbody,
  });
};

export const {
  setAutoAllocationSchedulerTableData,
  setAutoAllocationSchedulerTableLoader,
  setSchedulerFormData,
  setEditId,
  setEditRuleName,
  setSchedulerLoader,
} = autoAllocationSchedulerService.actions;

export default autoAllocationSchedulerService.reducer;

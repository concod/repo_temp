import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  GET_PLAN_LEVELS,
  GET_PLAN_ATTRIBUTES,
  CREATE_PLAN,
  GET_STORE_ATTRIBUTES,
  PLANSMART_GET_SEASON_OPTIONS
} from "../../constants-plansmart/apiConstants";

export const planSmartCreateNewPlanLoader = createSlice({
  name: "plansmartCreateNewPLanLoader",
  initialState: {
    plansmartCreateNewPlanLoader: false,
  },
  reducers: {
    setPlansmartCreateNewPlanLoader: (state, action) => {
      state.plansmartCreateNewPlanLoader = action.payload;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  setPlansmartCreateNewPlanLoader,
} = planSmartCreateNewPlanLoader.actions;

//API to Fetch Attributes for Creating a new plan
export const fetchCreatePlanAttributes = () => async (dispatch) => {
  return axiosInstance({
    url: GET_PLAN_LEVELS,
    method: "GET",
  });
};

//API to Create a New Plan and return plan code
export const createNewPlan = (postBody) => async (dispatch) => {
  return axiosInstance({
    url: CREATE_PLAN,
    method: "POST",
    data: postBody,
  });
};

export const getDropdownValues = (screen) => async (dispatch) => {
  return axiosInstance({
    url: `${GET_PLAN_ATTRIBUTES}/${screen}`,
    method: "GET",
  });
};

export const getStoreDropdownValues = (postBody) => async (dispatch) => {
  return axiosInstance({
    url: GET_STORE_ATTRIBUTES,
    method: "POST",
    data: postBody,
  });
};

export const getSeasonOptions = (body) => () => {
  return axiosInstance({
    url: PLANSMART_GET_SEASON_OPTIONS,
    method: "POST",
    data: body,
  });
};

export default planSmartCreateNewPlanLoader.reducer;

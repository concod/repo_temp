import { createSelector, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../../../../core/Utils/axios";
import {
  GET_HINDSIGHT_KPI_VIEW,
  GET_TREEMAP_Data,
  TREEMAP_FILTERS_DATA,
  CREATE_HINDSIGHT_VIEW,
  GET_HINDSIGHT_PLAN_DETAILS,
  BUBBLE_GRAPH_DATA,
  PARETO_GRAPH_DATA,
} from "modules/assortsmart/constants-assortsmart/apiConstants";

export const dashboardService = createSlice({
  name: "dashboardService",
  initialState: {
    hindsight_loader: false,
    hindsightTreemapData: {},
    hindsightTreemapFiltersOptions: {},
    hindsightPlanDetails: {},
    hindsightBubbleGraphData: {},
    bubbleGraphLoader: false,
    paretoGraphLoader: false,
    hindsightParetoGraphData: {}
  },
  reducers: {
    setHindsightLoader: (state, action) => {
      state.hindsight_loader = action.payload;
    },
    setHindsightTreemapData: (state, action) => {
      state.hindsightTreemapData = action.payload;
    },
    setHindsightTreemapFiltersOptions: (state, action) => {
      state.hindsightTreemapFiltersOptions = action.payload;
    },
    setHindsightPlanDetails: (state, action) => {
      state.hindsightPlanDetails = action.payload;
    },
    setHindsightBubbleGraphData: (state, action) => {
      state.hindsightBubbleGraphData = action.payload;
    },
    setBubbleGraphLoader: (state, action) => {
      state.bubbleGraphLoader = action.payload;
    },
    setParetoGraphLoader: (state, action) => {
      state.paretoGraphLoader = action.payload;
    },
    setHindsightParetoGraphData: (state, action) => {
      state.hindsightParetoGraphData = action.payload;
    }
  },
});

// Action creators are generated for each case reducer function
export const {
  setHindsightLoader,
  setHindsightTreemapData,
  setHindsightTreemapFiltersOptions,
  setHindsightPlanDetails,
  setHindsightBubbleGraphData,
  setBubbleGraphLoader,
  setParetoGraphLoader,
  setHindsightParetoGraphData
} = dashboardService.actions;

//API to view KPI
export const getHindsightKPIView = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_HINDSIGHT_KPI_VIEW,
    method: "POST",
    data: body,
  });
};

export const getHindsightTreemapData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_TREEMAP_Data,
    method: "POST",
    data: body
  })
}

export const getHindsightTreemapFilters = (endpoint) => () => {
  return axiosInstance({
    url: endpoint + TREEMAP_FILTERS_DATA,
    method: "GET"
  });
}

export const createHindsightView = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + CREATE_HINDSIGHT_VIEW,
    method: "POST",
    data: body
  });
}

export const getHindsightPlanDetails = (planCode, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_HINDSIGHT_PLAN_DETAILS + `/${planCode}`,
    method: "GET"
  });
}

export const getHindsightBubbleGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + BUBBLE_GRAPH_DATA,
    method: "POST",
    data: body
  });
}

export const updateHindisghtView = (body, planCode, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_HINDSIGHT_PLAN_DETAILS + `/${planCode}`,
    method: "PUT",
    data: body
  });
}

export const getParetoGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + PARETO_GRAPH_DATA,
    method: "POST",
    data: body
  });
}

// Selectors

export const hindsightReducerSelector = createSelector(
  (state) => state,
  (state) => state.assortsmartReducer.hindsightReducer
);

export const setHindsightLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsight_loader
);

export const setHindsightTreemapSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightTreemapData
);

export const setHindsightTreemapFiltersSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightTreemapFiltersOptions
);

export const getHindsightPlanDetailsSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightPlanDetails
);

export const setHindsightBubbleGraphSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightBubbleGraphData
);

export const setBubbleGraphLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.bubbleGraphLoader
)

export const setHindsightParetoGraphSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightParetoGraphData
);

export const setParetoGraphLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.paretoGraphLoader
)

export default dashboardService.reducer;

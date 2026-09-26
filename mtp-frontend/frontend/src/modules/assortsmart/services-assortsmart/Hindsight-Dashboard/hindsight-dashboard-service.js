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
  ATTRIBUTE_GRAPH_DATA,
  TIMELINE_GRAPH_DATA,
  GEO_GRAPH_DATA,
  ST_MARGIN_GRAPH_DATA,
  CLERANCE_CARRYOVER_GRAPH_DATA,
  ST_DISCOUNT_GRAPH_DATA,
  SIZE_REVIEW_GRAPH_DATA,
  UPDATED_SIZE_REVIEW_GRAPH_DATA,
  UPDATED_ATTRIBUTE_GRAPH_DATA,
  UPDATED_CLERANCE_CARRYOVER_GRAPH_DATA,
  UPDATED_GEO_GRAPH_DATA,
  UPDATED_TIMELINE_GRAPH_DATA,
  UPDATED_BUBBLE_GRAPH_DATA,
  UPDATED_PARETO_GRAPH_DATA,
  UPDATED_TREEMAP_Data,
  DOWNLOAD_GRAPH_DATA,
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
    hindsightParetoGraphData: {},
    attributeGraphLoader: {},
    hindsightAttributeGraphData: {},
    timelineGraphLoader: false,
    hindsightTimelineGraphData: {},
    geoGraphLoader: false,
    hindsightGeoGraphData: {},
    treemapLoader: false,
    stMarginGraphLoader: false,
    hindsightSTMarginGraphData: {},
    clearanceCarryoverLoader: false,
    hindsightClearanceCarryoverGraphData: {},
    stDiscountGraphLoader: false,
    hindsightSTDiscountGraphData: {},
    sizeGraphLoader: false,
    hindsightSizeGraphData: {},
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
    },
    setAttributeGraphLoader: (state, action) => {
      state.attributeGraphLoader = action.payload;
    },
    setHindsightAttributeGraphData: (state, action) => {
      state.hindsightAttributeGraphData = action.payload;
    },
    setTimelineGraphLoader: (state, action) => {
      state.timelineGraphLoader = action.payload;
    },
    setHindsightTimelineGraphData: (state, action) => {
      state.hindsightTimelineGraphData = action.payload;
    },
    setGeoGraphLoader: (state, action) => {
      state.geoGraphLoader = action.payload;
    },
    setHindsightGeoGraphData: (state, action) => {
      state.hindsightGeoGraphData = action.payload;
    },
    setTreemapLoader: (state, action) => {
      state.treemapLoader = action.payload;
    },
    setSTMarginGraphLoader: (state, action) => {
      state.stMarginGraphLoader = action.payload;
    },
    setHindsightSTMarginGraphData: (state, action) => {
      state.hindsightSTMarginGraphData = action.payload;
    },
    setClearanceCarryoverGraphLoader: (state, action) => {
      state.clearanceCarryoverLoader = action.payload;
    },
    setHindsightClearanceCarryoverGraphData: (state, action) => {
      state.hindsightClearanceCarryoverGraphData = action.payload;
    },
    setSTDiscountGraphLoader: (state, action) => {
      state.stDiscountGraphLoader = action.payload;
    },
    setHindsightSTDiscountGraphData: (state, action) => {
      state.hindsightSTDiscountGraphData = action.payload;
    },
    setSizeGraphLoader: (state, action) => {
      state.sizeGraphLoader = action.payload;
    },
    setHindsightSizeGraphData: (state, action) => {
      state.hindsightSizeGraphData = action.payload;
    },
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
  setHindsightParetoGraphData,
  setAttributeGraphLoader,
  setHindsightAttributeGraphData,
  setTimelineGraphLoader,
  setHindsightTimelineGraphData,
  setGeoGraphLoader,
  setHindsightGeoGraphData,
  setTreemapLoader,
  setSTMarginGraphLoader,
  setHindsightSTMarginGraphData,
  setClearanceCarryoverGraphLoader,
  setHindsightClearanceCarryoverGraphData,
  setSTDiscountGraphLoader,
  setHindsightSTDiscountGraphData,
  setHindsightSizeGraphData,
  setSizeGraphLoader,
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
    data: body,
  });
};

export const getHindsightTreemapFilters = (endpoint) => () => {
  return axiosInstance({
    url: endpoint + TREEMAP_FILTERS_DATA,
    method: "GET",
  });
};

export const getHindsightGraphDownload = (body,endpoint) => () => {
  return axiosInstance({
    url: endpoint + DOWNLOAD_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const createHindsightView = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + CREATE_HINDSIGHT_VIEW,
    method: "POST",
    data: body,
  });
};

export const getHindsightPlanDetails = (planCode, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_HINDSIGHT_PLAN_DETAILS + `/${planCode}`,
    method: "GET",
  });
};

export const getHindsightBubbleGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + BUBBLE_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const updateHindisghtView = (body, planCode, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GET_HINDSIGHT_PLAN_DETAILS + `/${planCode}`,
    method: "PUT",
    data: body,
  });
};

export const getParetoGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + PARETO_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getHindsightAttributeGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + ATTRIBUTE_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getHindsightTimelineGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + TIMELINE_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getHindsightGeoGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + GEO_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getHindsightSTMarginGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + ST_MARGIN_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getHindsightClearanceCarryoverGraphData = (
  body,
  endpoint
) => () => {
  return axiosInstance({
    url: endpoint + CLERANCE_CARRYOVER_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getHindsightSTDiscountGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + ST_DISCOUNT_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getHindsightSizeGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + SIZE_REVIEW_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getUpdatedHindsightSizeGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPDATED_SIZE_REVIEW_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getUpdatedHindsightAttributeGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPDATED_ATTRIBUTE_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getUpdatedHindsightClearanceCarryoverGraphData = (
  body,
  endpoint
) => () => {
  return axiosInstance({
    url: endpoint + UPDATED_CLERANCE_CARRYOVER_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getUpdatedHindsightGeoGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPDATED_GEO_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getUpdatedHindsightTimelineGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPDATED_TIMELINE_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getUpdatedHindsightBubbleGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPDATED_BUBBLE_GRAPH_DATA,
    method: "POST",
    data: body,
  });
};

export const getUpdatedHindsightParetoGraphData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPDATED_PARETO_GRAPH_DATA,
    method: "POST",
    data: body
  });
}

export const getUpdatedHindsightTreeMapData = (body, endpoint) => () => {
  return axiosInstance({
    url: endpoint + UPDATED_TREEMAP_Data,
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
);

export const setHindsightParetoGraphSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightParetoGraphData
);

export const setParetoGraphLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.paretoGraphLoader
);

export const setHindsightAttributeGraphSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightAttributeGraphData
);

export const setAttributeGraphLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.attributeGraphLoader
);

export const setTimelineGraphLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.timelineGraphLoader
);

export const setHindsightTimelineGraphSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightTimelineGraphData
);

export const setGeoGraphLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.geoGraphLoader
);

export const setHindsightGeoGraphSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightGeoGraphData
);

export const setTreemapLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.treemapLoader
);

export const setSTMarginLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.stMarginGraphLoader
);

export const setHindsightSTMarginGraphSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightSTMarginGraphData
);
export const setSTDiscountLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.stDiscountGraphLoader
);

export const setHindsightSTDiscountGraphSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightSTDiscountGraphData
);

export const setClearanceCarryoverLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.clearanceCarryoverLoader
);

export const setHindsightClearanceCarryoverGraphSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightClearanceCarryoverGraphData
);

export const setSizeLoaderSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.sizeGraphLoader
);

export const setHindsightSizeGraphSelector = createSelector(
  hindsightReducerSelector,
  (state) => state.hindsightSizeGraphData
);

export default dashboardService.reducer;

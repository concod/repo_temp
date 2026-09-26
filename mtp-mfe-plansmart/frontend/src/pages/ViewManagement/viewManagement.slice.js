import { createSelector, createSlice } from "@reduxjs/toolkit";
import { get, isEmpty } from "lodash";

const initialState = {
  isAdmin: null,
  isPlanner: null,
  screenIdMapping: {},
  listedViewList: {
    global_views: [],
    personal_views: []
  },
  activeView: {},
  activeViewDetails: {},
  templateDetails: {}
};

const viewManagement = createSlice({
  name: "ViewManagement",
  initialState,
  reducers: {
    setTemplateDetails: (state, action) => {
      state.templateDetails = action.payload;
    },
    setListedViewList: (state, action) => {
      state.listedViewList = action.payload;
    },
    setActiveView: (state, action) => {
      state.activeView = action.payload;
    },
    setActiveViewDetails: (state, action) => {
      state.activeViewDetails = action.payload;
    },
    setActiveViewSettingsData: (state, action) => {
      state.activeViewDetails = {
        ...state.activeViewDetails, // Ensure parent reference changes
        view_details: {
          ...state.activeViewDetails.view_details,
          view_settings: [...action.payload]
        }
      };
    },
    setActiveViewMetricsData: (state, action) => {
      state.activeViewDetails = {
        ...state.activeViewDetails, // Ensure parent reference changes
        view_details: {
          ...state.activeViewDetails.view_details,
          show_hide_metrics: [...action.payload]
        }
      };
    },
    setActiveViewVersionToggle: (state, action) => {
      state.activeViewDetails = {
        ...state.activeViewDetails,
        view_details: {
          ...state.activeViewDetails.view_details,
          view_settings: state.activeViewDetails.view_details.view_settings.map(
            (setting) =>
              setting.key === "version"
                ? { ...setting, selected: action.payload }
                : setting
          )
        }
      };
    },
    setActiveViewVarianceToggle: (state, action) => {
      state.activeViewDetails = {
        ...state.activeViewDetails,
        view_details: {
          ...state.activeViewDetails.view_details,
          view_settings: state.activeViewDetails.view_details.view_settings.map(
            (setting) =>
              setting.key === "variance"
                ? { ...setting, selected: action.payload }
                : setting
          )
        }
      };
    },
    setUserIsAdmin: (state, action) => {
      state.isAdmin = action.payload;
    },
    setUserIsPlanner: (state, action) => {
      state.isPlanner = action.payload;
    },
    setScreenIdMapping: (state, action) => {
      state.screenIdMapping = action.payload;
    },
    resetViewStates: (state) => {
      state.listedViewList = initialState.listedViewList;
      state.activeView = initialState.activeView;
      state.activeViewDetails = initialState.activeViewDetails;
      state.templateDetails = initialState.templateDetails;
    }
  }
});

export const {
  setTemplateDetails,
  setListedViewList,
  setActiveView,
  setActiveViewDetails,
  setUserIsAdmin,
  setUserIsPlanner,
  setScreenIdMapping,
  resetViewStates,
  setActiveViewSettingsData,
  setActiveViewMetricsData,
  setActiveViewVersionToggle,
  setActiveViewVarianceToggle
} = viewManagement.actions;

export const viewManagementSelector = createSelector(
  (state) => state,
  (state) => state?.plansmartReducer?.viewManagement
);

// Template Selectors
export const settingsTabTemplateSelector = createSelector(
  viewManagementSelector,
  (state) => state?.templateDetails?.view_details?.view_settings
);

// Active view details selector
export const activeViewDetailSelector = createSelector(
  viewManagementSelector,
  (state) => state?.activeViewDetails
);

// ActiveView table-settings selector
export const activeViewSettingsSelector = createSelector(
  viewManagementSelector,
  (state) => state?.activeViewDetails?.view_details?.view_settings
);

// ActiveView showHideMetric selector
export const activeViewShowOrHideMetricsDataSelector = createSelector(
  viewManagementSelector,
  (state) => state?.activeViewDetails?.view_details?.show_hide_metrics
);

// Save View Selectors
export const screenIdMappingSelector = createSelector(
  viewManagementSelector,
  (state) => state?.screenIdMapping
);

//View List Selector
export const listedViewListSelector = createSelector(
  viewManagementSelector,
  (state) =>
    get(state, "listedViewList", { global_views: [], personal_views: [] })
);

//current View selector
export const activeViewDetailsSelector = createSelector(
  viewManagementSelector,
  (state) => state?.activeView
);

// Selector to return global_views or personal_views depending if the user is planner or admin
export const currentViewsListSelector = createSelector(
  viewManagementSelector,
  (state) =>
    state?.isPlanner
      ? state?.listedViewList?.personal_views
      : state?.listedViewList?.global_views
);

// Selector to return a boolean value whether to call the template API for a screen or not
export const isTemplateCallRequiredSelector = createSelector(
  viewManagementSelector,
  (state) =>
    (state?.isAdmin && state?.listedViewList?.global_views?.length === 0) ||
    (state?.isPlanner &&
      state?.listedViewList?.personal_views?.length === 0 &&
      isEmpty(state?.activeView))
);

export const showViewManagementSelector = createSelector(
  viewManagementSelector,
  (state) => state?.isPlanner || state?.isAdmin
);

export const isUserPlannerSelector = createSelector(
  viewManagementSelector,
  (state) => state?.isPlanner
);

export default viewManagement.reducer;

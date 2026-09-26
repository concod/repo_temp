import { createSelector, createSlice } from "@reduxjs/toolkit";
import { get, isEmpty, cloneDeep } from "lodash";

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
  isValidView: false,

  viewUpdated: false,
  lastUpdatedViewId: null,
  /** In-flight GET /views/details/:id — ref-counted for overlapping requests. */
  viewDetailsFetchCount: 0,
};

const viewManagementV2Slice = createSlice({
  name: "orderManagementViewManagement",
  initialState,
  reducers: {
    setViewUpdated: (state, action) => {
      state.viewUpdated = action.payload;
      if (action.payload === false) {
        state.lastUpdatedViewId = null;
      }
    },
    setLastUpdatedViewId: (state, action) => {
      state.lastUpdatedViewId = action.payload;
    },
    markViewSaved: (state, action) => {
      state.lastUpdatedViewId = action.payload;
      state.viewUpdated = true;
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
        ...state.activeViewDetails,
        view_details: {
          ...state.activeViewDetails.view_details,
          view_settings: [...action.payload]
        }
      };
    },
    setActiveViewMetricsData: (state, action) => {
      state.activeViewDetails = {
        ...state.activeViewDetails,
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
    resetActiveView: (state) => {
      state.activeView = initialState.activeView;
    },
    resetViewStates: (state) => {
      state.activeView = initialState.activeView;
      state.activeViewDetails = initialState.activeViewDetails;
      state.listedViewList = initialState.listedViewList;
      // Clear screen-scoped save markers so a "save & apply" performed on one
      // screen does not auto-refetch the same view on the next screen.
      state.viewUpdated = initialState.viewUpdated;
      state.lastUpdatedViewId = initialState.lastUpdatedViewId;
      state.isValidView = initialState.isValidView;
      state.viewDetailsFetchCount = 0;
    },
    viewDetailsFetchStarted(state) {
      state.viewDetailsFetchCount += 1;
    },
    viewDetailsFetchFinished(state) {
      state.viewDetailsFetchCount = Math.max(0, state.viewDetailsFetchCount - 1);
    },
    setIsValidView: (state, action) => {
      state.isValidView = action.payload;
    },
    resetViewManagement: () => cloneDeep(initialState)
  }
});

export const {
  resetActiveView,
  resetViewStates,
  setListedViewList,
  setActiveView,
  setActiveViewDetails,
  setUserIsAdmin,
  setUserIsPlanner,
  setScreenIdMapping,
  setActiveViewSettingsData,
  setActiveViewMetricsData,
  setActiveViewVersionToggle,
  setActiveViewVarianceToggle,
  setIsValidView,
  setViewUpdated,
  setLastUpdatedViewId,
  markViewSaved,
  resetViewManagement,
  viewDetailsFetchStarted,
  viewDetailsFetchFinished,
} = viewManagementV2Slice.actions;

export const selectVmSlice = (state) =>
  state?.omsReducer?.orderManagementViewManagement;

export const selectActiveViewDetail = createSelector(
  selectVmSlice,
  (s) => s?.activeViewDetails
);

export const selectActiveViewSettings = createSelector(
  selectVmSlice,
  (s) => s?.activeViewDetails?.view_details?.view_settings
);

export const selectActiveViewShowHideMetrics = createSelector(
  selectVmSlice,
  (s) => s?.activeViewDetails?.view_details?.show_hide_metrics
);

export const selectScreenIdMapping = createSelector(
  selectVmSlice,
  (s) => s?.screenIdMapping
);

export const selectListedViewList = createSelector(
  selectVmSlice,
  (s) =>
    get(s, "listedViewList", { global_views: [], personal_views: [] })
);

export const selectActiveView = createSelector(
  selectVmSlice,
  (s) => s?.activeView
);

export const selectCurrentViewsList = createSelector(
  selectVmSlice,
  (s) => {
    if (!s) return [];
    const globalViews = s.listedViewList?.global_views ?? [];
    const personalViews = s.listedViewList?.personal_views ?? [];
    return s.isPlanner ? personalViews : [...globalViews, ...personalViews];
  }
);

export const selectIsTemplateCallRequired = createSelector(
  selectVmSlice,
  (s) =>
    (s?.isAdmin && s?.listedViewList?.global_views?.length === 0) ||
    (s?.isPlanner &&
      s?.listedViewList?.personal_views?.length === 0 &&
      isEmpty(s?.activeView))
);

export const selectShowViewManagement = createSelector(
  selectVmSlice,
  (s) => s?.isPlanner || s?.isAdmin
);

export const selectIsUserPlanner = createSelector(
  selectVmSlice,
  (s) => s?.isPlanner
);

export const selectIsValidView = createSelector(
  selectVmSlice,
  (s) => s?.isValidView
);

export const selectViewUpdated = createSelector(
  selectVmSlice,
  (s) => s?.viewUpdated
);

export const selectLastUpdatedViewId = createSelector(
  selectVmSlice,
  (s) => s?.lastUpdatedViewId
);

export const selectIsViewDetailsLoading = createSelector(
  selectVmSlice,
  (s) => (s?.viewDetailsFetchCount ?? 0) > 0
);

export default viewManagementV2Slice.reducer;

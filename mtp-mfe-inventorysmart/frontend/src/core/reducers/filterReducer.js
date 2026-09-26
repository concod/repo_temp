import {
  CHANGE_FILTER_DATA,
  SET_SELECTED_FILTERS,
  SET_SELECTED_FILTER_CONFIGURATION,
  SET_SAVED_FILTER_SELECTION,
  RESET_SELECTED_FILTER_CONFIGURATION,
  GET_SAVED_FILTERSELECTION_LOADING,
  SET_APPLICATION_CODES_LIST,
  SET_SAVED_FILTERS_LIST,
  SET_SAVED_SELECTED_FILTERS,
  SET_IS_FILTER_APPLIED,
  SET_UPLOADED_FILTERS,
  RESET_UPLOADED_FILTERS,
  SET_TRIGGER_FILTER_APPLY,
} from "../actions/types";

export const initialState = {
  filterInitialData: [],
  selectedFilters: {},
  savedSelectedFilter: null,
  filterDashboardConfiguration: {},
  savedFilterSelection: [],
  getSavedFilterSelectionLoading: true,
  applicationCodesList: [],
  savedFilterDashboard: [],
  isFilterApplied: false,
  uploadedFilters: {},
  triggerFilterApply: false,
};

export default function (state = initialState, action) {
  switch (action.type) {
    case CHANGE_FILTER_DATA:
      return {
        ...state,
        filterInitialData: action.payload,
      };
    case SET_SELECTED_FILTERS:
      return {
        ...state,
        selectedFilters: { ...state.selectedFilters, ...action.payload },
        triggerFilterApply: true,
      };
    case SET_TRIGGER_FILTER_APPLY:
      return {
        ...state,
        triggerFilterApply: action.payload,
      };
    case SET_SAVED_SELECTED_FILTERS:
      return {
        ...state,
        savedSelectedFilter: action.payload,
      };
    case SET_SELECTED_FILTER_CONFIGURATION:
      return {
        ...state,
        filterDashboardConfiguration: {
          ...state.filterDashboardConfiguration,
          ...action.payload,
        },
      };
    case GET_SAVED_FILTERSELECTION_LOADING:
      return {
        ...state,
        getSavedFilterSelectionLoading: action.payload,
      };
    case SET_SAVED_FILTER_SELECTION:
      return {
        ...state,
        savedFilterSelection: action.payload,
        getSavedFilterSelectionLoading: false,
      };
    case RESET_SELECTED_FILTER_CONFIGURATION:
      return {
        ...state,
        filterDashboardConfiguration: action.payload,
      };
    case SET_APPLICATION_CODES_LIST:
      return {
        ...state,
        applicationCodesList: action.payload,
      };
    case SET_SAVED_FILTERS_LIST:
      return {
        ...state,
        savedFilterDashboard: action.payload,
      };
    case SET_IS_FILTER_APPLIED:
      return {
        ...state,
        isFilterApplied: action.payload,
      };
    case SET_UPLOADED_FILTERS:
      return {
        ...state,
        uploadedFilters: {
          ...state.uploadedFilters,
          ...action.payload,
        },
      };
    case RESET_UPLOADED_FILTERS:
      return {
        ...state,
        uploadedFilters: {},
      };
    default:
      return state;
  }
}

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
    default:
      return state;
  }
}

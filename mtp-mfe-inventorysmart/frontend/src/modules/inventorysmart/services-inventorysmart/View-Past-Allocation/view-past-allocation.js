import { createSlice } from "@reduxjs/toolkit";
import {
  GET_PAST_ALLOCATION_TABLE_CONFIG,
  GET_PAST_ALLOCATION_TABLE_DATA,
  GET_S2S_PAST_ALLOCATION_TABLE_DATA,
} from "modules/inventorysmart/constants-inventorysmart/apiConstants";
import axiosInstance from "../../../../core/Utils/axios/index";

export const inventorySmartPastAllocationService = createSlice({
  name: "inventorySmartPastAllocationService",
  initialState: {
    inventorysmartPastAllocationFilterLoader: false,
    inventorysmartPastAllocationTableConfigLoader: false,
    inventorysmartPastAllocationTableDataLoader: false,
    inventorysmartPastAllocationFilterElements: [],
    inventorysmartPastAllocationFilterDependency: [],
    selectedFilters: [],
    isFiltersValid: false,
    PastAllocationTableConfig: [],
    PastAllocationTableData: [],
    backButtonClicked: false,
    formFilters: {},
    viewPastAllocationModuleConfig: {},
    dynamicViewPastCardLabels: {},
    pastAllocationCardsData: [],
    vpaConfiguration: {},
    appliedFiltersVPA: {},
    selectedFiltersVPA: {},
    S2SPastAllocationTableData: [],
    // Store-to-Store (S2S) independent filter states
    inventorysmartPastAllocationFilterElementsS2S: [],
    inventorysmartPastAllocationFilterDependencyS2S: [],
    selectedFiltersS2S: [],
    isFiltersValidS2S: false,
    vpaConfigurationS2S: {},
    appliedFiltersVPAS2S: {},
    selectedFiltersVPAS2S: {},
    formFiltersS2S: {},
    backButtonClickedS2S: false,
  },
  reducers: {
    setInventorysmartPastAllocationFilterLoader: (state, action) => {
      state.inventorysmartPastAllocationFilterLoader = action.payload;
    },
    setInventorysmartPastAllocationTableDataLoader: (state, action) => {
      state.inventorysmartPastAllocationTableDataLoader = action.payload;
    },
    setSelectedFilters: (state, action) => {
      state.selectedFilters = action.payload;
    },
    setInventorysmartPastAllocationFilterElements: (state, action) => {
      state.inventorysmartPastAllocationFilterElements = action.payload;
    },
    setInventorysmartPastAllocationFilterDependency: (state, action) => {
      state.inventorysmartPastAllocationFilterDependency = action.payload;
    },
    setBackButtonClicked: (state, action) => {
      state.backButtonClicked = action.payload;
    },
    setFormData: (state, action) => {
      state.formFilters = action.payload;
    },
    setIsFiltersValid: (state, action) => {
      state.isFiltersValid = action.payload;
    },
    setPastAllocationTableConfig: (state, action) => {
      state.PastAllocationTableConfig = action.payload;
    },
    setPastAllocationTableData: (state, action) => {
      state.PastAllocationTableData = action.payload;
    },
    setViewPastAllocationModuleConfig: (state, action) => {
      state.viewPastAllocationModuleConfig = action.payload;
    },
    setPastAllocationCardsData: (state, action) => {
      state.pastAllocationCardsData = action.payload;
    },
    setDynamicViewPastCardLabels: (state, action) => {
      state.dynamicViewPastCardLabels = action.payload;
    },
    setVpaConfiguration: (state, action) => {
      state.vpaConfiguration = action.payload;
    },
    setAppliedFiltersVPA: (state, action) => {
      state.appliedFiltersVPA = action.payload;
    },
    setSelectedFiltersVPA: (state, action) => {
      state.selectedFiltersVPA = action.payload;
    },
    setS2SPastAllocationTableData: (state, action) => {
      state.S2SPastAllocationTableData = action.payload;
    },
    // Store-to-Store (S2S) independent filter state setters
    setInventorysmartPastAllocationFilterElementsS2S: (state, action) => {
      state.inventorysmartPastAllocationFilterElementsS2S = action.payload;
    },
    setInventorysmartPastAllocationFilterDependencyS2S: (state, action) => {
      state.inventorysmartPastAllocationFilterDependencyS2S = action.payload;
    },
    setSelectedFiltersS2S: (state, action) => {
      state.selectedFiltersS2S = action.payload;
    },
    setIsFiltersValidS2S: (state, action) => {
      state.isFiltersValidS2S = action.payload;
    },
    setVpaConfigurationS2S: (state, action) => {
      state.vpaConfigurationS2S = action.payload;
    },
    setAppliedFiltersVPAS2S: (state, action) => {
      state.appliedFiltersVPAS2S = action.payload;
    },
    setSelectedFiltersVPAS2S: (state, action) => {
      state.selectedFiltersVPAS2S = action.payload;
    },
    setFormDataS2S: (state, action) => {
      state.formFiltersS2S = action.payload;
    },
    setBackButtonClickedS2S: (state, action) => {
      state.backButtonClickedS2S = action.payload;
    },
    resetCardsData: (state, action) => {
      state.pastAllocationCardsData = [];
    },
    resetPastAllocationState: (state) => {
      state.inventorysmartPastAllocationFilterLoader = false;
      state.inventorysmartPastAllocationTableConfigLoader = false;
      state.inventorysmartPastAllocationTableDataLoader = false;
      state.inventorysmartPastAllocationFilterElements = [];
      // state.inventorysmartPastAllocationFilterDependency = [];
      state.selectedFilters = [];
      state.isFiltersValid = false;
      state.PastAllocationTableConfig = [];
      state.PastAllocationTableData = [];
      state.backButtonClicked = false;
      state.formFilters = {};
      state.dynamicViewPastCardLabels = {};
      state.pastAllocationCardsData = [];
      state.S2SPastAllocationTableData = [];
      // reset S2S filter states
      state.inventorysmartPastAllocationFilterElementsS2S = [];
      state.selectedFiltersS2S = [];
      state.isFiltersValidS2S = false;
      state.backButtonClickedS2S = false;
    },
  },
});

export const {
  setInventorysmartPastAllocationFilterLoader,
  setInventorysmartPastAllocationTableDataLoader,
  setSelectedFilters,
  setInventorysmartPastAllocationFilterElements,
  setInventorysmartPastAllocationFilterDependency,
  setBackButtonClicked,
  setFormData,
  setIsFiltersValid,
  setPastAllocationTableConfig,
  setPastAllocationTableData,
  resetPastAllocationState,
  setViewPastAllocationModuleConfig,
  setPastAllocationCardsData,
  setDynamicViewPastCardLabels,
  resetCardsData,
  setAppliedFiltersVPA,
  setSelectedFiltersVPA,
  setVpaConfiguration,
  setS2SPastAllocationTableData,
  setInventorysmartPastAllocationFilterElementsS2S,
  setInventorysmartPastAllocationFilterDependencyS2S,
  setSelectedFiltersS2S,
  setIsFiltersValidS2S,
  setVpaConfigurationS2S,
  setAppliedFiltersVPAS2S,
  setSelectedFiltersVPAS2S,
  setFormDataS2S,
  setBackButtonClickedS2S,
} = inventorySmartPastAllocationService.actions;

export const getPastAllocationTableConfiguration = () => () => {
  return axiosInstance({
    url: GET_PAST_ALLOCATION_TABLE_CONFIG,
    method: "GET",
  });
};

export const getPastAllocationTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_PAST_ALLOCATION_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export const getPastAllocationTableDataDownload = (postBody) => () => {
  return axiosInstance({
    url: `${GET_PAST_ALLOCATION_TABLE_DATA}/download`,
    method: "POST",
    data: postBody,
  });
};

export const getS2SPastAllocationTableData = (postBody) => () => {
  return axiosInstance({
    url: GET_S2S_PAST_ALLOCATION_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

export default inventorySmartPastAllocationService.reducer;

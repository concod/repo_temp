import { createSlice } from "@reduxjs/toolkit";
import axiosInstance from "core/Utils/axios";

export const productUnitDefinitionService = createSlice({
  name: "productUnitDefinitionService",
  initialState: {
    stylesData: [],
    stylesDataCount: 0,
    stylesTableCols: [],
    isLoading: false,
    selectedStyleId: "",
    unitDefnType: "",
    unitDefnName: "",
    attributeType: "single size - all colors",
    attributes_sizes: [],
    attributes_colors: [],
    copyStyleId: "",
    availableDefinitions: [],
    selectedAvailableDefn: "",
    packQuantity: 0,
    packsInCartons: 0,
    cartonsInBoxes: 0,
    isPacksDisabled: true,
    isPacksInCartonsDisabled: true,
    isCartonsInBoxesDisabled: true,
    attributeData: [],
    metrics: [],
    showStylesTable: false,
    availableStyles: [],
    lastEditedData: [],
    lastEditedType: "",
    filtersData: [],
    currentPageIndex: 0,
    currentPageSize: 10,
    dataChanged: true,
    dataType: "firstrender",
    isMetricCopied: false,
    isNameValid: false,
    editName: "",
  },
  reducers: {
    setUnitDefns: (state, action) => {
      state.stylesData = action.payload.data;
      state.stylesDataCount = action.payload.count;
    },
    setStyleTableCols: (state, action) => {
      state.stylesTableCols = action.payload;
    },
    ToggleLoader: (state, action) => {
      state.isLoading = action.payload;
    },
    setSelectedStyleId: (state, action) => {
      state.selectedStyleId = action.payload;
    },
    setUnitDefnType: (state, action) => {
      state.unitDefnType = action.payload;
    },
    setUnitDefnName: (state, action) => {
      state.unitDefnName = action.payload;
    },
    setUnitAttributeType: (state, action) => {
      state.attributeType = action.payload;
    },
    setStyleAttributes: (state, action) => {
      state.attributes_sizes = action.payload.sizes;
      state.attributes_colors = action.payload.colors;
      state.metrics = action.payload.metrics;
    },
    setCopyStyleId: (state, action) => {
      state.copyStyleId = action.payload;
    },
    setAvailableDefns: (state, action) => {
      state.availableDefinitions = action.payload;
    },
    setSelectedAvailableDefn: (state, action) => {
      state.selectedAvailableDefn = action.payload;
    },
    setPackQuantity: (state, action) => {
      state.packQuantity = action.payload;
    },
    setPacksInCartons: (state, action) => {
      state.packsInCartons = action.payload;
    },
    setCartonsInBoxes: (state, action) => {
      state.cartonsInBoxes = action.payload;
    },
    setPacksDisableStatus: (state, action) => {
      state.isPacksDisabled = action.payload;
    },
    setPacksInCartonDisableStatus: (state, action) => {
      state.isPacksInCartonsDisabled = action.payload;
    },
    setCartonsInBoxesDisableStatus: (state, action) => {
      state.isPacksInCartonsDisabled = action.payload;
    },
    setAttributeData: (state, action) => {
      state.attributeData = [...action.payload];
    },
    setShowStylesTable: (state, action) => {
      state.showStylesTable = action.payload;
    },
    setAvailableStyles: (state, action) => {
      state.availableStyles = action.payload;
    },
    setLastEditedDetails: (state, action) => {
      state.lastEditedData = action.payload.data;
      state.lastEditedType = action.payload.type;
      state.isMetricCopied = action.payload.status
        ? action.payload.status
        : false;
    },
    setUnitDefnFilterValues: (state, action) => {
      state.filtersData = action.payload;
    },
    setStylesPageStatus: (state, action) => {
      state.currentPageIndex = action.payload.pageIndex;
      state.currentPageSize = action.payload.pageSize;
    },
    changeDataStatus: (state, action) => {
      state.dataChanged = action.payload.status;
      state.dataType = action.payload.type;
    },
    changeNameValidStatus: (state, action) => {
      state.isNameValid = action.payload;
    },
    setEditName: (state, action) => {
      state.editName = action.payload;
    },
    ResetDefn: (state, action) => {
      state.unitDefnName = "";
      state.unitDefnType = "";
      state.selectedStyleId = "";
      state.packQuantity = 0;
      state.packsInCartons = 0;
      state.cartonsInBoxes = 0;
      state.isPacksDisabled = true;
      state.isPacksInCartonsDisabled = true;
      state.isCartonsInBoxesDisabled = true;
      state.attributeType = "single size - all colors";
      state.copyStyleId = "";
      state.availableDefinitions = [];
      state.selectedAvailableDefn = "";
      state.lastEditedData = [];
      state.lastEditedType = "";
      state.isMetricCopied = false;
      state.isNameValid = false;
      state.editName = "";
    },
  },
});

// Action creators are generated for each case reducer function

export const {
  setUnitDefns,
  setStyleTableCols,
  ToggleLoader,
  setSelectedStyleId,
  setUnitDefnType,
  setUnitDefnName,
  setUnitAttributeType,
  setStyleAttributes,
  setCopyStyleId,
  setAvailableDefns,
  setSelectedAvailableDefn,
  setPackQuantity,
  setPacksInCartons,
  setCartonsInBoxes,
  setPacksDisableStatus,
  setPacksInCartonDisableStatus,
  setCartonsInBoxesDisableStatus,
  setAttributeData,
  setShowStylesTable,
  setAvailableStyles,
  setLastEditedDetails,
  setUnitDefnFilterValues,
  setStylesPageStatus,
  changeDataStatus,
  changeNameValidStatus,
  setEditName,
  ResetDefn
} = productUnitDefinitionService.actions;

// API calls
export const fetchUnitDefns = (body, queryParams) => (dispatch) => {
  return axiosInstance({
    url: `master/unit-definition/fetch`,
    method: "POST",
    data: body,
  });
};

export const fetchAttributes = (styleId) => (dispatch) => {
  return axiosInstance({
    url: `/master/unit-definition/fetch-attributes?style_id=${styleId}`,
    method: "GET",
  });
};

export const fetchAvailableDefns = (styleId) => (dispatch) => {
  return axiosInstance({
    url: `/master/unit-definition/available-definitions?style_id=${styleId}`,
    method: "GET",
  });
};

export const fetchUnitDefnById = (defnId) => (dispatch) => {
  return axiosInstance({
    url: `/master/unit-definition/fetch/${defnId}`,
    method: "GET",
  });
};

export const isNameValid = (name, styleId) => (dispatch) => {
  return axiosInstance({
    url: `/master/unit-definition/validate-name?style_id=${styleId}&name=${name}`,
    method: "GET",
  });
};

export const createNewDefn = (body, styleId) => (dispatch) => {
  return axiosInstance({
    url: `/master/unit-definition?style_id=${styleId}`,
    method: "POST",
    data: body,
  });
};

export const deleteDefn = (defn_id) => (dispatch) => {
  return axiosInstance({
    url: `/master/unit-definition/${defn_id}`,
    method: "DELETE",
  });
};

export const fetchAvailableStyles = (body) => (dispatch) => {
  return axiosInstance({
    url: `/master/unit-definition/fetch-styles`,
    method: "POST",
    data: body,
  });
};

export const updateUnitDefn = (body, styleId, defn_id) => (dispatch) => {
  return axiosInstance({
    url: `/master/unit-definition?style_id=${styleId}&definition_id=${defn_id}`,
    method: "PUT",
    data: body,
  });
};

export default productUnitDefinitionService.reducer;

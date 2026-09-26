import { createSlice } from "@reduxjs/toolkit";

const initialState = {
 tabLevelData: {},
  configureData: {},
  bulkConfigureData: null,
};

export const inventorySmartConfigurationService = createSlice({
  name: "inventorySmartConfigurationService",
  initialState,
  reducers: {
    setTabLevelData: (state, action) => {
      state.tabLevelData = {
        ...state.tabLevelData,
        [action.payload.level]: { id: action.payload.id },
      };
    },
    setChildTabLevelData: (state, action) => {
      let newState = { ...state.tabLevelData };
      newState[action.payload.parentLevel] = {
        ...newState[action.payload.parentLevel],
        [action.payload.level]: { id: action.payload.id },
      };
      state.tabLevelData = newState;
    },
    resetChildLevelData: (state, action) => {
      let newState = { ...(state.tabLevelData[action.payload] || {}) };
      Object.keys(newState).forEach((key) => {
        if (key !== "id") delete newState[key];
      });
      state.tabLevelData = {
        ...state.tabLevelData,
        [action.payload]: newState,
      };
    },
    setConfigureData: (state, action) => {
      state.configureData = {
        ...state.configureData,
        [action.payload.ruleCode]: {
          ruleCode: action.payload.ruleCode,
          columns: action.payload.columns || [],
          parentData: action.payload.parentData || {},
        },
      };
    },
    setBulkConfigureData: (state, action) => {
      state.bulkConfigureData = {
        columns: action.payload.columns || [],
        parentData: action.payload.parentData || {},
      };
    },
  },
});

export const {
  setTabLevelData,
  setChildTabLevelData,
  resetChildLevelData,
  setConfigureData,
  setBulkConfigureData,
} = inventorySmartConfigurationService.actions;

export default inventorySmartConfigurationService.reducer;

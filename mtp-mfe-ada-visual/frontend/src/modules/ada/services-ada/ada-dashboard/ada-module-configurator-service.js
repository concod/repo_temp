import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  moduleConfiguratorData: {},
  moduleConfigsLoader: false,
};

export const adaModuleConfiguratorService = createSlice({
  name: "adaModuleConfiguratorService",
  initialState,
  reducers: {
    setModuleConfiguratorData: (state, action) => {
      state.moduleConfiguratorData = action.payload;
    },
    setModuleConfigsLoader: (state, action) => {
      state.moduleConfigsLoader = action.payload;
    },
  },
});

export const {
  setModuleConfiguratorData,
  setModuleConfigsLoader,
} = adaModuleConfiguratorService.actions;

export default adaModuleConfiguratorService.reducer;
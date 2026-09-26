import { createSlice } from "@reduxjs/toolkit";

export const createDcTransferService = createSlice({
  name: "createDcTransferService",
  initialState: {
    loader: false,
    filterConfiguration: [],
    appliedFilters: null,
    filtersApplied: false,
    configurationTableName: "",
  },
  reducers: {
    setCreateDcTransferLoader: (state, action) => {
      state.loader = action.payload;
    },
    setCreateDcTransferFilterConfiguration: (state, action) => {
      state.filterConfiguration = action.payload;
    },
    setCreateDcTransferAppliedFilters: (state, action) => {
      state.appliedFilters = action.payload;
    },
    setCreateDcTransferFiltersApplied: (state, action) => {
      state.filtersApplied = action.payload;
    },
    setCreateDcTransferConfigurationTableName: (state, action) => {
      state.configurationTableName = action.payload;
    },
    resetCreateDcTransfer: (state) => {
      state.loader = false;
      state.filterConfiguration = [];
      state.appliedFilters = null;
      state.filtersApplied = false;
      state.configurationTableName = "";
    },
  },
});

export const {
  setCreateDcTransferLoader,
  setCreateDcTransferFilterConfiguration,
  setCreateDcTransferAppliedFilters,
  setCreateDcTransferFiltersApplied,
  setCreateDcTransferConfigurationTableName,
  resetCreateDcTransfer,
} = createDcTransferService.actions;

export default createDcTransferService.reducer;

import { createSlice } from "@reduxjs/toolkit";

export const customTableConfiguratorService = createSlice({
  name: "customTableConfiguratorService",
  initialState: {
    enableHeaderEdit: false,
  },
  reducers: {
    setEnableTableHeaderEdit: (state, action) => {
      state.enableHeaderEdit = action.payload;
    },
  },
});

export const {
  setEnableTableHeaderEdit,
} = customTableConfiguratorService.actions;

export default customTableConfiguratorService.reducer;

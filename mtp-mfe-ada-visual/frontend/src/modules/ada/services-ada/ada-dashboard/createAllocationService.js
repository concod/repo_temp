import { createSlice } from "@reduxjs/toolkit";


export const createAllocationService = createSlice({
  name: "inventorySmartCreateAllocationService",
  initialState: {
    articleAgGridParams: {},
    createAllocationFilterDependency: [],
  },
  reducers: {
  
    setArticleAgGridParams: (state, action) => {
      state.articleAgGridParams = action.payload;
    },

    setCreateAllocationFilterDependency: (state, action) => {
      state.createAllocationFilterDependency = action.payload;
    },
   
  },
});

export const {

  setArticleAgGridParams,
  setCreateAllocationFilterDependency,

} = createAllocationService.actions;




export default createAllocationService.reducer;

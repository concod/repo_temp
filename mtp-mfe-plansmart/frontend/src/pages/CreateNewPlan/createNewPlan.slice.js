import { createSelector, createSlice } from "@reduxjs/toolkit";

const createNewPlanPage = createSlice({
  name: "createNewPlanPage",
  initialState: {
    isLoading: false,
    formFields: []
  },
  reducers: {
    setFormFields: (state, action) => {
      state.formFields = action.payload || [];
    },
    setLoader: (state, action) => {
      state.isLoading = action.payload;
    }
  }
});

//actions
export const { setFormFields, setLoader } = createNewPlanPage.actions;

// Selectors

export const createNewPlanSelector = createSelector(
  (state) => state,
  (state) => state?.plansmartReducer?.createNewPlanPage
);

export const formFieldsSelector = createSelector(
  createNewPlanSelector,
  (state) => state?.formFields
);

export const isLoadingSelector = createSelector(
  createNewPlanSelector,
  (state) => state?.isLoading
);

// reducer
export default createNewPlanPage.reducer;

import React from "react";
import { MemoryRouter } from "react-router-dom-v5-compat";
import { render, fireEvent, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { combineReducers, configureStore, createSlice } from "@reduxjs/toolkit";
import CreateNewPlan from "../../pages/CreateNewPlan/CreateNewPlan";
import { ThemeProvider, } from "@mui/material/styles";
import { pxToRem } from "core/Utils/functions/utils";
import {mocktheme} from "__testConstant__/mocktheme"
jest.mock('core/Utils/functions/utils', () => ({
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`),
}));
const theme = mocktheme(pxToRem)

const createNewPlanPageSlice = createSlice({
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
const reducers = combineReducers({
  createNewPlanPage: createNewPlanPageSlice
});
const store = configureStore({ reducer: reducers });

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.fn()
}));

const mockUsedNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockUsedNavigate
}));

test("renders create new plan form", () => {
  const setFields = jest.fn();
  const setIsFieldValid = jest.fn();
  React.useState.mockImplementation((init) => [init, setFields]);
  React.useState.mockImplementation((init) => [init, setIsFieldValid]);
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <CreateNewPlan
            selectedScreenName={"PRE_SEASON"}
            filterConfigUrl={"url"}
            filterConfigPayload={{ payload: "payload" }}
          />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  const creareNewPlanBtn = screen.getByTestId("preSeasonCreateNewPlanBtn");
  fireEvent.click(creareNewPlanBtn);
  const createNewPlanForm = screen.getByTestId("preSeasonCreateNewPlanForm");
  expect(createNewPlanForm).toBeVisible();
});

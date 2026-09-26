import React from "react";
import { render, screen } from "@testing-library/react";
import fireEvent from "@testing-library/user-event";
import SelectFilter from "./SelectFilter";
import configureMockStore from "redux-mock-store";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom-v5-compat";
import { ThemeProvider} from "@mui/material/styles";
import thunk from "redux-thunk";
import { pxToRem } from "core/Utils/functions/utils";
import {mocktheme} from "__testConstant__/mocktheme"

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);
jest.mock('core/Utils/functions/utils', () => ({
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`),
}));
const theme = mocktheme(pxToRem)

const store = mockStore({
  plansmartReducer: {
    commonDashboard: {
      filterLoader: false,
      formFields: [],
      fieldsDefaultValues: {},
      callDropdownApi: false
    }
  }
});
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useState: jest.fn(),
  useLocation: jest.fn()
}));

const defaultProps = {
  selectedScreenName: "pre-season",
  filterConfigUrl: "",
  filterConfigPayload: {},
  filterLoader: false,
  formFields: [],
  fetchFilterConfig: jest.fn(),
  fetchFormFieldDataApi: jest.fn(),
  getDashboardTableData: jest.fn(),
  handleFilter: jest.fn(),
  setFilterLoader: jest.fn(),
  showFilterStatus: false,
  resetFilter: jest.fn(),
  fieldsDefaultValues: {},
  setFieldsDefaultValues: jest.fn(),
  callDropdownApi: false,
  setCallDropdownApi: jest.fn()
};

test("Render Filter on Click of select Filters", async () => {
  const setShowFilter = jest.fn(); // Mock the state update function
  React.useState.mockImplementation((init) => [init, setShowFilter]); // Mock useState to use our mock setIsClicked

  render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <SelectFilter
            selectedScreenName={"PRE_SEASON"}
            filterConfigUrl={"url"}
            filterConfigPayload={{ payload: "payload" }}
            resetFilter={() => {}}
          />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  // Click the button

  const filterButton = screen.getByTestId("plansmartFilterBtn");
  fireEvent.click(filterButton);
  const modal = screen.getByTestId("filterModal");
  expect(modal).toBeVisible();
});

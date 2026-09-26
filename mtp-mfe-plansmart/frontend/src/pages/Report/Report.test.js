import React from "react";
import { render } from "@testing-library/react";
import configureMockStore from "redux-mock-store";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import thunk from "redux-thunk";
import Report from "./Report";
import { pxToRem } from "core/Utils/functions/utils";
import {mocktheme} from "__testConstant__/mocktheme"

//const theme = mocktheme(pxToRem)

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

jest.mock("react", () => ({
  ...jest.requireActual("react"), // Use actual for all non-hook parts
  useState: jest.fn().mockImplementation((init) => [init, jest.fn()]) // Mock useState
}));

const initialState = {
  plansmartReducer: {
    commonDashboard: {
      reports: [
        {
          options: [{ label: "Corporate/ OTB", value: "otb_report" }]
        }
      ]
    }
  }
};

const store = mockStore(initialState);
jest.mock('core/Utils/functions/utils', () => ({
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`),
}));
const theme = mocktheme(pxToRem)

test("Verify Report Label", async () => {
  const { queryByText } = render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <Report
            fetchFilterConfig={jest.fn()} // Mock API functions
            fetchFormFieldDataApi={jest.fn()}
            formFields={[]} // Provide an empty array if form fields are not needed for this test
            generateReportApi={jest.fn()}
          />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  expect(queryByText("Report Filter")).toBeInTheDocument();
});

test("Verify Report Types is not present when There is only one report", () => {
  // Render the component
  const { queryByText } = render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <Report
            fetchFilterConfig={jest.fn()} // Mock API functions
            fetchFormFieldDataApi={jest.fn()}
            formFields={[]} // Provide an empty array if form fields are not needed for this test
            generateReportApi={jest.fn()}
          />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  // Check if the text or form is rendered when reports have more than one option
  expect(queryByText("Report Types")).not.toBeInTheDocument();
});

test("Verify Report Types dropdown when there is more than one report type", async () => {
  const initialState = {
    plansmartReducer: {
      commonDashboard: {
        reports: [
          {
            options: [
              { label: "Corporate/ OTB", value: "otb_report" },
              { label: "Another Report", value: "another_report" }
            ]
          }
        ]
      }
    }
  };

  const store = mockStore(initialState);

  const { queryByText } = render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <Report
            fetchFilterConfig={jest.fn()} // Mock API functions
            fetchFormFieldDataApi={jest.fn()}
            formFields={[]} // Provide an empty array if form fields are not needed for this test
            generateReportApi={jest.fn()}
          />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  expect(queryByText("Report Types")).toBeInTheDocument();
});

import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import PreSeasonDashboardComponent from "./TargetPlan";
import {
  TARGET_PLAN_FILTER_CONFIG,
  FETCH_FILTER_CONF_MODEL_API_DATA
} from "constants/modalApi.constant";
import {
  PLANS_LIST_STATUS_FILTER_PAYLOAD,
  DASHBOARD_PAGES
} from "../../dashboard.constant";
import {
  BREAD_CRUMBS_LABEL,
  TARGET_PLAN_PAGE_HEADER
} from "./targetPlan.constant";
import { pxToRem } from "core/Utils/functions/utils";
import { mocktheme } from "__testConstant__/mocktheme";
import { MemoryRouter } from "react-router-dom-v5-compat";
import { ThemeProvider } from "@mui/material/styles";
import { TARGET_PLAN_ROUTE } from "../../../../constants/route.constant";

// Mocking `pxToRem` utility
jest.mock("core/Utils/functions/utils", () => ({
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`)
}));

// Mocking `Dashboard` component
jest.mock("../../Dashboard", () => jest.fn(() => <div>Mocked Dashboard</div>));

const theme = mocktheme(pxToRem);

// Create a mock Redux store
const mockStore = configureStore([]);
let store;

describe("PreSeasonDashboardComponent", () => {
  beforeEach(() => {
    store = mockStore({});
  });

  test("should pass the correct props to the Dashboard component", () => {
    const { container } = render(
      <Provider store={store}>
        <MemoryRouter>
          <ThemeProvider theme={theme}>
            <PreSeasonDashboardComponent />
          </ThemeProvider>
        </MemoryRouter>
      </Provider>
    );

    // Assert that Dashboard was called with the correct props
    const Dashboard = require("../../Dashboard");
    expect(Dashboard).toHaveBeenCalledWith(
      {
        selectedScreenName: DASHBOARD_PAGES.TARGET_PLAN,
        BreadCrumbsLabel: BREAD_CRUMBS_LABEL,
        planScreenRoute: TARGET_PLAN_ROUTE,
        pageHeader: TARGET_PLAN_PAGE_HEADER,
        filterConfigUrl: TARGET_PLAN_FILTER_CONFIG,
        filterConfigPayload: FETCH_FILTER_CONF_MODEL_API_DATA,
        plansListStatusFilterPayload:
          PLANS_LIST_STATUS_FILTER_PAYLOAD.targetPlan
      },
      {}
    );
  });
});

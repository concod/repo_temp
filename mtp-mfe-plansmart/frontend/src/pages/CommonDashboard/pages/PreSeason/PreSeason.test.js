import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import PreSeasonDashboardComponent from "./PreSeason";
import {
    PRE_SEASON_PLAN_PAGE_HEADER,
  BREAD_CRUMBS_LABEL,
  FILTER_CONFIG_URL
} from "./preSeason.constant";
import { DASHBOARD_PAGES } from "../../dashboard.constant";
import { PRE_SEASON_DASHBOARD_ROUTE  } from "../../../../constants/route.constant";
import { pxToRem } from "core/Utils/functions/utils";
import { mocktheme } from "__testConstant__/mocktheme";
import { MemoryRouter } from "react-router-dom-v5-compat";
import { ThemeProvider } from "@mui/material/styles";

// Mocking `pxToRem` utility
jest.mock("core/Utils/functions/utils", () => ({
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`),
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
        selectedScreenName: DASHBOARD_PAGES.PRE_SEASON,
        BreadCrumbsLabel: BREAD_CRUMBS_LABEL,
        planScreenRoute: PRE_SEASON_DASHBOARD_ROUTE,
        pageHeader: PRE_SEASON_PLAN_PAGE_HEADER,
        filterConfigUrl: FILTER_CONFIG_URL,
      },
      {}
    );
  });
});

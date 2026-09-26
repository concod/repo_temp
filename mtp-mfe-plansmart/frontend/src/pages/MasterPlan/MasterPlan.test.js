import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import thunk from "redux-thunk";
import configureStore from "redux-mock-store";
import { MemoryRouter } from "react-router-dom-v5-compat";
import { ThemeProvider } from "@mui/material/styles";
import MasterPlan from "./MasterPlan";
import { pxToRem } from "core/Utils/functions/utils";
import { mocktheme } from "__testConstant__/mocktheme";

const middlewares = [thunk]; // Add thunk middleware here
const mockStore = configureStore(middlewares);

const store = mockStore({});

jest.mock("react-router-dom-v5-compat", () => ({
  ...jest.requireActual("react-router-dom-v5-compat"),
  useLocation: () => ({
    pathname: "/plan-smart/pre-season/master-plan",
    search: "",
    hash: "",
    state: null,
    key: "v4dlil"
  }) // Mock useLocation
}));

jest.mock("core/Utils/functions/utils", () => ({
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`)
}));
const theme = mocktheme(pxToRem);

test("Should render Master plan component with Dashboard / Master Plan breadcrumb", () => {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <MasterPlan
            selectedScreenName="pre-season"
            location={{
              pathname: "/plan-smart/pre-season/master-plan",
              search: "",
              hash: "",
              state: null,
              key: "v4dlil"
            }}
          />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  const breadcrumbWithDashboardText = screen.getByText("Dashboard");
  expect(breadcrumbWithDashboardText).toBeInTheDocument();

  const breadcrumbWithMasterPlanText = screen.getByText("Master Plan");
  expect(breadcrumbWithMasterPlanText).toBeInTheDocument();
});

test("Should render Master plan component with Download button", () => {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <MasterPlan
            selectedScreenName="pre-season"
            location={{
              pathname: "/plan-smart/pre-season/master-plan",
              search: "",
              hash: "",
              state: null,
              key: "v4dlil"
            }}
          />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  const downloadButton = screen.getByRole("button", { name: "Download" });
  expect(downloadButton).toBeInTheDocument();
});

test("Should render Master plan component with History button", () => {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <MasterPlan
            selectedScreenName="pre-season"
            location={{
              pathname: "/plan-smart/pre-season/master-plan",
              search: "",
              hash: "",
              state: null,
              key: "v4dlil"
            }}
          />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  const historyButton = screen.getByRole("button", { name: "History" });
  expect(historyButton).toBeInTheDocument();
});

test("Should render Master plan component with Select Filters button", () => {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <MasterPlan
            selectedScreenName="pre-season"
            location={{
              pathname: "/plan-smart/pre-season/master-plan",
              search: "",
              hash: "",
              state: null,
              key: "v4dlil"
            }}
          />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  const selectFiltersButton = screen.getByRole("button", {
    name: "Filters"
  });
  expect(selectFiltersButton).toBeInTheDocument();
});

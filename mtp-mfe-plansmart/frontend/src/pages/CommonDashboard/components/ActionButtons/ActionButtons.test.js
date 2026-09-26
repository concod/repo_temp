import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import ActionButtons from "./ActionButtons";
import { DASHBOARD_PAGES } from "../../dashboard.constant";
import { BrowserRouter } from "react-router-dom-v5-compat";
import thunk from "redux-thunk";
import { useNavigate } from "react-router-dom-v5-compat"; // Import useNavigate to mock
import { ThemeProvider } from "@mui/material/styles";
import { pxToRem } from "core/Utils/functions/utils";
import { mocktheme } from "__testConstant__/mocktheme";
// Mock the useNavigate hook from react-router-dom-v5-compat
jest.mock("react-router-dom-v5-compat", () => ({
  ...jest.requireActual("react-router-dom-v5-compat"),
  useNavigate: jest.fn() // Mock useNavigate
}));
const middlewares = [thunk]; // Add thunk middleware here
const mockStore = configureStore(middlewares);

jest.mock("core/Utils/functions/utils", () => ({
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`)
}));
const theme = mocktheme(pxToRem);
describe("Action Buttons Component for In-Season and Pre-Season", () => {
  let store;
  let props;
  const mockedNavigate = jest.fn(); // Spy for navigation

  beforeEach(() => {
    // Mock the return value of useNavigate to be our mocked function
    useNavigate.mockReturnValue(mockedNavigate);

    store = mockStore({
      sideBarReducer: { userPlatformScreenName: DASHBOARD_PAGES.PRE_SEASON },
      tenantUserRoleMgmtReducer: {
        userRoleManagementReducer: {
          planningLevelHierarchy: []
        }
      }
    });

    props = {
      selectedRows: [],
      planCode: 12345, // Make sure the planCode matches the expectation
      setDownloadPlanVisible: jest.fn(),
      selectedScreenName: DASHBOARD_PAGES.PRE_SEASON,
      actionButtonLoader: false,
      downloadPlanReq: jest.fn(),
      levels: []
    };
  });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <ActionButtons {...props} />
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );

  it("should render Create New Plan button if no rows are selected", () => {
    renderComponent();

    expect(screen.getByText("Create New Plan")).toBeInTheDocument();
  });

  it("should render Edit, View, Copy, and Delete buttons when a row is selected", () => {
    props.selectedRows = [{ data: { plan_code: "12345" } }];
    renderComponent();

    expect(screen.getByTestId("EditPlanBtn")).toBeInTheDocument();
    expect(screen.getByTestId("ViewPlanBtn")).toBeInTheDocument();
    expect(screen.getByTestId("CopyPlanBtn")).toBeInTheDocument();
    expect(screen.getByTestId("DeletePlanBtn")).toBeInTheDocument();
    expect(screen.getByTestId("DownloadPlanBtn")).toBeInTheDocument();
  });

  it("should open CopyPlanModal when Copy button is clicked", () => {
    props.selectedRows = [{ data: { plan_code: "12345" } }];
    renderComponent();
    fireEvent.click(screen.getByTestId("CopyPlanBtn"));
    // The modal should be visible
    expect(screen.getByTestId("copy-plan-modal")).toBeInTheDocument();
  });

  it("should open DeletePlan modal when Delete button is clicked", () => {
    props.selectedRows = [{ data: { plan_code: "12345" } }];
    renderComponent();

    fireEvent.click(screen.getByTestId("DeletePlanBtn"));

    // The delete modal should be visible
    expect(
      screen.getByText("Are you sure you want to delete 1 plan")
    ).toBeInTheDocument();
  });

  it("should trigger navigation when the Edit button is clicked", () => {
    props.selectedRows = [{ data: { plan_code: "12345" } }];
    renderComponent();

    // Simulate click on the Edit button
    const editButton = screen.getByTestId("EditPlanBtn");
    fireEvent.click(editButton);

    // Assert that the navigate function was called with the correct URL
    expect(mockedNavigate).toHaveBeenCalledWith("/plan-smart/plan/edit/12345");
  });

  it("should open Download modal when Download button is clicked", () => {
    props.selectedRows = [{ data: { plan_code: "12345" } }];
    renderComponent();
    fireEvent.click(screen.getByTestId("DownloadPlanBtn"));
    expect(screen.getByText("Entire plan")).toBeInTheDocument();
  });
});

describe("Action Buttons Component for Target Planning", () => {
  let store;
  let props;

  beforeEach(() => {
    // Initial mock Redux state and props
    store = mockStore({
      sideBarReducer: { userPlatformScreenName: DASHBOARD_PAGES.TARGET_PLAN },
      tenantUserRoleMgmtReducer: {
        userRoleManagementReducer: {
          planningLevelHierarchy: []
        }
      }
    });

    props = {
      selectedRows: [],
      planCode: 123,
      setDownloadPlanVisible: jest.fn(),
      selectedScreenName: DASHBOARD_PAGES.TARGET_PLAN,
      actionButtonLoader: false,
      downloadPlanReq: jest.fn(),
      levels: []
    };
  });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <BrowserRouter>
          <ActionButtons {...props} />
        </BrowserRouter>
      </Provider>
    );

  it("should not render Copy button if selected screen is TARGET_PLAN", () => {
    props.selectedRows = [{ data: { plan_code: "12345" } }];
    renderComponent();
    expect(screen.queryByTestId("CopyPlanBtn")).not.toBeInTheDocument();
  });
});

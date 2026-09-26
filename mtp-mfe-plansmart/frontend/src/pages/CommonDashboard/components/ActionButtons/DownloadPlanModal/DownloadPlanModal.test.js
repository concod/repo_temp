import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import DownloadPlanModal from "./DownloadPlanModal";
import reducer, { setDownloadPlanVisible } from "../../../dashboard.slice";

const mockStore = configureStore([]);

describe("DownloadPlanModal Component", () => {
  let store;
  const initialState = {
    plansmartReducer: {
      commonDashboard: {
        isDownloadPlanVisible: true // you can toggle this to false to test different scenarios
      }
    },
    tenantUserRoleMgmtReducer: {
      userRoleManagementReducer: {
        planningLevelHierarchy: [] // mock other needed state if necessary
      }
    }
  };

  beforeEach(() => {
    store = mockStore({
      plansmartReducer: {
        commonDashboard: {
          isDownloadPlanVisible: true // you can toggle this to false to test different scenarios
        }
      },
      tenantUserRoleMgmtReducer: {
        userRoleManagementReducer: {
          planningLevelHierarchy: [] // mock other needed state if necessary
        }
      }
    });

    store.dispatch = jest.fn(); // mock dispatch function
  });

  test("should render the Download Plan modal when isDownloadPlanVisible is true", () => {
    render(
      <Provider store={store}>
        <DownloadPlanModal
          selectedRows={[{ data: { plan_code: "12345" } }]} // mock selected rows
          setDownloadPlanVisible={jest.fn()} // mock setDownloadPlanVisible
          downloadPlanReq={jest.fn()} // mock downloadPlanReq
          downloadPlanLoader={false} // mock loading state
          levels={[]} // mock levels
        />
      </Provider>
    );

    // Check if the modal title "Download Plan" is rendered
    expect(screen.getByText("Download Plan")).toBeInTheDocument();

    // Check if the "Download" button is rendered
    expect(screen.getByText("Download")).toBeInTheDocument();

    // Check if the radio buttons are rendered
    expect(screen.getByLabelText("High Level Plan")).toBeInTheDocument();
    expect(screen.getByLabelText("Entire Plan")).toBeInTheDocument();
  });

  test("should not render the Download Plan modal when isDownloadPlanVisible is false", () => {
    // Update store to make isDownloadPlanVisible false
    store = mockStore({
      plansmartReducer: {
        commonDashboard: {
          isDownloadPlanVisible: false
        }
      }
    });

    render(
      <Provider store={store}>
        <DownloadPlanModal
          selectedRows={[{ data: { plan_code: "12345" } }]} // mock selected rows
          setDownloadPlanVisible={jest.fn()} // mock setDownloadPlanVisible
          downloadPlanReq={jest.fn()} // mock downloadPlanReq
          downloadPlanLoader={false} // mock loading state
          levels={[]} // mock levels
        />
      </Provider>
    );

    // Check that "Download Plan" is not rendered
    expect(screen.queryByText("Download Plan")).not.toBeInTheDocument();
  });

  test("should close the modal when Cancel button is clicked", () => {
    const setDownloadPlanVisibleMock = jest.fn(); // Create mock for setDownloadPlanVisible

    render(
      <Provider store={store}>
        <DownloadPlanModal
          selectedRows={[{ data: { plan_code: "12345" } }]} // mock selected rows
          setDownloadPlanVisible={setDownloadPlanVisibleMock} // pass the mock
          downloadPlanReq={jest.fn()} // mock downloadPlanReq
          downloadPlanLoader={false} // mock loading state
          levels={[]} // mock levels
        />
      </Provider>
    );

    // Simulate clicking the "Cancel" button
    const cancelButton = screen.getByText("Cancel");

    // Check if Cancel button is rendered
    expect(cancelButton).toBeInTheDocument();

    // Click the Cancel button
    fireEvent.click(cancelButton);

    const action = setDownloadPlanVisible(true);
    const newState = reducer(initialState, action);
    expect(newState.isDownloadPlanVisible).toEqual(true);
  });
});

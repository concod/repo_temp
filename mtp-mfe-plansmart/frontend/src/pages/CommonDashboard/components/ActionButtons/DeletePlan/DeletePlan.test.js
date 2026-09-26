import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { jest } from "@jest/globals";
import DeletePlan from "./DeletePlan";
import { onDeletePlan } from "./deletePlan.util";

// Mock the API and utility functions
jest.mock("./deletePlan.api", () => ({
  deletePlanApi: jest.fn()
}));

jest.mock("./deletePlan.util", () => ({
  onDeletePlan: jest.fn()
}));

const mockStore = configureStore({ reducer: {} });

const setup = (initialProps) => {
  return render(
    <Provider store={mockStore}>
      <DeletePlan {...initialProps} />
    </Provider>
  );
};

describe("DeletePlan Component", () => {
  it("should call onDeletePlan when Yes button is clicked", () => {
    const setShowDeletePlanDialogue = jest.fn();
    setup({
      showDeletePlanDialogue: true,
      selectedRows: [{}, {}],
      selectedScreenName: "testScreen",
      actionButtonLoader: false,
      setShowDeletePlanDialogue
    });

    fireEvent.click(screen.getByText("Yes"));

    expect(onDeletePlan).toHaveBeenCalledWith({
      selectedRows: [{}, {}],
      deletePlanApi: expect.any(Function), // Matches any function
      dispatch: expect.any(Function), // Matches any function
      selectedScreenName: "testScreen",
      setShowDeletePlanDialogue: setShowDeletePlanDialogue
    });
  });

  it("should render the Prompt with correct title and subheading", () => {
    setup({
      showDeletePlanDialogue: true,
      selectedRows: [{}, {}], // Simulating multiple rows selected
      actionButtonLoader: false
    });

    expect(screen.getByText("Delete Plan")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to delete 2 plans")
    ).toBeInTheDocument();
  });

  it("should call setShowDeletePlanDialogue with false when No button is clicked", () => {
    const setShowDeletePlanDialogue = jest.fn();
    setup({
      showDeletePlanDialogue: true,
      selectedRows: [{}],
      actionButtonLoader: false,
      setShowDeletePlanDialogue
    });

    fireEvent.click(screen.getByText("No"));

    expect(setShowDeletePlanDialogue).toHaveBeenCalledWith(false);
  });

  it("should show CircularProgress loader when actionButtonLoader is true", () => {
    setup({
      showDeletePlanDialogue: true,
      selectedRows: [{}],
      actionButtonLoader: true
    });

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should not show CircularProgress loader when actionButtonLoader is false", () => {
    setup({
      showDeletePlanDialogue: true,
      selectedRows: [{}],
      actionButtonLoader: false
    });

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});

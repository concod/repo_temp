import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { jest } from "@jest/globals";
import CopyPlanModal from "./CopyPlanModal";

// Mock the useNavigate hook
jest.mock("react-router-dom-v5-compat", () => ({
  useNavigate: () => jest.fn()
}));

// Mock the API and utility functions
jest.mock("./copyPlan.api", () => ({
  requestCopyPlan: jest.fn()
}));

jest.mock("./copyPlanModal.util", () => ({
  copyPlan: jest.fn()
}));

const mockStore = configureStore({ reducer: {} });

const setup = (initialProps) => {
  return render(
    <Provider store={mockStore}>
      <CopyPlanModal {...initialProps} />
    </Provider>
  );
};

describe("CopyPlanModal Component", () => {
  it("should render the Copy Plan modal", () => {
    setup({
      setShowCopyPlanModal: jest.fn(),
      planCode: 123,
      actionButtonLoader: false,
      requestCopyPlan: jest.fn()
    });

    expect(screen.getByText("Copy Plan")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("should close modal when Cancel button is clicked", () => {
    const setShowCopyPlanModal = jest.fn();
    setup({
      setShowCopyPlanModal,
      planCode: 123,
      actionButtonLoader: false,
      requestCopyPlan: jest.fn()
    });

    fireEvent.click(screen.getByText("Cancel"));

    expect(setShowCopyPlanModal).toHaveBeenCalledWith(false);
  });

  it("should enable Save button when planName is set and actionButtonLoader is false", () => {
    setup({
      setShowCopyPlanModal: jest.fn(),
      planCode: 123,
      actionButtonLoader: false,
      requestCopyPlan: jest.fn()
    });

    fireEvent.change(screen.getByPlaceholderText("Scenario Name"), {
      target: { value: "New Plan" }
    });

    expect(screen.getByText("Save")).not.toBeDisabled();
  });
});

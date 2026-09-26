import { copyPlan } from "./copyPlanModal.util";
import { setActionButtonLoader } from "../../../dashboard.slice";
import { EDIT, SUCCESS_MESSAGE, ERROR_MESSAGE } from "./copyPlan.constant";
import { SNACK_VARIANT } from "constants/toast.constant";
import { addSnack } from "actions/snackbarActions";
import { PLANNING_SCREEN_ROUTE } from "../../../../../constants/route.constant";
import "jest-location-mock"; // Import the mock library

jest.mock("../../../dashboard.slice", () => ({
  setActionButtonLoader: jest.fn()
}));

jest.mock("actions/snackbarActions", () => ({
  addSnack: jest.fn()
}));

describe("copyPlan", () => {
  const mockDispatch = jest.fn();
  const mockNavigate = jest.fn();
  const mockSetShowCopyPlanModal = jest.fn();
  const mockRequestCopyPlan = jest.fn();

  const planName = "Test Plan";
  const planCode = "1234";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should dispatch loader action, call requestCopyPlan, navigate to edit page, and add success snack on successful response", async () => {
    // Mock a successful response
    const mockResponse = {
      data: {
        status: true,
        data: {
          new_plan: "5678"
        },
        show_message: true,
        message: "Plan copied successfully"
      }
    };

    mockRequestCopyPlan.mockResolvedValue(mockResponse);

    await copyPlan({
      planName,
      planCode,
      requestCopyPlan: mockRequestCopyPlan,
      navigate: mockNavigate,
      dispatch: mockDispatch,
      setShowCopyPlanModal: mockSetShowCopyPlanModal
    });

    // Expect loader to be shown initially
    expect(mockDispatch).toHaveBeenCalledWith(setActionButtonLoader(true));

    // Expect requestCopyPlan to be called with correct payload
    expect(mockRequestCopyPlan).toHaveBeenCalledWith(
      { plan_code: planCode, plan_display_name: planName.trim() },
      mockDispatch
    );

    // Expect correct navigation route based on success response
    expect(mockNavigate).toHaveBeenCalledWith(
      `${PLANNING_SCREEN_ROUTE}/${EDIT}/5678`
    );

    // Expect a success snack to be added
    expect(mockDispatch).toHaveBeenCalledWith(
      addSnack({
        message: "Plan copied successfully",
        options: {
          variant: SNACK_VARIANT.SUCCESS
        }
      })
    );

    // Expect loader to be hidden after success
    expect(mockDispatch).toHaveBeenCalledWith(setActionButtonLoader(false));

    // Expect modal to be hidden
    expect(mockSetShowCopyPlanModal).toHaveBeenCalledWith(false);
  });

  it("should handle error response by showing error snack", async () => {
    // Mock a failed response
    mockRequestCopyPlan.mockRejectedValue(new Error("Network Error"));

    await copyPlan({
      planName,
      planCode,
      requestCopyPlan: mockRequestCopyPlan,
      navigate: mockNavigate,
      dispatch: mockDispatch,
      setShowCopyPlanModal: mockSetShowCopyPlanModal
    });

    // Expect loader to be shown initially
    expect(mockDispatch).toHaveBeenCalledWith(setActionButtonLoader(true));

    // Expect an error snack to be shown on failure
    expect(mockDispatch).toHaveBeenCalledWith(
      addSnack({
        message: ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );

    // Expect loader to be hidden after error
    expect(mockDispatch).toHaveBeenCalledWith(setActionButtonLoader(false));

    // Expect modal to be hidden
    expect(mockSetShowCopyPlanModal).toHaveBeenCalledWith(false);
  });

  it("should use IN_SEASON route when current URL includes IN_SEASON", async () => {
    // Mock window location to simulate IN_SEASON scenario
    window.location.assign("/in-season");

    const mockResponse = {
      data: {
        status: true,
        data: {
          new_plan: "5678"
        },
        show_message: false
      }
    };

    mockRequestCopyPlan.mockResolvedValue(mockResponse);

    await copyPlan({
      planName,
      planCode,
      requestCopyPlan: mockRequestCopyPlan,
      navigate: mockNavigate,
      dispatch: mockDispatch,
      setShowCopyPlanModal: mockSetShowCopyPlanModal
    });

    // Expect correct route for IN_SEASON
    expect(mockNavigate).toHaveBeenCalledWith(
      `${PLANNING_SCREEN_ROUTE}/${EDIT}/5678`
    );

    // Expect default success message to be used if show_message is false
    expect(mockDispatch).toHaveBeenCalledWith(
      addSnack({
        message: SUCCESS_MESSAGE,
        options: {
          variant: SNACK_VARIANT.SUCCESS
        }
      })
    );
  });
});

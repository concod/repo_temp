import { onDeletePlan } from "./deletePlan.util";
import { setActionButtonLoader } from "../../../dashboard.slice";
import { addSnack } from "actions/snackbarActions";
import {
  PLAN_DELETE_SUCCESS_MESSAGE,
  PLAN_DELETE_ERROR_MESSAGE
} from "./deletePlan.constant";
import { SNACK_VARIANT } from "constants/toast.constant";

// Mock the necessary imports
jest.mock("../../../dashboard.slice", () => ({
  setActionButtonLoader: jest.fn()
}));

jest.mock("actions/snackbarActions", () => ({
  addSnack: jest.fn()
}));

jest.mock("lodash", () => ({
  get: jest.fn()
}));

describe("onDeletePlan", () => {
  let dispatch;
  let deletePlanApi;
  let setShowDeletePlanDialogue;

  beforeEach(() => {
    dispatch = jest.fn();
    deletePlanApi = jest.fn();
    setShowDeletePlanDialogue = jest.fn();
  });

  const selectedRows = [
    { data: { plan_code: "PLAN001" } },
    { data: { plan_code: "PLAN002" } }
  ];

  it("should dispatch loader, call delete API, and show success message on success", async () => {
    const response = {
      data: {
        status: true,
        message: "Plans deleted successfully",
        show_message: true
      }
    };

    deletePlanApi.mockResolvedValue(response);

    await onDeletePlan({
      selectedRows,
      deletePlanApi,
      dispatch,
      selectedScreenName: "Screen1",
      setShowDeletePlanDialogue
    });

    expect(dispatch).toHaveBeenCalledWith(setActionButtonLoader(true));
    expect(deletePlanApi).toHaveBeenCalledWith(
      { plan_codes: ["PLAN001", "PLAN002"] },
      "Screen1",
      dispatch
    );
    expect(dispatch).toHaveBeenCalledWith(
      addSnack({
        message: "Plans deleted successfully",
        options: {
          variant: SNACK_VARIANT.SUCCESS
        }
      })
    );
    expect(dispatch).toHaveBeenCalledWith(setActionButtonLoader(false));
    expect(setShowDeletePlanDialogue).toHaveBeenCalledWith(false);
  });

  it("should show default success message if no custom message is provided", async () => {
    const response = {
      data: {
        status: true,
        show_message: false // No custom message
      }
    };

    deletePlanApi.mockResolvedValue(response);

    await onDeletePlan({
      selectedRows,
      deletePlanApi,
      dispatch,
      selectedScreenName: "Screen1",
      setShowDeletePlanDialogue
    });

    expect(dispatch).toHaveBeenCalledWith(
      addSnack({
        message: PLAN_DELETE_SUCCESS_MESSAGE,
        options: {
          variant: SNACK_VARIANT.SUCCESS
        }
      })
    );
  });

  it("should show error message on API failure", async () => {
    deletePlanApi.mockRejectedValue(new Error("API Error"));

    await onDeletePlan({
      selectedRows,
      deletePlanApi,
      dispatch,
      selectedScreenName: "Screen1",
      setShowDeletePlanDialogue
    });

    expect(dispatch).toHaveBeenCalledWith(setActionButtonLoader(true));
    expect(dispatch).toHaveBeenCalledWith(
      addSnack({
        message: PLAN_DELETE_ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
    expect(dispatch).toHaveBeenCalledWith(setActionButtonLoader(false));
    expect(setShowDeletePlanDialogue).toHaveBeenCalledWith(false);
  });

  it("should dispatch loader off and close the dialogue even if there is an error", async () => {
    deletePlanApi.mockRejectedValue(new Error("API Error"));

    await onDeletePlan({
      selectedRows,
      deletePlanApi,
      dispatch,
      selectedScreenName: "Screen1",
      setShowDeletePlanDialogue
    });

    expect(dispatch).toHaveBeenCalledWith(setActionButtonLoader(false));
    expect(setShowDeletePlanDialogue).toHaveBeenCalledWith(false);
  });
});

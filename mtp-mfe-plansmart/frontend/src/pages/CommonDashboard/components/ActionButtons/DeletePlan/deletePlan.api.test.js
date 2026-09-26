import { deletePlanApi } from "./deletePlan.api";
import { addSnack } from "actions/snackbarActions";
import { getDashboardTableData } from "../../../dashboard.api";
import { PLAN_DELETE_SUCCESS_MESSAGE } from "./deletePlan.constant";
import { SNACK_VARIANT } from "constants/toast.constant";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { API_METHOD } from "constants/api.constant";

jest.mock("utils/axiosInstanceWrapper");
jest.mock("actions/snackbarActions", () => ({
  addSnack: jest.fn()
}));
jest.mock("../../../dashboard.api", () => ({
  getDashboardTableData: jest.fn()
}));

describe("deletePlanApi", () => {
  let dispatch;

  beforeEach(() => {
    dispatch = jest.fn();
    jest.clearAllMocks();
  });

  const payload = { plan_codes: ["PLAN001", "PLAN002"] };
  const selectedScreenName = "Screen1";

  it("should dispatch success snack message and update dashboard data on successful plan deletion", async () => {
    const mockResponse = {
      status: true
    };

    axiosInstanceWrapper.mockResolvedValue(mockResponse);

    await deletePlanApi(payload, selectedScreenName)(dispatch);

    expect(axiosInstanceWrapper).toHaveBeenCalledWith(
      {
        url: "/plan-smart/plan/delete",
        method: API_METHOD.DELETE,
        data: payload
      },
      dispatch
    );
    expect(dispatch).toHaveBeenCalledWith(
      addSnack({
        message: PLAN_DELETE_SUCCESS_MESSAGE,
        options: {
          variant: SNACK_VARIANT.SUCCESS
        }
      })
    );
    expect(dispatch).toHaveBeenCalledWith(
      getDashboardTableData(selectedScreenName)
    );
  });

  it("should not dispatch anything if delete API fails", async () => {
    axiosInstanceWrapper.mockRejectedValue(new Error("Delete API failed"));

    await deletePlanApi(payload, selectedScreenName)(dispatch);

    expect(dispatch).not.toHaveBeenCalledWith(addSnack());
    expect(dispatch).not.toHaveBeenCalledWith(
      getDashboardTableData(selectedScreenName)
    );
  });

  it("should handle no status in response correctly", async () => {
    const mockResponse = {
      status: false
    };

    axiosInstanceWrapper.mockResolvedValue(mockResponse);

    await deletePlanApi(payload, selectedScreenName)(dispatch);

    // Should not dispatch success message if response status is false
    expect(dispatch).not.toHaveBeenCalledWith(
      addSnack({
        message: PLAN_DELETE_SUCCESS_MESSAGE,
        options: {
          variant: SNACK_VARIANT.SUCCESS
        }
      })
    );
  });
});

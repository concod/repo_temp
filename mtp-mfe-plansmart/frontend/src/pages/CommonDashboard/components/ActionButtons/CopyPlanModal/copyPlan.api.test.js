import { requestCopyPlan } from "./copyPlan.api";
import { addSnack } from "actions/snackbarActions";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import {
  PLANSMART_COPY_PLAN_API_URL,
  SUCCESS_MESSAGE,
  ERROR_MESSAGE
} from "./copyPlan.constant";
import { SNACK_VARIANT } from "constants/toast.constant";
import { API_METHOD } from "constants/api.constant";

jest.mock("utils/axiosInstanceWrapper");
jest.mock("actions/snackbarActions", () => ({
  addSnack: jest.fn()
}));

describe("requestCopyPlan", () => {
  let dispatch;

  beforeEach(() => {
    dispatch = jest.fn();
    jest.clearAllMocks();
  });

  const payload = { plan_code: "PLAN001", plan_display_name: "Test Plan" };

  it("should call axiosInstanceWrapper with correct parameters", async () => {
    const mockResponse = {
      status: true
    };
    axiosInstanceWrapper.mockResolvedValue(mockResponse);

    await requestCopyPlan(payload, dispatch)();

    expect(axiosInstanceWrapper).toHaveBeenCalledWith(
      {
        isV3: true,
        url: PLANSMART_COPY_PLAN_API_URL,
        method: API_METHOD.POST,
        data: payload
      },
      dispatch
    );
  });

  it("should dispatch success snack message when API call is successful", async () => {
    const mockResponse = {
      status: true
    };
    axiosInstanceWrapper.mockResolvedValue(mockResponse);

    await requestCopyPlan(payload, dispatch)();

    expect(dispatch).toHaveBeenCalledWith(
      addSnack({
        message: SUCCESS_MESSAGE,
        options: {
          variant: SNACK_VARIANT.SUCCESS
        }
      })
    );
  });

  it("should return the response when API call is successful", async () => {
    const mockResponse = {
      status: true
    };
    axiosInstanceWrapper.mockResolvedValue(mockResponse);

    const response = await requestCopyPlan(payload, dispatch)();
    expect(response).toEqual(mockResponse);
  });

  it("should dispatch error snack message when API call fails", async () => {
    const mockError = new Error("API error");
    axiosInstanceWrapper.mockRejectedValue(mockError);

    await requestCopyPlan(payload, dispatch)();

    expect(dispatch).toHaveBeenCalledWith(
      addSnack({
        message: ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  });

  it("should return undefined when API call fails", async () => {
    const mockError = new Error("API error");
    axiosInstanceWrapper.mockRejectedValue(mockError);

    const response = await requestCopyPlan(payload, dispatch)();
    expect(response).toBeUndefined();
  });
});

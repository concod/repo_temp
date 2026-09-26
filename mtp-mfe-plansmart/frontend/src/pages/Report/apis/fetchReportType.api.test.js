import { fetchReportType } from "./fetchReportType.api";
import { setReportType } from "../../CommonDashboard/dashboard.slice";
import { SNACK_VARIANT } from "constants/toast.constant";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { transformFilterConfig } from "../report.util";
import { getConfigFile } from "../../CreateNewPlan/createNewPlan.util";
import { ERROR_MESSAGE } from "../report.constant";
import { API_METHOD } from "constants/api.constant";

jest.mock("utils/axiosInstanceWrapper");
jest.mock('core/Utils/functions/utils', () => ({
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`)
}));
jest.mock("../report.util", () => ({
  transformFilterConfig: jest.fn()
}));
jest.mock("../../CreateNewPlan/createNewPlan.util", () => ({
  getConfigFile: jest.fn()
}));
jest.mock("actions/snackbarActions", () => ({
  addSnack: jest.fn((payload) => payload) // Mocking addSnack to return the payload itself
}));

describe("fetchReportType", () => {
  const mockDispatch = jest.fn();
  const mockSetFilterLoader = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch report types and dispatch setReportType action on success", async () => {
    const mockResponse = { data: { data: [{ id: 1, name: "Report Type 1" }] } };
    axiosInstanceWrapper.mockResolvedValue(mockResponse);

    const mockFormFields = [{ options: [] }];
    transformFilterConfig.mockReturnValue(mockFormFields);

    const mockReportOptions = { report_options: ["Option 1", "Option 2"] };
    getConfigFile.mockReturnValue(mockReportOptions);

    const result = await fetchReportType(mockSetFilterLoader)(mockDispatch);

    expect(mockSetFilterLoader).toHaveBeenCalledWith(true);
    expect(axiosInstanceWrapper).toHaveBeenCalledWith(
      {
        url: "core/filter-configuration/screen/plansmart%20report%20types",
        method: API_METHOD.GET
      },
      mockDispatch
    );
    expect(transformFilterConfig).toHaveBeenCalledWith(mockResponse.data.data);
    expect(mockFormFields[0].options).toEqual(mockReportOptions.report_options);
    expect(mockDispatch).toHaveBeenCalledWith(setReportType(mockFormFields));
    expect(result).toEqual(mockFormFields);
    expect(mockSetFilterLoader).toHaveBeenCalledWith(false);
  });

  it("should dispatch addSnack action on error", async () => {
    axiosInstanceWrapper.mockRejectedValue(new Error("Network Error"));

    await fetchReportType(mockSetFilterLoader)(mockDispatch);

    expect(mockSetFilterLoader).toHaveBeenCalledWith(true);

    // Using expect.objectContaining to avoid direct function comparison issues
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        message: ERROR_MESSAGE.FETCH_FILTER,
        options: { variant: SNACK_VARIANT.ERROR }
      })
    );
    expect(mockSetFilterLoader).toHaveBeenCalledWith(false);
  });
});

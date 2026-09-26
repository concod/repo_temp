import { generateReportApi } from "./generateReport.api";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper"; // Mock axios
import { addSnack } from "actions/snackbarActions"; // Mock snackbar actions
import {
  ERROR_MESSAGE,
  SUCCESS_MESSAGE,
  GENERATE_REPORT_URL
} from "../report.constant";
import { generateReportPayload } from "../report.util";
import { API_METHOD } from "constants/api.constant";
import { SNACK_VARIANT } from "constants/toast.constant";

// Mock dependencies
jest.mock("utils/axiosInstanceWrapper");
jest.mock("actions/snackbarActions");
jest.mock("../report.util");

describe("generateReportApi", () => {
  let dispatch;
  let setGenerateReportLoader;
  let setFieldsDefaultValues;

  beforeEach(() => {
    dispatch = jest.fn();
    setGenerateReportLoader = jest.fn();
    setFieldsDefaultValues = jest.fn();
    generateReportPayload.mockReturnValue({ someField: "someValue" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("dispatches success action when API call succeeds", async () => {
    // Mocking axiosInstanceWrapper response
    axiosInstanceWrapper.mockResolvedValue({ status: true });

    const payload = {
      fields: { someField: "someValue" },
      fieldsDefaultValues: { defaultField: "defaultValue" }
    };

    await generateReportApi(
      payload,
      setGenerateReportLoader,
      setFieldsDefaultValues
    )(dispatch);

    expect(setGenerateReportLoader).toHaveBeenCalledWith(true);
    expect(generateReportPayload).toHaveBeenCalledWith({
      fields: payload.fields,
      fieldsDefaultValues: payload.fieldsDefaultValues
    });

    expect(axiosInstanceWrapper).toHaveBeenCalledWith(
      {
        url: GENERATE_REPORT_URL,
        method: API_METHOD.POST,
        data: {
          someField: "someValue",
          source: "client",
          plan_code: 0
        }
      },
      dispatch
    );

    // Check for success message dispatch
    expect(dispatch).toHaveBeenCalledWith(
      addSnack({
        message: SUCCESS_MESSAGE,
        options: { variant: SNACK_VARIANT.INFO }
      })
    );

    expect(setGenerateReportLoader).toHaveBeenCalledWith(false);
    expect(setFieldsDefaultValues).toHaveBeenCalledWith({});
  });

  test("dispatches error action when API call fails", async () => {
    // Mock axios to throw an error
    axiosInstanceWrapper.mockRejectedValue(new Error("Network Error"));

    const payload = {
      fields: { someField: "someValue" },
      fieldsDefaultValues: { defaultField: "defaultValue" }
    };

    await generateReportApi(
      payload,
      setGenerateReportLoader,
      setFieldsDefaultValues
    )(dispatch);

    expect(setGenerateReportLoader).toHaveBeenCalledWith(true);
    expect(axiosInstanceWrapper).toHaveBeenCalled();

    // Check for error message dispatch
    expect(dispatch).toHaveBeenCalledWith(
      addSnack({
        message: ERROR_MESSAGE.DOWNLOAD_REPORT,
        option: { variant: SNACK_VARIANT.ERROR }
      })
    );

    expect(setGenerateReportLoader).toHaveBeenCalledWith(false);
    expect(setFieldsDefaultValues).toHaveBeenCalledWith({});
  });
});

import { fetchFormFieldDataApi } from "./fetchFormFieldData.api";
import { setformFields } from "../../../dashboard.slice";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { addSnack } from "actions/snackbarActions";
import {
  OPTION_SET,
  FORM_FIELDS_ERROR_MESSAGE
} from "../selectFilters.constant";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { formFieldsSelector } from "../../../dashboard.slice";
import {
  getFieldRequestPayload,
  getUpdatedFormFields
} from "../selectFilters.util";
import { MODEL_API_METHOD } from "constants/modalApi.constant";
import { getConfigFile } from "../../../../CreateNewPlan/createNewPlan.util";

// Mock dependencies
jest.mock('core/Utils/functions/utils', () => ({
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`),
  replaceSpecialCharacter: jest.fn((label) => label),
}));
jest.mock("utils/axiosInstanceWrapper");
jest.mock("../../../dashboard.slice", () => ({
  setformFields: jest.fn(),
  formFieldsSelector: jest.fn()
}));
jest.mock("actions/snackbarActions");
jest.mock("../selectFilters.util");
jest.mock("core/Utils/functions/utils");
jest.mock("../../../../CreateNewPlan/createNewPlan.util"); // Mock the getConfigFile

describe("fetchFormFieldDataApi", () => {
  let dispatch;
  let getStore;
  let dropdownDispatch;

  beforeEach(() => {
    dispatch = jest.fn();
    getStore = jest.fn(() => ({}));
    dropdownDispatch = jest.fn();
    formFieldsSelector.mockReturnValue({});
    getFieldRequestPayload.mockReturnValue({
      apiCall: true,
      requestPayload: {
        filters: []
      }
    });

    // Mocking getConfigFile to return an endpoint
    getConfigFile.mockReturnValue({
      fields: {
        someAccessor: {
          apiEndPoint: "https://example.com/api"
        }
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("dispatches form fields and dropdown options when API call is successful", async () => {
    // Mock axiosInstanceWrapper response
    axiosInstanceWrapper.mockResolvedValue({
      data: {
        data: [
          { id: 1, label: "Option 1" },
          { id: 2, label: "Option 2" }
        ]
      }
    });

    const payload = {
      selectedField: { accessor: "someAccessor" },
      dropdownDispatch,
      fieldsDefaultValues: {},
      selectedScreenName: "someScreen"
    };

    getUpdatedFormFields.mockReturnValue({
      updatedField: "updatedValue"
    });
    replaceSpecialCharacter.mockImplementation((label) => label);

    await fetchFormFieldDataApi(payload)(dispatch, getStore);

    expect(getFieldRequestPayload).toHaveBeenCalledWith({
      selectedField: payload.selectedField,
      fieldsDefaultValues: payload.fieldsDefaultValues
    });

    expect(axiosInstanceWrapper).toHaveBeenCalledWith(
      {
        url: "https://example.com/api", // Now we have a valid URL from getConfigFile mock
        method: MODEL_API_METHOD,
        data: {
          filters: []
        }
      },
      dispatch
    );

    // Check if form fields are updated
    expect(dispatch).toHaveBeenCalledWith(
      setformFields({ updatedField: "updatedValue" })
    );

    // Check if dropdownDispatch is called with correct options
    expect(dropdownDispatch).toHaveBeenCalledWith({
      type: OPTION_SET,
      payload: [
        { id: 1, label: "Option 1" },
        { id: 2, label: "Option 2" }
      ]
    });
  });

  test("dispatches error snackbar when API call fails", async () => {
    // Mock axiosInstanceWrapper to throw an error
    axiosInstanceWrapper.mockRejectedValue(new Error("Network Error"));

    const payload = {
      selectedField: { accessor: "someAccessor" },
      dropdownDispatch,
      fieldsDefaultValues: {},
      selectedScreenName: "someScreen"
    };

    await fetchFormFieldDataApi(payload)(dispatch, getStore);

    // Ensure error snackbar is dispatched
    expect(dispatch).toHaveBeenCalledWith(
      addSnack({
        message: FORM_FIELDS_ERROR_MESSAGE,
        options: { variant: "error" }
      })
    );

    // Ensure setformFields and dropdownDispatch are not called
    expect(setformFields).not.toHaveBeenCalled();
    expect(dropdownDispatch).not.toHaveBeenCalled();
  });

  test("uses provided options without API call when apiCall is false", async () => {
    // Mock request payload to not require an API call
    getFieldRequestPayload.mockReturnValue({
      apiCall: false,
      options: [{ id: 3, label: "Static Option" }]
    });

    const payload = {
      selectedField: { accessor: "someAccessor" },
      dropdownDispatch,
      fieldsDefaultValues: {},
      selectedScreenName: "someScreen"
    };

    getUpdatedFormFields.mockReturnValue({
      updatedField: "updatedValue"
    });
    replaceSpecialCharacter.mockImplementation((label) => label);

    await fetchFormFieldDataApi(payload)(dispatch, getStore);

    // Ensure no API call is made
    expect(axiosInstanceWrapper).not.toHaveBeenCalled();

    // Check if form fields are updated
    expect(dispatch).toHaveBeenCalledWith(
      setformFields({ updatedField: "updatedValue" })
    );

    // Check if dropdownDispatch is called with provided options
    expect(dropdownDispatch).toHaveBeenCalledWith({
      type: OPTION_SET,
      payload: [{ id: 3, label: "Static Option" }]
    });
  });
});

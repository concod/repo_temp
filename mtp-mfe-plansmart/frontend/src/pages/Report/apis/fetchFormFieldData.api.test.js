import configureMockStore from "redux-mock-store";
import thunk from "redux-thunk";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { fetchFormFieldDataApi } from "./fetchFormFieldData.api";
import { setformFields } from "../../CommonDashboard/dashboard.slice";
import { getFieldRequestPayload, getUpdatedFormFields } from "../report.util";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getConfigFile } from "../../CreateNewPlan/createNewPlan.util";

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

jest.mock("utils/axiosInstanceWrapper");
jest.mock("actions/snackbarActions", () => ({
  addSnack: jest.fn()
}));
jest.mock("../report.util", () => ({
  getFieldRequestPayload: jest.fn(),
  getUpdatedFormFields: jest.fn()
}));
jest.mock("core/Utils/functions/utils", () => ({
  replaceSpecialCharacter: jest.fn((label) => label),
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`)
}));
jest.mock("../../CreateNewPlan/createNewPlan.util", () => ({
  getConfigFile: jest.fn()
}));

describe("fetchFormFieldDataApi", () => {
  let store;
  let dropdownDispatch;

  beforeEach(() => {
    store = mockStore({});
    dropdownDispatch = jest.fn();
    jest.clearAllMocks();
  });

  it("dispatches setformFields and dropdownDispatch when API call is successful", async () => {
    // Mock necessary functions and API response
    const selectedField = { accessor: "someField" };
    const formFields = [];
    const fieldsDefaultValues = {};
    const fieldRequestPayload = {
      apiCall: true,
      requestPayload: { someKey: "someValue" }
    };
    const filterConfig = {
      apiEndPoint: "/some-endpoint",
      apiCallMethod: "POST"
    };
    const mockResponse = { data: { data: [{ label: "Option1" }] } };

    getFieldRequestPayload.mockReturnValueOnce(fieldRequestPayload);
    getConfigFile.mockReturnValueOnce({ fields: { someField: filterConfig } });
    axiosInstanceWrapper.mockResolvedValueOnce(mockResponse);
    getUpdatedFormFields.mockReturnValueOnce([{ updated: "fields" }]);

    const payload = {
      selectedField,
      formFields,
      dropdownDispatch,
      fieldsDefaultValues
    };

    await store.dispatch(fetchFormFieldDataApi(payload));

    // Check if API call was made correctly
    expect(axiosInstanceWrapper).toHaveBeenCalledWith(
      {
        url: "/some-endpoint",
        method: "POST",
        data: { someKey: "someValue" }
      },
      expect.any(Function)
    );

    // Check if setformFields was dispatched with the updated form fields
    expect(store.getActions()).toContainEqual(
      setformFields([{ updated: "fields" }])
    );

    // Check if dropdownDispatch was called with the formatted options
    expect(dropdownDispatch).toHaveBeenCalledWith({
      type: "OPTION_SET",
      payload: [{ label: "Option1" }]
    });

    // Check if replaceSpecialCharacter was called to format the options
    expect(replaceSpecialCharacter).toHaveBeenCalledWith("Option1");
  });
});

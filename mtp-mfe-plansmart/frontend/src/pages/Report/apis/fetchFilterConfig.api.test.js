import configureMockStore from "redux-mock-store";
import thunk from "redux-thunk";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { fetchFilterConfig } from "./fetchFilterConfig.api";
import { setformFields } from "../../CommonDashboard/dashboard.slice";
import { transformFilterConfig } from "../report.util";
import { OTB_REPORT_FILTER_CONFIG } from "../report.constant";

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

jest.mock("utils/axiosInstanceWrapper");
jest.mock('core/Utils/functions/utils', () => ({
  pxToRem: jest.fn((pxValue) => `${pxValue / 16}rem`),
}));
jest.mock("actions/snackbarActions", () => ({
  addSnack: jest.fn()
}));
jest.mock("../report.util", () => ({
  transformFilterConfig: jest.fn()
}));

describe("fetchFilterConfig", () => {
  let store;
  let setFilterLoader;

  beforeEach(() => {
    store = mockStore({});
    setFilterLoader = jest.fn();
    jest.clearAllMocks();
  });

  it("dispatches setformFields when API call is successful", async () => {
    // Mock API response
    const mockResponse = { data: { data: [{ id: 1, name: "filter1" }] } };
    axiosInstanceWrapper.mockResolvedValueOnce(mockResponse);

    // Mock the transformFilterConfig function
    const transformedData = [{ id: 1, name: "transformedFilter" }];
    transformFilterConfig.mockReturnValueOnce(transformedData);

    // Dispatch the action
    await store.dispatch(fetchFilterConfig(setFilterLoader, "otb_report"));

    // Check if loader is set to true at the start
    expect(setFilterLoader).toHaveBeenCalledWith(true);

    // Check if the API call was made correctly
    expect(axiosInstanceWrapper).toHaveBeenCalledWith(
      {
        url: OTB_REPORT_FILTER_CONFIG,
        method: "GET"
      },
      expect.any(Function)
    );

    // Check if the correct action is dispatched
    expect(store.getActions()).toContainEqual(setformFields(transformedData));

    // Check that loader is set to false at the end
    expect(setFilterLoader).toHaveBeenCalledWith(false);
  });
});

import configureMockStore from "redux-mock-store";
import thunk from "redux-thunk";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { fetchFilterConfig } from "./fetchFilterConfig.api";
import { setFilterLoader } from "../../../dashboard.slice";
import { SNACK_VARIANT } from "constants/toast.constant";
import { DASHBOARD_PAGES } from "../../../dashboard.constant";

// Setup mock store and axios adapter
const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);
const mockAxios = new MockAdapter(axios);

describe("fetchFilterConfig", () => {
  let store;

  beforeEach(() => {
    store = mockStore({});
    mockAxios.reset();
  });

  it("should handle errors and dispatch addSnack on failure", async () => {
    const planningScreenName = DASHBOARD_PAGES.TARGET_PLAN;
    const filterConfigUrl = "/test-url";
    const filterConfigPayload = { key: "value" };

    // Mock the API response to return an error
    mockAxios.onPost(filterConfigUrl).reply(500);

    // Mock the addSnack action creator
    const expectedSnackAction = {
      type: "ADD_SNACK",
      payload: {
        message: `Error in fetching filters for ${planningScreenName} plans`,
        options: { variant: SNACK_VARIANT.ERROR }
      }
    };

    // Dispatch the action
    await store.dispatch(
      fetchFilterConfig(
        planningScreenName,
        filterConfigUrl,
        filterConfigPayload
      )
    );

    // Assert actions
    const actions = store.getActions();
    expect(actions).toContainEqual(setFilterLoader(true));
    expect(actions).toContainEqual(expectedSnackAction);
    expect(actions).toContainEqual(setFilterLoader(false));
  });
});

import { createStore, applyMiddleware, compose, combineReducers } from "redux";
import thunk from "redux-thunk";
import { composeWithDevTools } from "redux-devtools-extension";
import rootReducer from "../core/reducers";
import { LOGOUT_CURRENT_USER } from "../core/actions/types";
import { ENV, TENANT } from "config/api";
import { includes } from "lodash";

const initialState = {};

const middleware = [thunk];

function configureStore(initialState) {
  const reducer = createReducer();

  const rootReducer = (state, action) => {
    if (action.type === LOGOUT_CURRENT_USER) {
      const { authReducer } = state;
      state = { authReducer };
    }
    return reducer(state, action);
  };

  let store;

  if (
    ENV?.toLowerCase() === "devs" ||
    ENV?.toLowerCase() === "test" ||
    ENV?.toLowerCase() === "sandbox" ||
    ENV?.toLowerCase() === "demo" ||
    TENANT?.toLowerCase()?.includes("localhost")
  ) {
    store = createStore(
      rootReducer,
      compose(composeWithDevTools(applyMiddleware(...middleware)))
    );
  } else {
    store = createStore(rootReducer, applyMiddleware(...middleware));
  }

  store.asyncReducers = {};

  store.injectReducer = (key, asyncReducer) => {
    store.asyncReducers[key] = asyncReducer;
    store.replaceReducer(createReducer(store.asyncReducers));
  };

  return store;
}

function createReducer(asyncReducers) {
  return combineReducers({
    ...rootReducer,
    ...asyncReducers,
  });
}

const store = configureStore(initialState);

export default store;
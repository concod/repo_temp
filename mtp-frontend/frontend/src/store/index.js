import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';
import rootReducer from '../core/reducers';

const initialState = {};

const middleware = [thunk];

const store = createStore(
  rootReducer,
  initialState,
  compose(composeWithDevTools(applyMiddleware(...middleware)))
);

export function getStoreData() {
  const state = store.getState();
  return state
}
export default store;
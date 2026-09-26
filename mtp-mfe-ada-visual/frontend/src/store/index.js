import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';
import rootReducer from '../core/reducers';


const initialState = {};

const middleware = [thunk];

const store = createStore(
  combineReducers(rootReducer),
  initialState,
  compose(composeWithDevTools(applyMiddleware(...middleware)))
);

export function getStoreData() {
  const state = store.getState();
  return state
}
export default store;
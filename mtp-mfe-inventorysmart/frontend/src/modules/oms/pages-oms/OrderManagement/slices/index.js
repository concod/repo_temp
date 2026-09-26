import { combineReducers } from "redux";
import pivotReducer from "./pivot.slice";
import gridReducer from "./grid.slice";
import kpiReducer from "./kpi.slice";
import editReducer from "./edit.slice";
import matrixHandoffReducer from "./matrixHandoff.slice";
import productDetailsReducer from "../ProductDetails/slices/productDetails.slice";

export const orderManagementTableReducer = combineReducers({
  pivot: pivotReducer,
  grid: gridReducer,
  kpi: kpiReducer,
  edit: editReducer,
  matrixHandoff: matrixHandoffReducer,
  productDetails: productDetailsReducer,
});

export default orderManagementTableReducer;

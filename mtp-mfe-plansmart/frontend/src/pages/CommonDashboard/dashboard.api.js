import { get } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import axiosInstance from "core/Utils/axios";
import {
  setDashboardPlanTableLoader,
  setDashboardPlanTableResp,
  statusFilterSelector,
  setFilterLoader,
  setPlanListSourceToken,
  planListSourceTokenSelector
} from "./dashboard.slice";
import { API_METHOD } from "constants/api.constant";
import { transformFilterPayload, getTableConfigUrl } from "./dashboard.util";
import {
  PLANS_LIST_TABLE_API_URL,
  PLANS_LIST_FILTER_PAYLOAD
} from "./dashboard.constant";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import axios from "axios";
import { productHierarchySelector } from "../PlanningScreen/slice/planningScreen.slice";

/**
 * Fetch and set the plan list data for the dashboard
 * @param {Function} dispatch - Function to dispatch actions.
 * @param {Function} getStore - Function to get the current store state.
 * @returns {Promise<void>} Resolves when the operation is complete and state is updated.
 * @description
 *   - Cancels any previous plan list request if pending.
 *   - Transforms or uses a default filter payload to fetch data.
 *   - Sets loader and retrieves column definitions and row data concurrently.
 *   - Handles success and error states to update the dashboard appropriately.
 */
export const getDashboardTableData = (screenName, filterPayload) => async (
  dispatch,
  getStore
) => {
  const planListSource = axios.CancelToken.source();
  const store = getStore();
  const productHierarchyList = productHierarchySelector(store);

  const planListSourceToken = planListSourceTokenSelector(store);
  if (planListSourceToken) {
    planListSourceToken.cancel({
      CANCELED: "cancelling on unmount of component"
    });
  }

  let requestPayload = [];
  if (filterPayload) {
  const filteredPayload = Object.fromEntries(Object.entries(filterPayload).filter(([key, value]) => value!=null) 
);
    requestPayload = [
      ...transformFilterPayload(filteredPayload),
      statusFilterSelector(store)
    ];
  } else {
    requestPayload = [
      ...PLANS_LIST_FILTER_PAYLOAD,
      statusFilterSelector(store)
    ];
  }

  dispatch(setDashboardPlanTableLoader(true));

  try {
    dispatch(setPlanListSourceToken(planListSource));
    const columnDefApi = axiosInstance({
      url: getTableConfigUrl(screenName),
      method: API_METHOD.GET,
      cancelToken: planListSource.token
    });

    const rowDataApi = axiosInstance({
      url: PLANS_LIST_TABLE_API_URL,
      method: API_METHOD.POST,
      data: {
        filters: [...requestPayload],
        meta: { range: [], sort: [], search: [] }
      },
      cancelToken: planListSource.token
    });

    const [columnDefResp, rowDataResp] = await Promise.all([
      columnDefApi,
      rowDataApi
    ]);

    const rowData = get(rowDataResp, "data.data.plans", []);

    const valueGetter = (cellProps) => {
      if (productHierarchyList.includes(cellProps.colDef.accessor)) {
        return replaceSpecialCharacter(
          cellProps?.data?.[cellProps.colDef.accessor]
        );
      }
      return cellProps?.data?.[cellProps.colDef.accessor];
    };
    const planListData = {
      columnDef: agGridColumnFormatter(
        get(columnDefResp, "data.data", []),
        {},
        {
          customValueGetter: (cellProps) => valueGetter(cellProps)
        }
      ),
      rowData: rowData
    };

    dispatch(setDashboardPlanTableResp(planListData));
    dispatch(setFilterLoader(false));
    dispatch(setDashboardPlanTableLoader(false));
  } catch (error) {
    if (error.message !== planListSource.token.reason.message) {
      dispatch(
        addSnack({
          message: `Error in fetching ${screenName} PlanList`,
          options: {
            variant: SNACK_VARIANT.ERROR
          }
        })
      );
      dispatch(setDashboardPlanTableLoader(false));
    }
  }
};

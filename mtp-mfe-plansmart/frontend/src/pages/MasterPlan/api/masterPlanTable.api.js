import { get } from "lodash";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { API_METHOD } from "../../../constants/api.constant";
import { addSnack } from "actions/snackbarActions";
import { MASTER_PLAN_API_CONSTS, KPI_CONFIG_API } from "../masterplan.constant";
import flattenColDefFunc from "../../../utils/getPlanningScreenFlattenColDef";

import {
  setSelectedFilters,
  setSelectedFiltersChips,
  setMasterPlanTableLoader,
  setMasterPlanTableResp,
  setMasterPlanLockAccess,
  setMasterPlanLockStatus,
  setMasterPlanApproveAccess,
  setMasterPlanApproveStatus,
  setMasterPlanKpiConfig,
  setMasterPlanKpiConfigLoader
} from "../masterPlan.slice";

import {
  getMasterPlanFilterChips,
  transformFilterPayload
} from "../components/MasterPlanFilter/masterPlanFilter.util";

import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";

/**
 * Function to fetch table row data
 * @param {object} filterPayload
 * @param {string} screenName
 */
export const fetchMasterPlanTableDataReq = (
  filterPayload,
  screenName,
  field
) => async (dispatch) => {
  const requestPayload = transformFilterPayload(
    filterPayload,
    screenName,
    field
  );
  dispatch(setMasterPlanTableLoader(true));

  try {
    const response = await axiosInstanceWrapper({
      axiosProps: {
        data: {
          filters: [...requestPayload]
        },
        isV3: true,
        method: API_METHOD.POST,
        url: MASTER_PLAN_API_CONSTS.REQUEST_TABLE_DATA
      },
      dispatch: dispatch
    });

    const flattenColDef = flattenColDefFunc(
      get(response, "data.data.column_config", []),
      get(response, "data.data.levels", 0)
    );

    dispatch(setSelectedFilters(requestPayload));
    dispatch(setSelectedFiltersChips(getMasterPlanFilterChips(requestPayload)));
    dispatch(
      setMasterPlanTableResp({
        columnDef: agGridColumnFormatter(flattenColDef),
        rowData: get(response, "data.data.data_row", []),
        masterPlanVarianceVersionList: Object.keys(
          get(
            response,
            "data.data.version_variance_config.variance_version_mapping",
            {}
          )
        )
      })
    );
    dispatch(
      setMasterPlanLockAccess(get(response, "data.data.lock_access", []))
    );
    dispatch(
      setMasterPlanLockStatus(get(response, "data.data.lock_status", []))
    );
    dispatch(
      setMasterPlanApproveAccess(get(response, "data.data.approve_access", []))
    );
    dispatch(
      setMasterPlanApproveStatus(get(response, "data.data.approve_status", []))
    );
  } catch (error) {
    dispatch(
      addSnack({
        message: SOMETHING_WENT_WRONG_MSG,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    dispatch(setMasterPlanTableLoader(false));
  }
};

export const getKpiConfig = (seasonType) => async (dispatch) => {
  try {
    dispatch(setMasterPlanKpiConfigLoader(true));
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: KPI_CONFIG_API,
        method: API_METHOD.POST,
        data: {
          plan_code: null,
          season_type: seasonType
        },
        isV3: true
      },
      dispatch: dispatch
    });

    if (response.status) {
      dispatch(setMasterPlanKpiConfig(response.data.data));
    } else {
      dispatch(setMasterPlanKpiConfig({}));
    }
  } catch (error) {
    dispatch(setMasterPlanKpiConfig({}));
  } finally {
    dispatch(setMasterPlanKpiConfigLoader(false));
  }
};

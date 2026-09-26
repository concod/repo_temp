import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";

import { addSnack } from "actions/snackbarActions";

import {
  setVersionColDefData,
  setVersionColDefLoader,
  productHierarchySelector
} from "../../../slice/planningScreen.slice";

import { API_METHOD } from "../../../../../constants/api.constant";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import { VERSIONS_API_CONSTS } from "../constants";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";

/**
 * Function to fetch Add/Hide Version table column configuration data
 * @param {Number} planCode
 */
export const fetchVersionColDefDataReq = (planCode) => async (
  dispatch,
  getStore
) => {
  const store = getStore();
  const productHierarchyList = productHierarchySelector(store);
  dispatch(setVersionColDefLoader(true));
  try {
    const {
      data: { data }
    } = await axiosInstanceWrapper({
      axiosProps: {
        method: API_METHOD.GET,
        url: VERSIONS_API_CONSTS.REQUEST_VERSION_TABLE_CONFIG
      },
      dispatch: dispatch
    });

    const valueGetter = (cellProps) => {
      if (
        Array.isArray(productHierarchyList) &&
        productHierarchyList.includes(cellProps.colDef.accessor)
      ) {
        return replaceSpecialCharacter(
          cellProps?.data?.[cellProps.colDef.accessor]
        );
      }
      return cellProps?.data?.[cellProps.colDef.accessor];
    };

    const columnDef = agGridColumnFormatter(
      data,
      {},
      {
        customValueGetter: (cellProps) => valueGetter(cellProps)
      }
    );

    dispatch(setVersionColDefData(columnDef));
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
    dispatch(setVersionColDefLoader(false));
  }
};

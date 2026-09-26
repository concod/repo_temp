import { get } from "lodash";
import { transformFilterConfig } from "../report.util";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { setformFields } from "../../CommonDashboard/dashboard.slice";
import {
  FORM_FIELDS,
  OTB_REPORT_FILTER_CONFIG,
  ERROR_MESSAGE,
  ROLLUP_REPORT_FILTER_CONFIG,
  ECECUTIVE_REPORT_FILTER_CONFIG
} from "../report.constant";
import { API_METHOD } from "constants/api.constant";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import { fetchFormFieldDataApi } from "./fetchFormFieldData.api";

export const fetchFilterConfig = (setFilterLoader, type) => async (
  dispatch
) => {
  const reportType = {
    otb_report: OTB_REPORT_FILTER_CONFIG,
    executive_report: ECECUTIVE_REPORT_FILTER_CONFIG,
    rollup_report: ROLLUP_REPORT_FILTER_CONFIG
  };
  try {
    setFilterLoader(true);
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: reportType[type],

        method: API_METHOD.GET
      },
      dispatch: dispatch
    });
    const filterData = get(response, "data.data", []);
    const formFields = transformFilterConfig(filterData);
    dispatch(setformFields(formFields));
    return formFields;
  } catch (error) {
    dispatch(
      addSnack({
        message: ERROR_MESSAGE.FETCH_FILTER,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  } finally {
    setFilterLoader(false);
  }
};

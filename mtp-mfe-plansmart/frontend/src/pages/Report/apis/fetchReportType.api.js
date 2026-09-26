import { get } from "lodash";
import { transformFilterConfig } from "../report.util";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { setReportType } from "../../CommonDashboard/dashboard.slice";
import { getConfigFile } from "../../CreateNewPlan/createNewPlan.util";
import { ERROR_MESSAGE } from "../report.constant";
import { API_METHOD } from "constants/api.constant";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";

export const fetchReportType = (setFilterLoader) => async (dispatch) => {
  try {
    setFilterLoader(true);
    const response = await axiosInstanceWrapper({
      axiosProps: {
        url: "core/filter-configuration/screen/plansmart%20report%20types",
        method: API_METHOD.GET
      },
      dispatch: dispatch
    });
    const filterData = get(response, "data.data", []);
    const formFields = transformFilterConfig(filterData);
    formFields[0].options = getConfigFile()?.report_options;

    dispatch(setReportType(formFields));
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

import { get } from "lodash";
import { API_METHOD } from "../../../../../constants/api.constant";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import {
  planDetailsSelector,
  setMatchWithKpiData,
  setMatchWithKpiLoader
} from "../../../slice/planningScreen.slice";
import { addSnack } from "actions/snackbarActions";
import {
  SNACK_VARIANT,
  SOMETHING_WENT_WRONG_MSG
} from "constants/toast.constant";
import {
  fields,
  MATCH_WITH,
  MATCH_WITH_DROPDOWN_API
} from "../matchWith.constants";

export const fetchMatchWithFieldData = (payload) => async (dispatch) => {
  try {
    dispatch(setMatchWithKpiLoader(true));

    const response = await axiosInstanceWrapper({
      axiosProps: {
        isV3: true,
        url: `${MATCH_WITH_DROPDOWN_API}`,
        method: API_METHOD.POST,
        data: payload
      },
      dispatch: dispatch
    });

    const matchWithData = get(response, "data.data", []);

    const updatedFields = fields.map((field) =>
      field.column_name === MATCH_WITH
        ? { ...field, options: [...matchWithData] }
        : field
    );
    dispatch(setMatchWithKpiData(updatedFields));
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
    dispatch(setMatchWithKpiLoader(false));
  }
};

import { setformFields } from "../../CommonDashboard/dashboard.slice";
import { getFieldRequestPayload, getUpdatedFormFields } from "../report.util";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { ERROR_MESSAGE } from "../report.constant";
import { get } from "lodash";
import { API_METHOD } from "constants/api.constant";
import { getConfigFile } from "../../CreateNewPlan/createNewPlan.util";

export const fetchFormFieldDataApi = (payload) => async (dispatch) => {
  try {
    const {
      selectedField,
      formFields,
      dropdownDispatch,
      fieldsDefaultValues
    } = payload;

    const fieldRequestPayload = getFieldRequestPayload({
      selectedField,
      fieldsDefaultValues
    });

    let options = [];
    const { accessor } = selectedField;
    const filterConfig = getConfigFile()?.fields[accessor];

    if (fieldRequestPayload.apiCall) {
      const apiRequest = await axiosInstanceWrapper({
        axiosProps: {
          url: filterConfig?.apiEndPoint,
          method: filterConfig?.apiCallMethod,
          data: fieldRequestPayload.requestPayload
        },
        dispatch: dispatch
      });
      if (fieldRequestPayload.responseFormatter) {
        options = fieldRequestPayload.responseFormatter(
          get(apiRequest, "data", [])
        );
      } else {
        options = get(apiRequest, "data.data", []);
      }
    } else {
      options = fieldRequestPayload.options;
    }

    if (dropdownDispatch) {
      const updatedFormFields = getUpdatedFormFields({
        selectedField,
        options,
        formFields
      });

      dispatch(setformFields(updatedFormFields));
      const formattedOptions = options.map((opt) => ({
        ...opt,
        label: replaceSpecialCharacter(opt.label)
      }));
      dropdownDispatch({ type: "OPTION_SET", payload: formattedOptions });
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: ERROR_MESSAGE.FORM_FIELDS_DATA,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  }
};

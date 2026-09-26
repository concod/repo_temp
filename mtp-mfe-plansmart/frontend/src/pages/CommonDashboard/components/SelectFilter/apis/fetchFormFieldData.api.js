import {
  OPTION_SET,
  FORM_FIELDS_ERROR_MESSAGE
} from "../selectFilters.constant";
import { setformFields } from "../../../dashboard.slice";
import {
  getFieldRequestPayload,
  getUpdatedFormFields
} from "../selectFilters.util";
import { MODEL_API_METHOD } from "constants/modalApi.constant";
import { addSnack } from "actions/snackbarActions";
import { SNACK_VARIANT } from "constants/toast.constant";
import axiosInstanceWrapper from "utils/axiosInstanceWrapper";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getConfigFile } from "../../../../CreateNewPlan/createNewPlan.util";
import { formFieldsSelector } from "../../../dashboard.slice";

/**
 * Handles asynchronous dropdown field updates based on selected criteria.
 * @param {Function} dispatch - Function for dispatching Redux actions.
 * @returns {Promise<void>} Updates form fields and dropdown options if applicable.
 * @description
 *   - Makes an API call to retrieve options based on the selected field.
 *   - Formats and sets options for dropdown dispatch if provided.
 *   - Handles errors by dispatching a snack notification.
 */
export const fetchFormFieldDataApi = (payload) => async (
  dispatch,
  getStore
) => {
  try {
    const {
      selectedField,
      dropdownDispatch,
      fieldsDefaultValues,
      selectedScreenName
    } = payload;
    const store = getStore();
    const formFields = formFieldsSelector(store);
    const makeApiCall = async (url, data) => {
      const response = await axiosInstanceWrapper({
        axiosProps: {
          url,
          method: MODEL_API_METHOD,
          data
        },
        dispatch: dispatch
      });

      return response?.data;
    };

    const fieldRequestPayload = getFieldRequestPayload({
      selectedField,
      fieldsDefaultValues
    });

    let options = [];

    const { accessor } = selectedField;
    const filterConfig = getConfigFile()?.fields[accessor];

    if (accessor === "plan_stage") {
      fieldRequestPayload?.requestPayload?.filters.push({
        attribute_name: selectedScreenName,
        operator: "in",
        values: [selectedScreenName],
        filter_type: "cascaded",
        dimension: "product"
      });
    }

    if (fieldRequestPayload?.apiCall) {
      const url = filterConfig?.apiEndPoint;

      if (url) {
        const apiRequestData = await makeApiCall(
          url,
          fieldRequestPayload.requestPayload
        );
        options = fieldRequestPayload.responseFormatter
          ? fieldRequestPayload.responseFormatter(apiRequestData)
          : apiRequestData?.data || [];
      }
    } else {
      options = fieldRequestPayload?.options;
    }
    // Check if dropdownDispatch is defined before updating form fields
    // const updatedFormFields = getUpdatedFormFields({
    //   selectedField,
    //   options,
    //   formFields,
    // });

    // dispatch(setformFields(updatedFormFields));

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
    if (dropdownDispatch) {
      dropdownDispatch({ type: OPTION_SET, payload: formattedOptions });
    }
  } catch (error) {
    dispatch(
      addSnack({
        message: FORM_FIELDS_ERROR_MESSAGE,
        options: {
          variant: SNACK_VARIANT.ERROR
        }
      })
    );
  }
};

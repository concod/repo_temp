import { get } from "lodash";
import axiosInstance from "core/Utils/axios";
import { setFormFields } from "../createNewPlan.slice";
import { getUpdatedFormFields, getConfigFile } from "../createNewPlan.util";
import { OPTION_SET, FORM_FIELDS } from "../createNewPlan.constant";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { IN_SEASON, PRE_SEASON } from "constants/constant";

export const fetchFormFieldDataApi = (payload) => async (dispatch) => {
  try {
    // show loader

    const {
      selectedScreenName,
      selectedField,
      fieldsDefaultValues,
      formFields,
      dropdownDispatch
    } = payload;

    const getRequestPayload = (
      selectedField,
      fieldsDefaultValues,
      dependencyArray,
      dimension
    ) => {
      if (selectedField.accessor === FORM_FIELDS.PLAN_STAGE) {
        const value =
          selectedScreenName === PRE_SEASON ? PRE_SEASON : IN_SEASON;
        return {
          attribute_name: selectedField.accessor,
          filter_type: "cascaded",
          filters: [
            {
              attribute_name: selectedScreenName,
              operator: "in",
              values: [value],
              filter_type: "cascaded",
              dimension: "product"
            }
          ]
        };
      }
      const filters = dependencyArray.map((level) => {
        const values = [];
        for (const key in fieldsDefaultValues) {
          if (key === level && fieldsDefaultValues[key]) {
            Array.isArray(fieldsDefaultValues[key])
              ? values.push(...fieldsDefaultValues[key])
              : values.push(fieldsDefaultValues[key]);
          }
        }

        return {
          attribute_name: level,
          operator: "in",
          values: values,
          filter_type: "cascaded",
          dimension: dimension
        };
      });

      return {
        attribute_name: selectedField.accessor,
        filter_type: "cascaded",
        filters,
        is_urm_filter: true,
        screen_name: "plansmart create plan",
        application_code: 4
      };
    };

    let options = [];
    const createPlanValidation = getConfigFile();
    const filterValidation = createPlanValidation.fields;
    for (const key in filterValidation) {
      const filterConfig = filterValidation[key];
      if (selectedField.accessor === key) {
        if (filterConfig?.apiCall) {
          const apiRequest = await axiosInstance({
            url: filterConfig?.apiEndPoint,
            method: filterConfig?.apiCallMethod,
            data: getRequestPayload(
              selectedField,
              fieldsDefaultValues,
              filterConfig?.payloadDependentOn,
              filterConfig?.dimension
            )
          });
          options = get(apiRequest, "data.data.attribute", []).map(
            (attribute, index) => ({
              label: attribute.attribute,
              value: attribute.attribute,
              extra: { ...attribute, id: index }
            })
          );
        } else {
          options = filterConfig?.options;
        }
      }
    }

    const updatedFormFields = getUpdatedFormFields({
      selectedField,
      options,
      formFields
    });
    dispatch(setFormFields(updatedFormFields));
    const formattedOptions = options.map((opt) => ({
      ...opt,
      label: replaceSpecialCharacter(opt.label)
    }));
    if (dropdownDispatch)
      dropdownDispatch({ type: OPTION_SET, payload: formattedOptions });
    return updatedFormFields;
  } catch (error) {
  } finally {
    // hide loader
  }
};

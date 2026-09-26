import { cloneDeep } from "lodash";
import {
  KPI,
  MATCH_WITH,
  CATEGORY,
  SELECT_ALL,
  PRE_SEASON,
  IN_SEASON,
  PRE_SEASON_STATUS_CODES
} from "./matchWith.constants";

export const getUpdatedDefaultValues = ({
  newDefaultValues,
  prevDefaultValues,
  fieldKey,
  setFormFields,
  formFields,
  fetchMatchWithData,
  matchWithKpiList,
  planCode,
  prevSelectedPlans
}) => {
  const updatedDefaultValues = cloneDeep(newDefaultValues);
  if (prevDefaultValues[fieldKey] !== newDefaultValues[fieldKey]) {
    if (fieldKey === MATCH_WITH) {
      delete updatedDefaultValues[CATEGORY];
      delete updatedDefaultValues[KPI.toLowerCase()];
      formFields.map((field) => {
        if (field.label === KPI) {
          return {
            ...field,
            options: [],
            is_disabled: false
          };
        }
      });
      if (prevSelectedPlans?.length > 0) {
        const matchingPlans = prevSelectedPlans.filter(
          (plan) =>
            newDefaultValues[MATCH_WITH] &&
            plan?.match_with_label === newDefaultValues[MATCH_WITH]
        );

        matchingPlans.forEach((plan) => {
          fetchMatchWithData({ planCode, version: plan?.version });
        });

        if (matchingPlans.length === 0) {
          newDefaultValues[MATCH_WITH] &&
            fetchMatchWithData({
              planCode,
              version: newDefaultValues[MATCH_WITH]
            });
        }
      } else {
        newDefaultValues[MATCH_WITH] &&
          fetchMatchWithData({
            planCode,
            version: newDefaultValues[MATCH_WITH]
          });
      }
    }
  }
  if (fieldKey === CATEGORY) {
    if (newDefaultValues[fieldKey] === SELECT_ALL) {
      delete updatedDefaultValues[KPI.toLowerCase()];
      const updatedFormFields = formFields.map((field) => {
        if (field.label === KPI) {
          return { ...field, is_disabled: true };
        }
        return field;
      });
      setFormFields(updatedFormFields);
    } else {
      delete updatedDefaultValues[KPI.toLowerCase()];
      const updatedFormFields = formFields.map((field) => {
        if (field.label === KPI) {
          return {
            ...field,
            is_disabled: false,
            options: matchWithKpiList[newDefaultValues[fieldKey]]
          };
        }
        return field;
      });
      setFormFields(updatedFormFields);
    }
  }

  return updatedDefaultValues;
};

export const updateFields = ({ fields, kpiList, selectAllFlagValue }) => {
  return fields.map((field) => {
    if (field.column_name === CATEGORY) {
      const option = field.options.filter((obj) => {
        return obj.label === SELECT_ALL;
      });
      const options = !option.length
        ? [{ value: SELECT_ALL, label: SELECT_ALL }]
        : option;
      const kipLists = kpiList.flatMap((obj) => {
        return Object.keys(obj).map((key) => {
          return {
            value: key,
            label: key
          };
        });
      });
      return {
        ...field,
        options: selectAllFlagValue ? options.concat(kipLists) : kipLists
      };
    }
    return field;
  });
};

export const fetchPayload = ({
  planCode,
  fieldsDefaultValues,
  prevSelectedPlans,
  calculationUUID
}) => {
  const createPayload = (plan = {}) => {
    const payload = {
      plan_code: planCode,
      match_with_plan: plan.version || fieldsDefaultValues[MATCH_WITH],
      match_with_plan_code: plan.plan_code,
      session_id: calculationUUID || null
    };

    if (fieldsDefaultValues[CATEGORY] !== SELECT_ALL) {
      payload.category = fieldsDefaultValues[CATEGORY];
      payload.kpi = [fieldsDefaultValues[KPI.toLowerCase()]];
    }

    return payload;
  };

  if (prevSelectedPlans?.length > 0) {
    const addedVersionPayload = prevSelectedPlans.find(
      (plan) => plan?.match_with_label === fieldsDefaultValues[MATCH_WITH]
    );

    if (addedVersionPayload) {
      return createPayload(addedVersionPayload);
    }
  }

  return createPayload();
};

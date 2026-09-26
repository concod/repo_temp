import React, { useCallback, useEffect, useState } from "react";
import { Button } from "impact-ui";
import { connect, useDispatch } from "react-redux";
import { bindActionCreators } from "redux";

import Form from "core/Utils/form";
import LoadingOverlay from "core/Utils/Loader/loader";

import * as apis from "./apis";
import * as actions from "./createNewPlan.slice";
import {
  getUpdatedDefaultValues,
  validateForm,
  validateField,
  getConfigFile
} from "./createNewPlan.util";
import "./CreateNewPlan.css";
import {
  PRE_SEASON_DASHBOARD_ROUTE,
  IN_SEASON_DASHBOARD_ROUTE,
  TARGET_PLAN_ROUTE
} from "../../constants/route.constant";
import TypographyWrapper from "../../components/material/TypographyWrapper";
import { DASHBOARD_PAGES } from "../CommonDashboard/dashboard.constant";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";

const CreateNewPlanScreen = (props) => {
  const {
    selectedScreenName,
    formFields,
    fetchFormFieldsApi,
    fetchFormFieldDataApi,
    createPlanApi,
    isLoading
  } = props;

  const [fields, setFields] = useState([]);
  const [isFormValid, setIsFormValid] = useState(false);
  const [fieldsDefaultValues, setFieldsDefaultValues] = useState({});
  const [selectedField, setSelectedField] = useState({});
  const [isFieldValid, setIsFieldValid] = useState({});

  const navigate = useNavigate();
  const location = useLocation();
  const formDispatch = useDispatch();

  const createPlanValidation = getConfigFile();

  useEffect(() => {
    if (selectedScreenName?.length) fetchFormFieldsApi(selectedScreenName);
  }, [selectedScreenName]);

  useEffect(() => {
    if (formFields) {
      setFields(formFields);
    }
  }, [formFields]);

  useEffect(() => {
    if (Object.keys(fieldsDefaultValues).length > 0) {
      let isvalidity = isFieldValid;
      const isfieldValidFlag = validateField({
        fields,
        fieldsDefaultValues,
        selectedField,
        formDispatch
      });
      const obj = {};
      if (
        createPlanValidation?.fields[selectedField]?.group_field_validation
          ?.length > 0
      ) {
        obj["group_field"] = isfieldValidFlag;
      } else obj[selectedField] = isfieldValidFlag;
      isvalidity = { ...isvalidity, ...obj };
      setIsFieldValid(isvalidity);
      const isAllInputFilled = validateForm({
        fields,
        fieldsDefaultValues,
        selectedField
      });
      setIsFormValid(
        Object.values(isvalidity).every((item) => item) && isAllInputFilled
      );
    }
  }, [fieldsDefaultValues]);

  const onDropdownOpen = useCallback(
    (dropdownDispatch, selectedField) => {
      dropdownDispatch({ type: "OPTION_INIT" });
      fetchFormFieldDataApi({
        selectedScreenName,
        selectedField,
        formFields,
        dropdownDispatch,
        fieldsDefaultValues
      });
    },

    [formFields, fieldsDefaultValues, setFieldsDefaultValues]
  );

  const onFormUpdate = async (defaultValues, fieldKey) => {
    setSelectedField(fieldKey);
    const value = defaultValues[fieldKey];
    const trimmedValues = {
      ...defaultValues,
      [fieldKey]: typeof value === "string" ? value.replace(/^\s+/, "") : value
    };
    const updatedDefaultValues = await getUpdatedDefaultValues({
      newDefaultValues: trimmedValues,
      prevDefaultValues: fieldsDefaultValues,
      fieldKey,
      formFields,
      formDispatch
    });
    setFieldsDefaultValues(updatedDefaultValues);
  };

  const onGeneratePlan = () => {
    createPlanApi({
      fields,
      fieldsDefaultValues,
      navigate,
      location,
      selectedScreenName
    });
  };

  const onClickHandler = () => {
    if (selectedScreenName === DASHBOARD_PAGES.TARGET_PLAN) {
      return navigate(TARGET_PLAN_ROUTE);
    }
    return navigate(
      selectedScreenName === DASHBOARD_PAGES.PRE_SEASON
        ? PRE_SEASON_DASHBOARD_ROUTE
        : IN_SEASON_DASHBOARD_ROUTE
    );
  };

  return (
    <LoadingOverlay loader={isLoading}>
      <div className="createNewPlan_wrapper">
        <div className="createNewPlan_actions">
          <Button
            id="CreatePlanCancelButton"
            variant="primary"
            className="cancelButton customActionButton"
            onClick={onClickHandler}
          >
            Cancel
          </Button>
        </div>

        <TypographyWrapper
          variant="h4"
          component="h4"
          content={
            selectedScreenName === DASHBOARD_PAGES.IN_SEASON
              ? "Review In-Season"
              : "Create New Plan"
          }
          className="pageHeader"
          data-testid="preSeasonCreateNewPlanBtn"
        />

        <div
          className="createNewPlan_form"
          data-testid="preSeasonCreateNewPlanForm"
        >
          <Form
            layout={"horizontal"}
            maxFieldsInRow={2}
            handleChange={onFormUpdate}
            fields={fields.map((field) => ({
              ...field,
              dropdownOpenCallback: onDropdownOpen
            }))}
            updateDefaultValue={false}
            defaultValues={fieldsDefaultValues}
            handleDropdownClose={true}
          />
          <div className="createNewPlan_form_actions">
            <Button
              className="customActionButton"
              variant="primary"
              id="GeneratePlanButton"
              onClick={onGeneratePlan}
              disabled={!isFormValid}
            >
              Generate Plan
            </Button>
          </div>
        </div>
      </div>
    </LoadingOverlay>
  );
};

const mapState = (state) => ({
  formFields: actions.formFieldsSelector(state),
  selectedScreenName: state?.sideBarReducer?.userPlatformScreenName,
  isLoading: actions.isLoadingSelector(state)
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators({ ...actions, ...apis }, dispatch)
  };
};

export default connect(mapState, mapDispatch)(CreateNewPlanScreen);

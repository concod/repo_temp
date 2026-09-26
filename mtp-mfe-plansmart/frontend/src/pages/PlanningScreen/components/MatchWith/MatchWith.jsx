import React, { useEffect, useState } from "react";
import { connect, useSelector } from "react-redux";
import { bindActionCreators } from "redux";
import PropTypes from "prop-types";
import { Panel } from "impact-ui";
import styles from "../MatchWith/MatchWith.module.css";
import Form from "core/Utils/form";
import { SELECT_ALL, ADDED_VERSION } from "./matchWith.constants";
import { transformFilterConfig } from "../../../CreateNewPlan/createNewPlan.util";
import * as actions from "../../slice/planningScreen.slice";
import * as apis from "./apis/fetchMatchWithData.api";
import * as requestMatchWithKpi from "./apis/requestMatchWithKpi.api";
import * as dashboard from "../../../CommonDashboard/dashboard.slice";
import * as planningScreen from "../../apis/planningScreen.api";
import * as fetchMatchWithFieldData from "./apis/fetchMatchWithFieldData.api";
import { getUpdatedDefaultValues, fetchPayload } from "./matchWith.util";
import LoadingOverlay from "core/Utils/Loader/loader";

const MatchWpWith = (props) => {
  const {
    showMatchWithPanel,
    setShowMatchWithPanel,
    fetchMatchWithData,
    matchWithKpiLoader,
    matchWithKpiData,
    matchWithKpiList,
    requestMatchWithKpi,
    planCode,
    fetchMatchWithFieldData,
    prevSelectedPlans,
    calculationUUID,
    setShowViewsList,
    activeViewApplyCallback
  } = props;

  useEffect(() => {
    const payload = {
      plan_code: planCode
    };
    if (prevSelectedPlans?.length > 0) {
      const addedVersionPlanCodes = prevSelectedPlans.map(
        (plan) => plan.plan_code
      );

      payload[ADDED_VERSION] = addedVersionPlanCodes;
    }
    fetchMatchWithFieldData(payload);
  }, []);

  const currentVersion = useSelector(actions?.currentVersionSelector);
  const [fieldsDefaultValues, setFieldsDefaultValues] = useState({});
  const [formFields, setFormFields] = useState([]);
  const [ismatchWithDisabled, setIsmatchWithDisabled] = useState(false);

  useEffect(() => {
    if (matchWithKpiData?.length > 0) {
      setFormFields(matchWithKpiData);
    }
  }, [matchWithKpiData]);

  useEffect(() => {
    const validateRequiredFields = formFields.every((field) => {
      return fieldsDefaultValues[field.column_name];
    });

    const validateSelectAll =
      fieldsDefaultValues?.match_with &&
      fieldsDefaultValues?.category === SELECT_ALL;

    setIsmatchWithDisabled(validateRequiredFields || validateSelectAll);
  }, [formFields, fieldsDefaultValues]);

  const onFormUpdate = (defaultValues, fieldKey) => {
    const updatedDefaultValues = getUpdatedDefaultValues({
      newDefaultValues: defaultValues,
      prevDefaultValues: fieldsDefaultValues,
      fieldKey,
      setFormFields,
      formFields,
      fetchMatchWithData,
      matchWithKpiList,
      planCode,
      prevSelectedPlans
    });
    setFieldsDefaultValues(updatedDefaultValues);
  };

  return (
    <div className={styles.panelContainer} onClick={(e) => e.stopPropagation()}>
      <Panel
        isOpen={showMatchWithPanel}
        size="small"
        title={`Match ${currentVersion} with`}
        onClose={() => setShowMatchWithPanel(false)}
        primaryButtonProps={{
          disabled: !ismatchWithDisabled,
          children: "Apply",
          onClick: async () => {
            setShowMatchWithPanel(false);
            requestMatchWithKpi(
              fetchPayload({
                planCode,
                fieldsDefaultValues,
                prevSelectedPlans,
                calculationUUID
              }),
              activeViewApplyCallback
            );

            setShowViewsList(true);
          }
        }}
        tertiaryButtonProps={{
          children: "Cancel",
          onClick: () => {
            setShowMatchWithPanel(false);
          }
        }}
      >
        <p>Choose the metrics that you want to override the values with</p>
        <LoadingOverlay loader={matchWithKpiLoader}>
          <Form
            layout={"horizontal"}
            maxFieldsInRow={1}
            fields={transformFilterConfig(formFields)}
            updateDefaultValue={false}
            handleChange={onFormUpdate}
            defaultValues={fieldsDefaultValues}
          />
        </LoadingOverlay>
      </Panel>
    </div>
  );
};

MatchWpWith.propTypes = {
  fetchMatchWithData: PropTypes.func,
  matchWithKpiLoader: PropTypes.bool,
  planCode: PropTypes.string,
  requestMatchWithKpi: PropTypes.func,
  showMatchWithPanel: PropTypes.bool,
  setShowMatchWithPanel: PropTypes.func,
  matchWithKpiData: PropTypes.any,
  matchWithKpiList: PropTypes.array,
  prevSelectedPlans: PropTypes.object,
  setShowViewsList: PropTypes.func,
  activeViewApplyCallback: PropTypes.func
};

const mapStateToProps = (state) => ({
  matchWithKpiLoader: actions.matchWithKpiLoaderSelector(state),
  matchWithKpiData: actions.setMatchWithKpiDataSelector(state),
  matchWithKpiList: actions.setMatchWithKpiListSelector(state),
  planCode: actions.planCodeSelector(state),
  prevSelectedPlans: actions.prevSelectedPlansSelector(state),
  calculationUUID: actions.calculationUUIDSelector(state)
});

const mapDispatchToProps = (dispatch) => {
  return {
    ...bindActionCreators(
      {
        ...actions,
        ...apis,
        ...requestMatchWithKpi,
        ...dashboard,
        ...planningScreen,
        ...fetchMatchWithFieldData
      },
      dispatch
    )
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(MatchWpWith);

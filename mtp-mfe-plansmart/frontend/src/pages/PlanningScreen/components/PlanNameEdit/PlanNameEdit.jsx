import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { Button, Spinner } from "impact-ui";
import InputField from "components/Impact/InputField";
import { bindActionCreators } from "redux";
import { Link } from "react-router-dom";
import {
  planDetailsSelector,
  planningScreenEditModeSelector,
  savePlanNameLoaderSelector
} from "../../slice/planningScreen.slice";
import * as apis from "./planNameEdit.api";

import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import "./planNameEdit.css";
import { get } from "lodash";
import HomeIcon from "../../../../assets/homeIcon.svg";

function PlanNameEdit(props) {
  const {
    planDetail,
    editMode,
    dispatch,
    savePlanName,
    savePlanNameLoader,
    labels
  } = props;
  const [planName, setPlanName] = useState("");
  const [planCode, setPlanCode] = useState(null);
  const [editName, setEditName] = useState(false);
  const [disableSave, setDisableSave] = useState(false);

  const currentPlanName = get(planDetail, "plan_display_name", "");

  useEffect(() => {
    const planName = get(planDetail, "plan_display_name", "") || "";
    setPlanName(planName);
    setPlanCode(get(planDetail, "plan_code", null));
  }, [planDetail]);

  useEffect(() => {
    const currentPlanName = get(planDetail, "plan_display_name", "");
    if (currentPlanName !== planName?.trim()) {
      setDisableSave(false);
    } else {
      setDisableSave(true);
    }
  }, [planDetail, planName]);

  const handlePlanNameChange = (event) => {
    setPlanName(event.target.value || "");
  };

  const handleCancelButton = (planName) => {
    if (planName !== currentPlanName) {
      setPlanName(currentPlanName);
      setEditName(false);
    } else {
      setEditName(false);
    }
  };

  const handlePlanNameSubmit = () => {
    dispatch(
      savePlanName({
        planName: planName.trim(),
        planCode,
        callback: () => setEditName(false)
      })
    );
  };

  return (
    <div className="custom-bread-crumbs-container">
      <div className="custom-bread-crumbs">
        {labels?.map((item) => {
          return item.labelType === "icon" ? (
            <>
              <Link className="custom-icon-container" to={`${item.to}`}>
                {" "}
                <HomeIcon className="custom-icon" />
              </Link>
              <span className="custom-arrow">&gt;</span>
            </>
          ) : (
            <>
              <Link className="custom-link-label" to={`${item.to}`}>
                {item.label}
              </Link>
              <span className="custom-arrow">&gt;</span>
            </>
          );
        })}
      </div>
      {editMode && editName ? (
        <div className="edit-container">
          <InputField
            value={planName}
            onChange={handlePlanNameChange}
            disabled={savePlanNameLoader}
            maxLength={50}
          />
          <Button
            icon={
              savePlanNameLoader
                ? () => <Spinner size="xs" className="editSpinner" />
                : CheckOutlinedIcon
            }
            disabled={
              disableSave || savePlanNameLoader || planName.trim().length < 1
            }
            variant="primary"
            id="saveDisplayNameButton"
            size="small"
            onClick={() => handlePlanNameSubmit(false)}
          />
          <Button
            icon={CloseOutlinedIcon}
            disabled={savePlanNameLoader}
            variant="primary"
            size="small"
            id="cancelDisplayNameButton"
            onClick={() => handleCancelButton(planName)}
          />
        </div>
      ) : planName && editMode ? (
        <div className="plan-name" onClick={() => setEditName(true)}>
          {planName}
        </div>
      ) : (
        <div className="plan-name-view">{planName}</div>
      )}
    </div>
  );
}

PlanNameEdit.propTypes = {
  planDetail: PropTypes.shape({
    plan_display_name: PropTypes.string,
    plan_code: PropTypes.number
  }),
  editMode: PropTypes.bool,
  dispatch: PropTypes.func,
  savePlanName: PropTypes.func,
  savePlanNameLoader: PropTypes.bool
};

const mapState = (state) => {
  return {
    planDetail: planDetailsSelector(state),
    savePlanNameLoader: savePlanNameLoaderSelector(state),
    editMode: planningScreenEditModeSelector(state)
  };
};

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators({ ...apis }, dispatch)
  };
};

export default connect(mapState, mapDispatch)(PlanNameEdit);

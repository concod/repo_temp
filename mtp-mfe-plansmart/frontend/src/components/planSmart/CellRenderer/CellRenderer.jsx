import { Input } from "impact-ui";
import { get, isNumber, isString, replace, toNumber } from "lodash";
import PropTypes from "prop-types";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import useKpiConfig from "../../../pages/PlanningScreen/hooks/useKpiConfig";
import styles from "./CellRenderer.modules.scss";

import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { replaceSpecialCharacter } from "../../../core/Utils/functions/utils";
import * as apis from "../../../pages/PlanningScreen/apis/planningScreen.api";
import * as actions from "../../../pages/PlanningScreen/slice/planningScreen.slice";

import { main as handleCellLock } from "./cellLockUnlock.util";

import {
  TOGGLE_LOCK_ACTION,
  TARGET_PLAN_STATUS_CODES
} from "./cellRender.constant";
import {
  editableValidation,
  getFormattedValue,
  getEditableValue
} from "./cellRenderer.util";

const numberValidation = (number) => {
  return !isNaN(number);
};

const numberFormatter = (value = "") => {
  const strNumber = String(value).replace(/[^\d.-\s]/g, "");
  if (!isNaN(Number(strNumber))) {
    return Number(strNumber);
  }
  return 0;
};

function InputCell(props) {
  const {
    onChange,
    inputRef,
    colDef,
    data,
    tableRowData,
    lockedCells,
    setLockedCells,
    planKpiConfig,
    isContributionCol,
    channelRollUpMapping,
    channelRollDownMapping,
    timeRollUpMapping,
    timeRollDownMapping,
    rowDataInxMapping,
    isCellBold,
    varianceList,
    metricKey,
    version,
    value,
    valueByColumnValueKey,
    fromAddVersion,
    budgetTableLoader,
    planDetailsLoader,
    checkBohSyncRequiredLoader,
    showHideMetricLoader,
    matchWithKpiUpdateLoader,
    updatePlanLoader,
    kpiConfigV2Loader,
    planActualizedWeeksLoader,
    planDetails
  } = props;

  const isTargetPlan = TARGET_PLAN_STATUS_CODES.includes(planDetails?.status);

  const { round_off } = planKpiConfig[metricKey] || {};

  const [initialValue, setInitialValue] = useState(value);
  const [newValue, setNewValue] = useState(value);
  const [isCellLocked, setIsCellLocked] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isEscapeKey, setIsEscapeKey] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [formattedValue, setFormattedValue] = useState(
    (Number(value) || 0).toLocaleString(undefined, {
      maximumFractionDigits: round_off
    })
  );

  /**
   * Formats the number if not focused, otherwise returns the new value as is.
   * @param {boolean} isFocused - Indicates if the element is currently focused.
   * @param {any} newValue - The new value to potentially format.
   * @returns {any} Either the new value or a formatted version of it.
   * @description
   *   - Returns the new value unchanged if the element is focused.
   */
  const inputValue = useMemo(() => {
    if (isFocused) {
      return newValue;
    }
    return numberFormatter(newValue);
  }, [newValue, isFocused]);

  useEffect(() => {
    const currentValue = value;
    setNewValue(Number(Number(currentValue).toFixed(round_off)));
  }, []);

  useEffect(() => {
    const lockedRows = get(lockedCells, colDef.accessor, []);
    const isLocked = lockedRows.includes(data?.index);
    if (isLocked) {
      setIsCellLocked(lockedRows.includes(data?.index));
    } else {
      setIsCellLocked(lockedRows.includes(data?.index));
    }
  }, [colDef, lockedCells, data]);

  useEffect(() => {
    setNewValue(value.toFixed(round_off));
    setInitialValue(value);
  }, [value]);

  /**
   * Updates the value using a formatter and triggers an onChange event.
   * @param {any} newupdatedValue - The value entered by the user to be formatted.
   * @description
   *   - Uses a numberFormatter to format the user-entered value.
   *   - Passes the formatted value and initial value to the onChange event.
   */
  const sendValue = (newupdatedValue) => {
    onChange(
      {
        user_entered_value: numberFormatter(newupdatedValue),
        before_user_entered_value: initialValue
      },
      props
    );
  };

  /**
   * Handles the change event for an input field
   * @param {Event} e - Event object representing the change event.
   * @description
   *   - Extracts the new value from the input field and updates internal state.
   *   - Formats the new value based on several parameters before setting it.
   *   - Calls an external onChange handler if provided.
   */
  //Loading.
  const handleChange = (e) => {
    const newValue = e.target.value;

    setNewValue(newValue);
    const formattedValue = getEditableValue({
      inputValue: newValue,
      varianceList,
      version,
      planKpiConfig,
      metricKey,
      isContributionCol
    });
    setFormattedValue(formattedValue);

    if (onChange) {
      onChange(e);
    }
  };

  /**
   * Handles keyboard events for a specific input.
   * @param {object} e - The keyboard event object.
   * @description
   *   - Blurs the input if Enter key (keyCode 13) is pressed.
   *   - On Escape key (keyCode 27) press, sets an escape flag and resets the value, then blurs input.
   */
  const onKeyPress = (e) => {
    if (e.keyCode === 13) {
      inputRef.current.blur();
    } else if (e.keyCode === 27) {
      setIsEscapeKey(true);
      setNewValue(value);
      setTimeout(() => {
        inputRef.current.blur();
      }, 0);
    }
  };

  /**
   * Handles the focus and editing states of an input.
   * @param {Event} e - The event object triggered by the user's action.
   * @description
   *   - Focuses and selects the text in the input immediately after setting states.
   *   - Utilizes a zero-delay timeout to ensure the input is ready for selection.
   */
  const handleFocus = (e) => {
    setIsFocused(true);
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current.select();
    }, 0);
  };

  /**
   * Formats and sends a new value if it has changed
   * @param {Object} options - Configuration options
   * @param {any} options.value - Initial value
   * @param {Array} options.varianceList - List of variances
   * @param {string} options.version - Current version
   * @param {Object} options.planKpiConfig - KPI Configuration
   * @param {string} options.metricKey - Metric key
   * @param {boolean} options.isContributionCol - Contribution column flag
   * @param {boolean} options.fromAddVersion - Add version flag
   * @description
   *   - The value is reformatted before comparison and potential dispatch.
   *   - The function differentiates between an escape key press and other changes.
   */
  const handleBlur = () => {
    const formattedValue = getFormattedValue({
      inputValue: value,
      varianceList,
      version,
      planKpiConfig,
      metricKey,
      isContributionCol,
      fromAddVersion
    });

    const originalValueWithFormatting = toNumber(
      replace(String(formattedValue), /[^\d.-\s]/g, "")
    );

    setIsFocused(false);
    if (!isEscapeKey) {
      if (newValue !== originalValueWithFormatting) {
        sendValue(newValue);
      }
    }
    setIsEscapeKey(false);
  };

  const preventDropDragHandler = (e) => {
    // this function is to prevent drag & drop of any selected values from one cell to another
    e.preventDefault();
  };

  return (
    <div
      className={`${styles.inputCellContainer} ${
        isCellBold ? styles.totalBold : ""
      }`}
    >
      {!isContributionCol &&
        (isCellLocked || budgetTableLoader ? (
          <LockOutlinedIcon
            className={styles.lockUnlockIcon}
            onClick={() => {
              handleCellLock({
                colDef,
                data,
                tableRowData,
                lockedCells,
                setLockedCells,
                action: TOGGLE_LOCK_ACTION.UNLOCK,
                setIsCellLocked,
                channelRollUpMapping,
                channelRollDownMapping,
                rowDataInxMapping,
                valueByColumnValueKey,
                isTargetPlan,
                timeRollUpMapping,
                timeRollDownMapping
              });
            }}
          />
        ) : (
          <LockOpenOutlinedIcon
            className={styles.lockUnlockIcon}
            onClick={() => {
              handleCellLock({
                colDef,
                data,
                tableRowData,
                lockedCells,
                setLockedCells,
                action: TOGGLE_LOCK_ACTION.LOCK,
                setIsCellLocked,
                channelRollUpMapping,
                channelRollDownMapping,
                rowDataInxMapping,
                valueByColumnValueKey,
                isTargetPlan,
                timeRollUpMapping,
                timeRollDownMapping
              });
            }}
          />
        ))}
      <Input
        onDragStart={preventDropDragHandler}
        onDrop={preventDropDragHandler}
        ref={{ inputRef: inputRef }}
        isAgGridCellRenderer
        disabled={
          planDetailsLoader ||
          checkBohSyncRequiredLoader ||
          budgetTableLoader ||
          showHideMetricLoader ||
          matchWithKpiUpdateLoader ||
          updatePlanLoader ||
          kpiConfigV2Loader ||
          planActualizedWeeksLoader ||
          isCellLocked
        }
        value={
          isEditing
            ? getEditableValue({
                inputValue,
                formattedValue,
                varianceList,
                version,
                planKpiConfig,
                metricKey,
                isContributionCol,
                defaultValue: value
              })
            : getFormattedValue({
                inputValue,
                varianceList,
                version,
                planKpiConfig,
                metricKey,
                isContributionCol,
                fromAddVersion,
                defaultValue: value
              })
        }
        onChange={handleChange}
        onKeyDown={onKeyPress}
        onFocus={() => {
          console.log({
            columnId: colDef?.accessor,
            rowIndex: data?.index
          });
          handleFocus();
        }}
        onBlur={() => {
          setIsEditing(false);
          handleBlur();
        }}
        tabIndex="0"
      />
    </div>
  );
}

function CellRenderer(props) {
  const {
    value,
    colDef,
    data,
    varianceList,
    planKpiConfig,
    editMode,
    isMasterPlan,
    currentVersion,
    budgetTableLoader
  } = props;

  const inputRef = useRef(null);
  const metricKey = get(data, "metric_key");
  const kpiConfig = useKpiConfig(metricKey, true);
  const version = get(data, "plan_version");
  const isContributionCol = get(colDef, "extra.contribution", false);
  const isCellBold = get(colDef, "extra.is_bold", false);
  let renderedValue;

  const fromAddVersion = get(data, "fromAddVersion", false);
  //TODO: Get kpi config for master plan
  const { shouldRenderInputCell, displayStaticValue } = isMasterPlan
    ? { shouldRenderInputCell: false, displayStaticValue: null }
    : editableValidation(props, kpiConfig, {
        currentVersion
      });

  // TODO: Need to refactor && isNumber(value) this condition
  if (
    editMode &&
    !isMasterPlan &&
    shouldRenderInputCell &&
    isNumber(value) &&
    !fromAddVersion
  ) {
    renderedValue = (
      //TODO: get formatting config from kpi config v2
      <InputCell
        {...props}
        planKpiConfig={planKpiConfig}
        inputRef={inputRef}
        isContributionCol={isContributionCol}
        isCellBold={isCellBold}
        metricKey={metricKey}
        version={version}
        fromAddVersion={fromAddVersion}
        cellLoaderStatus={budgetTableLoader}
      />
    );
  } else if (isString(value) || displayStaticValue !== null) {
    renderedValue = (
      <div
        className={`${styles.nonEditableCell} ${
          isCellBold ? styles.totalBold : ""
        }`}
      >
        {replaceSpecialCharacter(
          displayStaticValue !== null ? displayStaticValue : value
        )}
      </div>
    );
  } else {
    renderedValue = (
      <div
        className={`${styles.nonEditableCell} ${
          isCellBold ? styles.totalBold : ""
        }`}
      >
        {(isNumber(value) || isString(value)) &&
          getFormattedValue({
            inputValue: value,
            varianceList,
            version,
            planKpiConfig,
            metricKey,
            isContributionCol,
            fromAddVersion
          })}
      </div>
    );
  }

  return <>{renderedValue}</>;
}

InputCell.propTypes = {
  inputRef: PropTypes.shape({
    current: PropTypes.shape({
      blur: PropTypes.func
    })
  }),
  onChange: PropTypes.func,
  round_off: PropTypes.any,
  lockedCells: PropTypes.object,
  setLockedCells: PropTypes.func,
  colDef: PropTypes.object,
  data: PropTypes.object,
  planKpiConfig: PropTypes.object,
  isContributionCol: PropTypes.bool,
  isCellBold: PropTypes.bool,
  varianceList: PropTypes.array,
  metricKey: PropTypes.string,
  version: PropTypes.string,
  value: PropTypes.number,
  valueByColumnValueKey: PropTypes.array,
  planActualizedWeeks: PropTypes.object,
  budgetTableLoader: PropTypes.bool
};

CellRenderer.propTypes = {
  value: PropTypes.number,
  colDef: PropTypes.object,
  data: PropTypes.object,
  viewType: PropTypes.string,
  planKpiConfig: PropTypes.object,
  varianceList: PropTypes.array,
  editMode: PropTypes.bool,
  isMasterPlan: PropTypes.bool,
  valueByColumnValueKey: PropTypes.array
};

const mapState = (state) => ({
  lockedCells: actions.lockedCellsSelector(state),
  tableRowData: actions.budgetTableRowDataSelector(state),
  channelRollUpMapping: actions.channelRollUpMappingSelector(state),
  channelRollDownMapping: actions.channelRollDownMappingSelector(state),
  timeRollUpMapping: actions.timeRollUpMappingSelector(state),
  timeRollDownMapping: actions.timeRollDownMappingSelector(state),
  rowDataInxMapping: actions.rowDataInxMappingSelector(state),
  varianceMapping: actions.varianceVersionMappingSelector(state),
  valueByColumnValueKey: actions.valueByColumnValueKeySelector(state),
  planActualizedWeeks: actions.planActualizedWeeksSelector(state),
  planDetails: actions.planDetailsSelector(state),
  budgetTableLoader: actions.budgetTableLoaderSelector(state),
  planDetailsLoader: actions.planDetailsLoaderSelector(state),
  checkBohSyncRequiredLoader: actions.checkBohSyncRequiredLoaderSelector(state),
  showHideMetricLoader: actions.showHideMetricLoaderSelector(state),
  matchWithKpiUpdateLoader: actions.matchWithKpiUpdateLoaderSelector(state),
  updatePlanLoader: actions.updatePlanLoaderSelector(state),
  kpiConfigV2Loader: actions.kpiConfigV2LoaderSelector(state),
  planActualizedWeeksLoader: actions.planActualizedWeeksLoaderSelector(state)
});

const mapDispatch = (dispatch) => {
  return {
    ...bindActionCreators({ ...actions, ...apis }, dispatch)
  };
};

export default connect(mapState, mapDispatch)(CellRenderer);

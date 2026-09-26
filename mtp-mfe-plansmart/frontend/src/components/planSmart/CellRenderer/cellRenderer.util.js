import { difference, get, isArray, union } from "lodash";
import { PLAN_VERSION } from "../../../constants/constant";
import findIntersection from "../../../pages/PlanningScreen/budgetTableCalculation/common/findIntersection.util";
import getValueByColumnKeyUtil from "../../../pages/PlanningScreen/budgetTableCalculation/common/getValueByColumnKey.util";
import {
  CHANNEL_CLASS_CONTRIBUTION,
  CHILD_INDEX,
  CLASS_CONTRIBUTION,
  DOLLAR,
  PARENT_INDEX,
  PERCENTAGE,
  TOGGLE_LOCK_ACTION,
  LY_VERSION,
  PERCENTAGE_SYMBOL,
  VERSION_KEY,
  CLASS_DEPT_CONTRIBUTION_KEY,
  CLASS_CHANNEL_CONTRIBUTION_KEY,
  CLASS_CLASS_CONTRIBUTION_KEY,
  PRODUCT_HIERARCHY_CONTRIBUTION_KEY,
  PRODUCT_TOTAL_CONTRIBUTION_KEY,
  STATIC_VALUE,
  EDITABLE_KEY,
  VARIANCE_KEY
} from "./cellRender.constant";
import { channelBusinessUnitMapping } from "../../../pages/PlanningScreen/apis/budgetTable.data";
import { NON_ACTUALIZED_PLAN_STATUS } from "../../../pages/PlanningScreen/planningScreen.constant";

/**
 * Formats a given value based on version configuration and type of value.
 * @param {Object} options - Contains all the named arguments needed for the function.
 * @param {string} options.inputValue - The input value to be formatted.
 * @param {Object} options.planKpiConfig - Configuration object for KPI settings.
 * @param {string} options.metricKey - The key identifying the metric to format.
 */
export const getEditableValue = ({
  inputValue,
  planKpiConfig,
  metricKey,
  defaultValue,
  version
}) => {
  const { round_off: roundOff, point_variance_list: pointVarianceList = [] } =
    planKpiConfig[metricKey] || {};

  if (pointVarianceList.includes(version)) {
    return defaultValue.toFixed(roundOff);
  }
  return (String(inputValue).replace(/(?!^-)[^\d.]/g, "") || "")
    .replace(/(\..*)\./g, "")
    .toLocaleString(undefined, {
      maximumFractionDigits: roundOff
    });
};

export const getFormattedValue = ({
  inputValue,
  defaultValue,
  varianceList,
  version,
  planKpiConfig,
  metricKey,
  isContributionCol,
  fromAddVersion
}) => {
  const {
    type,
    round_off: roundOff,
    symbol,
    point_variance_list: pointVarianceList = []
  } = planKpiConfig[metricKey] || {};

  const formattedValue = inputValue ? inputValue : 0;

  // TODO: Need to refactor
  if (
    ((fromAddVersion
      ? version.includes(PERCENTAGE_SYMBOL)
      : varianceList.includes(version)) &&
      !pointVarianceList.includes(version)) ||
    isContributionCol
  ) {
    return `${formattedValue?.toFixed(roundOff)}%`;
  } else if (
    fromAddVersion
      ? version.includes(PERCENTAGE_SYMBOL)
      : varianceList.includes(version) && pointVarianceList.includes(version)
  ) {
    return defaultValue
      ? defaultValue.toFixed(roundOff)
      : inputValue.toFixed(roundOff);
  }

  let formattedValueString = formattedValue.toLocaleString(undefined, {
    maximumFractionDigits: roundOff
  });

  if (type === DOLLAR && symbol !== null) {
    return `${symbol}${formattedValueString}`;
  } else if (type === PERCENTAGE && symbol !== null) {
    formattedValueString = Number(formattedValue).toFixed(roundOff);
    return `${formattedValueString}${symbol}`;
  }

  return formattedValueString;
};

export const getPrimaryColAccessor = (colAccessor) => {
  let primaryAccessor = colAccessor;
  if (colAccessor.endsWith(CHANNEL_CLASS_CONTRIBUTION)) {
    primaryAccessor = colAccessor.slice(
      0,
      colAccessor.indexOf(CHANNEL_CLASS_CONTRIBUTION)
    );
  } else if (colAccessor.endsWith(CLASS_CONTRIBUTION)) {
    primaryAccessor = colAccessor.slice(
      0,
      colAccessor.indexOf(CLASS_CONTRIBUTION)
    );
  }
  return primaryAccessor;
};

export const getContributionCells = (colAccessor, rowIndex) => {
  const contributions = { [colAccessor]: rowIndex };
  const primaryColAccessor = getPrimaryColAccessor(colAccessor);

  if (colAccessor.includes("Total")) {
    // add contribution for total column
    if (colAccessor.endsWith(CLASS_CONTRIBUTION)) {
      contributions[primaryColAccessor] = rowIndex;
    } else {
      contributions[`${colAccessor}${CLASS_CONTRIBUTION}`] = rowIndex;
    }
  } else {
    // add contribution for non-total column
    if (colAccessor.endsWith(CHANNEL_CLASS_CONTRIBUTION)) {
      contributions[primaryColAccessor] = rowIndex;
      contributions[`${primaryColAccessor}${CLASS_CONTRIBUTION}`] = rowIndex;
    } else if (colAccessor.endsWith(CLASS_CONTRIBUTION)) {
      contributions[primaryColAccessor] = rowIndex;
      contributions[
        `${primaryColAccessor}${CHANNEL_CLASS_CONTRIBUTION}`
      ] = rowIndex;
    } else {
      contributions[`${colAccessor}${CLASS_CONTRIBUTION}`] = rowIndex;
      contributions[`${colAccessor}${CHANNEL_CLASS_CONTRIBUTION}`] = rowIndex;
    }
  }
  return contributions;
};

export const getChannelDependantCells = (
  colAccessor,
  rowIndex,
  updatedLockedCells,
  channelRollUpMapping,
  channelRollDownMapping
) => {
  let dependants = {};
  const primaryColAccessor = getPrimaryColAccessor(colAccessor);
  const isChannelChild = channelRollUpMapping.hasOwnProperty(colAccessor);
  const isChannelParent = channelRollDownMapping.hasOwnProperty(colAccessor);

  if (isChannelParent) {
    const rollDownChannels = channelRollDownMapping[primaryColAccessor];
    const allChildLocked = rollDownChannels.every(
      (cell) =>
        updatedLockedCells[cell] && updatedLockedCells[cell].includes(rowIndex)
    );
    const isParentLocked = get(
      updatedLockedCells,
      primaryColAccessor,
      []
    ).includes(rowIndex);
    if (allChildLocked) {
      for (let colKey of rollDownChannels) {
        dependants = {
          ...dependants,
          ...getContributionCells(colKey, rowIndex)
        };
      }
    } else if (isParentLocked) {
      const childLockCount = rollDownChannels.reduce((acc, cell) => {
        if (
          updatedLockedCells[cell] &&
          updatedLockedCells[cell].includes(rowIndex)
        ) {
          acc++;
        }
        return acc;
      }, 0);
      if (childLockCount === rollDownChannels.length - 1) {
        for (let colKey of rollDownChannels) {
          dependants = {
            ...dependants,
            ...getContributionCells(colKey, rowIndex)
          };
        }
      }
    }
  }

  if (isChannelChild) {
    const rollUpChannel = channelRollUpMapping[primaryColAccessor];
    const rollDownChannels = channelRollDownMapping[rollUpChannel];
    const parentColAccessor = rollUpChannel[0];
    const allChildLocked = rollDownChannels.every(
      (cell) =>
        updatedLockedCells[cell] && updatedLockedCells[cell].includes(rowIndex)
    );
    const isParentLocked = get(
      updatedLockedCells,
      parentColAccessor,
      []
    ).includes(rowIndex);

    if (allChildLocked) {
      dependants = {
        ...dependants,
        ...getContributionCells(parentColAccessor, rowIndex)
      };
    } else if (isParentLocked) {
      const childLockCount = rollDownChannels.reduce((acc, cell) => {
        if (
          updatedLockedCells[cell] &&
          updatedLockedCells[cell].includes(rowIndex)
        ) {
          acc++;
        }
        return acc;
      }, 0);
      if (childLockCount === rollDownChannels.length - 1) {
        for (let colKey of rollDownChannels) {
          dependants = {
            ...dependants,
            ...getContributionCells(colKey, rowIndex)
          };
        }
      }
    }
  }
  return dependants;
};

const setTimelineDependantCells = ({
  changedColAccessor,
  changedRowIndex,
  updatedLockedCells,
  data,
  tableRowData,
  action,
  rowDataInxMapping,
  valueByColumnValueKey
}) => {
  let dependants = {};
  const isChild = data.hasOwnProperty(PARENT_INDEX);
  if (isChild) {
    const parentIndex = get(data, PARENT_INDEX, null);
    const parentData = get(tableRowData, parentIndex, {});
    const childrenIndexes = get(parentData, CHILD_INDEX, []);
    const allChildLocked = childrenIndexes.every(
      (cell) =>
        updatedLockedCells[changedColAccessor] &&
        updatedLockedCells[changedColAccessor].includes(cell)
    );
    const isParentLocked = get(
      updatedLockedCells,
      changedColAccessor,
      []
    ).includes(parentIndex);

    if (allChildLocked) {
      dependants = {
        ...dependants,
        ...getContributionCells(changedColAccessor, parentIndex)
      };
      updateLockUnlockStatus({
        cellList: dependants,
        updatedLockedCells,
        action,
        data,
        rowDataInxMapping,
        valueByColumnValueKey
      });
    } else if (isParentLocked) {
      const childLockCount = childrenIndexes.reduce((acc, cell) => {
        if (
          updatedLockedCells[changedColAccessor] &&
          updatedLockedCells[changedColAccessor].includes(cell)
        ) {
          acc++;
        }
        return acc;
      }, 0);
      if (childLockCount === childrenIndexes.length - 1) {
        for (let index of childrenIndexes) {
          dependants = {
            ...dependants,
            ...getContributionCells(changedColAccessor, index)
          };
          updateLockUnlockStatus({
            cellList: dependants,
            updatedLockedCells,
            action,
            data,
            rowDataInxMapping,
            valueByColumnValueKey
          });
        }
      }
    }
  } else {
    const parentIndex = changedRowIndex;
    const childrenIndexes = get(data, CHILD_INDEX, []);
    const allChildLocked = childrenIndexes.every(
      (cell) =>
        updatedLockedCells[changedColAccessor] &&
        updatedLockedCells[changedColAccessor].includes(cell)
    );
    const isParentLocked = get(
      updatedLockedCells,
      changedColAccessor,
      []
    ).includes(parentIndex);
    if (allChildLocked) {
      for (let index of childrenIndexes) {
        dependants = {
          ...dependants,
          ...getContributionCells(changedColAccessor, index)
        };
        updateLockUnlockStatus({
          cellList: dependants,
          updatedLockedCells,
          action,
          data,
          rowDataInxMapping,
          valueByColumnValueKey
        });
      }
    } else if (isParentLocked) {
      const childLockCount = childrenIndexes.reduce((acc, cell) => {
        if (
          updatedLockedCells[changedColAccessor] &&
          updatedLockedCells[changedColAccessor].includes(cell)
        ) {
          acc++;
        }
        return acc;
      }, 0);
      if (childLockCount === childrenIndexes.length - 1) {
        for (let index of childrenIndexes) {
          dependants = {
            ...dependants,
            ...getContributionCells(changedColAccessor, index)
          };
          updateLockUnlockStatus({
            cellList: dependants,
            updatedLockedCells,
            action,
            data,
            rowDataInxMapping,
            valueByColumnValueKey
          });
        }
      }
    }
  }
  return dependants;
};

const getRowsWithKpiDependantCells = ({
  lockedRows,
  data,
  action,
  rowIndex,
  rowDataInxMapping,
  valueByColumnValueKey
}) => {
  const columnKeys = valueByColumnValueKey.filter(
    (key) => key !== PLAN_VERSION
  );
  const columnsValues = getValueByColumnKeyUtil(columnKeys, data);

  const KPIRows = findIntersection(rowDataInxMapping, columnsValues);
  if (action === TOGGLE_LOCK_ACTION.LOCK) {
    return union([...lockedRows, rowIndex], KPIRows);
  }
  return difference(lockedRows, [...KPIRows, rowIndex]);
};

function updateLockUnlockStatus({
  cellList,
  updatedLockedCells,
  action,
  data,
  rowDataInxMapping,
  valueByColumnValueKey
}) {
  for (const key in cellList) {
    const lockedRows = get(updatedLockedCells, key, []);
    const updatedRowIndexes = getRowsWithKpiDependantCells({
      lockedRows,
      data,
      action,
      rowIndex: cellList[key],
      rowDataInxMapping,
      valueByColumnValueKey
    });
    if (updatedLockedCells[key] && !updatedRowIndexes.length) {
      delete updatedLockedCells[key];
    } else {
      updatedLockedCells[key] = updatedRowIndexes;
    }
  }
}

export const handleCellLock = ({
  colDef,
  data,
  tableRowData,
  lockedCells,
  setLockedCells,
  action,
  channelRollUpMapping,
  channelRollDownMapping,
  rowDataInxMapping,
  valueByColumnValueKey
}) => {
  const changedColAccessor = colDef?.accessor;
  const changedRowIndex = data?.index;
  const updatedLockedCells = Object.assign({}, lockedCells);

  // update lock/unlock status for contribution cells
  const contributionCells = getContributionCells(
    changedColAccessor,
    changedRowIndex
  );
  updateLockUnlockStatus({
    cellList: contributionCells,
    updatedLockedCells,
    action,
    data,
    rowDataInxMapping,
    valueByColumnValueKey
  });

  const channelDependantCells = getChannelDependantCells(
    changedColAccessor,
    changedRowIndex,
    updatedLockedCells,
    channelRollUpMapping,
    channelRollDownMapping
  );
  updateLockUnlockStatus({
    cellList: channelDependantCells,
    updatedLockedCells,
    action,
    data,
    rowDataInxMapping,
    valueByColumnValueKey
  });

  setTimelineDependantCells({
    changedColAccessor,
    changedRowIndex,
    updatedLockedCells,
    data,
    colDef,
    tableRowData,
    action,
    rowDataInxMapping,
    valueByColumnValueKey
  });

  setLockedCells(updatedLockedCells);
};

const extractContributionFlags = (colDef) => {
  return {
    isChannelContribution: get(colDef, "extra.channel_contribution", false),
    isProductHierarchyContribution: get(
      colDef,
      `extra.${PRODUCT_HIERARCHY_CONTRIBUTION_KEY}`,
      false
    ),
    isTotalProductHierarchyContr: get(
      colDef,
      `extra.${PRODUCT_TOTAL_CONTRIBUTION_KEY}`,
      false
    )
  };
};

const isConditionMetInAnyChannel = (channelDetails, key) => {
  let conditionCheck = false;
  Object.keys(channelDetails).forEach((channel) => {
    conditionCheck =
      conditionCheck || get(channelDetails, [channel, key], false);
  });
  return conditionCheck;
};

export const editableValidation = (params, kpiConfig, extraProps = {}) => {
  const {
    colDef,
    data,
    editMode,
    varianceList,
    valueByColumnValueKey = [],
    varianceMapping,
    planActualizedWeeks,
    planDetails
  } = params;

  const { currentVersion = "" } = extraProps;

  const { fromAddVersion } = data || {};

  // TODO: Need refactor
  let version = get(data, "plan_version", "");
  const parent_index = get(data, PARENT_INDEX, -1);
  let channel = get(colDef, "extra.channel", "");
  const isContributionCol = get(colDef, "extra.contribution", false);
  const isColumnEditable = get(colDef, "extra.isEditable", false);
  const isColDefFirstWeek = get(colDef, "extra.is_first_week", false);
  const editable = get(kpiConfig, EDITABLE_KEY, {});
  const visible = get(kpiConfig, VERSION_KEY, {});
  const isChannelTotal = get(colDef, "extra.channel_total", false);

  const category = get(colDef, "extra.category", []);
  const timeline = get(colDef, "extra.timeline", "");

  //planActualizedWeeks is an object with all the timeline keys so using it to get timeline key from category
  const timeCategory = category.filter((key) => planActualizedWeeks[key]);
  const planActualizedWeeksForTimeCategory = get(
    planActualizedWeeks,
    timeCategory,
    []
  );

  //for grand total the planActualizedWeeksForTimeCategory will be boolean so using the same
  let isActualized = isArray(planActualizedWeeksForTimeCategory)
    ? planActualizedWeeksForTimeCategory.includes(timeline)
    : planActualizedWeeksForTimeCategory;

  if (NON_ACTUALIZED_PLAN_STATUS.includes(planDetails.status)) {
    isActualized = false;
  }

  const channelConfig = get(editable[version], channel, {});

  const isKpiConfigFirstWeekEditable =
    isChannelTotal && editable[version]
      ? Object.values(editable[version]).some(
          (item) => item.first_week_editable === true
        )
      : get(channelConfig, "first_week_editable", false);

  // TODO: remove this when business unit is added to column config
  if (get(channelBusinessUnitMapping, channel, false)) {
    channel = channelBusinessUnitMapping[channel];
  }

  const isVarianceRow = fromAddVersion
    ? version.includes(PERCENTAGE_SYMBOL) // TODO: Need refactor
    : varianceList.includes(version);
  version = isVarianceRow ? version : fromAddVersion ? currentVersion : version;
  const visibleDeStructure = channel ? [channel, VERSION_KEY] : [VERSION_KEY];
  const varianceDeStructure = channel
    ? [channel, VARIANCE_KEY]
    : [VARIANCE_KEY];
  const editableDeStructure = channel
    ? [channel, EDITABLE_KEY]
    : [EDITABLE_KEY];

  /**
   * this check for making Department class kpi version non editable
   */
  if (["kpi", ...valueByColumnValueKey].includes(colDef.accessor)) {
    return {
      shouldRenderInputCell: false,
      displayStaticValue: null
    };
  }

  /**
   * if the column is contribution and row is variance then we should not show the value
   */
  if (isContributionCol && isVarianceRow) {
    return {
      shouldRenderInputCell: false,
      displayStaticValue: ""
    };
  }

  /**
   * this condition is for variance row
   */
  if (isVarianceRow) {
    // TODO: Need refactor
    const mappedVersion = fromAddVersion
      ? LY_VERSION
      : varianceMapping[version];
    const mappedVersionVisibleChannelDetails = visible[mappedVersion];
    const mappedVersionEditableChannelDetails = editable[mappedVersion];
    const isMappedVersionVisible =
      Object.keys(mappedVersionVisibleChannelDetails).length > 0;
    const isMappedVersionEditable =
      Object.keys(mappedVersionEditableChannelDetails).length > 0;
    const isMappedVersionVisibleChannelEligibility = isChannelTotal
      ? isMappedVersionVisible
      : get(mappedVersionVisibleChannelDetails, visibleDeStructure, false);
    const isMappedVersionEditableChannelEligibility = isChannelTotal
      ? isMappedVersionEditable
      : get(mappedVersionEditableChannelDetails, varianceDeStructure, false);
    const isVarianceEditable = isChannelTotal
      ? isConditionMetInAnyChannel(
          mappedVersionEditableChannelDetails,
          VARIANCE_KEY
        )
      : get(mappedVersionEditableChannelDetails, varianceDeStructure, false);
    /**
     * below condition for Eligibility check for map version example if variance is Var LY% than mapped version LY below check is for LY
     *
     */
    if (isMappedVersionVisible && isMappedVersionVisibleChannelEligibility) {
      if (
        fromAddVersion || // TODO: Need refactor
        !editMode ||
        (isKpiConfigFirstWeekEditable && !isColDefFirstWeek) ||
        !isColumnEditable
      ) {
        return {
          shouldRenderInputCell: false,
          displayStaticValue: null
        };
      }
      if (
        isMappedVersionEditable &&
        isMappedVersionEditableChannelEligibility
      ) {
        return {
          shouldRenderInputCell: isVarianceEditable && !isActualized,
          displayStaticValue: null
        };
      }

      return {
        shouldRenderInputCell: false,
        displayStaticValue: null
      };
    }
    return {
      shouldRenderInputCell: false,
      displayStaticValue: STATIC_VALUE
    };
  }
  const visibleChannelDetails = visible[version] || {};
  const editableChannelDetails = editable[version] || {};
  const isVersionVisible = Object.keys(visibleChannelDetails).length > 0;
  const isVersionEditable = Object.keys(editableChannelDetails).length > 0;
  const isVersionVisibleChannelEligibility = isChannelTotal
    ? isVersionVisible
    : get(visibleChannelDetails, visibleDeStructure, false);
  const isVersionEditableChannelEligibility = isChannelTotal
    ? isVersionEditable
    : get(editableChannelDetails, editableDeStructure, false);

  if (!isVersionVisible) {
    return {
      shouldRenderInputCell: false,
      displayStaticValue: null
    };
  }

  const {
    isChannelContribution,
    isProductHierarchyContribution,
    isTotalProductHierarchyContr
  } = extractContributionFlags(colDef);

  if (isChannelContribution) {
    const channelEditable = get(
      editableChannelDetails,
      channel
        ? [channel, CLASS_CHANNEL_CONTRIBUTION_KEY]
        : [CLASS_CHANNEL_CONTRIBUTION_KEY],
      false
    );
    const channelVisible = get(
      visibleChannelDetails,
      channel
        ? [channel, CLASS_CHANNEL_CONTRIBUTION_KEY]
        : [CLASS_CHANNEL_CONTRIBUTION_KEY],
      false
    );
    return {
      shouldRenderInputCell:
        channelVisible &&
        channelEditable &&
        (isKpiConfigFirstWeekEditable ? isColDefFirstWeek : true) &&
        isColumnEditable &&
        !isActualized,
      displayStaticValue: channelVisible ? null : STATIC_VALUE
    };
  } else if (isProductHierarchyContribution) {
    const classEditable = get(
      editableChannelDetails,
      channel
        ? [channel, CLASS_CLASS_CONTRIBUTION_KEY]
        : [CLASS_CLASS_CONTRIBUTION_KEY],
      false
    );
    const classVisible = get(
      visibleChannelDetails,
      channel
        ? [channel, CLASS_CLASS_CONTRIBUTION_KEY]
        : [CLASS_CLASS_CONTRIBUTION_KEY],
      false
    );
    return {
      shouldRenderInputCell:
        classEditable &&
        classVisible &&
        parent_index > -1 &&
        (isKpiConfigFirstWeekEditable ? isColDefFirstWeek : true) &&
        isColumnEditable &&
        !isActualized,
      displayStaticValue:
        classVisible && parent_index > -1 ? null : STATIC_VALUE
    };
  } else if (isTotalProductHierarchyContr) {
    const classEditable = isConditionMetInAnyChannel(
      editableChannelDetails,
      CLASS_DEPT_CONTRIBUTION_KEY
    );

    const classVisible = isConditionMetInAnyChannel(
      visibleChannelDetails,
      CLASS_DEPT_CONTRIBUTION_KEY
    );
    return {
      shouldRenderInputCell:
        classEditable &&
        classVisible &&
        parent_index > -1 &&
        (isKpiConfigFirstWeekEditable ? isColDefFirstWeek : true) &&
        isColumnEditable &&
        !isActualized,
      displayStaticValue:
        classVisible && parent_index > -1 ? null : STATIC_VALUE
    };
  }

  //TODO: Need to refactor
  const editableCheck = fromAddVersion
    ? false
    : isChannelTotal
    ? isConditionMetInAnyChannel(editableChannelDetails, EDITABLE_KEY)
    : isVersionEditableChannelEligibility;
  const visibleCheck = isChannelTotal
    ? isConditionMetInAnyChannel(visibleChannelDetails, VERSION_KEY)
    : isVersionVisibleChannelEligibility;

  return {
    shouldRenderInputCell:
      editableCheck &&
      visibleCheck &&
      (isKpiConfigFirstWeekEditable ? isColDefFirstWeek : true) &&
      isColumnEditable &&
      !isActualized,
    displayStaticValue: visibleCheck ? null : STATIC_VALUE
  };
};

export const validateContribution = ({
  colDef,
  kpiConfig,
  parentIndex,
  version,
  channel
}) => {
  const {
    isChannelContribution,
    isProductHierarchyContribution,
    isTotalProductHierarchyContr
  } = extractContributionFlags(colDef);

  const visible = get(kpiConfig, VERSION_KEY, {});
  const visibleChannelDetails = visible[version] || {};

  if (isChannelContribution) {
    const channelVisible = get(
      visibleChannelDetails,
      channel
        ? [channel, CLASS_CHANNEL_CONTRIBUTION_KEY]
        : [CLASS_CHANNEL_CONTRIBUTION_KEY],
      false
    );
    return channelVisible ? null : STATIC_VALUE;
  } else if (isProductHierarchyContribution) {
    const classVisible = get(
      visibleChannelDetails,
      channel
        ? [channel, CLASS_CLASS_CONTRIBUTION_KEY]
        : [CLASS_CLASS_CONTRIBUTION_KEY],
      false
    );
    return classVisible && parentIndex > -1 ? null : STATIC_VALUE;
  } else if (isTotalProductHierarchyContr) {
    const classVisible = isConditionMetInAnyChannel(
      visibleChannelDetails,
      CLASS_DEPT_CONTRIBUTION_KEY
    );
    return classVisible && parentIndex > -1 ? null : STATIC_VALUE;
  }
};

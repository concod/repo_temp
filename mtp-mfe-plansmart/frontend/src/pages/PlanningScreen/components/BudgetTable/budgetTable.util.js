import { get } from "lodash";
import Tabbing from "./Tabbing.util";
import redrawBudgetTable from "../../../../utils/redrawBudgetTable.util";
import flashEditedCells from "../../../../utils/flashCells.util";
import {
  setBudgeTableRowData,
  setCalculationUUID,
  setIsUpdatePlanEnabled,
  setIsEditActionsEnabled,
  setIsAllColumnCollapse,
  setIsWrittenKpiEdited
} from "../../slice/planningScreen.slice";
import { DEBOUNCE_DELAY } from "./constants";

const getChangedCellValue = (
  userEnteredValue,
  totalValue,
  beforeUserEnteredValue
) => {
  return {
    before_user_entered_value: beforeUserEnteredValue.toString(),
    user_entered_value: (userEnteredValue / 100) * totalValue
  };
};

export const getContributionValues = (
  cellProps,
  tableRows,
  columnsMap,
  changeDetected,
  changedColumnDef,
  productContributionParentMapping,
  channelContributionParentMapping,
  channelRollUpMapping,
  lockedCells
) => {
  let updatedChangedColumnDef;
  let parentIndex;
  let totalValue;
  let beforeUserEnteredValue;
  let updatedLockedCells = {};

  const parentProductKey = get(
    productContributionParentMapping,
    changedColumnDef.accessor
  );

  const { user_entered_value } = changeDetected;
  const changedIndex = cellProps.data.index;

  if (parentProductKey) {
    updatedChangedColumnDef = get(columnsMap, parentProductKey);
    parentIndex = get(cellProps.data, "parent_index");
    totalValue = get(tableRows[parentIndex], parentProductKey);
    beforeUserEnteredValue = get(tableRows[changedIndex], parentProductKey);

    updatedLockedCells = {
      ...lockedCells,
      [parentProductKey]: [
        ...(lockedCells[parentProductKey] || []),
        parentIndex
      ]
    };

    changeDetected = getChangedCellValue(
      user_entered_value,
      totalValue,
      beforeUserEnteredValue
    );
  } else {
    const childChannelKey = get(
      channelContributionParentMapping,
      changedColumnDef.accessor
    );

    if (childChannelKey) {
      const parentChannelKey = channelRollUpMapping[childChannelKey][0];

      updatedChangedColumnDef = get(columnsMap, childChannelKey);
      totalValue = get(tableRows[changedIndex], parentChannelKey);
      beforeUserEnteredValue = get(tableRows[changedIndex], childChannelKey);

      updatedLockedCells = {
        ...lockedCells,
        [parentChannelKey]: [
          ...(lockedCells[parentChannelKey] || []),
          changedIndex
        ]
      };

      changeDetected = getChangedCellValue(
        user_entered_value,
        totalValue,
        beforeUserEnteredValue
      );
    }
  }

  return {
    updatedChangedCellData: changeDetected,
    updatedChangedColumnDef: updatedChangedColumnDef,
    updatedLockedCells: updatedLockedCells
  };
};

const findColumnIndex = (columnId, editableAndNonHiddenColumnDefs) =>
  editableAndNonHiddenColumnDefs?.findIndex((col) => {
    return col.colId === columnId;
  });

export const customTabFunction = (() => {
  let isTabbing = false;

  return ({
    column,
    instance,
    event,
    planDetails,
    kpiConfigV2,
    varianceList,
    varianceMapping,
    lockedCells
  }) => {
    const editableAndNonHiddenColumnDefs = instance?.columnApi
      ?.getAllColumns()
      ?.filter((col) => col?.colDef?.is_editable && !col?.colDef?.is_hidden);

    const currentColInx = findColumnIndex(
      column?.colId,
      editableAndNonHiddenColumnDefs
    );
    const currentRowIndex = instance?.node?.rowIndex;

    const currentColDef = editableAndNonHiddenColumnDefs[currentColInx];
    const cellHTMLElement = instance?.api?.rowModel?.beans?.rowRenderer?.rowCtrlsByRowIndex[
      currentRowIndex
    ]?.getCellElement(currentColDef);

    if (cellHTMLElement?.querySelector("input") === null) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (isTabbing && event?.key === "Tab") {
      event.preventDefault();
      return true;
    }

    isTabbing = true;
    const tabbingObj = new Tabbing({
      event,
      column,
      instance,
      lockedCells,
      currentColInx,
      editableAndNonHiddenColumnDefs,
      currentRowIndex
    });

    if (event?.key === "Tab" && !event?.shiftKey) {
      tabbingObj.forwardTabbing();
    } else if (event?.key === "Tab" && event?.shiftKey) {
      tabbingObj.reverseTabbing();
    }

    setTimeout(() => {
      isTabbing = false;
    }, DEBOUNCE_DELAY);

    return true;
  };
})();
export const addGroupingMenuItems = (
  columnMenuItems,
  gridOptions,
  colDef,
  dispatch
) => {
  //grid Expand - row Grouping columns
  if (colDef?.rowGroup) {
    columnMenuItems.push({
      name: "Expand All",
      disabled: !!gridOptions.isGroupOpenByDefault,
      action: () => {
        gridOptions.api.forEachNode((node) => {
          if (node.group) {
            node.setExpanded(true);
            gridOptions.isGroupOpenByDefault = true;
          }
        });
      }
    });
  }

  //grid Collapse - row Grouping columns
  gridOptions.columnDefs.forEach((field) => {
    if (colDef?.rowGroup && colDef?.accessor === field.accessor) {
      columnMenuItems.push({
        name: "Collapse All",
        disabled: false,
        action: () => {
          gridOptions.api.forEachNode((node) => {
            if (node.group && node.field === field.accessor) {
              node.setExpanded(false);
              gridOptions.isGroupOpenByDefault = false;
            }
          });
        }
      });
    }
  });

  //grid Expand/Collapse All - Time Hierarchy columns
  const toggleAllGroups = (isOpen) => {
    const displayedGroups = Object.values(
      gridOptions.columnApi.columnModel.displayedColumnsAndGroupsMap
    );
    displayedGroups.forEach((group) => {
      gridOptions.columnApi.setColumnGroupState([
        { groupId: group.groupId, open: isOpen }
      ]);
    });
    dispatch(setIsAllColumnCollapse(isOpen));
  };

  if (colDef?.extra?.channel_total) {
    columnMenuItems.push({
      name: "Expand All",
      disabled: false,
      action: () => {
        toggleAllGroups(false);
      }
    });

    columnMenuItems.push({
      name: "Collapse All",
      disabled: false,
      action: () => {
        toggleAllGroups(true);
      }
    });
  }
};

export const handleApiResponse = ({
  result,
  tableRows,
  tableRef,
  dispatch
}) => {
  const changedRowsWithInx = get(result, `data.data.changedRowsWithInx`, {});
  const refreshCells = get(result, `data.data.refreshCells`, {});

  const isWrittenKpiEdited = get(result, `data.data.isWrittenKpiEdited`, false);
  const updatedRowData = tableRows.map((row, index) => ({
    ...row,
    ...(changedRowsWithInx[index] || {})
  }));

  const isUpdatePlanEnabled = get(
    result,
    `data.data.isEnableUpdatePlan`,
    false
  );
  const isEditActionsEnabled = get(
    result,
    "data.data.is_edit_actions_enabled",
    false
  );
  const calculationUUID = get(result, `data.data.session_id`, null);

  dispatch(setBudgeTableRowData(updatedRowData));
  redrawBudgetTable({ tableRef, rowData: refreshCells.rowData });
  flashEditedCells({ tableRef, newRefreshCells: refreshCells });
  dispatch(setIsUpdatePlanEnabled(isUpdatePlanEnabled));
  dispatch(setIsEditActionsEnabled(isEditActionsEnabled));
  dispatch(setCalculationUUID(calculationUUID));

  if (isWrittenKpiEdited) {
    dispatch(setIsWrittenKpiEdited(isWrittenKpiEdited));
  }
};

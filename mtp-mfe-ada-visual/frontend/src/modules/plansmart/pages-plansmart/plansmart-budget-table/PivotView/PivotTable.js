import { get } from "lodash";
import { planSmartPivotLoaderSelector } from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";
import React, { useEffect } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import PivotSidePanel from "./PivotSidePanel";

function PivotTable({
  columns,
  rowData,
  pivotTableRef,
  pivotLoader,
  hierarchyKeys,
  filterObj,
  updateFilter,
}) {
  useEffect(() => {
    const pivotTableCurrent = pivotTableRef?.current?.props?.gridOptions;
    if (pivotTableCurrent) {
      pivotTableCurrent?.api?.addEventListener(
        "columnRowGroupChanged",
        columnRowGroupChanged
      );
    }

    return () =>
      pivotTableCurrent?.api?.removeEventListener(
        "columnRowGroupChanged",
        columnRowGroupChanged
      );
  }, []);

  const autoGroupColumnDef = {
    headerName: "",
    width: 200,
  };

  const columnRowGroupChanged = (columnDetails) => {
    const newGroupedColumnList = columnDetails.columns.map(
      (column) => column.colId
    );
    const allColumns = columnDetails.columnApi.getAllColumns();
    const allColumnIdList = allColumns.map((column) => column.colId);
    const showColumnList = [];
    const hideColumnList = [];
    allColumnIdList.forEach((colId) => {
      if (newGroupedColumnList.indexOf(colId) > -1) {
        hideColumnList.push(colId);
      } else {
        showColumnList.push(colId);
      }
    });
    columnDetails.columnApi.setColumnsVisible(showColumnList, true);
    columnDetails.columnApi.setColumnsVisible(hideColumnList, false);
  };

  const customAggFunction = (instance) => {
    const columnName = instance?.column?.colId;
    const groupedByKey = get(instance, "rowNode.key", "");
    const nodeData = get(instance, "rowNode.allLeafChildren[0].data", {});
    if (nodeData && nodeData[groupedByKey]) {
      if (typeof nodeData[groupedByKey][columnName] === "number") {
        return parseFloat(nodeData[groupedByKey][columnName]).toFixed(2);
      }
      return "";
    } else if (nodeData && nodeData[`${groupedByKey}_inx`] >= 0) {
      const hierarchyInx = nodeData[`${groupedByKey}_inx`];
      return parseFloat(
        nodeData[`${hierarchyKeys[hierarchyInx]}_value`][columnName]
      ).toFixed(2);
    } else {
      return "";
    }
  };

  const noEditableCustomCellRender = (cellProps) => {
    if (typeof cellProps.value === "number") {
      return parseFloat(cellProps.value).toFixed(2);
    }
    return cellProps.value;
  };

  if (pivotLoader) {
    return null;
  }

  function isExternalFilterPresent() {
    return true;
  }

  function doesExternalFilterPass(node) {
    let isPass = true;
    const nodeData = node.data;
    Object.keys(filterObj).forEach((filterKey) => {
      if (filterObj[filterKey].groupedFilter) {
        const groupKeys = filterObj[filterKey].groupKeys;
        const valueKey = filterObj[filterKey].valueKey;
        const nodeGroupData = groupKeys
          .map((groupKey) => nodeData[groupKey])
          .join(".");
        const nodeValueData = nodeData[valueKey];
        const selectedOptions = get(
          filterObj[filterKey],
          `filterDetails.${nodeGroupData}.selectedOptions`,
          []
        );
        const isValuePresent = selectedOptions.some(
          (option) => option.value === nodeValueData
        );
        if (isPass) isPass = isValuePresent;
      } else {
        const selectedOptions = filterObj[filterKey].selectedOptions || [];
        const isValuePresent = selectedOptions.some(
          (option) => option.value === nodeData[filterKey]
        );
        if (isPass) isPass = isValuePresent;
      }
    });
    return isPass;
  }

  return (
    <div>
      <AgGridComponent
        autoGroupColumnDef={autoGroupColumnDef}
        tableRef={pivotTableRef}
        columns={columns}
        rowdata={rowData}
        minWidth={200}
        isExternalFilterPresent={isExternalFilterPresent}
        doesExternalFilterPass={doesExternalFilterPass}
        showSaveTableConfig={false}
        uniqueRowId="uniqueId"
        rowGroupPanelShow="always"
        groupDefaultExpanded={1}
        customSideBar={[
          {
            id: "filter",
            labelDefault: "Filters",
            labelKey: "filters",
            iconKey: "filter",
            toolPanel: PivotSidePanel,
            height: 600,
            minHeight: 600,
            maxHeight: 600,
            toolPanelParams: {
              filters: filterObj,
              updateFilters: updateFilter,
            },
          },
        ]}
      />
    </div>
  );
}

const mapState = (state) => {
  return {
    pivotLoader: planSmartPivotLoaderSelector(state),
  };
};

export default connect(mapState)(PivotTable);

import React from "react";
import { cloneDeep } from "lodash";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import AddActionButton from "modules/inventorysmart/components/ui-actions/AddActionButton";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import {
  applyActionColumnLayout,
  renderParentDash,
  renderReadOnlyConstraintValue,
  wrapColumnsWithEmptyCell,
} from "../landing-screen/constraintsCommonUtils";
import {
  formatMinDistributionDisplayValue,
  PRODUCT_TYPE_COLUMN_LABEL,
  hasNestedStyleSizeMinDistribution,
} from "./createNewRuleConstraintsUtils";
import UpViewIcon from "assets/up_view.svg";
import { renderRuleTypeStatusBadge } from "./ruleTypeCellRenderer";
import { getSizeBasedonRowHeight } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";

const RULE_TYPE_COLUMN = "rule_type";

const CONSTRAINT_COLUMN_NAMES = [
  "wos",
  "st",
  "min_stock",
  "max_stock",
  "category_minimum",
  "category_maximum",
  "start_date",
  "end_date",
];

const isConstraintColumn = (column) =>
  CONSTRAINT_COLUMN_NAMES.includes(column?.column_name) ||
  column?.extra?.isEditableConstraint;

/** SSRM tree child rows can report level 0; detect via parent/child shape. */
const isConstraintChildRow = (cellProps) => {
  const node = cellProps?.node;
  if (!node) {
    return false;
  }
  if (node.level > 0) {
    return true;
  }
  return Boolean(node.parent?.data?.data) && !node.data?.data;
};

const isConstraintParentRow = (cellProps) => {
  const node = cellProps?.node;
  if (!node) {
    return false;
  }
  return Array.isArray(node.data?.data) && !isConstraintChildRow(cellProps);
};

const applyNumericColumnStyles = (colDef) => {
  const nestedColumns = colDef?.children?.length
    ? colDef.children
    : colDef?.sub_headers;

  nestedColumns?.forEach(applyNumericColumnStyles);

  if (colDef?.type === "int" || colDef?.type === "float") {
    colDef.cellStyle = { ...colDef.cellStyle, textAlign: "right" };
    colDef.headerClass = `${colDef.headerClass || ""} ag-right-aligned-header`;
  }
};

const renderConstraintCell = (cellProps, extraProps, column, isEditEnabled) => {
  if (!isConstraintChildRow(cellProps)) {
    return renderParentDash(column);
  }

  if (!isEditEnabled) {
    return renderReadOnlyConstraintValue(cellProps, column);
  }

  return (
    <CellRenderers
      cellData={cellProps}
      column={column}
      extraProps={extraProps}
    />
  );
};

/**
 * Parent rows stay read-only; child rows use editable inputs (AllRulesTable parity).
 */
const applyConstraintColumnRenderer = (column, isEditEnabled) => {
  if (!isConstraintColumn(column)) {
    return;
  }

  column.extra = {
    ...column.extra,
    isEditableConstraint: true,
  };

  column.cellRenderer = (cellProps, extraProps) =>
    renderConstraintCell(cellProps, extraProps, column, isEditEnabled);

  if (column.column_name === "end_date") {
    column.disablePast = true;
  }
};

const applyEditableFlags = (column, isEditEnabled) => {
  if (!isConstraintColumn(column)) {
    column.is_editable = column?.is_editable && isEditEnabled;
  } else {
    applyConstraintColumnRenderer(column, isEditEnabled);
  }

  const nestedColumns = column?.children?.length
    ? column.children
    : column?.sub_headers;
  nestedColumns?.forEach((subColumn) =>
    applyEditableFlags(subColumn, isEditEnabled)
  );
};

const applyColumnRenderers = (data, options) => {
  const {
    isEditEnabled,
    handlersRef,
    minDistributionHandlersRef,
    inventorySmartClasses = {},
  } = options;

  if (
    data?.column_name === "rule_code" ||
    data?.column_name === "rule_id"
  ) {
    data.cellRenderer = "agGroupCellRenderer";
        data.cellRendererParams = {
          suppressPadding: true,
          suppressHorizontalWheelScroll: true,
          innerRenderer: (cellProps, extraProps) => {
            // Extract rule_id_status from the node data and pass it to the renderer
            const status = cellProps?.node?.data?.rule_id_status || 
                          cellProps?.data?.rule_id_status || 
                          null;
                        
            return (
              <CellRenderers
                cellData={cellProps}
                column={{ ...data, type: "ruleIdWithStatus" }}
                extraProps={{ ...extraProps, status }}
              />
            );
          }
        };
    data.rowGroup = true;
  }
  if (data?.column_name === RULE_TYPE_COLUMN) {
    data.label = data.label || PRODUCT_TYPE_COLUMN_LABEL;
    data.headerName = data.headerName || PRODUCT_TYPE_COLUMN_LABEL;
    data.is_editable = false;
    data.is_hidden = false;
    data.cellRenderer = renderRuleTypeStatusBadge;
    data.cellClass = "cell-vertical-center-align";
  }
  if (data?.column_name === "rule_name") {
    data.is_hidden = false;
    data.is_editable = isEditEnabled;
    data.editable = (params) =>
      isConstraintParentRow(params) && isEditEnabled;
    data.valueGetter = (params) => {
      if (isConstraintChildRow(params)) {
        return null;
      }
      return params.data?.rule_name ?? "";
    };
    data.cellRenderer = (cellProps, extraProps) => {
      if (isConstraintChildRow(cellProps)) {
        return <></>;
      }
      const displayValue =
        cellProps.value ?? cellProps.data?.rule_name ?? "";
      const cellData = { ...cellProps, value: displayValue };
      if (!isEditEnabled) {
        return <div>{displayValue}</div>;
      }

      return (
          <CellRenderers
            cellData={cellData}
            column={data}
            extraProps={extraProps}
          />
      );
    };
  }
  if (data?.column_name === "min_distribution") {
    data.is_aggregated = false;
    data.width = 470;
    data.minWidth = 470;
    data.extra = { ...data.extra, width: 470 };
    data.valueGetter = (params) =>
      formatMinDistributionDisplayValue(params?.data);
    data.cellRenderer = (cellProps, extraProps) => {
      if (!isConstraintChildRow(cellProps)) {
        return renderParentDash(data);
      }
      const displayValue = formatMinDistributionDisplayValue(cellProps?.data);
      const nextCellProps = { ...cellProps, value: displayValue };
      const hasDetails = hasNestedStyleSizeMinDistribution(cellProps?.data);

      if (isEditEnabled) {
        return (
          <div className={inventorySmartClasses.minDistributionCell}>
            <div className={inventorySmartClasses.minDistributionCellContent}>
              <CellRenderers
                cellData={nextCellProps}
                column={data}
                extraProps={extraProps}
              />
            </div>
            {hasDetails && (
              <span
                role="button"
                onClick={() =>
                  minDistributionHandlersRef?.current?.openModal?.(cellProps)
                }
                className={inventorySmartClasses.minDistributionIconBtn}
                aria-label="View style and size details"
              >
                <UpViewIcon className={inventorySmartClasses.minDistributionIcon} />
              </span>
            )}
          </div>
        );
      }
      return renderReadOnlyConstraintValue(nextCellProps, data);
    };
    data.onClick = (tableInfo) => {
      minDistributionHandlersRef?.current?.openModal?.(tableInfo.cellData);
    };
  }
  if (data?.column_name === "action") {
    applyActionColumnLayout(data);
    data.cellRenderer = (params) => {
      if (isConstraintChildRow(params)) {
        return (
          <div>
            <DeleteActionButton
              iconOnly
              plainHover
              onClick={() => handlersRef.current.onDeleteClick(params)}
              disabled={
                !isEditEnabled ||
                params?.node?.parent?.data?.data?.length === 1 ||
                params?.node?.parent?.data?.is_default
              }
              size={getSizeBasedonRowHeight(params)}
            />
          </div>
        );
      }
      if (!isConstraintParentRow(params)) {
        return "";
      }
      return (
        <div>
          <AddActionButton
            iconOnly
            plainHover
            onClick={() => handlersRef.current.addChildRow(params)}
            disabled={
              !isEditEnabled ||
              params?.node?.data?.data?.length > 4 ||
              params?.node?.data?.is_default
            }
          />
        </div>
      );
    };
  }

  const nestedColumns = data?.children?.length
    ? data.children
    : data?.sub_headers;
  nestedColumns?.forEach((subColumn) =>
    applyColumnRenderers(subColumn, options)
  );
};

/**
 * Applies create-new-rule cell renderers and edit flags to rules_constraint_table columns.
 */
export function buildSetConstraintsColumns(rulesConstraintColDef, options) {
  const { showSingleMergedRows } = options;

  if (showSingleMergedRows) {
    return rulesConstraintColDef;
  }

  const colDefs = cloneDeep(rulesConstraintColDef);
  colDefs.forEach(applyNumericColumnStyles);
  colDefs.forEach((data) => {
    applyEditableFlags(data, options.isEditEnabled);
    applyColumnRenderers(data, options);
  });
  wrapColumnsWithEmptyCell(colDefs);
  return colDefs;
}

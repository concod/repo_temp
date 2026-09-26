import React, { useMemo, useRef } from "react";
import { BottomSheet, useTranslation } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { nonEditableCell } from "core/Utils/agGrid/table-functions";
import { getPackCountRowStyle } from "./constants";
import {
  ALLOC_QTY_GROUP,
  REMAINING_DC_ATA_GROUP,
} from "../constants/allocationEditConstants";
import { isMissingOrNull } from "../utils/allocationEditUtils";

const BREAKDOWN_COLUMN_NAMES = [
  "size",
  "opening_inventory",
  ALLOC_QTY_GROUP,
  REMAINING_DC_ATA_GROUP,
];

const LABEL_OVERRIDES = {
  [REMAINING_DC_ATA_GROUP]: "Available Quantity",
};

/**
 * Post-processing step applied after agGridColumnFormatter.
 * Walks the formatted column tree (using `children`, not `sub_headers`) and
 * forcefully removes every trace of editable rendering:
 *   - strips the "cell-renderer" CSS class that gives cells the blue look
 *   - sets editable=false so ag-Grid won't open an editor on click
 *   - replaces any existing cellRenderer (editable or otherwise) with the
 *     nonEditableCell renderer, matching the pattern used in ProductStoreDetailsTable
 */
function applyViewOnly(cols) {
  if (!cols) return;
  cols.forEach((col) => {
    col.is_editable = false;
    col.editable = false;
    if (typeof col.cellClass === "string") {
      col.cellClass = col.cellClass.replace("cell-renderer", "").trim();
    }
    if (col.cellRenderer && typeof col.cellRenderer !== "string") {
      const snapshot = col;
      col.cellRenderer = (cellProps) => nonEditableCell(snapshot, null, true)(cellProps);
    }
    if (col.children?.length) {
      applyViewOnly(col.children);
    }
  });
}

function applyNullHyphenOnLeaves(cols) {
  if (!cols) return;
  cols.forEach((col) => {
    if (col.children?.length) {
      applyNullHyphenOnLeaves(col.children);
      return;
    }
    const colName = col.column_name || col.field;
    if (!colName) return;
    const origGetter = col.valueGetter;
    const origRenderer = col.cellRenderer;
    col.valueGetter = (params) => {
      if (isMissingOrNull(params.data, colName)) return "-";
      return origGetter ? origGetter(params) : params.data?.[colName];
    };
    if (typeof origRenderer === "function") {
      col.cellRenderer = (params, extra) => {
        if (isMissingOrNull(params.data, colName)) return "-";
        return origRenderer(params, extra);
      };
    }
  });
}

/**
 * Extracts DC-specific columns from the full product-size-view table_config.
 *
 * For flat columns (e.g. "size"), includes as-is.
 * For DC-grouped columns (opening_inventory, allocated_quantity, remaining_dc_ata),
 * finds the sub-header matching the DC label and promotes its children to be
 * direct children of a renamed parent group.
 */
function buildDcColumns(tableConfig, dcName) {
  if (!tableConfig || !dcName) return [];

  const filtered = [];

  for (const colName of BREAKDOWN_COLUMN_NAMES) {
    const col = tableConfig.find((c) => c.column_name === colName);
    if (!col) continue;

    if (!col.sub_headers || col.sub_headers.length === 0) {
      filtered.push({ ...col, is_hidden: false, is_editable: false });
      continue;
    }
    

    //this case needs to be handled more gracefully because label can be different for and it should be handled by some non changing key.
    const dcSub = col.sub_headers.find((sub) => sub.label === dcName);
    if (!dcSub) continue;

    const overrideLabel = LABEL_OVERRIDES[colName];
    const packColumns = (dcSub.sub_headers || []).map((pack) => ({
      ...pack,
      is_hidden: false,
      is_editable: false,
      parent_id: [colName],
    }));

    filtered.push({
      ...col,
      label: overrideLabel || col.label,
      is_hidden: false,
      is_editable: false,
      is_master_group: true,
      sub_headers: packColumns,
    });
  }

  return filtered;
}

const DCBreakdownBottomSheet = ({
  open,
  onClose,
  dcName,
  tableConfig,
  tableData,
}) => {
  const { t } = useTranslation();
  const tableInstance = useRef(null);

  const columns = useMemo(() => {
    const dcConfig = buildDcColumns(tableConfig, dcName);
    const formatted = agGridColumnFormatter(dcConfig, null, null, null, null, true);
    applyViewOnly(formatted);
    applyNullHyphenOnLeaves(formatted);
    return formatted;
  }, [tableConfig, dcName]);

  const rows = tableData || [];

  const sheetTitle = dcName
    ? `${dcName} ${t("inventorysmart.finalize.recommendation.breakdown")}`
    : t("inventorysmart.finalize.recommendation.breakdown");

  return (
    <BottomSheet
      title={sheetTitle}
      size="medium"
      open={open}
      onClose={onClose}
    >
        <AgGridComponent
          columns={columns}
          rowdata={rows}
          uniqueRowId="size"
          tableHeader={t("inventorysmart.details")}
          sizeColumnsToFitFlag
          suppressFieldDotNotation
          pagination={false}
          getRowStyle={getPackCountRowStyle}
          loadTableInstance={(p) => {
            tableInstance.current = p;
          }}
          downloadAsExcel={rows.length > 0}
          showDownloadTooltip
          cardContainer={false}
          isInsideBottomSheet
          isBottomSheetExpanded={true}
        />
    </BottomSheet>
  );
};

export default DCBreakdownBottomSheet;

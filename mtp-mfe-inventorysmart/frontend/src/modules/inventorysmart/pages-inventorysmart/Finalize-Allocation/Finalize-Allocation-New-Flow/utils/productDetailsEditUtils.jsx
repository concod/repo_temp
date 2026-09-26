import React from "react";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  PRODUCT_ALLOC_QTY_GROUP,
  PRODUCT_NET_AVAILABLE_GROUP,
  PRODUCT_MAX_ALLOC_PCT_GROUP,
  EDITABLE_SUFFIXES,
  PACKS_SUFFIX,
  PACK_TYPE_EACHES,
  PACK_TYPE_PACKS,
  PACK_TYPE_LABELS,
} from "../constants/allocationEditConstants";
import { replaceColumnGroup } from "./allocationEditUtils";

/** True when a leaf column_name ends with an editable suffix (eaches / packs). */
const isEditableSuffix = (columnName) =>
  EDITABLE_SUFFIXES.some((suffix) => columnName.endsWith(suffix));

/** The pack_type sent for a leaf column, derived from its suffix. */
const packTypeForColumn = (columnName) =>
  columnName.endsWith(PACKS_SUFFIX) ? PACK_TYPE_PACKS : PACK_TYPE_EACHES;

/**
 * Walk the 3-level `hle_allocated_pack_qty` group and, in place:
 *  - force every leaf `is_editable = false` (view-mode default)
 *  - collect a flat list of the packs/eaches leaves that CAN become editable
 *
 * @param {Array} columns - formatted column defs (mutated in place)
 * @param {Array} dcDict  - dc_dict from the API response
 * @returns {{ editableLeaves: Array }}
 */
export const collectEditableAllocLeaves = (columns, dcDict) => {
  const editableLeaves = [];
  const allocGroup = columns.find(
    (c) => c.column_name === PRODUCT_ALLOC_QTY_GROUP
  );
  if (!allocGroup?.sub_headers) return { editableLeaves };

  allocGroup.sub_headers.forEach((dcHeader) => {
    const dcOption = dcDict?.find(
      (dc) => replaceSpecialCharacter(dc.label) === dcHeader.label
    );

    (dcHeader.sub_headers || []).forEach((leaf) => {
      leaf.is_editable = false;
      leaf.cellRenderer = null;

      if (isEditableSuffix(leaf.column_name)) {
        const typeLabel = PACK_TYPE_LABELS[packTypeForColumn(leaf.column_name)];
        editableLeaves.push({
          column_name: leaf.column_name,
          columnLabel: `${dcHeader.label} - ${typeLabel}`,
          dc_code: dcOption?.value || dcOption?.dc_code,
        });
      }
    });
  });

  return { editableLeaves };
};

/**
 * Toggle `is_editable` and `cellRenderer` on only the packs/eaches leaves.
 * pack_units and total are never touched — they stay read-only permanently.
 *
 * @param {Array}   columns            - current column defs (mutated in place)
 * @param {Array}   editableColumnKeys - column_name list from the editable leaves
 * @param {boolean} editable           - true to enable, false to disable
 */
export const setAllocLeafEditability = (
  columns,
  editableColumnKeys,
  editable
) => {
  const keySet = new Set(editableColumnKeys);
  const allocGroup = columns.find(
    (c) => c.column_name === PRODUCT_ALLOC_QTY_GROUP
  );
  if (!allocGroup?.sub_headers) return;

  allocGroup.sub_headers.forEach((dcHeader) => {
    (dcHeader.sub_headers || []).forEach((leaf) => {
      if (!keySet.has(leaf.column_name)) return;

      leaf.is_editable = editable;
      if (editable) {
        leaf.cellRenderer = (params, extraProps) => {
          if (
            !params.data ||
            !Object.prototype.hasOwnProperty.call(params.data, leaf.column_name)
          ) {
            return "-";
          }
          return (
            <CellRenderers
              cellData={params}
              column={leaf}
              extraProps={extraProps}
              actions={null}
            />
          );
        };
      } else {
        leaf.cellRenderer = null;
      }
    });
  });
};

/**
 * Build `allocation_updates` for a product_details grid apply.
 * One entry per dirty article; only DC eaches/packs that actually changed.
 */
export const buildProductDetailsAllocationUpdates = (
  editedRows,
  originalRows,
  editableLeaves
) => {
  const updates = [];

  editedRows.forEach((editedRow) => {
    const originalRow = originalRows.find(
      (r) => r.article === editedRow.article
    );
    if (!originalRow) return;

    const packLevelUpdates = [];

    editableLeaves.forEach(({ column_name, dc_code }) => {
      const newVal = Number(editedRow[column_name] ?? 0);
      const oldVal = Number(originalRow[column_name] ?? 0);
      if (newVal === oldVal) return;

      packLevelUpdates.push({
        dc_code,
        pack_type: packTypeForColumn(column_name),
        is_percentage: false,
        value: newVal,
      });
    });

    if (packLevelUpdates.length > 0) {
      updates.push({
        row_filters: { article: editedRow.article },
        pack_level_updates: packLevelUpdates,
        pack_type_id_updates: [],
      });
    }
  });

  return updates;
};

/**
 * Build the `dcConfigs` the Set All panel renders, grouped by DC.
 *
 * maxAbsolute   = min over selected articles of (original_alloc + net_available)
 * maxPercentage = min over selected articles of max_alloc_pct
 */
export const buildProductDetailsSetAllDcConfigs = (
  selectedRows,
  originalRows,
  editableLeaves
) => {
  if (selectedRows.length === 0) return [];

  const dcMap = {};

  editableLeaves.forEach(({ column_name, columnLabel, dc_code }) => {
    const dcLabel = columnLabel.split(" - ")[0];
    if (!dcMap[dc_code]) {
      dcMap[dc_code] = { dcLabel, dcCode: dc_code, fields: [] };
    }

    const type = packTypeForColumn(column_name);
    const label = PACK_TYPE_LABELS[type];

    const maxAbsolute = selectedRows.reduce((min, row) => {
      const origRow = originalRows.find((r) => r.article === row.article);
      const origAlloc = Number(origRow?.[column_name] ?? 0);
      const netKey = replaceColumnGroup(
        column_name,
        PRODUCT_ALLOC_QTY_GROUP,
        PRODUCT_NET_AVAILABLE_GROUP
      );
      const netAvail = Number(origRow?.[netKey] ?? 0);
      return Math.min(min, origAlloc + netAvail);
    }, Infinity);

    const pctKey = replaceColumnGroup(
      column_name,
      PRODUCT_ALLOC_QTY_GROUP,
      PRODUCT_MAX_ALLOC_PCT_GROUP
    );
    // Read max_alloc_pct from the original (server) snapshot so grid edits
    // to the live row object don't corrupt the cap value.
    // Skip rows where the column is absent rather than defaulting to 0,
    // which would wrongly collapse every percentage entry to 0%.
    const maxPercentage = selectedRows.reduce((min, row) => {
      const origRow = originalRows.find((r) => r.article === row.article);
      const pctVal = origRow?.[pctKey];
      if (pctVal === undefined || pctVal === null) return min;
      return Math.min(min, Number(pctVal));
    }, Infinity);

    dcMap[dc_code].fields.push({
      key: column_name,
      label,
      type,
      maxAbsolute: maxAbsolute === Infinity ? 0 : maxAbsolute,
      maxPercentage: maxPercentage === Infinity ? null : maxPercentage,
    });
  });

  return Object.values(dcMap);
};

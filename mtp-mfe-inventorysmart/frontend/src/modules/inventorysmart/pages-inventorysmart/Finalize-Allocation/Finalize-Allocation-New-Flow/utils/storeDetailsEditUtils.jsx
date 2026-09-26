import React from "react";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  STORE_ALLOC_QTY_GROUP,
  STORE_ALLOC_LEAF_PREFIX,
  STORE_NET_AVAILABLE_GROUP,
  STORE_MAX_ALLOC_PCT_GROUP,
  EDITABLE_SUFFIXES,
  PACKS_SUFFIX,
  PACK_TYPE_EACHES,
  PACK_TYPE_PACKS,
  PACK_TYPE_LABELS,
} from "../constants/allocationEditConstants";
import { replaceColumnGroup } from "./allocationEditUtils";

const isEditableSuffix = (columnName) =>
  EDITABLE_SUFFIXES.some((suffix) => columnName.endsWith(suffix));

const packTypeForColumn = (columnName) =>
  columnName.endsWith(PACKS_SUFFIX) ? PACK_TYPE_PACKS : PACK_TYPE_EACHES;

/**
 * Walk `allocated_quantity_packs_eaches` and, in place:
 *  - force every leaf `is_editable = false` (view-mode default)
 *  - collect the packs/eaches leaves that CAN become editable
 */
export const collectStoreDetailsEditableLeaves = (columns, dcDict) => {
  const editableLeaves = [];
  const allocGroup = columns.find(
    (c) => c.column_name === STORE_ALLOC_QTY_GROUP
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
 * Toggle `is_editable` and `cellRenderer` on store-details packs/eaches leaves.
 * pack_units and total are never touched.
 */
export const setStoreDetailsAllocLeafEditability = (
  columns,
  editableColumnKeys,
  editable
) => {
  const keySet = new Set(editableColumnKeys);
  const allocGroup = columns.find(
    (c) => c.column_name === STORE_ALLOC_QTY_GROUP
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
 * store_details apply. Envelope article / store / size stay null. One
 * allocation_updates entry per dirty store; identity is
 * `row_filters: { store }`. Eaches / Pack Count go to pack_level_updates.
 * Pack-type-id is not on this grain, so that array is usually [].
 */
export const buildStoreDetailsAllocationUpdates = (
  editedRows,
  originalRows,
  editableLeaves
) => {
  const updates = [];

  editedRows.forEach((editedRow) => {
    const originalRow = originalRows.find(
      (r) => r.store_code === editedRow.store_code
    );
    if (!originalRow) return;

    const packLevelUpdates = [];
    const packTypeIdUpdates = [];

    editableLeaves.forEach(({ column_name, dc_code, isPackTypeId }) => {
      const newVal = Number(editedRow[column_name] ?? 0);
      const oldVal = Number(originalRow[column_name] ?? 0);
      if (newVal === oldVal) return;

      const resolvedDc = String(
        dc_code || editedRow.dc_codes || editedRow.dc_code || ""
      );

      if (isPackTypeId) {
        packTypeIdUpdates.push({
          dc_code: resolvedDc,
          pack_type_id: column_name.split("__").pop(),
          value: newVal,
        });
        return;
      }

      packLevelUpdates.push({
        dc_code: resolvedDc,
        pack_type: packTypeForColumn(column_name),
        is_percentage: false,
        value: newVal,
      });
    });

    if (packLevelUpdates.length > 0 || packTypeIdUpdates.length > 0) {
      updates.push({
        row_filters: { store: editedRow.store_code },
        pack_level_updates: packLevelUpdates,
        pack_type_id_updates: packTypeIdUpdates,
      });
    }
  });

  return updates;
};

/**
 * Set All dcConfigs for store_details. Same pattern as product_details:
 * every eaches/packs leaf is shown, and caps are min() over ALL selected
 * stores. A 0 allocated + 0 remaining on any selected store makes that
 * field's max 0.
 */
export const buildStoreDetailsSetAllDcConfigs = (
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
      const origRow = originalRows.find(
        (r) => r.store_code === row.store_code
      );
      const origAlloc = Number(origRow?.[column_name] ?? 0);
      const netKey = replaceColumnGroup(
        column_name,
        STORE_ALLOC_LEAF_PREFIX,
        STORE_NET_AVAILABLE_GROUP
      );
      const netAvail = Number(origRow?.[netKey] ?? 0);
      return Math.min(min, origAlloc + netAvail);
    }, Infinity);

    const pctKey = replaceColumnGroup(
      column_name,
      STORE_ALLOC_LEAF_PREFIX,
      STORE_MAX_ALLOC_PCT_GROUP
    );
    const maxPercentage = selectedRows.reduce((min, row) => {
      const origRow = originalRows.find(
        (r) => r.store_code === row.store_code
      );
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

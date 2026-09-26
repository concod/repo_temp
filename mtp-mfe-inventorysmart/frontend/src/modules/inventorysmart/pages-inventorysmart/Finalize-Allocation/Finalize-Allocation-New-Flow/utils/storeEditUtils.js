/**
 * Pure builders for the product_store / product_store_size grains: leaf
 * collection, `other_columns` preparation, and every apply / Set All
 * allocation-update payload. No React here — callers pass in their snapshots
 * (original rows, editable leaves, dc_dict) and receive plain payload arrays.
 *
 * The per-view `row_filters` and hoisting rules are intentionally encoded here
 * verbatim; see finalize-new-flow-learnings.md §16-17 for why each branch
 * shapes its filters the way it does.
 */
import moment from "moment";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  ALLOC_QTY_GROUP,
  KNOWN_PACK_SUFFIXES,
  TOTAL_SUFFIX,
  PACKS_SUFFIX,
  PACK_TYPE_PACKS,
  PACK_TYPE_EACHES,
} from "../constants/allocationEditConstants";

/** Weekend guard shared by the store grid date column and the Set All picker. */
export const isWeekendDate = (date) => {
  const dayNumber = moment(date).day();
  return dayNumber === 0 || dayNumber === 6;
};

/**
 * Mark `other_columns` from editSchema on the raw table_config BEFORE
 * formatting: force read-only start, and wire up the calendar picker for any
 * date/datetime column. Mutates `rawTableConfig` in place.
 *
 * @returns {string[]} the column_name strings that were processed
 */
export const prepareOtherColumns = (rawTableConfig, otherColumns) => {
  if (!otherColumns || otherColumns.length === 0) return [];

  const otherSet = new Set(otherColumns);
  const processed = [];

  const walkRaw = (items) => {
    items.forEach((item) => {
      if (otherSet.has(item.column_name)) {
        if (item.type === "date" || item.type === "datetime") {
          item.type = "datetime";
          item.extra = { ...(item.extra || {}), disablePast: true };
          item.shouldDisableDate = isWeekendDate;
          // agGridColumnFormatter only auto-widens date columns when is_editable
          // is truthy at format time. Since we force it false here, set width
          // manually so the date picker has enough room from the start.
          item.width = 256;
          item.minWidth = 256;
          item.suppressSizeToFit = true;
          item.cellStyle = { ...(item.cellStyle || {}), padding: "0 8px" };
          item.cellClass = `${item.cellClass || ""} ag-cell-date-center`.trim();
        }
        item.is_editable = false; // start disabled; toggled when edit mode activates
        processed.push(item.column_name);
      }
      if (item.sub_headers?.length) {
        walkRaw(item.sub_headers);
      }
    });
  };
  walkRaw(rawTableConfig);
  return processed;
};

/**
 * Walk the `allocated_quantity` column group and force every leaf read-only,
 * collecting the leaves that CAN become editable per editSchema. Used by the
 * top-level DC grids (product_store and product_size): each leaf carries its
 * dc_code and a display label. Does not skip the `__total` roll-up.
 *
 * @returns {{ editableLeaves: Array<{column_name, columnLabel, dc_code, isPackTypeId}> }}
 */
export const collectDcGridEditableLeaves = (columns, dcDict, editSchemaForView) => {
  const editableLeaves = [];
  const allocGroup = columns.find((c) => c.column_name === ALLOC_QTY_GROUP);
  if (!allocGroup?.sub_headers) return { editableLeaves };

  const packLevelFields = editSchemaForView?.pack_level_fields || [];
  const allowsPackTypeId = editSchemaForView?.allows_pack_type_id || false;

  allocGroup.sub_headers.forEach((dcHeader) => {
    const dcOption = dcDict?.find(
      (dc) => replaceSpecialCharacter(dc.label) === dcHeader.label
    );

    (dcHeader.sub_headers || []).forEach((leaf) => {
      leaf.is_editable = false;
      leaf.cellRenderer = null;

      const colName = leaf.column_name;

      const isPackLevel = packLevelFields.some((f) => colName.endsWith(`__${f}`));
      const isPackTypeId =
        allowsPackTypeId &&
        !KNOWN_PACK_SUFFIXES.some((s) => colName.endsWith(s));

      if (isPackLevel || isPackTypeId) {
        const typeLabel = isPackTypeId
          ? leaf.label || colName.split("__").pop()
          : colName.endsWith(PACKS_SUFFIX)
          ? "Pack Count"
          : "Eaches (Units)";

        editableLeaves.push({
          column_name: colName,
          columnLabel: `${dcHeader.label} - ${typeLabel}`,
          dc_code: dcOption?.value || dcOption?.dc_code,
          isPackTypeId,
        });
      }
    });
  });

  return { editableLeaves };
};

/**
 * Detail (product_store_size) variant: strips the formatter's input renderers
 * from every alloc leaf and collects the editable ones. Each leaf carries its
 * `dc_code` so the payload builder can emit it directly without parsing the
 * column name. Skips the `__total` roll-up column.
 *
 * @returns {Array<{column_name, dc_code, isPackTypeId}>}
 */
export const collectDetailEditableLeaves = (columns, dcDict, editSchemaForView) => {
  const editableLeaves = [];
  const allocGroup = columns.find((c) => c.column_name === ALLOC_QTY_GROUP);
  // No early return on a missing schema — view mode has none, and the alloc
  // leaves still have to be stripped of the formatter's input renderers.
  if (!allocGroup?.sub_headers) return editableLeaves;

  const packLevelFields = editSchemaForView?.pack_level_fields || [];
  const allowsPackTypeId = Boolean(editSchemaForView?.allows_pack_type_id);

  allocGroup.sub_headers.forEach((dcHeader) => {
    const dcOption = dcDict?.find(
      (dc) => replaceSpecialCharacter(dc.label) === dcHeader.label
    );

    (dcHeader.sub_headers || []).forEach((leaf) => {
      leaf.is_editable = false;
      leaf.cellRenderer = null;

      const colName = leaf.column_name;
      if (colName.endsWith(TOTAL_SUFFIX)) return;

      const isPackLevel = packLevelFields.some((f) => colName.endsWith(`__${f}`));
      const isPackTypeId =
        allowsPackTypeId && !KNOWN_PACK_SUFFIXES.some((s) => colName.endsWith(s));

      if (isPackLevel || isPackTypeId) {
        editableLeaves.push({
          column_name: colName,
          dc_code: dcOption?.value || dcOption?.dc_code,
          isPackTypeId,
        });
      }
    });
  });

  return editableLeaves;
};

// ─── apply payload builders ─────────────────────────────────────────────────

/**
 * product_store apply: one allocation_update per edited store, split into
 * pack-level (eaches/packs) and pack-type-id updates. row_filters = { store }.
 */
export const buildStoreAllocationUpdates = (editedRows, originalRows, editableLeaves) => {
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

      if (isPackTypeId) {
        const packTypeId = column_name.split("__").pop();
        packTypeIdUpdates.push({
          dc_code: String(dc_code),
          pack_type_id: packTypeId,
          value: newVal,
        });
      } else {
        const packType = column_name.endsWith(PACKS_SUFFIX)
          ? PACK_TYPE_PACKS
          : PACK_TYPE_EACHES;
        packLevelUpdates.push({
          dc_code: String(dc_code),
          pack_type: packType,
          is_percentage: false,
          value: newVal,
        });
      }
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
 * product_store other_updates (e.g. delivery date). Dates are compared and
 * emitted as YYYY-MM-DD to avoid type mismatches. row_filters = { store }.
 */
export const buildStoreOtherUpdates = (editedRows, originalRows, otherColumnNames) => {
  const updates = [];

  editedRows.forEach((editedRow) => {
    const originalRow = originalRows.find(
      (r) => r.store_code === editedRow.store_code
    );
    if (!originalRow) return;

    const columnUpdates = [];

    otherColumnNames.forEach((colName) => {
      const newVal = editedRow[colName];
      const oldVal = originalRow[colName];

      const newFormatted = newVal ? moment(newVal).format("YYYY-MM-DD") : null;
      const oldFormatted = oldVal ? moment(oldVal).format("YYYY-MM-DD") : null;
      if (newFormatted === oldFormatted) return;

      columnUpdates.push({ column: colName, value: newFormatted });
    });

    if (columnUpdates.length > 0) {
      updates.push({
        row_filters: { store: editedRow.store_code },
        updates: columnUpdates,
      });
    }
  });

  return updates;
};

/**
 * product_store_size apply from the nested detail grids. When exactly one
 * store is included the store is hoisted to the envelope (so it is omitted
 * from row_filters); with many, each update carries its own store filter.
 * Pack-type-id edits never carry a size filter (backend infers size from the
 * pack id); eaches edits do.
 *
 * @param sizeEditsMap { [storeCode]: { edits, included, editableLeaves, originalRows } }
 * @returns {{ updates: Array, storeCode: string|null }}
 */
export const buildStoreSizeAllocationUpdates = (sizeEditsMap) => {
  const includedStores = Object.entries(sizeEditsMap).filter(
    ([, v]) => v.included && v.edits.length > 0
  );
  if (includedStores.length === 0) return { updates: [], storeCode: null };

  const isSingleStore = includedStores.length === 1;
  const singleStoreCode = isSingleStore ? includedStores[0][0] : null;
  const updates = [];

  includedStores.forEach(([storeCode, { edits, editableLeaves, originalRows }]) => {
    edits.forEach((editedRow) => {
      const originalRow = originalRows.find((r) => r.size === editedRow.size);
      if (!originalRow) return;

      const packLevelUpdates = [];
      const packTypeIdUpdates = [];

      editableLeaves.forEach(({ column_name, dc_code, isPackTypeId }) => {
        const newVal = Number(editedRow[column_name] ?? 0);
        const oldVal = Number(originalRow[column_name] ?? 0);
        if (newVal === oldVal) return;

        const dcCode = String(dc_code || "");

        if (isPackTypeId) {
          const parts = column_name.split("__");
          const packTypeId = parts[parts.length - 1];
          packTypeIdUpdates.push({ dc_code: dcCode, pack_type_id: packTypeId, value: newVal });
        } else {
          const packType = column_name.endsWith(PACKS_SUFFIX)
            ? PACK_TYPE_PACKS
            : PACK_TYPE_EACHES;
          packLevelUpdates.push({
            dc_code: dcCode,
            pack_type: packType,
            is_percentage: false,
            value: newVal,
          });
        }
      });

      if (packLevelUpdates.length > 0 || packTypeIdUpdates.length > 0) {
        // Pack Count (aggregate) row: pack_type_id_updates carry the pack id,
        // backend infers size from that — don't send size in row_filters.
        const hasPackTypeEdits = packTypeIdUpdates.length > 0;
        const rowFilters = {};
        if (!hasPackTypeEdits) {
          rowFilters.size = editedRow.size;
        }
        if (!isSingleStore) {
          rowFilters.store = storeCode;
        }
        updates.push({
          row_filters: rowFilters,
          pack_level_updates: packLevelUpdates,
          pack_type_id_updates: packTypeIdUpdates,
        });
      }
    });
  });

  return { updates, storeCode: singleStoreCode };
};

// ─── Set All payload builders ───────────────────────────────────────────────

/**
 * Set All "By Store": one entry per selected store, each field applied only to
 * the stores that actually carry it (field.presentOn). row_filters = { store }.
 */
export const buildSetAllByStoreUpdates = (selectedRows, mapping, fieldValues) => {
  const updates = [];
  (selectedRows || []).forEach((row) => {
    const storeCode = row?.store_code;
    if (!storeCode) return;

    const packLevelUpdates = [];
    const packTypeIdUpdates = [];

    (mapping?.dcGroups || []).forEach((dc) => {
      dc.fields.forEach((field) => {
        if (!field.presentOn.includes(storeCode)) return;
        const value = fieldValues?.[field.key];
        if (value === "" || value === null || value === undefined) return;

        if (field.type === "pack_type_id") {
          packTypeIdUpdates.push({
            dc_code: String(dc.dcCode),
            pack_type_id: field.packTypeId,
            value: Number(value),
          });
        } else {
          packLevelUpdates.push({
            dc_code: String(dc.dcCode),
            pack_type: field.type,
            is_percentage: false,
            value: Number(value),
          });
        }
      });
    });

    if (packLevelUpdates.length > 0 || packTypeIdUpdates.length > 0) {
      updates.push({
        row_filters: { store: storeCode },
        pack_level_updates: packLevelUpdates,
        pack_type_id_updates: packTypeIdUpdates,
      });
    }
  });
  return updates;
};

/**
 * Set All "By Size": expand each filled field across the stores from
 * size_store_map. Pack-type-id → row_filters { store } (Pack Count aggregate).
 * Eaches → row_filters { size, store } (per product-size-store split).
 */
export const buildSetAllBySizeUpdates = (sizeMapping, sizeFieldValues) => {
  if (!sizeMapping?.dcGroups) return [];
  const updates = [];

  const packByStore = {};
  sizeMapping.dcGroups.forEach((dc) => {
    dc.fields.forEach((field) => {
      const value = sizeFieldValues?.[field.key];
      if (value === "" || value === null || value === undefined) return;
      (field.stores || []).forEach((storeCode) => {
        if (!packByStore[storeCode]) {
          packByStore[storeCode] = {
            row_filters: { store: storeCode },
            pack_level_updates: [],
            pack_type_id_updates: [],
          };
        }
        packByStore[storeCode].pack_type_id_updates.push({
          dc_code: String(dc.dcCode),
          pack_type_id: field.packTypeId,
          value: Number(value),
        });
      });
    });
  });
  Object.values(packByStore).forEach((entry) => updates.push(entry));

  const eachesByKey = {};
  sizeMapping.dcGroups.forEach((dc) => {
    dc.sizeFields.forEach((field) => {
      const value = sizeFieldValues?.[field.key];
      if (value === "" || value === null || value === undefined) return;
      (field.stores || []).forEach((storeCode) => {
        const mapKey = `${field.size}__${storeCode}`;
        if (!eachesByKey[mapKey]) {
          eachesByKey[mapKey] = {
            row_filters: { size: field.size, store: storeCode },
            pack_level_updates: [],
            pack_type_id_updates: [],
          };
        }
        eachesByKey[mapKey].pack_level_updates.push({
          dc_code: String(dc.dcCode),
          pack_type: PACK_TYPE_EACHES,
          is_percentage: false,
          value: Number(value),
        });
      });
    });
  });
  Object.values(eachesByKey).forEach((entry) => updates.push(entry));

  return updates;
};

/**
 * Set All ship-date other_updates: apply one formatted date to every selected
 * store. row_filters = { store }. Empty when no date / no column.
 */
export const buildSetAllShipDateUpdates = (selectedRows, shipDateColumn, shipDate) => {
  const updates = [];
  if (!shipDate || !shipDateColumn) return updates;
  const formattedDate = moment(shipDate).format("YYYY-MM-DD");
  (selectedRows || []).forEach((row) => {
    if (!row?.store_code) return;
    updates.push({
      row_filters: { store: row.store_code },
      updates: [{ column: shipDateColumn, value: formattedDate }],
    });
  });
  return updates;
};

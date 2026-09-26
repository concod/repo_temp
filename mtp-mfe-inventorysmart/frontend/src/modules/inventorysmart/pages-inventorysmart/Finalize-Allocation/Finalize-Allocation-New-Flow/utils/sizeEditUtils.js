/**
 * Pure builders for the product_size / product_size_store grains: the
 * size→store detail leaf collector and every apply / Set All allocation-update
 * payload. Mirror of storeEditUtils for the transposed (size-first) grain. No
 * React here — callers pass in their snapshots and receive plain payload
 * arrays.
 *
 * The size grain hoists `size` where the store grain hoists `store`; otherwise
 * the row_filters / pack-type rules are the same. See
 * finalize-new-flow-learnings.md §16-17 for why each branch shapes its filters
 * the way it does.
 */
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import {
  ALLOC_QTY_GROUP,
  KNOWN_PACK_SUFFIXES,
  REMAINING_DC_ATA_GROUP,
  TOTAL_SUFFIX,
  PACKS_SUFFIX,
  PACK_TYPE_PACKS,
  PACK_TYPE_EACHES,
  PACK_TYPE_LABELS,
} from "../constants/allocationEditConstants";

/**
 * size→store breakdown detail: strip the formatter's input renderers from
 * every alloc leaf and collect the editable ones. Every store row is uniformly
 * editable for eaches. Pack-type-id columns stay read-only on this grain,
 * same as the `__total` roll-up. Each leaf carries its dc_code so the payload
 * builder can emit it directly.
 *
 * @returns {Array<{column_name, columnLabel, dc_code, isPackTypeId}>}
 */
export const collectSizeStoreEditableLeaves = (columns, dcDict, editSchemaForView) => {
  const editableLeaves = [];
  const allocGroup = columns.find((c) => c.column_name === ALLOC_QTY_GROUP);
  // No early return on a missing schema — view mode has none, and the alloc
  // leaves still have to be stripped of the formatter's input renderers.
  if (!allocGroup?.sub_headers) return editableLeaves;

  const packLevelFields = editSchemaForView?.pack_level_fields || [];

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
      const isPackTypeId = !KNOWN_PACK_SUFFIXES.some((s) => colName.endsWith(s));
      // Pack-type-id stays read-only on product_size_store, same as Total Units.
      if (isPackTypeId) return;

      if (isPackLevel) {
        editableLeaves.push({
          column_name: colName,
          columnLabel: `${dcHeader.label} - ${PACK_TYPE_LABELS[PACK_TYPE_EACHES]}`,
          dc_code: dcOption?.value || dcOption?.dc_code,
          isPackTypeId: false,
        });
      }
    });
  });

  return editableLeaves;
};

// ─── apply payload builders ─────────────────────────────────────────────────

/**
 * product_size apply: one allocation_update per edited size, split into
 * pack-level (eaches/packs) and pack-type-id updates. Pack-type-id edits sit on
 * the Pack Count aggregate row (backend infers size), so they carry no size
 * filter; eaches edits carry row_filters = { size }.
 */
export const buildProductSizeAllocationUpdates = (editedRows, originalRows, editableLeaves) => {
  const updates = [];

  editedRows.forEach((editedRow) => {
    const originalRow = originalRows.find((r) => r.size === editedRow.size);
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
      const hasPackTypeEdits = packTypeIdUpdates.length > 0;
      const rowFilters = {};
      if (!hasPackTypeEdits) {
        rowFilters.size = editedRow.size;
      }
      updates.push({
        row_filters: rowFilters,
        pack_level_updates: packLevelUpdates,
        pack_type_id_updates: packTypeIdUpdates,
      });
    }
  });

  return updates;
};

/**
 * product_size_store apply from the nested detail grids. When exactly one size
 * is included the size is hoisted to the envelope (so it is omitted from
 * row_filters); with many, each update carries its own size filter.
 * row_filters always carries both size and store. Pack-level edits are always
 * eaches on this grain. Pack-type-id is read-only here and is never sent.
 *
 * @param sizeEditsMap { [sizeCode]: { edits, included, editableLeaves, originalRows } }
 * @returns {{ updates: Array, sizeCode: string|null }}
 */
export const buildProductSizeStoreAllocationUpdates = (sizeEditsMap) => {
  const includedSizes = Object.entries(sizeEditsMap).filter(
    ([, v]) => v.included && v.edits.length > 0
  );
  if (includedSizes.length === 0) return { updates: [], sizeCode: null };

  const isSingleSize = includedSizes.length === 1;
  const singleSizeCode = isSingleSize ? includedSizes[0][0] : null;
  const updates = [];

  includedSizes.forEach(([sizeKey, { edits, editableLeaves, originalRows }]) => {
    edits.forEach((editedRow) => {
      const originalRow = originalRows.find((r) => r.store_code === editedRow.store_code);
      if (!originalRow) return;

      const packLevelUpdates = [];

      editableLeaves.forEach(({ column_name, dc_code, isPackTypeId }) => {
        if (isPackTypeId) return;

        const newVal = Number(editedRow[column_name] ?? 0);
        const oldVal = Number(originalRow[column_name] ?? 0);
        if (newVal === oldVal) return;

        packLevelUpdates.push({
          dc_code: String(dc_code || ""),
          pack_type: PACK_TYPE_EACHES,
          is_percentage: false,
          value: newVal,
        });
      });

      if (packLevelUpdates.length > 0) {
        updates.push({
          row_filters: { size: sizeKey, store: editedRow.store_code },
          pack_level_updates: packLevelUpdates,
          pack_type_id_updates: [],
        });
      }
    });
  });

  return { updates, sizeCode: singleSizeCode };
};

// ─── Set All: product_size_store (size→store) ───────────────────────────────

/**
 * Build the Set All mapping for the size→store detail grain. Eaches only —
 * pack-type-id is read-only on this grain. One eaches field per DC.
 *
 * maxAbsolute uses the same formula as the store-level Set All:
 *   floor((sum_alloc + max_remaining) / presentCount)
 * computed over the aggregated store rows returned by the API.
 *
 * @param {Object} opts
 * @param {Object[]} opts.rows       table_data from getProductSizeStoreView (aggregated store rows)
 * @param {Object[]} opts.dcDict     dc_dict from the API response
 * @returns {{ dcGroups: Array<{ dcLabel, dcCode, fields: Array }> }}
 */
export const buildSizeStoreSetAllMapping = ({
  rows = [],
  dcDict = [],
} = {}) => {
  if (rows.length === 0) return { dcGroups: [] };

  const sampleRow = rows[0];
  const eachesCols = Object.keys(sampleRow).filter(
    (key) => key.startsWith(ALLOC_QTY_GROUP) && key.endsWith("__eaches")
  );

  const dcGroups = [];

  eachesCols.forEach((eachesCol) => {
    const parts = eachesCol.split("__");
    if (parts.length < 3) return;
    const dcLabel = parts.slice(1, -1).join("__");

    const dcOption = dcDict?.find(
      (dc) => replaceSpecialCharacter(dc.label) === dcLabel
    );
    const dcCode = dcOption?.value || dcOption?.dc_code || dcLabel;
    const ataCol = eachesCol.replace(ALLOC_QTY_GROUP, REMAINING_DC_ATA_GROUP);

    const presentRows = rows.filter(
      (row) =>
        Object.prototype.hasOwnProperty.call(row, eachesCol) &&
        row[eachesCol] !== null &&
        row[eachesCol] !== undefined
    );
    if (presentRows.length === 0) return;

    const sumAlloc = presentRows.reduce(
      (acc, row) => acc + (Number(row[eachesCol]) || 0),
      0
    );
    const maxRemaining = Math.max(
      ...presentRows.map((row) => Number(row[ataCol]) || 0)
    );
    const maxAbsolute = Math.floor(
      (sumAlloc + maxRemaining) / presentRows.length
    );

    dcGroups.push({
      dcLabel,
      dcCode,
      fields: [
        {
          key: eachesCol,
          label: PACK_TYPE_LABELS[PACK_TYPE_EACHES],
          type: PACK_TYPE_EACHES,
          maxAbsolute,
        },
      ],
    });
  });

  return { dcGroups };
};

/**
 * Build the apply payload for product_size_store Set All. Uses size_store_map
 * from the API to expand the uniform eaches value across every size→store
 * combination. row_filters = { size, store }; pack_type_id_updates is always [].
 *
 * size_store_map shape: { [dcLabel]: { [store_code]: [sizes/packTypes present] } }
 *
 * @param {Object} opts
 * @param {Object}   opts.mapping       from buildSizeStoreSetAllMapping (carries dcCode per field)
 * @param {Object}   opts.sizeStoreMap  from the API response
 * @param {string[]} opts.selectedSizes sizes included in Set All
 * @param {Object}   opts.fieldValues   { [eachesColKey]: valueStr }
 * @returns {{ updates: Array, sizeCode: string|null }}
 */
export const buildSizeStoreSetAllUpdates = ({
  mapping = {},
  sizeStoreMap = {},
  selectedSizes = [],
  fieldValues = {},
} = {}) => {
  const isSingle = selectedSizes.length === 1;
  const singleSizeCode = isSingle ? selectedSizes[0] : null;
  const selectedSet = new Set(selectedSizes);

  // Build a colKey → { dcCode, dcLabel } lookup from the mapping
  const dcInfoByKey = {};
  (mapping?.dcGroups || []).forEach((dc) => {
    dc.fields.forEach((field) => {
      dcInfoByKey[field.key] = { dcCode: dc.dcCode, dcLabel: dc.dcLabel };
    });
  });

  // Collect updates keyed by size__store to merge pack_level_updates per DC
  const updatesByKey = {};

  Object.entries(fieldValues).forEach(([colKey, rawValue]) => {
    if (rawValue === "" || rawValue === null || rawValue === undefined) return;
    const dcInfo = dcInfoByKey[colKey];
    if (!dcInfo) return;

    const dcMap = sizeStoreMap?.[dcInfo.dcLabel];
    if (!dcMap) return;

    // Iterate stores in the map for this DC
    Object.entries(dcMap).forEach(([storeCode, sizesAtStore]) => {
      if (!Array.isArray(sizesAtStore)) return;

      // For each selected size present at this store, create an update
      selectedSizes.forEach((sizeKey) => {
        if (!sizesAtStore.includes(sizeKey)) return;

        const mapKey = `${sizeKey}__${storeCode}`;
        if (!updatesByKey[mapKey]) {
          updatesByKey[mapKey] = {
            row_filters: { size: sizeKey, store: storeCode },
            pack_level_updates: [],
            pack_type_id_updates: [],
          };
        }
        updatesByKey[mapKey].pack_level_updates.push({
          dc_code: String(dcInfo.dcCode),
          pack_type: PACK_TYPE_EACHES,
          is_percentage: false,
          value: Number(rawValue),
        });
      });
    });
  });

  const updates = Object.values(updatesByKey);
  return { updates, sizeCode: singleSizeCode };
};

// ─── Set All payload builder (product_size) ─────────────────────────────────

/**
 * Set All "By Size": pack-type-id fields apply globally (row_filters {}, one
 * combined update); eaches fields expand across the sizes that carry them
 * (field.presentOn) with row_filters = { size }.
 */
export const buildProductSizeSetAllUpdates = (mapping, fieldValues) => {
  const packTypeIdUpdates = [];
  const updatesBySize = {};

  (mapping?.dcGroups || []).forEach((dc) => {
    dc.fields.forEach((field) => {
      const value = fieldValues?.[field.key];
      if (value === "" || value === null || value === undefined) return;

      if (field.type === "pack_type_id") {
        packTypeIdUpdates.push({
          dc_code: String(dc.dcCode),
          pack_type_id: field.packTypeId,
          value: Number(value),
        });
        return;
      }

      field.presentOn.forEach((size) => {
        if (!updatesBySize[size]) {
          updatesBySize[size] = {
            row_filters: { size },
            pack_level_updates: [],
            pack_type_id_updates: [],
          };
        }
        updatesBySize[size].pack_level_updates.push({
          dc_code: String(dc.dcCode),
          pack_type: field.type,
          is_percentage: false,
          value: Number(value),
        });
      });
    });
  });

  const allocationUpdates = [];
  if (packTypeIdUpdates.length > 0) {
    allocationUpdates.push({
      row_filters: {},
      pack_level_updates: [],
      pack_type_id_updates: packTypeIdUpdates,
    });
  }
  allocationUpdates.push(...Object.values(updatesBySize));

  return allocationUpdates;
};

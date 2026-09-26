import moment from "moment";
import {
  ALLOC_QTY_GROUP,
  KNOWN_PACK_SUFFIXES,
  PACKS_SUFFIX,
  PACK_TYPE_PACKS,
  PACK_TYPE_EACHES,
  REMAINING_DC_ATA_GROUP,
} from "../constants/allocationEditConstants";
import { getColumnName, matchDcOption } from "./allocationEditUtils";
import { PACK_COUNT_SIZE } from "../store-view/constants";

const SKIP_PACK_SUFFIXES = ["__packs", "__pack_units", "__total"];
const SKIP_SIZE_PACK_SUFFIXES = [
  "__eaches",
  "__packs",
  "__pack_units",
  "__total",
];

const isPresent = (row, colName) =>
  Boolean(row) &&
  Object.prototype.hasOwnProperty.call(row, colName) &&
  row[colName] !== null &&
  row[colName] !== undefined;

const uniqueCodes = (rows, key) => {
  const seen = [];
  (rows || []).forEach((row) => {
    const code = row?.[key];
    if (code === undefined || code === null) return;
    const value = String(code);
    if (!seen.includes(value)) seen.push(value);
  });
  return seen;
};

const minAllocPlusRemaining = (rows, colName) => {
  const ataKey = colName.replace(ALLOC_QTY_GROUP, REMAINING_DC_ATA_GROUP);
  return Math.min(
    ...(rows || []).map(
      (row) => (Number(row[colName]) || 0) + (Number(row[ataKey]) || 0)
    )
  );
};

const traverseColumnTree = (items, visitFn) => {
  (items || []).forEach((item) => {
    visitFn(item);
    if (item?.sub_headers?.length)
      traverseColumnTree(item.sub_headers, visitFn);
    if (item?.children?.length) traverseColumnTree(item.children, visitFn);
  });
};

const findShipDateColumn = (columns, otherColumns) => {
  if (!otherColumns || otherColumns.length === 0) return null;
  const otherSet = new Set(otherColumns);
  let found = null;
  traverseColumnTree(columns, (item) => {
    if (found) return;
    const name = getColumnName(item);
    if (!otherSet.has(name)) return;
    if (item.type === "date" || item.type === "datetime") {
      found = {
        column_name: name,
        label: item.label || name,
        type: item.type,
      };
    }
  });
  if (found) return found;

  traverseColumnTree(columns, (item) => {
    if (found) return;
    const name = getColumnName(item);
    if (!otherSet.has(name)) return;
    found = {
      column_name: name,
      label: item.label || name,
      type: item.type || "date",
    };
  });
  return found;
};

const resolveArticles = (mappedArticles, presentArticles) => {
  if (!Array.isArray(mappedArticles)) return presentArticles;
  return mappedArticles
    .map(String)
    .filter((article) => presentArticles.includes(article));
};

/**
 * store_product apply: replica of product_store. Envelope carries the opened
 * parent store; each dirty article is one allocation_updates entry.
 * row_filters = { article }. Eaches → pack_level_updates; PK-* →
 * pack_type_id_updates.
 */
export const buildStoreProductAllocationUpdates = (
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
    const packTypeIdUpdates = [];

    editableLeaves.forEach(({ column_name, dc_code, isPackTypeId }) => {
      if (
        !Object.prototype.hasOwnProperty.call(originalRow, column_name) &&
        !Object.prototype.hasOwnProperty.call(editedRow, column_name)
      ) {
        return;
      }

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
        row_filters: { article: editedRow.article },
        pack_level_updates: packLevelUpdates,
        pack_type_id_updates: packTypeIdUpdates,
      });
    }
  });

  return updates;
};

export const buildStoreProductOtherUpdates = (
  editedRows,
  originalRows,
  otherColumnNames
) => {
  const updates = [];

  editedRows.forEach((editedRow) => {
    const originalRow = originalRows.find(
      (r) => r.article === editedRow.article
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
        row_filters: { article: editedRow.article },
        updates: columnUpdates,
      });
    }
  });

  return updates;
};

/**
 * store_product_size apply from the nested detail grids. Twin of
 * buildStoreSizeAllocationUpdates: parent store always stays on the envelope.
 *
 * One article included  → article is hoisted to the envelope and omitted from
 *                         row_filters. Eaches: { size }. Pack id: {}.
 * Many articles included → envelope article is null. Eaches: { article, size }.
 *                          Pack id: { article } (no size — backend infers it).
 * Unchecked "Include In Apply" splits are dropped, same as product_store_size.
 *
 * @param sizeEditsMap { [article]: { edits, included, editableLeaves, originalRows } }
 * @returns {{ updates: Array, article: string|null }}
 */
export const buildStoreProductSizeAllocationUpdates = (sizeEditsMap) => {
  const includedArticles = Object.entries(sizeEditsMap).filter(
    ([, v]) => v.included && v.edits.length > 0
  );
  if (includedArticles.length === 0) return { updates: [], article: null };

  const isSingleArticle = includedArticles.length === 1;
  const singleArticle = isSingleArticle ? includedArticles[0][0] : null;
  const updates = [];

  includedArticles.forEach(
    ([article, { edits, editableLeaves, originalRows }]) => {
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
            packTypeIdUpdates.push({
              dc_code: dcCode,
              pack_type_id: packTypeId,
              value: newVal,
            });
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
          if (!isSingleArticle) {
            rowFilters.article = article;
          }
          updates.push({
            row_filters: rowFilters,
            pack_level_updates: packLevelUpdates,
            pack_type_id_updates: packTypeIdUpdates,
          });
        }
      });
    }
  );

  return { updates, article: singleArticle };
};

/**
 * Set All "Edit by Product": union of eaches + pack-type-id leaves. 0 is
 * present; missing/null keys are excluded. maxAbsolute is
 * min(allocated + remaining) over articles that carry the key.
 */
export const buildStoreProductSetAllMapping = ({
  columns = [],
  dcDict = [],
  originalRows = [],
  selectedRows = [],
  editSchema,
} = {}) => {
  const selectedCodes = (selectedRows || [])
    .map((row) => row?.article)
    .filter((code) => code !== undefined && code !== null)
    .map(String);
  const selectedOrigRows = (originalRows || []).filter((row) =>
    selectedCodes.includes(String(row?.article))
  );

  const shipDateColumn = findShipDateColumn(columns, editSchema?.other_columns);

  const allocGroup = (columns || []).find(
    (c) => getColumnName(c) === ALLOC_QTY_GROUP
  );
  if (!allocGroup?.sub_headers) {
    return { shipDateColumn, dcGroups: [] };
  }

  const packLevelFields = editSchema?.pack_level_fields || [];
  const allowsPackTypeId = Boolean(editSchema?.allows_pack_type_id);
  const dcGroups = [];

  allocGroup.sub_headers.forEach((dcHeader) => {
    const dcOption = matchDcOption(dcDict, dcHeader);
    const fields = [];

    (dcHeader.sub_headers || []).forEach((leaf) => {
      const colName = getColumnName(leaf);
      if (!colName) return;
      if (SKIP_PACK_SUFFIXES.some((s) => colName.endsWith(s))) return;

      const isPackLevel = packLevelFields.some((f) =>
        colName.endsWith(`__${f}`)
      );
      const isPackTypeId =
        allowsPackTypeId &&
        !KNOWN_PACK_SUFFIXES.some((s) => colName.endsWith(s));
      if (!isPackLevel && !isPackTypeId) return;

      const suffix = colName.split("__").pop();
      const presentRows = selectedOrigRows.filter((row) =>
        isPresent(row, colName)
      );
      const presentOn = uniqueCodes(presentRows, "article");
      if (presentOn.length === 0) return;

      fields.push({
        key: colName,
        label: leaf.label || suffix,
        type: isPackTypeId ? "pack_type_id" : suffix,
        packTypeId: isPackTypeId ? suffix : null,
        presentOn,
        maxAbsolute: minAllocPlusRemaining(presentRows, colName),
      });
    });

    if (fields.length === 0) return;
    dcGroups.push({
      dcLabel: dcHeader.label,
      dcCode: dcOption?.value || dcOption?.dc_code || dcHeader.label,
      fields,
    });
  });

  return { shipDateColumn, dcGroups };
};

/**
 * Set All "Edit by Size" from unaggregated article×size rows.
 * Pack-type-id comes from Pack Count rows only. Eaches are grouped by size.
 * maxAbsolute is min(allocated + remaining) across splits where the key is
 * present (0 included, missing/null excluded). size_article_map is optional.
 */
export const buildStoreProductSizeSetAllMapping = ({
  columns = [],
  dcDict = [],
  rows = [],
  sizeArticleMap = {},
} = {}) => {
  const allocGroup = (columns || []).find(
    (c) => getColumnName(c) === ALLOC_QTY_GROUP
  );
  if (!allocGroup?.sub_headers) {
    return { dcGroups: [] };
  }

  const packCountRows = (rows || []).filter((r) => r?.size === PACK_COUNT_SIZE);
  const sizeOnlyRows = (rows || []).filter(
    (r) => r?.size != null && r?.size !== PACK_COUNT_SIZE
  );

  const sizeOrder = [];
  const sizeRowsBySize = {};
  sizeOnlyRows.forEach((row) => {
    const size = String(row.size);
    if (!sizeRowsBySize[size]) {
      sizeRowsBySize[size] = [];
      sizeOrder.push(size);
    }
    sizeRowsBySize[size].push(row);
  });

  const getMappedArticles = (dcLabel, mapKey) => {
    const list = sizeArticleMap?.[dcLabel]?.[mapKey];
    return Array.isArray(list) ? list.map(String) : null;
  };

  const dcGroups = [];

  allocGroup.sub_headers.forEach((dcHeader) => {
    const dcOption = matchDcOption(dcDict, dcHeader);
    const dcCode = dcOption?.value || dcOption?.dc_code || dcHeader.label;
    const dcLabel = dcHeader.label;
    const fields = [];

    (dcHeader.sub_headers || []).forEach((leaf) => {
      const colName = getColumnName(leaf);
      if (!colName) return;
      if (SKIP_SIZE_PACK_SUFFIXES.some((s) => colName.endsWith(s))) return;

      const suffix = colName.split("__").pop();
      const presentRows = packCountRows.filter((row) =>
        isPresent(row, colName)
      );
      const presentArticles = uniqueCodes(presentRows, "article");
      const articles = resolveArticles(
        getMappedArticles(dcLabel, suffix),
        presentArticles
      );
      if (articles.length === 0) return;

      const rowsForMax = presentRows.filter((row) =>
        articles.includes(String(row.article))
      );
      if (rowsForMax.length === 0) return;

      fields.push({
        key: colName,
        label: leaf.label || suffix,
        type: "pack_type_id",
        packTypeId: suffix,
        articles,
        maxAbsolute: minAllocPlusRemaining(rowsForMax, colName),
      });
    });

    const eachesCol = `${ALLOC_QTY_GROUP}__${dcLabel}__eaches`;
    const sizeFields = [];
    sizeOrder.forEach((size) => {
      const sizeRows = sizeRowsBySize[size] || [];
      const presentRows = sizeRows.filter((row) => isPresent(row, eachesCol));
      const presentArticles = uniqueCodes(presentRows, "article");
      const articles = resolveArticles(
        getMappedArticles(dcLabel, size),
        presentArticles
      );
      if (articles.length === 0) return;

      const rowsForMax = presentRows.filter((row) =>
        articles.includes(String(row.article))
      );
      if (rowsForMax.length === 0) return;

      sizeFields.push({
        key: `${eachesCol}__${size}`,
        colName: eachesCol,
        label: size,
        size,
        type: "eaches",
        articles,
        maxAbsolute: minAllocPlusRemaining(rowsForMax, eachesCol),
      });
    });

    if (fields.length === 0 && sizeFields.length === 0) return;
    dcGroups.push({ dcLabel, dcCode, fields, sizeFields });
  });

  return { dcGroups };
};

/**
 * Set All "Edit by Product": twin of buildSetAllByStoreUpdates.
 * One allocation_updates entry per selected article. A filled eaches / pack-id
 * field is applied only when that column is present on the article row (0 is
 * present; missing/null is not). row_filters = { article }.
 */
export const buildSetAllByProductUpdates = (
  selectedRows,
  mapping,
  fieldValues
) => {
  const updates = [];
  (selectedRows || []).forEach((row) => {
    const article = row?.article;
    if (article === undefined || article === null) return;

    const packLevelUpdates = [];
    const packTypeIdUpdates = [];

    (mapping?.dcGroups || []).forEach((dc) => {
      dc.fields.forEach((field) => {
        if (!isPresent(row, field.key)) return;
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
        row_filters: { article },
        pack_level_updates: packLevelUpdates,
        pack_type_id_updates: packTypeIdUpdates,
      });
    }
  });
  return updates;
};

/**
 * Set All "Edit by Size": twin of buildSetAllBySizeUpdates.
 * Pack-type-id → row_filters { article } (Pack Count aggregate, no size).
 * Eaches (each size input) → row_filters { size, article }.
 * field.articles is the present-on list from the unaggregated size rows.
 */
export const buildSetAllByProductSizeUpdates = (
  sizeMapping,
  sizeFieldValues
) => {
  if (!sizeMapping?.dcGroups) return [];
  const updates = [];

  const packByArticle = {};
  sizeMapping.dcGroups.forEach((dc) => {
    dc.fields.forEach((field) => {
      const value = sizeFieldValues?.[field.key];
      if (value === "" || value === null || value === undefined) return;
      (field.articles || []).forEach((article) => {
        if (!packByArticle[article]) {
          packByArticle[article] = {
            row_filters: { article },
            pack_level_updates: [],
            pack_type_id_updates: [],
          };
        }
        packByArticle[article].pack_type_id_updates.push({
          dc_code: String(dc.dcCode),
          pack_type_id: field.packTypeId,
          value: Number(value),
        });
      });
    });
  });
  Object.values(packByArticle).forEach((entry) => updates.push(entry));

  const eachesByKey = {};
  sizeMapping.dcGroups.forEach((dc) => {
    dc.sizeFields.forEach((field) => {
      const value = sizeFieldValues?.[field.key];
      if (value === "" || value === null || value === undefined) return;
      (field.articles || []).forEach((article) => {
        const mapKey = `${field.size}__${article}`;
        if (!eachesByKey[mapKey]) {
          eachesByKey[mapKey] = {
            row_filters: { size: field.size, article },
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
 * Set All ship-date other_updates: twin of buildSetAllShipDateUpdates.
 * One formatted date per selected article. row_filters = { article }.
 */
export const buildSetAllProductShipDateUpdates = (
  selectedRows,
  shipDateColumn,
  shipDate
) => {
  const updates = [];
  if (!shipDate || !shipDateColumn) return updates;
  const formattedDate = moment(shipDate).format("YYYY-MM-DD");
  (selectedRows || []).forEach((row) => {
    if (row?.article === undefined || row?.article === null) return;
    updates.push({
      row_filters: { article: row.article },
      updates: [{ column: shipDateColumn, value: formattedDate }],
    });
  });
  return updates;
};

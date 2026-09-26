/**
 * Pack-configuration helper text shared by the store / size grids and the
 * Set All panel. A pack's per-size unit split is shown as tooltip / helper
 * text next to its pack-type-id column, e.g.
 *
 *   S-2, M-3, L-3, XL-2
 *   XXL-2
 *   Total-12
 *
 * Sizes are chunked `PACK_HELPER_ITEMS_PER_ROW` per line, with the total on
 * its own trailing line.
 */
import {
  ALLOC_QTY_GROUP,
  KNOWN_PACK_SUFFIXES,
  TOTAL_SUFFIX,
} from "../constants/allocationEditConstants";

const PACK_HELPER_ITEMS_PER_ROW = 4;

/**
 * @returns {string[] | null} lines of helper text, or null when the pack has
 * no size split to describe.
 */
export const buildPackHelperRows = (packConfig) => {
  if (!packConfig?.sizes?.length) return null;
  const parts = packConfig.sizes.map(({ size, units }) => `${size}-${units}`);
  const rows = [];
  for (let i = 0; i < parts.length; i += PACK_HELPER_ITEMS_PER_ROW) {
    rows.push(parts.slice(i, i + PACK_HELPER_ITEMS_PER_ROW).join(", "));
  }
  rows.push(`Total-${packConfig.total_units}`);
  return rows;
};

/** Newline-joined form of {@link buildPackHelperRows} for grid cell helperText. */
export const buildPackHelperText = (packConfig) => {
  const rows = buildPackHelperRows(packConfig);
  return rows ? rows.join("\n") : "";
};

/** { pack_type_id → packConfig }, including eaches whose id is a size code. */
export const toPackConfigMap = (configs = []) =>
  Object.fromEntries(
    (configs || [])
      .filter((c) => c?.pack_type_id != null)
      .map((c) => [String(c.pack_type_id), c])
  );

/**
 * Attach `showHelperText` / `helperText` onto every pack-type-id leaf under
 * `allocated_quantity`, using a { pack_type_id → packConfig } map. Mutates the
 * raw column tree in place, before formatting. No-op when the map is absent.
 */
export const injectPackHelperText = (rawColumns, packConfigMap) => {
  if (!packConfigMap) return;
  const allocGroup = rawColumns.find((c) => c.column_name === ALLOC_QTY_GROUP);
  if (!allocGroup?.sub_headers) return;
  allocGroup.sub_headers.forEach((dcHeader) => {
    (dcHeader.sub_headers || []).forEach((leaf) => {
      const colName = leaf.column_name;
      if (!colName || colName.endsWith(TOTAL_SUFFIX)) return;
      if (KNOWN_PACK_SUFFIXES.some((s) => colName.endsWith(s))) return;
      const packConfig = packConfigMap[String(colName.split("__").pop())];
      if (!packConfig) return;
      const helperText = buildPackHelperText(packConfig);
      if (helperText) {
        leaf.extra = { ...(leaf.extra || {}), showHelperText: true, helperText };
      }
    });
  });
};

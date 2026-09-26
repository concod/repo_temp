/**
 * Ref-gated cell renderers for the store / size allocation grids.
 *
 * Renderers are attached ONCE at fetch time and read edit state from
 * `editStateRef` (updated every render) through an injected `editGate`. That
 * lets a chip / edit-mode change refresh with a single refreshCells instead of
 * rebuilding columnDefs — a rebuild would remount open master-detail panels.
 */
import React from "react";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { ALLOC_QTY_GROUP } from "../constants/allocationEditConstants";
import { PACK_COUNT_SIZE } from "../product-view/constants";
import { isMissingOrNull } from "./allocationEditUtils";

/**
 * Whether a given detail row may be edited for this column:
 *  - pack-type-id columns edit only on the "Pack Count" aggregate row
 *  - eaches columns edit only on the real size rows
 */
export const canEditOnRow = (data, isPackTypeId) => {
  const isPackCount = data?.size === PACK_COUNT_SIZE;
  return isPackTypeId ? isPackCount : !isPackCount;
};

/**
 * Store grid: attach renderers to the collected editable alloc leaves. A cell
 * shows "-" when the row lacks the key or holds null, the raw value when
 * editing is off, and the editable input otherwise.
 *
 * `allocGroupName` defaults to `ALLOC_QTY_GROUP` for the store_product /
 * product_store grids. Pass `STORE_ALLOC_QTY_GROUP` for store_details.
 */
export const attachStoreAllocRenderers = (
  columns,
  editableColumnKeys,
  editStateRef,
  editGate,
  allocGroupName = ALLOC_QTY_GROUP
) => {
  const keySet = new Set(editableColumnKeys);
  const allocGroup = columns.find((c) => c.column_name === allocGroupName);
  if (!allocGroup?.sub_headers) return;

  allocGroup.sub_headers.forEach((dcHeader) => {
    (dcHeader.sub_headers || []).forEach((leaf) => {
      if (!keySet.has(leaf.column_name)) return;

      leaf.is_editable = true;
      leaf.cellRenderer = (params, extraProps) => {
        if (isMissingOrNull(params.data, leaf.column_name)) {
          return "-";
        }
        if (!editGate(editStateRef)) {
          return params.data[leaf.column_name];
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
    });
  });
};

/**
 * Store grid: same ref-gated approach for `other_columns` (e.g. delivery_dt),
 * walking the formatted tree by `children` / `sub_headers`.
 */
export const attachOtherColumnRenderers = (
  columns,
  otherColumnNames,
  editStateRef,
  editGate
) => {
  if (!otherColumnNames || otherColumnNames.length === 0) return;
  const nameSet = new Set(otherColumnNames);

  const walkFormatted = (items) => {
    items.forEach((col) => {
      const key = col.field || col.column_name;
      if (nameSet.has(key)) {
        col.is_editable = true;
        col.cellRenderer = (params, extraProps) => {
          if (
            !params.data ||
            !Object.prototype.hasOwnProperty.call(params.data, key)
          ) {
            return "-";
          }
          if (!editGate(editStateRef)) {
            return params.data[key];
          }
          return (
            <CellRenderers
              cellData={params}
              column={col}
              extraProps={extraProps}
              actions={null}
            />
          );
        };
      }
      if (col.children?.length) walkFormatted(col.children);
      if (col.sub_headers?.length) walkFormatted(col.sub_headers);
    });
  };
  walkFormatted(columns);
};

/**
 * Detail (size) grid: attach renderers to the editable leaves, additionally
 * gated per-row by `canEditRow`. Missing / null cells show "-".
 *
 * `canEditRow(data, isPackTypeId)` defaults to {@link canEditOnRow} (the
 * Pack-Count-aware rule used by the size-breakdown grids). Grids whose rows are
 * all uniformly editable for the collected leaves (e.g. size→store eaches)
 * pass `() => true`.
 */
export const attachDetailAllocRenderers = (
  columns,
  editableLeaves,
  editStateRef,
  editGate,
  canEditRow = canEditOnRow
) => {
  if (!editableLeaves.length || !editStateRef) return;
  const meta = new Map(editableLeaves.map((l) => [l.column_name, l]));
  const allocGroup = columns.find((c) => c.column_name === ALLOC_QTY_GROUP);
  if (!allocGroup?.sub_headers) return;

  allocGroup.sub_headers.forEach((dcHeader) => {
    (dcHeader.sub_headers || []).forEach((leaf) => {
      const m = meta.get(leaf.column_name);
      if (!m) return;
      leaf.is_editable = true;
      leaf.cellRenderer = (params, extraProps) => {
        if (isMissingOrNull(params.data, leaf.column_name)) return "-";
        if (!editGate(editStateRef) || !canEditRow(params.data, m.isPackTypeId)) {
          return params.data[leaf.column_name];
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
    });
  });
};

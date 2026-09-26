/**
 * MTP-146390 — Packs is the only writable quantity; eaches is always
 * forward-derived (packs × pack ratio). Never reverse-derive packs from eaches.
 */

export function isPacksColumn(name = "") {
  if (typeof name !== "string") return false;
  return /_packs_/.test(name) || /_packs$/.test(name) || name.endsWith("_packs");
}

export function isEachesColumn(name = "") {
  if (typeof name !== "string") return false;
  return /_eaches_/.test(name) || /_eaches$/.test(name) || name.endsWith("_eaches");
}

/** Detect Packs sub-column by API label or column_name. */
export function isPacksSubHeader(subHeader) {
  const label = (subHeader?.label || "").trim().toLowerCase();
  const name = subHeader?.column_name || "";
  return label === "packs" || isPacksColumn(name);
}

/** Detect Eaches sub-column by API label or column_name. */
export function isEachesSubHeader(subHeader) {
  const label = (subHeader?.label || "").trim().toLowerCase();
  const name = subHeader?.column_name || "";
  return label === "eaches" || isEachesColumn(name);
}

/** Only Orders Under Review Packs are editable in Edit Values mode. */
export function isEditablePacksStatus(name = "") {
  return typeof name === "string" && name.includes("orders_under_review");
}

/** Not sent for approval: int only — never a link, never editable. */
export function isNotSentForApprovalStatus(name = "") {
  if (typeof name !== "string") return false;
  return name.includes("not_sent") || name.includes("not_sent_for_approval");
}

/** Approved (and similar) Packs stay link-only — never editable. */
export function isLinkOnlyPacksStatus(name = "") {
  return typeof name === "string" && name.includes("approved_orders");
}

export function getOrderTypeForPacksColumn(columnName = "") {
  if (columnName.includes("orders_under_review")) return "Push_Back";
  if (columnName.includes("pending_orders")) return "Send_for_Approval_1";
  if (columnName.includes("approved_orders")) return "approved_orders";
  return null;
}

function makeReadOnlyIntSubHeader(subHeader) {
  return {
    ...subHeader,
    type: "int",
    onClick: undefined,
    is_editable: false,
  };
}

function makeEditableIntSubHeader(subHeader) {
  return {
    ...subHeader,
    type: "int",
    onClick: undefined,
    is_editable: (params) => isPresentNumericCellValue(params?.value),
  };
}

/** `…_packs_…` → `…_eaches_…` (also `_packs` suffix variants). */
export function deriveEachesColumnName(packsColumnName) {
  if (!isPacksColumn(packsColumnName)) return null;
  if (packsColumnName.includes("_packs_")) {
    return packsColumnName.replace(/_packs_/, "_eaches_");
  }
  return packsColumnName.replace(/_packs$/, "_eaches");
}

/**
 * Apply MTP-146390 column rules to sub_headers (recursive for nested groups).
 * Status bucket is derived from the parent group column_name; Packs/Eaches from label.
 */
export function applyOrderRepoPacksEachesSubHeaders(
  columns,
  { isEditMode, onOrderColumnClick }
) {
  const mapColumn = (column) => {
    const statusParentName = column.column_name || "";
    const linkParentName = column.column_name || "";
    const orderType = getOrderTypeForPacksColumn(statusParentName);
    const next = { ...column };

    if (!Array.isArray(next.sub_headers) || !next.sub_headers.length) {
      return next;
    }

    next.sub_headers = next.sub_headers.map((subHeader) => {
      if (Array.isArray(subHeader.sub_headers) && subHeader.sub_headers.length) {
        return mapColumn(subHeader);
      }
      return configureQuantitySubHeader(subHeader, {
        statusParentName,
        linkParentName,
        orderType,
        isEditMode,
        onOrderColumnClick,
      });
    });

    return next;
  };

  return (columns || []).map(mapColumn);
}

function configureQuantitySubHeader(
  subHeader,
  { statusParentName, linkParentName, orderType, isEditMode, onOrderColumnClick }
) {
  const columnName = subHeader.column_name || "";

  if (isEachesSubHeader(subHeader)) {
    return {
      ...subHeader,
      type: "int",
      is_editable: false,
      onClick: undefined,
    };
  }

  if (isPacksSubHeader(subHeader)) {
    // Not sent for approval: always read-only int, never link
    if (isNotSentForApprovalStatus(statusParentName)) {
      return makeReadOnlyIntSubHeader(subHeader);
    }

    const makeLinkSubHeader = () => ({
      ...subHeader,
      type: "link",
      is_editable: true,
      onClick: (tableInfo) => {
        if (!orderType || !onOrderColumnClick) return;
        const clickedValue = tableInfo?.cellData?.value;
        const rowData = tableInfo?.cellData?.data;
        const node = tableInfo?.cellData?.node;
        const parentNodeData = node?.parent?.data;
        onOrderColumnClick(
          orderType,
          linkParentName,
          clickedValue,
          rowData,
          parentNodeData
        );
      },
    });

    if (isLinkOnlyPacksStatus(statusParentName)) {
      return makeLinkSubHeader();
    }

    if (isEditablePacksStatus(statusParentName)) {
      if (isEditMode) {
        return makeEditableIntSubHeader(subHeader);
      }
      return makeLinkSubHeader();
    }

    // Pending, approved, and all other buckets: link only (no edit)
    return makeLinkSubHeader();
  }

  // Legacy single-value status columns (no packs/eaches split)
  if (isNotSentForApprovalStatus(columnName)) {
    return makeReadOnlyIntSubHeader(subHeader);
  }

  if (columnName.includes("orders_under_review")) {
    if (isEditMode) {
      return makeEditableIntSubHeader(subHeader);
    }
    return {
      ...subHeader,
      type: "link",
      is_editable: true,
      onClick: (tableInfo) => {
        if (!onOrderColumnClick) return;
        onOrderColumnClick(
          "Push_Back",
          linkParentName,
          tableInfo?.cellData?.value,
          tableInfo?.cellData?.data,
          tableInfo?.cellData?.node?.parent?.data
        );
      },
    };
  }

  if (
    columnName.includes("pending_orders") &&
    !isPacksSubHeader(subHeader) &&
    !isEachesSubHeader(subHeader)
  ) {
    return {
      ...subHeader,
      type: "link",
      is_editable: true,
      onClick: (tableInfo) => {
        if (!onOrderColumnClick) return;
        onOrderColumnClick(
          "Send_for_Approval_1",
          linkParentName,
          tableInfo?.cellData?.value,
          tableInfo?.cellData?.data,
          tableInfo?.cellData?.node?.parent?.data
        );
      },
    };
  }

  if (columnName.includes("approved_orders")) {
    return {
      ...subHeader,
      type: "link",
      is_editable: true,
      onClick: (tableInfo) => {
        if (!onOrderColumnClick) return;
        onOrderColumnClick(
          "approved_orders",
          linkParentName,
          tableInfo?.cellData?.value,
          tableInfo?.cellData?.data,
          tableInfo?.cellData?.node?.parent?.data
        );
      },
    };
  }

  return {
    ...subHeader,
    type: "int",
    is_editable: false,
    onClick: undefined,
  };
}

/**
 * Pack size ratio for a style. Non-pack styles → 1 (packs === eaches).
 * Supports `pack_config`, `units_in_pack` (number or array), `pack_size_ratio`.
 */
export function getPackRatio(rowData) {
  if (!rowData) return 1;
  let ratio =
    rowData.pack_config ??
    rowData.units_in_pack ??
    rowData.pack_size_ratio ??
    1;

  if (Array.isArray(ratio)) {
    const first = ratio.find((x) => x != null && x !== "");
    ratio = first ?? 1;
  }

  const n = Number(ratio);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function deriveEachesFromPacks(packs, rowData) {
  const packsNum = parseInt(packs, 10) || 0;
  return Math.round(packsNum * getPackRatio(rowData));
}

/**
 * Distribute a new aggregated packs total across children as whole packs.
 * Default: proportional to current packs; if old total is 0, equal split.
 * After rounding, reconcile residual (±1) so Σ children === newTotal.
 *
 * @param {number[]} childPacks - current packs per child
 * @param {number} newTotal - target parent packs
 * @returns {number[]} whole-pack values per child
 */
export function distributePacksWithResidual(childPacks, newTotal) {
  const count = childPacks?.length || 0;
  if (count === 0) return [];

  const target = Math.max(0, parseInt(newTotal, 10) || 0);
  const oldValues = childPacks.map((p) => Math.max(0, parseInt(p, 10) || 0));
  const oldTotal = oldValues.reduce((sum, v) => sum + v, 0);

  let distributed;

  if (oldTotal === 0) {
    const base = Math.floor(target / count);
    distributed = oldValues.map((_, index) =>
      index === count - 1 ? target - base * (count - 1) : base
    );
  } else {
    const ratio = target / oldTotal;
    distributed = oldValues.map((p) => Math.round(p * ratio));

    let sum = distributed.reduce((a, b) => a + b, 0);
    let delta = target - sum;

    // Adjust ±1 packs preferring children with largest original packs
    const indices = distributed
      .map((v, i) => ({ v, i, orig: oldValues[i] }))
      .sort((a, b) => b.orig - a.orig || b.v - a.v)
      .map((x) => x.i);

    let guard = 0;
    while (delta !== 0 && guard < 10000) {
      guard += 1;
      let moved = false;
      for (const i of indices) {
        if (delta === 0) break;
        if (delta > 0) {
          distributed[i] += 1;
          delta -= 1;
          moved = true;
        } else if (distributed[i] > 0) {
          distributed[i] -= 1;
          delta += 1;
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  return distributed.map((v) => Math.max(0, v));
}

export function isPresentNumericCellValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "-" || trimmed === "–") return false;
  }
  if (typeof value === "number" && Number.isNaN(value)) return false;
  return true;
}

function isOrderRepoQuantityLinkField(field = "") {
  if (!field || isEachesColumn(field)) return false;
  if (isPacksColumn(field)) return true;
  return (
    field.includes("orders_under_review") ||
    field.includes("pending_orders") ||
    field.includes("approved_orders")
  );
}

function getQuantityValueFromCell(params, field) {
  if (params?.data && field && Object.prototype.hasOwnProperty.call(params.data, field)) {
    return params.data[field];
  }
  return params?.value;
}

export function hasOrderRepoQuantityLinkValue(params, field = "") {
  const columnField =
    field ||
    params?.colDef?.field ||
    params?.colDef?.column_name ||
    params?.column?.colId ||
    "";
  return isPresentNumericCellValue(getQuantityValueFromCell(params, columnField));
}

/** Block bottom sheet when the clicked quantity is empty / "-". */
export function wrapOrderRepoColumnClick(onOrderColumnClick) {
  if (typeof onOrderColumnClick !== "function") {
    return onOrderColumnClick;
  }
  return (orderType, columnName, value, rowData, parentData) => {
    if (!isPresentNumericCellValue(value)) return;
    onOrderColumnClick(orderType, columnName, value, rowData, parentData);
  };
}

/**
 * Patch formatted AG Grid column defs in place so empty quantity cells are plain
 * "-" (no link button) and clicks cannot open the bottom sheet.
 */
export function patchOrderRepoEmptyQuantityLinks(columnsDef = []) {
  const visit = (cols) => {
    (cols || []).forEach((col) => {
      if (Array.isArray(col.children) && col.children.length) {
        visit(col.children);
      }

      const field = col.column_name || col.field || col.colId || "";
      if (col.type !== "link" || col.extra?.is_grouping_key) return;
      if (!isOrderRepoQuantityLinkField(field)) return;

      const previousRenderer = col.cellRenderer;
      const previousOnClick = col.onClick;

      if (typeof previousOnClick === "function") {
        col.onClick = (tableInfo) => {
          const cellParams = tableInfo?.cellData || tableInfo;
          if (!hasOrderRepoQuantityLinkValue(cellParams, field)) return;
          previousOnClick(tableInfo);
        };
      }

      if (typeof previousRenderer !== "function") return;

      col.cellRenderer = (params, extraProps) => {
        if (!hasOrderRepoQuantityLinkValue(params, field)) {
          return "-";
        }
        return previousRenderer(params, extraProps);
      };
    });
  };

  visit(columnsDef);
  return columnsDef;
}

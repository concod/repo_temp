import { isEmpty } from "lodash";
import { Tooltip, Badge } from "impact-ui-v3";
import WarningIcon from "assets/warning.svg";
import CellRenderer from "core/Utils/agGrid/cellRenderer";
import ImageCellRenderer from "core/Utils/agGrid/cellsToBeRendered/ImageCellRenderer";
import colours from "core/Styles/colours";

export const DEFAULT_COL_FIELD = "transfer_units";
export const DEFAULT_CAP_FIELD = "remaining_source_oh";

const intColumnTypes = ["int", "percentage", "float", "dollar", "euro"];
// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Merges two filter-dependency arrays into one. When the same filter key
 * appears in both arrays its `values` are intersected; filters present in
 * only one array are carried over as-is. Entries with empty `values` are
 * treated as having no data and dropped.
 *
 * O(n + m): the secondary array is indexed in a Map for O(1) lookups.
 *
 * @param {any[]} primary - e.g. s2sFilterDependency
 * @param {any[]} secondary - e.g. microFilterSelectedFilters
 * @returns {any[]} merged dependency array
 */
export const mergeFiltersWithIntersection = (
  primary = [],
  secondary = []
) => {
  const keyOf = (f) => f?.attribute_name || f?.filter_id || f?.column_name;
  const hasValues = (f) => Array.isArray(f?.values) && f.values.length > 0;
  const normalize = (v) => String(typeof v === "object" ? v?.value ?? v : v);

  // Index secondary entries (with data) by filter key for O(1) lookup.
  const secondaryMap = new Map();
  (secondary || []).forEach((f) => {
    const key = keyOf(f);
    if (key && hasValues(f)) secondaryMap.set(key, f);
  });

  const merged = [];
  const consumedKeys = new Set();

  (primary || []).forEach((f) => {
    const key = keyOf(f);
    if (!key || !hasValues(f)) return;
    const other = secondaryMap.get(key);
    if (other) {
      // Same key in both — intersect the values.
      consumedKeys.add(key);
      const otherValues = new Set(other.values.map(normalize));
      merged.push({
        ...f,
        values: f.values.filter((v) => otherValues.has(normalize(v))),
      });
    } else {
      merged.push(f);
    }
  });

  // Keys present only in the secondary array.
  secondaryMap.forEach((f, key) => {
    if (!consumedKeys.has(key)) merged.push(f);
  });

  return merged;
};

/**
 * Resolves the source_store_code from a child node, falling back to parent, then otherData.
 */
export const resolveSourceStoreCode = (node, otherData) => {
  return (
    node.parent?.data?.source_store_code ||
    node.data?.source_store_code ||
    otherData?.sourceStoreCode ||
    ""
  );
};

/**
 * Rows added via the "Add Transfer" panel are flagged with new_created on
 * their parent row only, so the "New" badge should render once per newly
 * added row rather than on every
 * size/child row. Returns the badge JSX, or null if it shouldn't render.
 */
export const renderNewCreatedBadge = (params) => {
  if (params.node.level === 0 && params.data?.new_created) {
    return (
      <div className="flex-align-between-center">
        <span>{params.value}</span>
        <Badge color="success" label="New" variant="subtle" />
      </div>
    );
  }
  return null;
};

/**
 * Refreshes cells for the given nodes and columns in the grid.
 * Accepts a single column string or an array of columns.
 */
export const refreshColumnCells = (api, nodes, columns) => {
  if (!api) return;
  const rowNodes = nodes instanceof Set ? Array.from(nodes) : nodes;
  if (!rowNodes || rowNodes.length === 0) return;
  const cols = Array.isArray(columns) ? columns : [columns];

  api.refreshCells({ rowNodes, columns: cols, force: true });
};

// ─── Core single-node update ────────────────────────────────────────────────

/**
 * Updates a single child node's transfer_units, capped by (oldValue + remaining_source_oh).
 * After update, recalculates remaining_source_oh = maxCap - cappedNewValue.
 *
 * @returns {{ delta: number, wasCapped: boolean, newRemainingOh: number }}
 *
 * @example
 *   // transfer_units was 14, remaining_source_oh is 15 → maxCap = 29
 *   // User types 15 → cappedNewValue = 15, newRemainingOh = 14
 */
export const updateChildColumnValue = (node, newValue, options = {}) => {
  const {
    colField = DEFAULT_COL_FIELD,
    capField = DEFAULT_CAP_FIELD,
    oldValue,
  } = options;

  const currentOldValue = Number(oldValue) || 0;
  const capValue = node.data[capField] < 0 ? 2 : node.data[capField];
  const maxCap = currentOldValue + capValue;
  const numericNewValue = Math.max(0, Number(newValue) || 0);
  const cappedNewValue = Math.min(numericNewValue, maxCap);
  const wasCapped = numericNewValue > maxCap;
  const delta = cappedNewValue - currentOldValue;

  node.setDataValue(colField, cappedNewValue);

  const newRemainingOh = maxCap - cappedNewValue;
  node.setDataValue(capField, newRemainingOh);

  return { delta, wasCapped, newRemainingOh };
};

/**
 * Applies a delta to a parent node's column value (in-memory, no grid event).
 */
export const applyDeltaToParent = (parentNode, delta, options = {}) => {
  const { colField = DEFAULT_COL_FIELD } = options;
  if (!parentNode?.data) return;
  parentNode.data[colField] = (Number(parentNode.data[colField]) || 0) + delta;
};

// ─── Propagation (single source of truth) ───────────────────────────────────

export const updateGrandTotal = ({
  api,
  colField,
  capField,
  totalDelta,
  setGrandTotalRow,
}) => {
  let grandTotalOh = 0;
  let count = 0;
  api.forEachNode((node) => {
    if (node.data?.path?.length === 1) {
      grandTotalOh += Number(node.data[capField]) || 0;
      count++;
    }
  });
  setGrandTotalRow((prev) => ({
    ...prev,
    [colField]: (Number(prev[colField]) || 0) + totalDelta,
    [capField]: Math.floor(grandTotalOh / count),
  }));
};

/**
 * Single-pass propagation: updates remaining_source_oh on all child rows
 * matching the given source_store_code + size, re-aggregates their parent rows,
 * and returns the aggregated grand-total remaining_source_oh.
 *
 * This is the ONLY function that propagates remaining_source_oh.
 * All callers (single edit, bulk update, bulk zero) use this.
 */
export const syncRemainingSourceOh = ({
  api,
  propagationMap,
  capField = DEFAULT_CAP_FIELD,
  setGrandTotalRow,
  totalDelta = 0,
  colField = DEFAULT_COL_FIELD,
}) => {
  if (!api) return;

  if (propagationMap.size === 0) {
    // No propagation needed, but still update grand total
    if (setGrandTotalRow) {
      updateGrandTotal({
        api,
        capField,
        colField,
        totalDelta,
        setGrandTotalRow,
      });
    }
    return;
  }

  const childNodesToRefresh = [];
  const affectedParents = new Set();

  // Single pass: update matching children + collect their parents
  api.forEachNode((node) => {
    if (!node.data) return;

    const nodeSourceStore =
      node.parent?.data?.source_store_code || node.data.source_store_code || "";
    const nodeSize = node.data.sizes || "";
    const key = `${nodeSourceStore}_${nodeSize}`;

    if (propagationMap.has(key)) {
      node.data[capField] = propagationMap.get(key);
      childNodesToRefresh.push(node);
      // Collect parent for re-aggregation
      if (node.parent?.data) {
        affectedParents.add(node.parent);
      }
    }
  });

  // Re-aggregate parent remaining_source_oh from children
  affectedParents.forEach((parentNode) => {
    let total = 0;
    (parentNode.childrenAfterGroup || []).forEach((child) => {
      total += Number(child.data?.[capField]) || 0;
    });
    parentNode.data[capField] = total;
  });

  // Batch refresh all affected nodes
  const allNodesToRefresh = [
    ...childNodesToRefresh,
    ...Array.from(affectedParents),
  ];
  if (allNodesToRefresh.length > 0) {
    refreshColumnCells(api, allNodesToRefresh, capField);
  }

  // Compute aggregated grand total remaining_source_oh from all parent rows
  if (setGrandTotalRow) {
    updateGrandTotal({
      api,
      capField,
      colField,
      totalDelta,
      setGrandTotalRow,
    });
  }
};

// ─── Bulk operations ────────────────────────────────────────────────────────

/**
 * Bulk updates transfer_units for selected child nodes.
 * Handles: capping, remaining_source_oh update, parent rollup,
 *          propagation, grid refresh, and grand total.
 *
 * @param {Object} params
 * @param {Object} params.api - ag-grid API
 * @param {Function} params.getNewValue - (nodeData) => desired new value
 * @param {Function} [params.setGrandTotalRow] - React state setter for grand total
 * @param {Array} [params.nodes] - nodes to update (defaults to selected)
 * @param {Object} [params.otherData] - fallback source/dest store codes
 * @returns {number} total delta
 */
export const bulkUpdateChildColumnValues = ({
  api,
  getNewValue,
  setGrandTotalRow,
  nodes,
  colField = DEFAULT_COL_FIELD,
  capField = DEFAULT_CAP_FIELD,
  otherData,
}) => {
  if (!api) return 0;

  const selectedNodes = nodes || api.getSelectedNodes();
  let totalDelta = 0;
  const parentNodesToRefresh = new Set();
  const propagationMap = new Map();

  selectedNodes.forEach((node) => {
    if (node.data?._isParent) return;
    const currentOldValue = node.data[colField];

    const { delta, newRemainingOh } = updateChildColumnValue(
      node,
      getNewValue(node.data),
      { colField, capField, oldValue: currentOldValue }
    );

    const parentNode = node.parent;
    if (parentNode?.data) {
      applyDeltaToParent(parentNode, delta, { colField });
      parentNodesToRefresh.add(parentNode);
    }

    const srcCode = resolveSourceStoreCode(node, otherData);
    const size = node.data.sizes || "";
    if (srcCode && size) {
      propagationMap.set(`${srcCode}_${size}`, newRemainingOh);
    }

    totalDelta += delta;
  });

  refreshColumnCells(api, parentNodesToRefresh, [colField, capField]);

  syncRemainingSourceOh({
    api,
    propagationMap,
    capField,
    setGrandTotalRow,
    totalDelta,
    colField,
  });

  return totalDelta;
};

/**
 * Zeroes transfer_units for selected parent nodes and all their children.
 * Adds each child's current transfer_units back to remaining_source_oh,
 * then propagates + re-aggregates + updates grand total.
 */
export const bulkZeroParentColumnValues = ({
  api,
  setGrandTotalRow,
  nodes,
  otherData,
  colField = DEFAULT_COL_FIELD,
  capField = DEFAULT_CAP_FIELD,
}) => {
  if (!api) return 0;

  const allSelectedNodes = nodes || api.getSelectedNodes();
  const selectedParents = allSelectedNodes.filter(
    (n) => n.childrenAfterGroup?.length > 0
  );
  let totalDelta = 0;
  const parentNodesToRefresh = [];
  const propagationMap = new Map();

  selectedParents.forEach((parentNode) => {
    const oldParentValue = Number(parentNode.data[colField]) || 0;

    parentNode.childrenAfterGroup.forEach((childNode) => {
      const childOldValue = Number(childNode.data[colField]) || 0;

      const srcCode = resolveSourceStoreCode(childNode, otherData);
      const size = childNode.data.sizes || "";
      const key = srcCode && size ? `${srcCode}_${size}` : "";

      // Use propagationMap as source of truth: if a previous parent already
      // restored remaining_source_oh for this key, start from that value
      // instead of the stale value on this child node
      const currentOh =
        key && propagationMap.has(key)
          ? propagationMap.get(key)
          : Number(childNode.data[capField]) || 0;
      const restored = currentOh + childOldValue;

      childNode.setDataValue(colField, 0);
      childNode.data[capField] = restored;

      if (key) {
        propagationMap.set(key, restored);
      }
    });

    // Zero out the parent and re-aggregate its remaining_source_oh from children
    parentNode.data[colField] = 0;
    let parentCapTotal = 0;
    (parentNode.childrenAfterGroup || []).forEach((child) => {
      parentCapTotal += Number(child.data?.[capField]) || 0;
    });
    parentNode.data[capField] = parentCapTotal;
    parentNodesToRefresh.push(parentNode);
    totalDelta -= oldParentValue;
  });

  refreshColumnCells(api, parentNodesToRefresh, [colField, capField]);

  syncRemainingSourceOh({
    api,
    propagationMap,
    capField,
    setGrandTotalRow,
    totalDelta,
    colField,
  });

  return totalDelta;
};

// ─── UI helpers ─────────────────────────────────────────────────────────────

export const getTooltipTitle = (params) => {
  return (
    <div className="storetostore-tooltip">
      {params.data.info?.warning_message_source && (
        <>
          <div className="store-tooltip-title">
            {params.data.info.warning_message_source}
          </div>
          {params.data.info.warning_stores.map((item) => (
            <div>{item}</div>
          ))}
        </>
      )}
      {params.data.info.warning_message_destination && (
        <>
          <div
            className="store-tooltip-title"
            style={{
              marginTop: params.data.info?.warning_message_source ? "20px" : "",
            }}
          >
            {params.data.info.warning_message_destination}
          </div>
          {params.data.info.warning_destinations.map((item) => (
            <div>{item}</div>
          ))}
        </>
      )}
    </div>
  );
};

export const onKeyDownPreventNeg = (event) => {
  if (event.key === "-") {
    event.preventDefault();
  }
};

export const getCapacityProgressStyleByPercentage = (value) => {
  if (value < 50) {
    return {
      progressColor: colours.neutralText,
      color: "default",
      width: `${value}%`,
    };
  } else if (value >= 50 && value < 80) {
    return {
      progressColor: colours.forestGreen,
      color: "default",
      width: `${value}%`,
    };
  } else if (value >= 80 && value < 100) {
    return {
      progressColor: colours.purple,
      color: "default",
      width: `${value}%`,
    };
  } else if (value >= 100 && value < 110) {
    return {
      progressColor: "#ED7955",
      color: "default",
      width: "100%",
    };
  } else {
    return {
      progressColor: colours.errorRed,
      color: "error",
      width: "100%",
    };
  }
};

export const progressBarCellRenderer = (column) => {
  if (
    column.column_name === "destination_pre_transfer_capacity_pct" ||
    column.column_name === "destination_post_transfer_capacity_pct" ||
    column.column_name === "source_pre_transfer_capacity_pct" ||
    column.column_name === "source_post_transfer_capacity_pct" ||
    column.column_name === "post_transfer_capacity_pct" ||
    column.column_name === "pre_transfer_capacity_pct"
  ) {
    return {
      ...column,
      cellRenderer: (params) => {
        const progressStyle = getCapacityProgressStyleByPercentage(
          Number(params.value || 0)
        );
        if (params.value != null || params.value != undefined) {
          return (
            <div className="capacity-progress-bar-container">
              <div className="capacity-progress-bar">
                <div
                  className="capacity-progress"
                  style={{
                    background: progressStyle.progressColor,
                    width: progressStyle.width,
                  }}
                />
              </div>
              <Badge
                variant="subtle"
                size="small"
                label={`${params.value}%`}
                color={progressStyle.color}
              />
            </div>
          );
        }
        return <div className="number-cell">{params.value || "-"}</div>;
      },
    };
  }
  return column;
};

/**
 * A drawer row can belong to a different plan than the one in the URL
 * (order batching lists many allocation codes together), so editability is
 * decided per row using the allocation codes we actually hold a lock for.
 * When no lock info is available we fall back to the screen level edit mode.
 *
 * @param {Object} params - ag-grid cell/row params (or `{ data, node }`)
 * @param {string[]} [lockedAllocationCodes]
 */
export const isRowEditLocked = (params, lockedAllocationCodes) => {
  if (!lockedAllocationCodes?.length) return true;
  const allocationCode =
    params?.data?.allocation_code ||
    params?.node?.parent?.data?.allocation_code;
  if (!allocationCode) return true;
  // Lock map keys are always strings, row values may come back numeric
  return lockedAllocationCodes
    .map((code) => String(code))
    .includes(String(allocationCode));
};

export const applyDrawerCellRenderer = (cols, otherData) => {
  return cols.map((column) => {
    if (column.sub_headers && column.sub_headers.length) {
      const nested = applyDrawerCellRenderer(column.sub_headers, otherData);
      column.sub_headers = nested;
      column.children = nested;
    }
    if (column.column_name === "sizes") {
      return {
        ...column,
        cellRenderer: "agGroupCellRenderer",
        cellRendererParams: {
          suppressCount: true,
          innerRenderer: (params) => {
            if (params.data?._isParent) {
              return "View Sizes";
            }
            return (
              <div className="store-2-store-size-warning">
                <span>{params.value}</span>
                {params.data.info && !isEmpty(params.data.info) ? (
                  <Tooltip
                    orientation="top"
                    title={getTooltipTitle(params)}
                    variant="tertiary"
                  >
                    <span className="waring-icon">
                      <WarningIcon />
                    </span>
                  </Tooltip>
                ) : undefined}
              </div>
            );
          },
        },
      };
    }
    if (column.column_name === "transfer_units") {
      if (otherData && otherData.editMode === "edit") {
        return {
          ...column,
          cellRenderer: (params, extraProps) => {
            if (
              params.node.rowPinned !== "top" &&
              params.node.level !== 0 &&
              isEmpty(params.data?.info) &&
              isRowEditLocked(params, otherData.lockedAllocationCodes) &&
              (!params.node.parent?.data?.review_status ||
              otherData.isOrderBatching
                ? params.node.parent?.data?.review_status !== "Created"
                : params.node.parent?.data?.review_status === "Created")
            ) {
              return (
                <CellRenderer
                  cellData={{ ...params, onKeyDown: onKeyDownPreventNeg }}
                  column={column}
                  extraProps={extraProps}
                  actions={null}
                />
              );
            }
            return <div className="number-cell">{params.value}</div>;
          },
        };
      }
      return {
        ...column,
        cellRenderer: null,
      };
    }
    if (column.column_name === "article") {
      return {
        ...column,
        cellRenderer: (params) => {
          const newBadge = renderNewCreatedBadge(params);
          if (newBadge) return newBadge;

          if (
            params.node.level === 0 &&
            otherData &&
            params.data?.article === otherData?.selectedArticle?.article
          ) {
            return (
              <div className="flex-align-between-center">
                <span>{params.value}</span>
                <Badge color="info" label="Selected" variant="subtle" />
              </div>
            );
          }
          return params.value || "";
        },
      };
    }
    if (column.column_name === "source_store_code") {
      return {
        ...column,
        cellRenderer: (params) => {
          const newBadge = renderNewCreatedBadge(params);
          if (newBadge) return newBadge;

          return params.value ?? "";
        },
      };
    }
    if (column.column_name === "plan_name") {
      return editModeGetLinkRenderer({
        column,
        editMode: otherData?.editMode,
        actionMap: otherData?.actionMap,
      });
    }
    if (column.type === "image") {
      return {
        ...column,
        cellRenderer: (params) => {
          if (params.node.rowPinned !== "top") {
            return ImageCellRenderer(
              params,
              true,
              true,
              column.tableConfig,
              []
            );
          }
          return params.value;
        },
      };
    }
    return progressBarCellRenderer(column);
  });
};

export const getBadgeColorMapping = () => {
  return {
    approved: "#0B832F",
    "move to order batching": colours.studio,
    "moved to order batching": colours.studio,
    "moved to allocation batching": colours.studio,
    created: "#5267F4",
  };
};

// Store view → store_code; Grade leaf → psa_name; Region leaf → region
export const resolveStoreCodeFromRow = (data) => {
  if (!data) return null;
  return data.store_code || data.psa_name || data.region || null;
};

export const getReviewStatusCellRenderer = (column, width = 240) => {
  return {
    ...column,
    width,
    cellRenderer: (params) => {
      if (params.value) {
        const color = getBadgeColorMapping()[params.value.toLowerCase()];
        return (
          <div className="s2s-review-badge-container">
            <div
              style={{
                color: color,
                borderColor: color,
              }}
              className="s2s-review-badge"
            >
              {params.value}
            </div>
          </div>
        );
      }
      return "-";
    },
  };
};

export const isEditEnabled = (selectedArticle, isOrderBatching) => {
  if (isOrderBatching) {
    return selectedArticle?.review_status?.toLowerCase() !== "created";
  }
  return selectedArticle?.review_status?.toLowerCase() === "created";
};

export const getEditModeBasedOnReviewStatus = (
  selectedArticle,
  editMode,
  isOrderBatching,
  selectedStore
) => {
  if (isOrderBatching) {
    return selectedArticle?.review_status?.toLowerCase() !== "created" ||
      selectedStore?.review_status?.toLowerCase() !== "created"
      ? editMode
      : "view";
  }
  return selectedArticle?.review_status?.toLowerCase() === "created" ||
    selectedStore?.review_status?.toLowerCase() === "created"
    ? editMode
    : "view";
};
// Review statuses that lock a row from being selected/edited
export const NON_SELECTABLE_REVIEW_STATUSES = [
  "move to order batching",
  "moved to order batching",
  "moved to allocation batching",
  "approved",
];

export const isRowSelectionRestricted = (data) => {
  const status = data?.review_status;
  return (
    !!status &&
    NON_SELECTABLE_REVIEW_STATUSES.includes(String(status).toLowerCase())
  );
};

export const editModeGetLinkRenderer = ({ column, editMode, actionMap }) => {
  if (editMode === "view") {
    return {
      ...column,
      width: 260,
      cellRenderer: null,
    };
  } else {
    return {
      ...column,
      width: 260,
      cellRenderer: (params, extraProps) => {
        if (params.node.level === 0 && params.node.rowPinned !== "top") {
          return (
            <CellRenderer
              cellData={params}
              column={column}
              extraProps={extraProps}
              actions={actionMap}
            />
          );
        } else {
          return params.value;
        }
      },
    };
  }
};

export const greenRedColorNumberRenderer = (column) => {
  return {
    ...column,
    cellRenderer: (params) => {
      const isNegative = params.value && Number(params.value) < 0;
      const isPositive = params.value && Number(params.value) > 0;
      const colorName = isNegative
        ? colours.errorRed
        : isPositive
        ? colours.pepGreen
        : "";
      return (
        <div
          style={{ color: colorName, width: "100%" }}
          className={intColumnTypes.includes(column.type) ? "number-cell" : ""}
        >
          {isPositive ? `+${params.value}` : params.value}
        </div>
      );
    },
  };
};

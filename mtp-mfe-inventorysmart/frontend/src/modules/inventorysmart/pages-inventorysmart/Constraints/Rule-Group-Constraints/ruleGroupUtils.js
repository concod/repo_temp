import React from "react";
import { getColumnsAg } from "actions/tableColumnActions";
import { Badge } from "impact-ui-v3";
import moment from "moment";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { MIN_DISTRIBUTION_MAP } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { cellStyles } from "./ruleGroupStyles";
import ConstraintOverflowTooltip from "../landing-screen/ConstraintOverflowTooltip";
import {
  applyMinDistributionRowFields,
  hasNestedStyleSizeMinDistribution,
} from "../create-new-rule-flow/createNewRuleConstraintsUtils";

export const RULE_GROUPS_TABLE_NAME = "rule_groups_constraint_table";
export const RULE_GROUPS_TABLE_COLUMNS_QUERY = `table_name=${RULE_GROUPS_TABLE_NAME}`;

// Content-based height for the expanded detail grids (Constraints/Exceptions).
const INNER_GRID_ROW_HEIGHT = 46;
const INNER_GRID_MAX_ROWS = 10;
const INNER_GRID_EMPTY_HEIGHT = "140px";

export const getDetailGridHeight = (params) => {
  const count = params?.api?.getDisplayedRowCount?.() || 0;
  if (count === 0) return INNER_GRID_EMPTY_HEIGHT;
  const visibleRows = Math.min(count, INNER_GRID_MAX_ROWS);
  // +16px keeps the horizontal scrollbar from clipping the last row.
  return `${visibleRows * INNER_GRID_ROW_HEIGHT + 16}px`;
};

const STATUS_BADGE_COLOR = {
  "Expiring Soon": "warning",
  Active: "success",
  Scheduled: "info",
};

const getStatusCounts = (statusList) => {
  if (!Array.isArray(statusList) || !statusList.length) return {};
  return statusList.reduce((acc, status) => {
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
};

const statusCellRenderer = (params) => {
  const statusList = params?.data?.status_list;
  const statusCounts = getStatusCounts(statusList);
  const STATUS_ORDER = ["Expiring Soon", "Active", "Scheduled"];
  const entries = STATUS_ORDER
    .filter((key) => statusCounts[key])
    .map((key) => [key, statusCounts[key]]);
  if (!entries.length) return "";
  return (
    <div style={cellStyles.statusBadgeRow}>
      {entries.map(([label, count]) => (
        <Badge
          key={label}
          label={`${label}(${count})`}
          variant="stroke"
          color={STATUS_BADGE_COLOR[label] || "default"}
          size="default"
        />
      ))}
    </div>
  );
};

export const statusBadgeCellRenderer = (params) => {
  const value = params?.value;
  if (!value) return "";
  return (
    <Badge
      label={value}
      variant="stroke"
      color={STATUS_BADGE_COLOR[value] || "default"}
      size="default"
    />
  );
};

const tenantDateFormat = localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY";

const formatDate = (date) => {
  if (!date) return "";
  return moment(date).format(tenantDateFormat);
};

const dateRangeCellRenderer = (params) => {
  const startDate = params?.data?.start_date;
  const endDate = params?.data?.end_date;
  if (!startDate && !endDate) return "";
  return (
    <span>{formatDate(startDate)} → {formatDate(endDate)}</span>
  );
};

let ruleGroupsTableColumnsRequest = null;

export const fetchRuleGroupsTableColumns = () => {
  if (!ruleGroupsTableColumnsRequest) {
    ruleGroupsTableColumnsRequest = getColumnsAg(
      RULE_GROUPS_TABLE_COLUMNS_QUERY
    )().catch((error) => {
      ruleGroupsTableColumnsRequest = null;
      throw error;
    });
  }
  return ruleGroupsTableColumnsRequest;
};

// Options for the "Sort by" dropdown in the Rule Groups table header.
// Status is intentionally excluded (custom badge cell renderer, not a plain field).
export const RULE_GROUP_SORT_OPTIONS = [
  { label: "A \u2192 Z", value: "name_asc" },
  { label: "Z \u2192 A", value: "name_desc" },
  { label: "Newest First", value: "newest" },
  { label: "Oldest First", value: "oldest" },
];

const compareStrings = (a, b) =>
  (a ?? "")
    .toString()
    .toLowerCase()
    .localeCompare((b ?? "").toString().toLowerCase());

const toTime = (value) => {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

// Nulls always sink to the bottom regardless of sort direction.
const compareDates = (a, b, dir) => {
  const at = toTime(a);
  const bt = toTime(b);
  if (at == null && bt == null) return 0;
  if (at == null) return 1;
  if (bt == null) return -1;
  return (at - bt) * dir;
};

// In-memory sort for the client-side Rule Groups list. Returns a new array;
// an unknown/empty sort value returns the rows unchanged (original order).
export const sortRuleGroups = (rows, sortValue) => {
  if (!Array.isArray(rows) || !sortValue) return rows;
  const sorted = [...rows];
  switch (sortValue) {
    case "name_asc":
      sorted.sort((a, b) => compareStrings(a?.group_name, b?.group_name));
      break;
    case "name_desc":
      sorted.sort((a, b) => compareStrings(b?.group_name, a?.group_name));
      break;
    case "newest":
      sorted.sort((a, b) => compareDates(a?.start_date, b?.start_date, -1));
      break;
    case "oldest":
      sorted.sort((a, b) => compareDates(a?.start_date, b?.start_date, 1));
      break;
    default:
      return rows;
  }
  return sorted;
};

const expandedGroups = new Set();
export const clearExpandedGroups = () => expandedGroups.clear();

const GroupCellRenderer = (params) => {
  const groupId = params?.data?.group_id;

  const [expanded, setExpanded] = React.useState(params.node.expanded);
  const [hasBeenExpanded, setHasBeenExpanded] = React.useState(
    expandedGroups.has(groupId)
  );

  React.useEffect(() => {
    const listener = (event) => {
      if (event.node === params.node) {
        setExpanded(event.node.expanded);
        if (event.node.expanded) {
          setHasBeenExpanded(true);
          expandedGroups.add(groupId);
        }
      }
    };
    params.api.addEventListener("rowGroupOpened", listener);
    return () => params.api.removeEventListener("rowGroupOpened", listener);
  }, [params.api, params.node]);

  const toggle = (e) => {
    e.stopPropagation();
    params.node.setExpanded(!params.node.expanded);
  };

  // Show a blue dot only when created_by and updated_by differ (both present).
  // A null updated_by is treated as "not updated" and does NOT show the dot.
  // updated_by is treated as a number for the comparison.
  // The dot disappears once the row has been expanded and does not reappear.
  const createdBy = params?.data?.created_by;
  const updatedBy = params?.data?.updated_by;
  const hasCreatedBy = createdBy != null;
  const isNotUpdated = updatedBy == null;
  const showUpdatedDot =
    !hasBeenExpanded &&
    hasCreatedBy &&
    !isNotUpdated &&
    Number(createdBy) !== Number(updatedBy);

  return (
    <div style={cellStyles.groupCellContainer}>
      <div style={cellStyles.groupCellToggleWrapper}>
        {showUpdatedDot && <span style={cellStyles.groupCellUpdatedDot} />}
        <button
          onClick={toggle}
          style={{
            ...cellStyles.groupCellToggleButton,
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <NavigateNextIcon style={cellStyles.groupCellIcon} />
        </button>
      </div>
      <div style={cellStyles.groupCellNameWrapper}>
        <ConstraintOverflowTooltip {...params} value={params.value || ""} />
      </div>
    </div>
  );
};

export const applyRuleGroupColumnRenderers = (colDef) => {
  const name = colDef?.column_name || colDef?.field;
  //custom logic for table type list view 
  if (colDef?.type === "int" || colDef?.type === "float") {
    colDef.cellStyle = { ...colDef.cellStyle, textAlign: "right" };
    colDef.headerClass = `${colDef.headerClass || ""} ag-right-aligned-header`;
    // The default numeric renderer wraps the value in an `inline-block` span (OverflowTooltip).
    // An inline-block with a fixed height sits on the text baseline and inflates the cell's
    // line box (~55px vs the 46px row), pushing the value above the vertical center. Render
    // through the block-level ConstraintOverflowTooltip instead so the value stays centered
    // (and still truncates with a tooltip). Right alignment comes from the inherited textAlign
    // applied to the full-width block span.
    colDef.cellRenderer = (params) => <ConstraintOverflowTooltip {...params} />;
  }
  if (name === "group_name") {
    colDef.cellRenderer = GroupCellRenderer;
  }
  if (name === "status") {
    colDef.cellRenderer = statusCellRenderer;
    colDef.minWidth = 370;
  }
  if (name === "daterange") {
    colDef.cellRenderer = dateRangeCellRenderer;
  }
  if (name === "last_updated") {
    colDef.cellRenderer = (params) => {
      const value = params?.data?.last_updated;
      if (!value) return "";
      return <span>{formatDate(value)}</span>;
    };
  }
  // Plain text columns: use ConstraintOverflowTooltip so they align with custom
  // renderers and truncate with a tooltip (default formatter uses inline-block).
  const COLUMNS_WITH_CUSTOM_RENDERER = [
    "group_name",
    "status",
    "daterange",
    "last_updated",
  ];
  const isPlainTextColumn =
    colDef?.type === "str" || colDef?.type === "link";
  if (
    !COLUMNS_WITH_CUSTOM_RENDERER.includes(name) &&
    !colDef?.children &&
    isPlainTextColumn
  ) {
    colDef.cellRenderer = (params) => <ConstraintOverflowTooltip {...params} />;
  }
  if (colDef?.children) {
    colDef.children.forEach(applyRuleGroupColumnRenderers);
  }
  return colDef;
};


export const transformMinDistribution = (
  apiData,
  { isNewConstraintsFlow = false } = {}
) => {
  return apiData.map((row) => {
    let inputData = row.data;
    if (inputData && Array.isArray(inputData)) {
      inputData = inputData.map((subRow) => {
        if (
          isNewConstraintsFlow ||
          hasNestedStyleSizeMinDistribution(subRow)
        ) {
          return applyMinDistributionRowFields(subRow);
        }
        let minDistributionType = "Same minimum for all sizes";
        let sizeSelectionData = {};
        if (subRow.min_distribution) {
          try {
            const legacy = JSON.parse(subRow.min_distribution) || {};
            minDistributionType =
              MIN_DISTRIBUTION_MAP[legacy.distribution_type] ||
              "Same minimum for all sizes";
            sizeSelectionData = legacy.x_units_per_size || {};
          } catch (e) {
            minDistributionType = "Same minimum for all sizes";
          }
        }
        return {
          ...subRow,
          min_distribution: minDistributionType,
          x_units_per_size: sizeSelectionData,
        };
      });
    }
    return { ...row, data: inputData };
  });
};



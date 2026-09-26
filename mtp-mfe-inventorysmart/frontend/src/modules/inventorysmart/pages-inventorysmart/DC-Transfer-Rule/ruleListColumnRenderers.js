import { Badge } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";

const RULE_NAME_CELL_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  height: "100%",
  width: "100%",
  boxSizing: "border-box",
  overflow: "visible",
};

const RULE_NAME_TEXT_STYLE = {
  minWidth: 0,
  flex: "1 1 auto",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const DEFAULT_BADGE_SX = {
  "&.MuiChip-root": {
    backgroundColor: "#F2F3F4 !important",
  },
  "& .MuiChip-label": {
    color: "#5F6673 !important",
  },
};

export const isDefaultDCTransferRule = (row) => {
  if (!row) {
    return false;
  }

  const flag = row.is_default ?? row.isDefault ?? row.default;
  if (
    flag === true ||
    flag === 1 ||
    flag === "1" ||
    flag === "true" ||
    flag === "True"
  ) {
    return true;
  }

  const ruleName = String(row.rule_name ?? "").trim().toLowerCase();
  return (
    ruleName === "default_rule" ||
    ruleName === "default rule" ||
    ruleName === "default"
  );
};

const getFulfillmentTypeTagConfig = (value, fulfillmentLabels = {}) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalizedKey = String(value).toLowerCase();
  const label = fulfillmentLabels[normalizedKey];

  if (label) {
    return {
      label,
      variant: "solid",
    };
  }

  return {
    label: String(value),
    variant: "solid",
  };
};

const fillFullMentStyles = makeStyles(() => ({
  tagContainer: {
    display: "flex",
    alignItems: "center",
    height: "100%"
  },
  tag: {
    display: "flex",
    padding: "2px 8px",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    width: "fit-content",
    borderRadius: "1000px",
    textAlign: "center",
    textOverflow: "ellipsis",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "20px",
    textTransform: "capitalize"
  },
  need_based: {
    background: colours.cararra,
    color: colours.avocado,
  },
  fixed_push: {
    background: colours.hummingBird,
    color: colours.easternBlue, 
  }
}))

export const fulfillmentLabels = {
  need_based: "Need Based",
  fixed_push: "Fixed Push",
};

export const FulfillmentTypeTagCell = (params) => {  
  const fillTagStyle = fillFullMentStyles();
  const value = params?.value ?? params?.data?.fulfillment_type;
  const fulfillmentLabels = params?.fulfillmentLabels || {};
  const tagConfig = getFulfillmentTypeTagConfig(value, fulfillmentLabels);

  if (!tagConfig) {
    return "-";
  }

  return (
    <div className={fillTagStyle.tagContainer}>
      <div className={`${fillTagStyle.tag} ${fillTagStyle[value]}`}>
        {tagConfig.label}
      </div>
    </div>
  );
};

export const RuleNameWithDefaultTagCell = (params) => {
  const data = params?.data || {};
  const ruleName = params?.value ?? data?.rule_name ?? "";
  const defaultLabel = params?.defaultLabel || "Default";
  const showDefaultBadge = isDefaultDCTransferRule(data);

  return (
    <div style={RULE_NAME_CELL_STYLE}>
      <span style={RULE_NAME_TEXT_STYLE}>{ruleName}</span>
      {showDefaultBadge ? (
        <Badge
          color="default"
          label={defaultLabel}
          size="small"
          variant="filled"
          sx={DEFAULT_BADGE_SX}
        />
      ) : null}
    </div>
  );
};

const isRuleNameColumn = (column) =>
  column?.column_name === "rule_name" || column?.field === "rule_name";

const isFulfillmentTypeColumn = (column) => {
  const keys = [column?.column_name, column?.field].filter(Boolean);
  return keys.some((key) =>
    ["fulfillment_type", "fulfilment_type"].includes(String(key).toLowerCase())
  );
};

const visitColumns = (columns, visitor) => {
  columns?.forEach((column) => {
    if (column?.children?.length) {
      visitColumns(column.children, visitor);
      return;
    }

    if (column?.sub_headers?.length) {
      visitColumns(column.sub_headers, visitor);
      return;
    }

    visitor(column);
  });
};

export const applyDCTransferRuleListColumnRenderers = (
  columns = [],
  {
    defaultLabel = "Default",
    needBasedLabel = "Need Based",
    fixedPushLabel = "Fixed Push",
  } = {}
) => {
  const fulfillmentLabels = {
    need_based: needBasedLabel,
    fixed_push: fixedPushLabel,
  };
  const nextColumns = columns.map((column) => ({ ...column }));

  visitColumns(nextColumns, (column) => {
    if (isRuleNameColumn(column)) {
      column.type = "str";
      column.is_editable = false;
      column.editable = false;
      column.minWidth = column.minWidth || 220;
      column.flex = column.flex || 1;
      column.cellStyle = {
        ...(typeof column.cellStyle === "object" ? column.cellStyle : {}),
        display: "flex",
        alignItems: "center",
        overflow: "visible",
      };
      column.cellRenderer = (cellProps) => (
        <RuleNameWithDefaultTagCell
          {...cellProps}
          defaultLabel={defaultLabel}
        />
      );
      return;
    }

    if (isFulfillmentTypeColumn(column)) {
      column.type = "str";
      column.is_editable = false;
      column.editable = false;
      column.cellRenderer = (cellProps) => (
        <FulfillmentTypeTagCell
          {...cellProps}
          fulfillmentLabels={fulfillmentLabels}
        />
      );
    }
  });

  return nextColumns;
};

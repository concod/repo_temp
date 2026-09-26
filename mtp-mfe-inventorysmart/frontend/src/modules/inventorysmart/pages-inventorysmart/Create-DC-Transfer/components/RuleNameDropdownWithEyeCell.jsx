import React from "react";
import { makeStyles } from "@mui/styles";
import EyeIcon from "assets/IS_icons/IS_Eye.svg";
import { Tooltip } from "impact-ui-v3";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import {
  DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN,
} from "../../DC-Transfer-Configuration/constants";
import { findMatchedRuleOption } from "../../DC-Transfer-Configuration/common-functions";

const RULE_NAME_DROPDOWN_WIDTH = 184;
const EYE_ICON_WIDTH = 24;

const useStyles = makeStyles(() => ({
  cellContainer: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  dropdownContainer: {
    flex: `1 1 ${RULE_NAME_DROPDOWN_WIDTH}px`,
    minWidth: 0,
    maxWidth: `${RULE_NAME_DROPDOWN_WIDTH}px`,
  },
  eyeIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: `0 0 ${EYE_ICON_WIDTH}px`,
    width: `${EYE_ICON_WIDTH}px`,
    minWidth: `${EYE_ICON_WIDTH}px`,
    cursor: "pointer",
    lineHeight: 0,
    "& svg": {
      width: "16px",
      height: "16px",
      display: "block",
    },
    "& svg path": {
      fill: "#60697D",
    },
  },
}));

const RuleNameDropdownWithEyeCell = (params) => {
  const classes = useStyles();
  const data = params?.data || {};
  const colDef = params?.column?.colDef || {};
  const accessor =
    colDef.accessor ||
    colDef.field ||
    DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN;

  const ruleOptions = params?.getRuleOptions?.() ?? [];
  const matchedOption = findMatchedRuleOption(data, ruleOptions);
  const canViewRule = Boolean(matchedOption?.value);

  const columnItem = {
    ...colDef,
    accessor,
    column_name: accessor,
    field: colDef.field || accessor,
    type: colDef.type || "dynamic-list",
    extra: colDef.extra,
    is_editable: colDef.is_editable ?? colDef.editable,
  };

  const handleViewRule = (event) => {
    event?.stopPropagation?.();
    if (!canViewRule) {
      return;
    }
    params?.onViewRule?.(data);
  };

  return (
    <div className={classes.cellContainer}>
      <div className={classes.dropdownContainer}>
        <CellRenderers cellData={params} column={columnItem} />
      </div>
      <Tooltip title="View rule mapping" orientation="top" variant="tertiary">
        <span
          role="button"
          tabIndex={0}
          className={classes.eyeIcon}
          onClick={handleViewRule}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleViewRule(event);
            }
          }}
        >
          <EyeIcon />
        </span>
      </Tooltip>
    </div>
  );
};

export default RuleNameDropdownWithEyeCell;

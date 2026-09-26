import React from "react";
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { makeStyles } from "@mui/styles";
import { pxToRem } from "core/Utils/functions/utils";
import colours from "core/Styles/colours";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    alignItems: "center",
    width: "100%"
  },
  textSpan: {
    width: "auto",
    paddingRight: pxToRem(32),
    flex: "0 1 auto"
  },
  spacer: {
    flex: "1 1 auto"
  },
  statusIcon: {
    fontSize: pxToRem(16),
    flex: "0 0 auto"
  }
}));

const RuleIdWithStatusCell = (props) => {
  const classes = useStyles();
  const { value, status, node } = props;

  // Get status from the most reliable source for agGroupCellRenderer
  const actualStatus = status || 
                      node?.data?.rule_id_status || 
                      node?.data?.data?.rule_id_status ||
                      null;
  
  const level = node?.node?.level;

  // For group rows (level 0), show the text with status (if not null)
  // For child rows, show just the text
  if (level === 0) {
    if (actualStatus === null) {
      // Show only text when status is null
      return <span>{value || ""}</span>;
    }
    
    const isStatusActive = actualStatus === "active";
    const StatusIcon = isStatusActive ? CheckCircleOutlineOutlinedIcon : ErrorOutlineOutlinedIcon;
    const iconColor = isStatusActive ? colours.successTick : colours.errorInfo;
    
    // Return inner content for agGroupCellRenderer to wrap
    return (
      <div className={classes.container}>
        <span className={classes.textSpan}>
          {value || ""}
        </span>
        <div className={classes.spacer}></div>
        <StatusIcon 
          className={classes.statusIcon}
          style={{ color: iconColor }}
        />
      </div>
    );
  }

  // For child rows, just return the text
  return <span>{value || ""}</span>;
};

export default RuleIdWithStatusCell;

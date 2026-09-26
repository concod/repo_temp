import React from "react";
import { Panel } from "impact-ui-v3";
import { useATAStyles } from "./ata-styles";

/**
 * Right-side panel to display all allocation codes (plans) for a violation row.
 * Opens when the user clicks the "+X" badge in the violations table.
 */
const AllocationCodesPanel = ({ open, onClose, codes = [] }) => {
  const classes = useATAStyles();

  return (
    <Panel
      open={open}
      onClose={onClose}
      anchor="right"
      size="large"
      title="Allocations plans"
    >
      <div className={classes.panelContent}>
        <h4 className={classes.panelHeading}>
          {`Plans (${codes.length})`}
        </h4>
        <div className={classes.panelBadgeContainer}>
          {codes.map((code, index) => (
            <span key={`${code}-${index}`} className={classes.panelBadge}>
              {code}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
};

export default AllocationCodesPanel;

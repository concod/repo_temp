import React from "react";
import {
  getRuleTypeStatusLabel,
  isCreateNewRuleRow,
} from "./createNewRuleConstraintsUtils";

const getRuleTypeBadgeStyle = (row) => {
  if (isCreateNewRuleRow(row)) {
    return {
      backgroundColor: "#F4F1F9",
      color: "#7552AD",
    };
  }

  return {
    backgroundColor: "#F2F3F4",
    color: "#5F6673",
  };
};

const ColoredBadge = ({ label, backgroundColor, color }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      maxWidth: "164px",
      padding: "2px 8px",
      borderRadius: "16px",
      backgroundColor,
      color,
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: "20px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}
  >
    {label}
  </div>
);

/**
 * AG Grid cell renderer for Rule Type (New Rule vs Existing Rule).
 * Uses `is_new_rule` and `rule_type` on the row — not the raw cell string.
 */
export const renderRuleTypeStatusBadge = (params) => {
  if (params?.node?.level !== 0 || !params?.data) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        height: "100%",
        flexWrap: "wrap",
      }}
    >
      <ColoredBadge
        label={getRuleTypeStatusLabel(params.data)}
        {...getRuleTypeBadgeStyle(params.data)}
      />
    </div>
  );
};

import React from "react";
import { Badge } from "impact-ui-v3";

const DRAFT_TYPE_COLORS = {
  ia: {
    color: "#BE77EE",
    label: "Manual Off Cycle Order",
  },
  modified: {
    color: "#6BBEC2",
    label: "Expedite Off Cycle Order",
  },
};

export function getDraftTypeDisplay(draftType) {
  const value = draftType != null ? String(draftType) : "";
  if (value.toLowerCase().includes("manual")) {
    return DRAFT_TYPE_COLORS.ia;
  }
  if (value.toLowerCase().includes("expedite")) {
    return DRAFT_TYPE_COLORS.modified;
  }
  return { color: "#5F6673", label: value || "-" };
}

export default function DraftTypeCellRenderer(params) {
  const { color, label } = getDraftTypeDisplay(params?.value);

  return (
    <Badge
      label={label}
      variant="stroke"
      size="small"
      sx={{
        "&.MuiChip-root": { border: `1px solid ${color} !important` },
        "& .MuiChip-label": { color: `${color} !important` },
      }}
    />
  );
}

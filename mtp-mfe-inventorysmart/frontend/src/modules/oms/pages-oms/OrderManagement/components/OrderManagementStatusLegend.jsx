import React from "react";
import { MATRIX_SUMMARY_ROQ_STATUS_LEGEND_V3 } from "modules/oms/constants-oms/stringConstants.js";

const legendRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 16,
  padding: "4px 0",
};

const legendItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const swatchBaseStyle = {
  width: 10,
  height: 10,
  borderRadius: 2,
  flexShrink: 0,
};

const labelStyle = {
  fontSize: 12,
  color: "#3f4754",
};

function OrderManagementStatusLegend() {
  return (
    <div style={legendRowStyle} aria-label="ROQ status legend">
      {MATRIX_SUMMARY_ROQ_STATUS_LEGEND_V3.map((item) => (
        <div key={item.label} style={legendItemStyle}>
          <span
            style={{
              ...swatchBaseStyle,
              backgroundColor: item.backgroundColor,
              border: item.border,
            }}
          />
          <span style={labelStyle}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default OrderManagementStatusLegend;

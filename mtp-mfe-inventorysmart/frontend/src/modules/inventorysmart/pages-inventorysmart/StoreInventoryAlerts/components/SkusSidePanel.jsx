import React from "react";
import { Badge, Panel } from "impact-ui-v3";
import colours from "core/Styles/colours";
import "./skus.css";

const SIDE_PANEL_BADGE_SX = {
  "&.MuiChip-root.impact_badges_only_label_stroke": {
    borderRadius: "var(--Scales-S_max, 1000px)",
    border: `1px solid ${colours.chips}`,
    background: colours.lighterGrey,
  },
};

const SkusSidePanel = ({ open, onClose, title, skus }) => {
  const list = Array.isArray(skus) ? skus : [];

  return (
    <Panel
      open={open}
      onClose={onClose}
      anchor="right"
      size="large"
      title={title}
    >
      <div className="skus-side-panel-content">
        <h4 className="skus-side-panel-title">{`Styles (${list.length})`}</h4>
        <div className="skus-side-panel-grid">
          {list.map((item, index) => (
            <Badge
              key={`${item}-${index}`}
              label={item}
              variant="stroke"
              size="small"
              sx={SIDE_PANEL_BADGE_SX}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
};

export default SkusSidePanel;

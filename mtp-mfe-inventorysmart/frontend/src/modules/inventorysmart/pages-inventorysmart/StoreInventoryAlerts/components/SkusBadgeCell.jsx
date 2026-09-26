import React from "react";
import { Badge, Tooltip } from "impact-ui-v3";
import "./skus.css";

const MAX_VISIBLE_BADGES = 3;
const BADGE_SX_STYLES = [
  {
    "&.MuiChip-root.impact_badges_only_label_stroke": {
      backgroundColor: "#F6F6F3",
      border: "none",
    },
    "&.MuiChip-root.impact_badges_only_label_stroke .MuiChip-label": {
      color: "#8C906A",
    },
  },
  {
    "&.MuiChip-root.impact_badges_only_label_stroke": {
      backgroundColor: "#E9F7FC",
      border: "none",
    },
    "&.MuiChip-root.impact_badges_only_label_stroke .MuiChip-label": {
      color: "#1789A5",
    },
  },
  {
    "&.MuiChip-root.impact_badges_only_label_stroke": {
      backgroundColor: "#F4F1F9",
      border: "none",
    },
    "&.MuiChip-root.impact_badges_only_label_stroke .MuiChip-label": {
      color: "#7552AD",
    },
  },
];

const SkusBadgeCell = ({ skus, onOpenPanel }) => {
  const list = Array.isArray(skus) ? skus : [];

  if (!list.length) {
    return <span>-</span>;
  }

  const visibleItems = list.slice(0, MAX_VISIBLE_BADGES);
  const remainingItems = list.slice(MAX_VISIBLE_BADGES);

  const tooltipContent = (
    <div className="skus-tooltip-grid">
      {remainingItems.map((item, index) => (
        <span key={`${item}-${index}`}>{item}</span>
      ))}
    </div>
  );

  return (
    <div
      role="button"
      onClick={() => onOpenPanel(list)}
      className="skus-badge-cell"
    >
      {visibleItems.map((item, index) => (
        <Badge
          key={`${item}-${index}`}
          label={item}
          variant="stroke"
          size="small"
          sx={BADGE_SX_STYLES[index % BADGE_SX_STYLES.length]}
        />
      ))}
      {remainingItems.length > 0 && (
        <Tooltip
          title={tooltipContent}
          variant="tertiary"
          orientation="right"
        >
          <span className="skus-overflow-badge">
            <Badge
              label={`+${remainingItems.length}`}
              variant="subtle"
              size="small"
            />
          </span>
        </Tooltip>
      )}
    </div>
  );
};

export default SkusBadgeCell;

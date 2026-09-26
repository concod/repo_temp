import React, { useRef, useState } from "react";
import { Tooltip } from "impact-ui-v3";
import { MAX_VISIBLE_BADGES } from "./ata-constants";
import { useATAStyles } from "./ata-styles";

const BADGE_STYLE_KEYS = ["codeBadgeStyle0", "codeBadgeStyle1"];

/**
 * Badge span that shows a Tooltip only when the text is actually truncated.
 * Checks overflow on mouse enter so it stays accurate after resizes.
 */
const BadgeWithTooltip = ({ code, index, classes }) => {
  const spanRef = useRef(null);
  const [isOverflowed, setIsOverflowed] = useState(false);

  const handleMouseEnter = () => {
    const el = spanRef.current;
    if (el) {
      setIsOverflowed(el.scrollWidth > el.clientWidth);
    }
  };

  const badgeColorClass = BADGE_STYLE_KEYS[index % BADGE_STYLE_KEYS.length];

  return (
    <Tooltip
      title={isOverflowed ? code : ""}
      orientation="top"
      arrow
      variant="tertiary"
      disableHoverListener={!isOverflowed}
    >
      <span
        ref={spanRef}
        className={`${classes.codeBadgeBase} ${classes[badgeColorClass]}`}
        onMouseEnter={handleMouseEnter}
      >
        {code}
      </span>
    </Tooltip>
  );
};

/**
 * Cell renderer for the "Allocation Plans (View Only)" column in violations table.
 * Shows first N badges and a "+X" tag for the remaining.
 * Clicking the "+X" tag opens the allocation codes panel.
 */
const AllocationCodesBadges = ({ codes = [], onViewAll }) => {
  const classes = useATAStyles();

  if (!codes || codes.length === 0) return null;

  const visibleCodes = codes.slice(0, MAX_VISIBLE_BADGES);
  const remainingCount = codes.length - MAX_VISIBLE_BADGES;

  return (
    <div className={classes.badgeContainer}>
      {visibleCodes.map((code, index) => (
        <BadgeWithTooltip
          key={`${code}-${index}`}
          code={code}
          index={index}
          classes={classes}
        />
      ))}
      {remainingCount > 0 && (
        <span
          className={classes.overflowBadge}
          onClick={(e) => {
            e.stopPropagation();
            onViewAll?.(codes);
          }}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

export default AllocationCodesBadges;

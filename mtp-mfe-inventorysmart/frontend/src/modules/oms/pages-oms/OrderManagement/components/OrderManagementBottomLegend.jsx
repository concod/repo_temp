import React from "react";
import PropTypes from "prop-types";
import { Tooltip } from "impact-ui-v3";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import {
  MATRIX_SUMMARY_ROQ_STATUS_LEGEND_V3,
  ORDER_MANAGEMENT_EDIT_STATUS_LEGEND,
} from "modules/oms/constants-oms/stringConstants.js";

// One swatch size for every legend set (Edits/Hierarchy/ROQ Status) so
// nothing in the bottom bar visually mismatches — per Figma.
const SWATCH_SIZE = 8;
const VISIBLE_SET_COUNT = 2;

const HIERARCHY_LEGEND_ITEMS = [
  { label: "Level", backgroundColor: "#F0DFFB" },
  { label: "Mixed", backgroundColor: "#CFF0F8" },
  { label: "NA", backgroundColor: "#DDDFD3" },
];

const legendBarStyle = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  minWidth: 0,
  color: "#3f4754",
};

const legendSetStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
};

const legendTitleStyle = {
  fontSize: 12,
  fontWeight: 700,
  lineHeight: "125%",
  color: "#1F2B4D",
  fontFamily: "Manrope",
  flexShrink: 0,
};

// The overflow tooltip renders on the DS "tertiary" (dark) tooltip
// background — the on-bar title/label colors above are tuned for the
// light bottom-bar background and unreadable there, so the tooltip variant
// swaps in light text instead (same size/weight, just recolored).
const legendTitleDarkStyle = {
  ...legendTitleStyle,
  color: "#F5F6F8",
};

const legendItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

const labelStyle = {
  fontSize: "12px",
  lineHeight: "125%",
  fontStyle: "normal",
  fontWeight: 500,
  fontFamily: "Manrope",
  color: "#7A8294",
  whiteSpace: "nowrap",
};

const labelDarkStyle = {
  ...labelStyle,
  color: "#D7DBE3",
};

const dividerStyle = {
  width: 1,
  height: 14,
  backgroundColor: "#D8DCE1",
  flexShrink: 0,
};

/** @type {React.CSSProperties} */
const overflowTooltipContentStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: "4px 2px",
  color: "#fff",
  // Every set's items render on one line each — let the box grow to fit
  // the widest row instead of wrapping/clipping inside the DS tooltip's
  // default max-width (see the `componentsProps.tooltip.sx` override on
  // the `Tooltip` below, which lifts that cap).
  width: "max-content",
};

// Every legend set (Edits/Hierarchy/ROQ Status) uses the same square swatch
// — no per-set shape variation, so the bottom bar reads as one consistent
// structure regardless of which sets happen to be visible.
function swatchStyle({ backgroundColor, border }) {
  /** @type {React.CSSProperties} */
  const style = {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: 2,
    backgroundColor,
    border,
    boxSizing: "border-box",
    flexShrink: 0,
  };
  return style;
}

function LegendSet({ title, items, dark = false }) {
  if (!items?.length) return null;
  return (
    <div style={legendSetStyle}>
      <span style={dark ? legendTitleDarkStyle : legendTitleStyle}>
        {title}
      </span>
      {items.map((item) => (
        <div key={item.label} style={legendItemStyle}>
          <span
            style={swatchStyle({
              backgroundColor: item.backgroundColor,
              border: item.border,
            })}
          />
          <span style={dark ? labelDarkStyle : labelStyle}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

LegendSet.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      backgroundColor: PropTypes.string,
      border: PropTypes.string,
    })
  ),
  dark: PropTypes.bool,
};

/**
 * "Edits" is edit-mode only — cells can't be edited in view mode, so the
 * set is dropped entirely there rather than just deprioritized behind the
 * overflow "…". In edit mode it's the most actionable set, so it takes the
 * first inline slot and "ROQ Status" moves behind the overflow instead.
 */
function buildLegendSets(isEditMode) {
  const edits = {
    id: "edits",
    title: "Edits:",
    items: ORDER_MANAGEMENT_EDIT_STATUS_LEGEND,
  };
  const hierarchy = {
    id: "hierarchy",
    title: "Hierarchy:",
    items: HIERARCHY_LEGEND_ITEMS,
  };
  const roqStatus = {
    id: "roq-status",
    title: "ROQ Status:",
    items: MATRIX_SUMMARY_ROQ_STATUS_LEGEND_V3,
  };

  return isEditMode ? [edits, hierarchy, roqStatus] : [roqStatus, hierarchy];
}

function OrderManagementBottomLegend({ isEditMode = false }) {
  const legendSets = buildLegendSets(isEditMode);
  const visibleSets = legendSets.slice(0, VISIBLE_SET_COUNT);
  const overflowSets = legendSets.slice(VISIBLE_SET_COUNT);

  return (
    <div style={legendBarStyle} aria-label="Order management legend">
      {visibleSets.map((set, index) => (
        <React.Fragment key={set.id}>
          {index > 0 && <span style={dividerStyle} aria-hidden="true" />}
          <LegendSet title={set.title} items={set.items} />
        </React.Fragment>
      ))}
      {overflowSets.length > 0 && (
        <>
          <span style={dividerStyle} aria-hidden="true" />
          <Tooltip
            orientation="top"
            variant="tertiary"
            componentsProps={{
              tooltip: {
                sx: {
                  // DS tooltip caps at MUI's default 300px and centers its
                  // content — our multi-row legend list needs to size to
                  // its own (wider) content instead of wrapping/clipping.
                  maxWidth: "none",
                  width: "max-content",
                },
              },
            }}
            title={
              <div style={overflowTooltipContentStyle}>
                {overflowSets.map((set) => (
                  <LegendSet
                    key={set.id}
                    title={set.title}
                    items={set.items}
                    dark
                  />
                ))}
              </div>
            }
          >
            <MoreHorizIcon
              aria-label={`${overflowSets.length} more legend group${
                overflowSets.length > 1 ? "s" : ""
              }`}
              style={{ fontSize: 18, color: "#687487", cursor: "pointer", flexShrink: 0 }}
            />
          </Tooltip>
        </>
      )}
    </div>
  );
}

OrderManagementBottomLegend.propTypes = {
  isEditMode: PropTypes.bool,
};

export default OrderManagementBottomLegend;

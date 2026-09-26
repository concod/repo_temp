import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";



export const useATAStyles = makeStyles(() => ({
  // AllocationCodesBadges
  badgeContainer: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(8),
    flexWrap: "nowrap",
    overflow: "hidden",
    height: "100%",
  },
  codeBadgeBase: {
    display: "block",
    padding: `${pxToRem(2)} ${pxToRem(8)}`,
    borderRadius: pxToRem(1000),
    fontSize: pxToRem(14),
    fontWeight: 500,
    fontFamily: "Manrope, sans-serif",
    lineHeight: pxToRem(20),
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: "0 1 auto",
    minWidth: 0,
    maxWidth: "fit-content",
  },
  codeBadgeStyle0: {
    background: colours.cararra,
    color: colours.avocado,
  },
  codeBadgeStyle1: {
    background: colours.hummingBird,
    color: colours.easternBlue,
  },
  overflowBadge: {
    background: colours.softLightGrey,
    color: colours.cloudBurst,
    borderRadius: pxToRem(8),
    padding: `${pxToRem(2)} ${pxToRem(12)}`,
    fontSize: pxToRem(12),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 500,
    fontFamily: "Manrope, sans-serif",
    lineHeight: pxToRem(16),
    whiteSpace: "nowrap",
    cursor: "pointer",
    flexShrink: 0,
  },

  // AllocationCodesPanel
  panelContent: {
    padding: pxToRem(16),
  },
  panelHeading: {
    fontFamily: "Manrope",
    fontWeight: 800,
    fontSize: pxToRem(16),
    lineHeight: pxToRem(24),
    marginBottom: pxToRem(16),
    color: colours.darkBlack,
  },
  panelBadgeContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: pxToRem(12),
  },
  panelBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: `${pxToRem(2)} ${pxToRem(8)}`,
    borderRadius: pxToRem(1000),
    background: colours.softLightGrey,
    border: `${pxToRem(1)} solid ${colours.neutralBorder}`,
    color: colours.avocado,
    fontSize: pxToRem(14),
    fontWeight: 500,
    fontFamily: "Manrope, sans-serif",
    lineHeight: pxToRem(20),
    height: pxToRem(24),
    boxSizing: "border-box",
    whiteSpace: "nowrap",
  },

  // AllocationPlansTable - Status badge
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: `${pxToRem(2)} ${pxToRem(8)}`,
    borderRadius: pxToRem(1000),
    background: colours.white,
    border: `${pxToRem(1)} solid ${colours.mandy}`,
    color: colours.mandy,
    fontSize: pxToRem(14),
    fontWeight: 500,
    fontFamily: "Manrope, sans-serif",
    lineHeight: pxToRem(20),
    whiteSpace: "nowrap",
  },

  // AllocationPlansTable - Finalize menu wrapper
  finalizeMenuWrapper: {
    position: "relative",
  },

  // AllocationPlansTable - Prompt plan list
  promptParagraph: {
    margin: `0 0 ${pxToRem(8)}`,
  },
  promptList: {
    margin: 0,
    paddingLeft: pxToRem(20),
    maxHeight: pxToRem(150),
    overflowY: "auto",
  },
  promptListItem: {
    fontSize: pxToRem(14),
    lineHeight: pxToRem(22),
  },

  // index.js - Tab label
  tabLabel: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(8),
  },
}));

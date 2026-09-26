import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
export const useStyles = makeStyles((theme) => ({
  snackbarLayoutWrapper: {
    height: pxToRem(28),
    gap: pxToRem(8),
    padding: "0 1rem",
    margin: "auto 0",
  },
  label: {
    lineHeight: pxToRem(21),
    color: colours.slateGrayLight,
  },
  selectedFilterWrapper: {
    padding: "0.25rem 0.25rem 0.25rem 0.5rem",
    gap: pxToRem(6),
    height: pxToRem(26),
    borderRadius: pxToRem(4),
    background: colours.aliceBlue,
    color: colours.fiord,
  },
  selectedFieldWrapper: {
    gap: pxToRem(6),
  },
  selectedField: {
    fontSize: pxToRem(12),
    color: colours.fiord,
  },
  selectedValue: {
    background: colours.hawksBlue,
    padding: "0rem 0.5rem",
    gap: pxToRem(25),
    borderRadius: pxToRem(4),
    color: colours.fiord,
    fontWeight: 500,
    height: pxToRem(18),
  },
  popoverBody: {
    marginTop: pxToRem(8),
  },
  popoverWapper: {
    background: colours.white,
    width: pxToRem(488),
    borderRadius: pxToRem(4),
    boxShadow: "0px 3px 6px 0px #00000040",
    padding: "0.5rem 1rem",
  },
  filterRow: {
    height: pxToRem(58),
    width: pxToRem(456),
    overflow: "hidden",
    borderTop: "1px dashed",
    borderColor: colours.alto,
    gap: pxToRem(16),
    padding: "0rem 0.5rem",
    "&:nth-child(1)": {
      borderTop: "none",
    },
  },
  filterLabel: {
    lineHeight: pxToRem(21),
    whiteSpace: "nowrap",
    minWidth: pxToRem(130),
  },
  filterChipWrapper: {
    maxWidth: pxToRem(300),
    whiteSpace: "nowrap",
    overflow: "hidden",
    display: "flex",
    gap: pxToRem(8),
  },
  viewMoreText: {
    color: colours.endavour,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(18),
    marginBottom: "1rem",
    cursor: "pointer",
    paddingLeft: pxToRem(8),
  },
}));

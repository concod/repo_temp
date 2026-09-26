import { makeStyles } from "@mui/styles";
import colours from "./colours";

const rem = (px) => `${px / 16}rem`;

const globalStyles = makeStyles((theme) => ({
  mainBody: {
    padding: "1.5rem 2rem",
  },
  h_100: {
    height: "100%",
  },
  paper: {
    marginBottom: "1rem",
    padding: "1.5rem 2rem",
    width: "100%",
  },
  paddingVertical: {
    padding: "1rem 0",
  },
  paddingHorizontal: {
    padding: "0 1rem",
  },
  paddingAround: {
    padding: "0.5rem 1rem",
  },
  padding_0: {
    padding: "0",
  },
  gap: {
    gap: "1rem",
  },
  gapHalf: {
    gap: "0.5rem",
  },
  fullWidth: {
    width: "100%",
  },
  widthFitContent: {
    width: "fit-content",
  },
  marginVertical: {
    margin: "0.5rem 0",
  },
  marginVertical1rem: {
    margin: "1rem 0",
  },
  marginHorizontal: {
    margin: "0 1rem",
  },
  marginAround: {
    margin: "1rem",
  },
  marginAuto: {
    margin: "auto",
  },
  marginTop: {
    marginTop: "1rem",
  },
  marginBottom: {
    marginBottom: "1rem",
  },
  marginBtnVertical: {
    margin: `${rem(12)} 0`,
  },
  filterWrapper: {
    padding: "0 2rem",
  },
  tableWrapper: {
    margin: "2rem",
  },
  paperWrapper: {
    padding: "2rem",
  },
  paperHeader: {
    padding: "1rem",
    borderBottom: `1px solid ${colours.alto}`,
  },
  horizontalBottomLine: {
    borderBottom: `1px solid ${colours.alto}`,
  },
  evenPaddingAround: {
    padding: "1rem",
  },
  positionFixedCenter: {
    position: "fixed",
    top: "50%",
    left: "50%",
    zIndex: "1",
  },
  scroll: {
    overflow: "scroll",
  },
  auto: {
    overflowX: "auto",
  },
  verticalLabel: {
    marginBottom: "0.3rem",
  },
  label: {
    color: theme.palette.colours.labelColour,
    textTransform: "uppercase",
    lineHeight: "1.5",
  },
  centerAlign: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  minHeightBody: {
    minHeight: "10rem",
  },
  dialogConfirmBox: {
    "& .MuiDialog-paper": {
      minWidth: "430px",
      borderRadius: "10px 10px 6px 6px",
    },
  },
  dialogActionBox: {
    background: "#f7f7f7",
    padding: "1rem",
  },
  dialogTitle: {
    ...theme.typography.h4,
    paddingTop: "1rem",
  },
  dialogText: {
    ...theme.typography.body1,
    paddingTop: "1rem",
  },
  moduleTitle: {
    ...theme.typography.h3,
  },
  dialogContentBody: {
    borderTop: "none",
  },
  flexRow: {
    display: "flex",
  },
  flexWrap: {
    flexWrap: "wrap",
  },
  whiteSpace: {
    whiteSpace: "nowrap",
  },
  flexGrow: {
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
  flexColumn: {
    flexDirection: "column",
  },
  displayNone: {
    display: "none",
  },
  layoutAlignBetweenCenter: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  flexAlignBetweenCenter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  layoutAlignSpaceBetween: {
    display: "flex",
    justifyContent: "space-between",
  },
  layoutAlignEnd: {
    display: "flex",
    justifyContent: "flex-end",
  },
  layoutAlignStart: {
    display: "flex",
    justifyContent: "flex-start",
  },
  layoutAlignCenter: {
    justifyContent: "center",
    alignItems: "center",
  },
  alignTextCenter: {
    textAlign: "center",
  },
  verticalAlignCenter: {
    alignItems: "center",
  },
  filterGroupItemContainer: {
    minWidth: "calc((30%/1.5) - 5px)",
    margin: "0.7rem",
  },
  warningBackground: {
    background: colours.wispPink,
  },
  pageHeader: {
    display: "inline-block",
    fontSize: "1.125rem",
    lineHeight: "1.5",
    color: theme.palette.colours.codGray,
    letterSpacing: "0px",
    opacity: 1,
  },
  marginVertical2rem: {
    margin: "2rem 0",
  },
  subLabel: {
    fontSize: "0.85rem",
    fontWeight: "100",
    color: theme.palette.textColours.slateGrayLight,
  },
  marginLeft1rem: {
    marginLeft: "1rem",
  },
  // styles for dialog component
  root: {
    "& .MuiDialog-paperWidthSm": {
      borderRadius: "0.6rem",
    },
  },
  contentBody: {
    minHeight: "20rem",
  },
  accordianWrapper: {
    marginBottom: 15,
  },
  inputLabel: {
    color: theme.palette.colours.filterLabelColor,
    lineHeight: "1.6",
    letterSpacing: "0px",
    opacity: 1,
    fontSize: "0.80rem",
    paddingBottom: "0.4rem",
    display: "inline-block",
  },
  halfWidth: {
    width: "50%",
  },
  toolPanel: {
    fontSize: "1rem",
    height: "2rem",
    paddingLeft: "0.5rem",
    padding: "0.5rem",
    fontWeight: "bold",
  },
  zeroWidth: {
    width: 0,
  },
  cursorPointer: {
    cursor: "pointer",
  },
  defaultChipStyle: {
    width: "0.9rem",
    height: "0.9rem",
    background: colours.white,
    border: `0.075rem solid ${colours.webOrange}`,
    borderRadius: "50%",
  },
  selectedChipStyle: {
    width: "0.9rem",
    height: "0.9rem",
    background: "#0051A81A",
    border: `0.075rem solid ${colours.endavour}`,
    borderRadius: "50%",
  },
  activeChipStyle: {
    width: "0.9rem",
    height: "0.9rem",
    background: colours.white,
    border: `0.075rem solid ${colours.seaGreen}`,
    borderRadius: "50%",
  },
  overlayLoader: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(255, 255, 255, 0.7)", // Semi-transparent white background
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999, // Ensure the overlay is above other elements
  },

  // NEW BUTTON STYLES
  buttonNew: {
    width: rem(36),
    height: rem(37),
    borderRadius: rem(4), // Ensure square shape
    padding: "0",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "1px solid #0055AF",
    minWidth: "unset",
  },
  iconNew: {
    width: rem(20),
    height: rem(20),
    color: theme.palette.primary.main,
  },
  positionRelative: {
    position: "relative",
  },
  positionLeftBottom: {
    position: "absolute",
    left: 0,
    bottom: 0,
  },
  panelWrapper: {
    "& .panel-container": {
      right: theme.customVariables.commentDrawerWidth,
      top: theme.customVariables.headerHeight,
      zIndex: 801,
    },
  },
  customTooltip: {
    backgroundColor: theme.palette.colours.tooltipColor,
    fontSize: theme.typography.pxToRem(14),
    lineHeight: theme.typography.pxToRem(18),
    fontWeight: 400,
    padding: "0.5rem 1rem",
    boxShadow: "0 0.25rem 0.75rem 0 #00000014",
    borderRadius: "0.25rem",
    "& .MuiTooltip-arrow::before": {
      backgroundColor: theme.palette.colours.tooltipColor,
    },
  },
  textEllipsis: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  fakeInputStyle: {
    border: "1px solid #acacac",
    borderRadius: "3px",
    padding: "0px 12px",
    margin: "2px 0 0",
    height: "35px",
    fontSize: "12px",
    fontWeight: 400,
  },
}));

export default globalStyles;

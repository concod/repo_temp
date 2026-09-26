import { makeStyles } from "@mui/styles";
import colours from "./colours";

const rem = (px) => `${px / 16}rem`;

// Helper function to generate spacing utilities dynamically
const generateSpacingUtilities = () => {
  const spacingValues = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48];
  const utilities = {};
  
  const remLocal = (px) => `${px / 16}rem`;

  spacingValues.forEach((value) => {
    // Padding utilities
    utilities[`padding_${value}`] = { padding: remLocal(value) };
    utilities[`paddingVertical_${value}`] = { padding: `${remLocal(value)} 0` };
    utilities[`paddingHorizontal_${value}`] = { padding: `0 ${remLocal(value)}` };
    utilities[`paddingTop_${value}`] = { paddingTop: remLocal(value) };
    utilities[`paddingBottom_${value}`] = { paddingBottom: remLocal(value) };
    utilities[`paddingLeft_${value}`] = { paddingLeft: remLocal(value) };
    utilities[`paddingRight_${value}`] = { paddingRight: remLocal(value) };

    // Margin utilities
    utilities[`margin_${value}`] = { margin: remLocal(value) };
    utilities[`marginVertical_${value}`] = { margin: `${remLocal(value)} 0` };
    utilities[`marginHorizontal_${value}`] = { margin: `0 ${remLocal(value)}` };
    utilities[`marginTop_${value}`] = { marginTop: remLocal(value) };
    utilities[`marginBottom_${value}`] = { marginBottom: remLocal(value) };
    utilities[`marginLeft_${value}`] = { marginLeft: remLocal(value) };
    utilities[`marginRight_${value}`] = { marginRight: remLocal(value) };

    // Gap utilities
    utilities[`gap_${value}`] = { gap: remLocal(value) };
  });

  // Clockwise notation utilities (top, right, bottom, left)
  // Generate combinations for padding and margin
  spacingValues.forEach((top) => {
    spacingValues.forEach((right) => {
      spacingValues.forEach((bottom) => {
        spacingValues.forEach((left) => {
          const paddingKey = `padding_${top}_${right}_${bottom}_${left}`;
          const marginKey = `margin_${top}_${right}_${bottom}_${left}`;
          
          utilities[paddingKey] = {
            padding: `${remLocal(top)} ${remLocal(right)} ${remLocal(bottom)} ${remLocal(left)}`
          };
          
          utilities[marginKey] = {
            margin: `${remLocal(top)} ${remLocal(right)} ${remLocal(bottom)} ${remLocal(left)}`
          };
        });
      });
    });
  });

  return utilities;
};

const globalStyles = makeStyles((theme) => ({
  mainBody: {
    padding: "1.5rem 2rem",
  },
  h_100: {
    height: "100%",
  },
  h_32: {
    height: "32px",
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
    padding: "24px",
  },
  paddingAroundNew: {
    padding: "12px 24px 24px 24px",
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
  marginBottom24: {
    marginBottom: "24px",
  },
  filterBreadcrumbHeight: {
    height: "32px",
    marginBottom: "12px",
  },
  breadcrumbPadding: {
    padding: "5.5px 0px 5.5px 0px",
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
    color: theme?.palette?.colours?.labelColour,
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
    ...theme?.typography?.h4,
    paddingTop: "1rem",
  },
  dialogText: {
    ...theme?.typography?.body1,
    paddingTop: "1rem",
  },
  moduleTitle: {
    ...theme?.typography?.h3,
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
  flexReverse: {
    flexDirection: "row-reverse",
  },
  displayNone: {
    display: "none",
  },
  displayBlock: {
    display: "block",
  },
  layoutAlignBetweenCenter: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  layoutAlignBetweenStretch: {
    justifyContent: "space-between",
    alignItems: "stretch",
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
  verticalAlignBaseline: {
    alignItems: "baseline",
  },
  verticalAlignEnd: {
    alignItems: "flex-end",
  },
  verticalAlignStart: {
    alignItems: "flex-start",
  },
  filterGroupItemContainer: {
    minWidth: "calc((30%/1.5) - 5px)",
    margin: "0.7rem",
  },
  warningBackground: {
    background: colours.wispPink,
  },
  cardBg: {
    background: theme?.palette?.common?.white,
  },
  pageHeader: {
    display: "inline-block",
    fontSize: "1.125rem",
    lineHeight: "1.5",
    color: theme?.palette?.colours?.codGray,
    letterSpacing: "0px",
    opacity: 1,
  },
  marginVertical2rem: {
    margin: "2rem 0",
  },
  subLabel: {
    fontSize: "0.85rem",
    fontWeight: "100",
    color: theme?.palette?.textColours?.slateGrayLight,
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
    color: theme?.palette?.colours?.filterLabelColor,
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
  cursorDefault: {
    cursor: "default",
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
    color: theme?.palette?.primary?.main,
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
      right: theme?.customVariables?.commentDrawerWidth,
      top: theme?.customVariables?.headerHeight,
      zIndex: 801,
    },
  },
  customTooltip: {
    backgroundColor: theme?.palette?.colours?.tooltipColor,
    fontSize: theme?.typography?.pxToRem(14),
    lineHeight: theme?.typography?.pxToRem(18),
    fontWeight: 400,
    padding: "0.5rem 1rem",
    boxShadow: "0 0.25rem 0.75rem 0 #00000014",
    borderRadius: "0.25rem",
    "& .MuiTooltip-arrow::before": {
      backgroundColor: theme?.palette?.colours?.tooltipColor,
    },
  },
  boxShadowNone: {
    boxShadow: "none",
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
  extraButtonStyle: {
    marginRight: "10px",
  },
  iconButton: {
    minWidth: "20px",
  },
  // New Styles Acc to Impact UI V3
  paddingHorizonal24: {
    padding: "0px",
  },
  shrink0: {
    flexShrink: 0,
  },
  disabledBg: {
    background: theme?.palette?.background?.disabled,
  },
    flexBasisHalf:{
      flexBasis:'50%'
    },
    bottomButtonsContainer: {
      position: "fixed",
      zIndex: 10,
      bottom: 0,
      width: "-webkit-fill-available",
      backgroundColor: 'white',
      padding: "12px 24px",
      left:'10px'
    },
    stickyFooter: {
      position: "fixed",
      bottom: "0",
      backgroundColor: "white",
      left: "60px",
      width: "calc(100% - 60px)",
      padding: "12px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      boxSizing: "border-box",
      borderTop: "1px solid #E0E0E0",
      zIndex: 10,
    },
    selectorContainer: {
      display: "flex",
      width: "561px",
      padding: "8px",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderRadius: "8px",
      background: "#F5F6FA",
    },

  ...generateSpacingUtilities(),
}));

export default globalStyles;

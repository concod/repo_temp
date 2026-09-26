import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles((theme) => ({
  parentContainer: {
    margin: 0,
    padding: `${pxToRem(30)} ${pxToRem(15)} ${pxToRem(24)} ${pxToRem(21)}`,
  },
  title: {
    color: theme.palette.text.primary,
    font: `normal normal 600 ${pxToRem(18)}/normal Manrope`,
  },
  headerContainer: {
    marginTop: pxToRem(13),
  },
  backButton: {
    padding: "0.5rem 1.5rem",
    borderRadius: "0.25rem",
    alignSelf: "flex-end",
  },
  header: {
    color: theme.palette.text.primary,
    font: `normal normal 500 1rem/1.5rem Manrope`,
  },
  card: {
    boxShadow: "0px 0px 8px 0px rgba(0, 0, 0, 0.12)",
    borderRadius: "0.25rem",
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  cardContent: {
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  cardHeader: {
    color: theme.palette.text.primary,
    font: `normal normal 500 1rem/1.5rem Manrope`,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    margin: 0,
    padding: 0,
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
  cardSubHeader: {
    color: "#4259EE",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "20px",
    cursor: "pointer",
    margin: 0,
    padding: 0,
  },
  customButton: {
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    minWidth: "auto",
    textTransform: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  cardHeaderOptions: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  cardParagraph: {
    color: theme.palette.textColours.slateGrayLight,
    font: `normal normal 400 ${pxToRem(14)}/normal Manrope`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box", //displays the text as a block container
    "-webkit-line-clamp": 2, // Limit the number of lines to 2
    "-webkit-box-orient": "vertical",
    marginTop: pxToRem(10),
  },
  cardLearnmore: {
    color: theme.palette.primary.main,
    font: `normal normal 500 0.75rem/normal Manrope`,
    padding: "0",
    marginTop: "0.5rem",
  },

  cardActions: {
    padding: "0",
  },
  progressBar: {
    height: pxToRem(6),
  },
  listHeader: {
    color: theme.palette.text.primary,
    font: `normal normal 500 0.75rem/normal Manrope`,
  },
  listSubHeader: {
    color: theme.palette.textColours.subHeader,
    font: `normal normal 400 0.75rem/normal Manrope`,
  },
  gridContainer: {
    marginTop: pxToRem(13),
  },
  divider: {
    marginTop: "1.5rem",
  },
  rotatedIcon: {
    transform: "rotate(90deg)",
  },
  cardSubHeaderContainer: {
    marginTop: "auto",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    paddingTop: pxToRem(10),
    paddingLeft: 0,
    marginLeft: 0,
  },
  // Search input wrapper
  searchInputWrapper: {
    display: "flex",
    alignItems: "center",
  },
  // Search icon
  searchIcon: {
    display: "flex",
    alignItems: "center",
  },
  // Level container
  levelContainer: {
    background: "#FFF",
  },
  // Icon container
  iconContainer: {
    position: "relative",
    width: "40px",
    height: "40px",
  },
  // Icon number overlay
  iconNumberOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: "#FFF",
    fontFamily: "Manrope",
    fontSize: "22.582px",
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: "1",
    textShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    margin: 0,
    padding: 0,
  },
  // Level text
  levelText: {
    color: "#0D152C",
    fontFamily: "Manrope",
    fontSize: "20px",
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: "30px",
  },
  // Level badge container
  levelBadgeContainer: {
    display: "flex",
    maxWidth: "164px",
    padding: "2px 8px",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
    borderRadius: "1000px",
  },
  levelBadgeSuccess: {
    background: "#F4FFF7",
  },
  levelBadgeInfo: {
    background: "#F1F3FE",
  },
  // Level badge icon
  levelBadgeIconSuccess: {
    color: "#3BB273",
    fontSize: "16px",
  },
  levelBadgeIconInfo: {
    color: "#4259EE",
    fontSize: "16px",
  },
  // Level badge text
  levelBadgeTextSuccess: {
    color: "#3BB273",
  },
  levelBadgeTextInfo: {
    color: "#4259EE",
  },
  // Modules completed text
  modulesCompletedText: {
    color: "#7A8294",
    textAlign: "right",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "20px",
    paddingRight: "8px",
  },
  // Completed number span
  completedNumberSpan: {
    fontWeight: 700,
    fontSize: "16px",
    color: "#000000",
  },
  // Cards grid padding
  cardsGridPadding: {
    paddingLeft: "8px",
    paddingRight: "8px",
  },
  // Cards grid container
  cardsGridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "30px",
    width: "100%",
    boxSizing: "border-box",
  },
  // Card wrapper
  cardWrapper: {
    minWidth: 0,
    width: "100%",
  },
  // Card container
  systemCard: {
    background: "#FFF",
    boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.12)",
    border: "1px solid #F0F0F0",
    overflow: "hidden",
    width: "100%",
    minWidth: 0,
  },
  // Progress bar wrapper
  progressBarWrapper: {
    marginTop: 0,
  },
  // Card content
  cardContentPadding: {
    padding: "24px",
  },
  // Card badge container
  cardBadgeContainer: {
    display: "flex",
    maxWidth: "100%",
    padding: "2px 8px",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
    borderRadius: "1000px",
  },
  cardBadgeSuccess: {
    background: "#F4FFF7",
  },
  cardBadgeInfo: {
    background: "#F1F3FE",
  },
  // Card badge icon
  cardBadgeIconSuccess: {
    color: "#3BB273",
    fontSize: "16px",
  },
  cardBadgeIconInfo: {
    color: "#4259EE",
    fontSize: "16px",
  },
  // Card badge text
  cardBadgeTextSuccess: {
    color: "#3BB273",
  },
  cardBadgeTextInfo: {
    color: "#4259EE",
  },
  // Card title
  cardTitle: {
    color: "#1F2B4D",
    fontFamily: "Manrope",
    fontSize: "16px",
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: "24px",
  },
  // Card description
  cardDescription: {
    color: "#7A8294",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "21px",
    marginTop: "6px",
  },
  // View dependency container
  viewDependencyContainer: {
    marginTop: "20px",
  },
}));

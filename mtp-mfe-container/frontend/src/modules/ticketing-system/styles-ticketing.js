import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles((theme) => ({
  outerContainer: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: `minmax(0, 1fr) ${pxToRem(460)}`,
    gap: pxToRem(10),
    "& > :first-child": {
      minWidth: 0,
    },

    "& hr": {
      margin: pxToRem(0),
      marginTop: pxToRem(20.5),
      border: `${pxToRem(1)} solid ${colours.alto}`,
    },
    "& .progressBar-progress-test": {
      display: "none",
    },
    "& .progressBar-label": {
      width: "100%",
      font: `normal normal normal ${pxToRem(14)}/${pxToRem(21)} Poppins`,
      letterSpacing: pxToRem(0),
      color: colours.codGray,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    "@media (min-width: 1600px)": {
      gridTemplateColumns: `minmax(0, 1fr) ${pxToRem(549)}`,
    },
    "&.right-panel": {
      position: "relative",
    },
  },
  analyticsContainer: {
    width: "100%",
    height: (props) => `calc(100vh - ${props.statusPanelTop}px - 0.875rem)`,
    overflow: "auto",
    position: "relative",
    paddingTop: 0,
    "&::-webkit-scrollbar": {
      width: pxToRem(0.1),
      /* Width of the scrollbar */
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
    "&.sticky": {
      paddingLeft: pxToRem(0),
      paddingRight: pxToRem(0),
    },
  },
  stickyDivHeader: {
    padding: pxToRem(16),
    borderBottom: `1px solid ${theme.palette.background.separaterColor}`,
  },

  separator: {
    height: pxToRem(16),
    borderRight: `1px solid ${theme.palette.background.separaterColor}`,
  },
  summaryViewHeaderCurrentStateContainer: {
    width: "100%",
    maxWidth: pxToRem(400),
  },
  summaryViewHeader: {
    font: `normal normal 600 ${pxToRem(18)}/${pxToRem(27)} Poppins`,
    color: colours.codGray,
  },
  summaryViewCurrentStateValue: {
    font: `normal normal 600 ${pxToRem(16)}/${pxToRem(26)} Poppins`,
    color: colours.endavour,
    cursor: "pointer",
  },
  summarViewTitle: {
    fontWeight: 600,
    fontSize: pxToRem(16),
    marginRight: pxToRem(12),
    color: theme?.palette?.textColours?.lightNeutrals,
  },
  gap24: {
    gap: pxToRem(24),
  },
  card: {
    width: "100%",
    boxShadow: `${pxToRem(0)} ${pxToRem(0)} ${pxToRem(4)} ${colours.boxShadow}`,
    borderRadius: pxToRem(3),
  },
  graphContainer: {
    border: `1px solid ${theme.palette.background.separaterColor}`,
    padding: `${pxToRem(12)} ${pxToRem(18)}`,
    borderRadius: pxToRem(8),
    background: theme?.palette?.common?.white,
  },
  graphContainerHeader: {
    color: theme?.palette?.colours?.darkBlack,
    fontWeight: 800,
    fontSize: pxToRem(16),
    lineHeight: pxToRem(24),
  },
  tableContainer: {
    width: "100%",
    marginTop: pxToRem(15),
  },
  graphContainerGraph: {
    // marginTop: pxToRem(24),
  },
  headerContainer: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  flexContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: pxToRem(8),
  },
  badge: {
    font: `normal normal normal ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: "0px",
    color: colours.white,
    backgroundColor: colours.eucalyptus,
    padding: `${pxToRem(4)} ${pxToRem(5)}`,
    borderRadius: pxToRem(4),
  },
  toolTipStyle: {
    padding: pxToRem(0),
    "& svg": {
      width: pxToRem(20),
      height: pxToRem(20),
    },
  },
  headerIcons: {
    color: theme.palette.text.disabled,
  },
  dateSelection: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: pxToRem(12),
    "& .ia-switch-label": {
      whiteSpace: "nowrap",
    },
  },
  ticketVolumeContainer: {
    margin: `${pxToRem(16)} 0rem ${pxToRem(25)}`,
  },
  ticketVolumeContainerHeader: {
    font: `normal normal 500 ${pxToRem(16)}/${pxToRem(25)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
  },
  ticketVolumeContainerInfo: {
    width: "100%",
    marginTop: pxToRem(16),
    gap: pxToRem(16),
    padding: `0rem ${pxToRem(1)}`,
  },
  ticketVolumeContainerInfoValue: {
    font: `normal normal 600 ${pxToRem(16)}/${pxToRem(25)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
  },
  ticketVolumeContainerInfoSingle: {
    width: "100%",
    maxWidth: pxToRem(306),
    font: `normal normal normal ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
  },
  mb0: {
    marginBottom: pxToRem(0),
  },
  mb10: {
    marginBottom: pxToRem(10),
  },
  mb5: {
    marginBottom: pxToRem(10),
  },
  mt38: {
    marginTop: pxToRem(38),
  },
  tableContainerHeader: {
    font: `normal normal 600 ${pxToRem(18)}/${pxToRem(27)} Poppins`,
    letterSpacing: pxToRem(0.08),
    color: colours.codGray,
    "&:first-letter": {
      textTransform: "capitalize",
    },
  },
  tableContainerCount: {
    font: `normal normal 600 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0.08),
    color: colours.codGray,
    textTransform: "capitalize",
  },
  maxContent: {
    maxWidth: "max-content",
  },
  tabsContainer: {
    marginTop: pxToRem(30),
  },
  rightPanelInner: {
    position: "fixed",
    background: theme?.palette?.common?.white,
    borderRadius: pxToRem(8),
    boxShadow: "0px 0px 4px 0px #0000001F",
    right: 16,
    width: pxToRem(460),
    "@media (min-width: 1600px)": {
      width: pxToRem(549),
    },
  },
  //------------------Recent-Activity-Styles------------------------------------
  recentActivity: {
    padding: pxToRem(16),
  },
  allRecentActivites: {
    maxHeight: "min(40vh, 49.5rem)",
    overflow: "auto",
    marginTop: pxToRem(25),
    "&::-webkit-scrollbar": {
      width: pxToRem(0.1),
      /* Width of the scrollbar */
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
  },
  allRecentActivitiesEmpty: {
    padding: `${pxToRem(12)} ${pxToRem(16)}`,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  recentActivityContainer: {
    "& hr": {
      margin: `${pxToRem(18.5)} ${pxToRem(0)} ${pxToRem(18.5)}`,
      border: `${pxToRem(1)} solid ${colours.lightGrey}`,
    },
    "&:last-child": {
      "& hr": {
        display: "none",
      },
    },
  },
  activityBox: {
    width: "100%",
    display: "flex",
    gap: pxToRem(9),
  },
  recentActivityHeader: {
    fontSize: pxToRem(16),
    fontWeight: 600,
    color: theme?.palette?.textColours?.lightNeutrals,
  },
  recentActivityLink: {
    color: colours.endavour,
    font: `normal normal 600 ${pxToRem(16)}/${pxToRem(26)} Poppins`,
    letterSpacing: pxToRem(0),
    cursor: "pointer",
    "&:hover": {
      textDecoration: "underline",
    },
  },
  activityBoxName: {
    backgroundColor: colours.crusta,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: colours.white,
    borderRadius: pxToRem(3),
    height: pxToRem(68),
    minWidth: pxToRem(68),
  },
  activityBoxNameText: {
    font: `normal normal 600 ${pxToRem(20)}/${pxToRem(30)} Poppins`,
    letterSpacing: pxToRem(0.12),
  },
  activityBoxInfo: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
  },

  activityBoxInfoHeader: {
    font: `normal normal 600 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  activityBoxInfoId: {
    font: `normal normal 500 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
  },

  mt3: {
    marginTop: pxToRem(3),
  },
  mt27: {
    marginTop: pxToRem(27),
  },

  activityBoxInfoBadge: {
    padding: `${pxToRem(2)} ${pxToRem(5)}`,
    textTransform: "capitalize",
    width: "fit-content",
    font: `normal normal normal ${pxToRem(12)}/${pxToRem(18)} Poppins`,

    "&.emergency, &.urgent": {
      backgroundColor: colours.seashellPeach,
      border: `${pxToRem(1)} solid ${colours.crusta}`,
      color: colours.crusta,
      borderRadius: pxToRem(2),
    },

    "&.normal, &.low": {
      backgroundColor: colours.linkWater,
      border: `${pxToRem(1)} solid ${colours.danube}`,
      color: colours.danube,
      borderRadius: pxToRem(2),
    },
  },

  activityBoxInfoTime: {
    color: colours.lightslategray,
    font: `normal normal normal ${pxToRem(12)}/${pxToRem(18)} Poppins`,
    marginRight: pxToRem(10),
  },

  flexContainerHeaderIcon: {
    gap: pxToRem(4),
    display: "flex",
    alignItems: "center",
    "& svg": {
      width: pxToRem(20),
      height: pxToRem(20),
    },
  },

  //--------------------------Transaction-History-Styles------------------------------------

  transactionHistory: {
    position: "absolute",
    height: `calc(100% - 106px)`,
    bottom: 0,
    right: "50px",
    background: `${colours.white} 0% 0% no-repeat padding-box`,
    opacity: 1,
    width: pxToRem(681),
    boxShadow: `${pxToRem(0)} ${pxToRem(0)} ${pxToRem(4)} ${colours.boxShadow}`,
    zIndex: 10,
  },

  transactionHistoryHeader: {
    fontWeight: 700,
    fontSize: pxToRem(16),
    color: theme?.palette?.textColours?.lightNeutrals,
  },

  transactionHistoryHeaderLabel: {
    color: colours.codGray,
    letterSpacing: pxToRem(0.08),
    font: `normal normal 600 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
  },

  transactionHistoryHeaderClose: {
    cursor: "pointer",
    width: pxToRem(12),
    height: pxToRem(12),
    color: colours.slateGrayLight,

    "& svg": {
      width: pxToRem(12),
      height: pxToRem(12),
    },

    "&:hover": {
      transform: "scale(1.01)",
    },
  },

  transactionHistoryBody: {
    padding: `${pxToRem(22)} ${pxToRem(20)}`,
    paddingRight: pxToRem(68),
  },

  transactionHistoryTitle: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(25),
  },

  transactionHistoryTitleCircleId: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(12),
  },

  transactionHistoryTitleCircle: {
    background: `${colours.froly} 0% 0% no-repeat padding-box`,
    width: pxToRem(22),
    height: pxToRem(22),
    borderRadius: "50%",

    "&.open": {
      background: `${colours.froly} 0% 0% no-repeat padding-box`,
    },

    "&.close": {
      background: `${colours.tradewind} 0% 0% no-repeat padding-box`,
    },
  },

  transactionHistoryTitleInfo: {
    color: colours.codGray,
    font: `normal normal medium ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0.08),
  },

  transactionHistoryCard: {
    borderRadius: pxToRem(8),
    border: `${pxToRem(1)} solid ${theme.palette.background.separaterColor}`,
    margin: `${pxToRem(16)} 0 ${pxToRem(24)}`,
  },
  transactionHistoryCardHeader: {
    borderBottom: `${pxToRem(1)} solid ${colours.gallery}`,
    padding: `${pxToRem(10)} ${pxToRem(16)}`,
  },

  THCardTitle: {
    font: `700 ${pxToRem(16)} Manrope`,
    color: theme?.palette?.textColours?.lightNeutrals,
  },
  THCardLabel: {
    font: `700 ${pxToRem(16)} Manrope`,
    color: theme?.palette?.textColours?.greyHelperText,
  },

  transactionHistoryCardBody: {
    padding: pxToRem(16),
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: pxToRem(16),
  },
  transactionHistoryModalTitle: {
    fontWeight: 800,
    fontSize: pxToRem(16),
    lineHeight: pxToRem(24),
    gap: pxToRem(8),
    color: theme?.palette?.colours?.darkBlack,
  },
  transactionHistorySummary: {
    marginTop: pxToRem(30),
    marginLeft: pxToRem(90),
    display: "flex",
    alignItems: "center",
    gap: pxToRem(36),
  },

  transactionHistorySummaryIconNameCount: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(8),
  },

  noGap: {
    gap: pxToRem(0),
  },
  ticketPanel: {
    border: "5px solid red",
    "& .ticket-info-panel": {
      background: "red",
    },
  },

  transactionHistorySummaryIcon: {
    "& svg": {
      width: pxToRem(8),
      height: pxToRem(16),
    },

    "&.mr-6": {
      marginRight: pxToRem(6),
    },
  },

  transactionHistorySummaryName: {
    font: `normal normal medium ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.endavour,

    "&.mr-8": {
      marginRight: pxToRem(8),
    },
  },

  transactionHistorySummaryCount: {
    background: `${colours.gallery} 0% 0% no-repeat padding-box`,
    borderRadius: pxToRem(17),
    padding: `${pxToRem(3)} ${pxToRem(16)}`,
    textAlign: "center",
    font: `normal normal medium ${pxToRem(12)}/${pxToRem(18)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.slateGrayLight,
  },

  transactionHistoryCommentCards: {
    overflow: "auto",
    display: "flex",
    flexDirection: "column",
    gap: pxToRem(24),
    marginTop: pxToRem(24),
    "&::-webkit-scrollbar": {
      width: pxToRem(0.1),
      /* Width of the scrollbar */
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
  },

  //--------------------Detailed-View-Styles--------------------------------

  outerContainerDetailedView: {
    width: "100%",
    marginTop: pxToRem(20),
    background: theme?.palette?.common?.white,
    borderRadius: pxToRem(8),
    "& .card-container": {
      boxShadow: "none!important",
    },
  },

  outerContainerDetailedViewHeader: {
    padding: pxToRem(16),
    borderBottom: `1px solid ${theme?.palette?.background?.separaterColor}`,
  },

  outerContainerDetailedViewHeaderNumber: {
    font: `normal normal 600 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0.08),
    color: colours.codGray,
    textTransform: "capitalize",
  },

  outerContainerDetailedViewHeaderInfo: {
    font: `normal normal normal ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0.08),
    color: colours.codGray,
    textTransform: "capitalize",
  },

  detailedView: {
    position: "relative",
  },

  openCheckboxFieldsContainer: {
    display: "inline",
    background: colours.selago,
    borderRadius: pxToRem(4),
    padding: `${pxToRem(4)} ${pxToRem(8)}`,
    "& .MuiFormControlLabel-root": {
      "&:last-child": {
        marginRight: pxToRem(0),
      },
    },
    marginRight: pxToRem(16),
  },
  customTooltip: {
    backgroundColor: theme.palette.colours.tooltipColor,
    fontSize: theme.typography.pxToRem(14),
    lineHeight: theme.typography.pxToRem(18),
    fontWeight: 400,
    padding: "0.5rem 1rem",
    boxShadow: "0 0.25rem 0.75rem 0 #00000014",
    "& .MuiTooltip-arrow::before": {
      backgroundColor: theme.palette.colours.tooltipColor,
    },
  },
  horizontalSeparator: {
    borderBottom: "1px solid  #D9DDE7",
  },
  gap_18: {
    gap: pxToRem(18),
  },
  gap_12: {
    gap: pxToRem(12),
  },

  newCard: {
    background: theme?.palette?.common?.white,
    borderRadius: pxToRem(8),
    boxShadow: "0px 0px 4px 0px #0000001F",
    paddingBottom: pxToRem(16),
  },
  chartHeading: {
    fontWeight: 800,
    fontSize: pxToRem(16),
    lineHeight: pxToRem(24),
    color: theme.palette.colours.neutralGrey,
    margin: `${pxToRem(16)} 0rem`,
  },
  marginVertical_24: {
    margin: `${pxToRem(24)} ${pxToRem(0)}`,
  },
  mainTrendContainer: {
    width: "calc(100% - 32px)",
    margin: "auto",
  },

  formWrapper: {
    height: pxToRem(32),
    borderRadius: pxToRem(12),
    padding: `${pxToRem(6)} ${pxToRem(12)}`,
    border: `1px solid #d9dde7`,
    marginLeft: "unset",
  },
  blueBorder: {
    border: `1px solid #4259EE`,
    "& span": {
      color: "#4259EE!important",
      fontWeight: 500,
    },
  },
  detailViewHeader: {
    padding: pxToRem(16),
    borderBottom: `1px solid ${theme?.palette?.background?.separaterColor}`,
  },
  detailViewContainer: {
    "& .card-container": {
      boxShadow: "none!important",
    },
  },
  individualViewFormWrapper: {
    padding: pxToRem(16),
  },
  detailedViewTitle: {
    font: `600 ${pxToRem(16)} Manrope`,
  },
}));

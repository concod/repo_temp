import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles(() => ({
  outerContainer: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: `auto ${pxToRem(460)}`,
    padding: `${pxToRem(0)} ${pxToRem(22)} ${pxToRem(0)} ${pxToRem(23)}`,
    gap: pxToRem(10),

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
      gridTemplateColumns: `auto ${pxToRem(549)}`,
    },
    "&.right-panel": {
      position: "relative",
    },
  },
  analyticsContainer: {
    width: "100%",
    padding: pxToRem(15),
    border: `${pxToRem(1)} solid ${colours.lightGrey}`,
    borderRadius: pxToRem(4),
    height: "100vh",
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
  stickyDiv: {
    position: "sticky",
    top: 0,
    backgroundColor: colours.white,
    zIndex: 1,
    paddingTop: pxToRem(8),
    boxShadow: `0 0 ${pxToRem(5)} ${pxToRem(5)} ${colours.white}`,
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
  gap24: {
    gap: pxToRem(24),
  },
  card: {
    width: "100%",
    boxShadow: `${pxToRem(0)} ${pxToRem(0)} ${pxToRem(4)} ${colours.boxShadow}`,
    borderRadius: pxToRem(3),
  },
  graphContainer: {
    width: "100%",
    padding: `${pxToRem(12)} ${pxToRem(18)}`,
    marginTop: pxToRem(15),

    "& .select-label": {
      font: `normal normal normal ${pxToRem(12)}/${pxToRem(26)} Poppins`,
      letterSpacing: pxToRem(0),
      color: colours.slateGrayLight,
    },

    "& .select-button": {
      minWidth: pxToRem(151),
      minHeight: pxToRem(37),
      font: `normal normal normal ${pxToRem(14)}/${pxToRem(26)} Poppins`,
      letterSpacing: pxToRem(0),
      color: colours.codGray,
    },
    "& .select-dropdown-container": {
      minWidth: pxToRem(151),
    },
  },
  graphContainerHeader: {
    font: `normal normal 600 ${pxToRem(16)}/${pxToRem(25)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
  },
  tableContainer: {
    width: "100%",
    marginTop: pxToRem(15),
  },
  graphContainerGraph: {
    marginTop: pxToRem(4),
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
  dateSelection: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: `${pxToRem(5)} ${pxToRem(0)} ${pxToRem(10)} ${pxToRem(5)}`,
    gap: pxToRem(10),
    "& .MuiButton-outlined": {
      font: `normal normal normal ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    },
  },
  ticketVolumeContainer: {
    padding: `${pxToRem(16)} ${pxToRem(21)} ${pxToRem(23)} ${pxToRem(21)}`,
  },
  ticketVolumeContainerHeader: {
    font: `normal normal 500 ${pxToRem(16)}/${pxToRem(25)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
  },
  ticketVolumeContainerInfo: {
    width: "100%",
    marginTop: pxToRem(20),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: pxToRem(50),
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
    width: pxToRem(460),
    "@media (min-width: 1600px)": {
      width: pxToRem(549),
    },
  },
  //------------------Recent-Activity-Styles------------------------------------
  recentActivity: {
    padding: `${pxToRem(12)} ${pxToRem(15)}`,
    border: `${pxToRem(1)} solid ${colours.lightGrey}`,
    boxShadow: "none",
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
    color: colours.codGray,
    font: `normal normal 600 ${pxToRem(16)}/${pxToRem(25)} Poppins`,
    letterSpacing: pxToRem(0),
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
    display: "flex",
    justifyContent: "space-between",
    padding: `${pxToRem(22)} ${pxToRem(20)}`,
    borderBottom: `${pxToRem(1)} solid ${colours.gallery}`,
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

  transactionHistoryTitleId: {
    letterSpacing: pxToRem(0.08),
    color: colours.codGray,
    font: `normal normal 600 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
  },

  transactionHistoryTitleInfo: {
    color: colours.codGray,
    font: `normal normal medium ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0.08),
  },

  transactionHistoryCard: {
    borderRadius: pxToRem(3),
    border: `${pxToRem(1)} solid ${colours.lightGrey}`,
    marginTop: pxToRem(30),
  },

  transactionHistoryCardHeader: {
    padding: pxToRem(16),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `${pxToRem(1)} solid ${colours.gallery}`,
  },

  transactionHistoryCardHeaderKeyBadgeBlock: {
    display: "flex",
    gap: pxToRem(44),
    alignItems: "center",
  },

  transactionHistoryCardHeaderBadge: {
    padding: `${pxToRem(5)} ${pxToRem(8)} ${pxToRem(4)}`,
    textTransform: "capitalize",
    width: "fit-content",
    font: `normal normal normal ${pxToRem(12)}/${pxToRem(18)} Poppins`,
    borderRadius: pxToRem(4),

    "&.closed": {
      backgroundColor: colours.panache,
      border: `${pxToRem(1)} solid ${colours.eucalyptus}`,
      color: colours.eucalyptus,
    },

    "&.open": {
      backgroundColor: colours.wispPink,
      border: `${pxToRem(1)} solid ${colours.alizarinCrimson}`,
      color: colours.alizarinCrimson,
    },

    "&.solved": {
      backgroundColor: colours.bubbles,
      border: `${pxToRem(1)} solid ${colours.cerulean}`,
      color: colours.cerulean,
    },

    "&.emergency, &.inprogress": {
      backgroundColor: colours.seashellPeach,
      border: `${pxToRem(1)} solid ${colours.crusta}`,
      color: colours.crusta,
    },

    "&.urgent, &.informationrequested": {
      backgroundColor: colours.ginfizz,
      border: `${pxToRem(1)} solid ${colours.creamCan}`,
      color: colours.creamCan,
    },

    "&.informationrequested": {
      color: colours.goldSand,
    },

    "&.low": {
      backgroundColor: colours.pinkLace,
      border: `${pxToRem(1)} solid ${colours.fuchsiaPink}`,
      color: colours.fuchsiaPink,
    },

    "&.normal, &.new": {
      backgroundColor: colours.linkWater,
      border: `${pxToRem(1)} solid ${colours.endavour}`,
      color: colours.endavour,
    },
  },

  transactionHistoryCardHeaderTitle: {
    font: `normal normal 600 ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0.08),
    color: colours.codGray,
  },

  transactionHistoryCardBody: {
    padding: pxToRem(16),
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: pxToRem(16),
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
    marginTop: pxToRem(32),
    height: "36vh",
    overflow: "auto",
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
  },

  outerContainerDetailedViewHeader: {
    font: `normal normal 600 ${pxToRem(18)}/${pxToRem(27)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.codGray,
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

  backToPreviousPage: {
    cursor: "pointer",
    font: `normal normal 600 ${pxToRem(16)}/${pxToRem(26)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.endavour,

    "& svg": {
      stroke: colours.endavour,
      width: pxToRem(19),
      height: pxToRem(15),
    },
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
}));

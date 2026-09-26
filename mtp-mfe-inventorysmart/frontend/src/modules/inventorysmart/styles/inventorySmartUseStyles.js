import { makeStyles } from "@mui/styles";
import { borderColor } from "@mui/system";

const rem = (px) => `${px / 16}rem`;

export const useStyles = makeStyles((theme) => ({
  tabContainerInCNAFinalize: {
    flex: "1",
    minWidth: 0,
    "& .impact-tab-panel": {
      display: "none !important",
    },
    "& .ia-tabList": {
      backgroundColor: "transparent",
      border: "none",
      borderRadius: 0,
    },
  },
  tabContainerInCNAFinalizeOldFlow: {
    "& .MuiTabs-root": {
      width: "83% !important",
    },
    "& .ia-styles.ia-tabContainer.ia-tabs-horizontal .ia-styles.ia-tabList": {
      width: "85% !important",
    },
    "& .impact-tab-panel": {
      paddingTop: "8px !important",
    },
  },
  cnaTabsRow: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    paddingTop: "24px",
    paddingBottom: "16px",
  },
  tabPanelPaddingInCNAFinalize: {
    "& .impact-tab-panel": {
      paddingTop: "8px !important",
    },
  },
  cnaTabPanels: {
    paddingTop: 0,
  },
  cnaContentScroll: {
    flex: 1,
    overflow: "auto",
    minHeight: 0,
  },
  cnaStep3ScrollArea: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    "& > div": {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
    },
    "& ._loading_overlay_wrapper": {
      flex: "1 !important",
      minHeight: "0 !important",
      display: "flex !important",
      flexDirection: "column !important",
    },
    "& ._loading_overlay_wrapper > div:last-child": {
      flex: "1 !important",
      overflow: "auto !important",
      minHeight: "0 !important",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      "&::-webkit-scrollbar": {
        display: "none",
        width: 0,
        height: 0,
      },
    },
  },
  contentBody: {
    minHeight: "5rem",
  },
  scrollArrow: {
    position: "absolute",
    right: 0,
  },
  autoOverflowWrapper: {
    overflow: theme.content.overflow.auto,
  },
  container: {
    margin: "1rem 0",
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
  },
  dashboardFiltersBtnsDiv: {
    display: "flex",
    alignSelf: "end",
    marginLeft: "15px",
  },
  dashboardTools: {
    backgroundColor: theme.palette.common.white,
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    // padding: "1rem 2rem",
  },
  timePeriodFormContainer: {
    width: "25%",
    marginRight: "1rem",
    padding: "0.7rem",
  },
  spacedElements: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: theme.spacing(2),
    alignItems: "center",
    gap: theme.spacing(2),
  },
  constraintsModal: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  constraintsPanel: {
    width: "593px",
    maxWidth: "593px",
    "& .MuiDrawer-paper": {
      width: "593px",
      maxWidth: "593px",
    },
  },
  button: {
    margin: `0 ${theme.typography.pxToRem(5)}`,
    "&:nth-of-type(1)": {
      marginLeft: 0,
    },

    "&:last-child()": {
      marginRight: 0,
    },
  },
  flexJustifyFlexEnd: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "8px"
  },
  filterBoardHeader: {
    display: "flex",
    justifyContent: "space-between",
  },
  filterBoardMain: {
    display: "flex",
    width: "100%",
    marginTop: `${theme.typography.pxToRem(30)}`,
  },
  inputLabel: {
    padding: "1.3rem",
    background: "white",
    borderRadius: "8px 8px 0 0",
  },
  inputStyle: {
    minWidth: 220,
  },
  mainWrapper: {
    padding: "0px 24px",
  },
  mainWrapperFinalize: {
    minHeight: "600px",
  },
  customWrapper: {
    margin: 0,
    padding: 0,
  },

  stepperWrapper: {
    marginBottom: "16px",
    justifyContent: "center",
  },
  listWrapper: {
    paddingLeft: "1px",
    marginTop: "8px",
    marginBottom: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    "& > div": {
      width: "15rem",
    },
  },
  spinner: {
    animationDuration: "550ms",
    position: "absolute",
    left: 0,
  },
  spinnerContainer: {
    display: "inline-flex",
    position: "relative",
  },
  buttonGroupWrapper: {
    textAlign: "center",
    marginTop: "2rem",
  },
  tableBtn: {
    marginBottom: "4px",
  },
  iconBlue: {
    fontSize: theme.typography.pxToRem(14),
    margin: "0 0.5rem",
    color: theme.palette.primary.main,
    cursor: "pointer",
  },
  iconDisabled: {
    fontSize: theme.typography.pxToRem(14),
    margin: "0 0.5rem",
    color: theme.palette.text.disabled,
    cursor: "pointer",
  },

  // NEW General Styles

  labelPrimary: {
    fontSize: rem(16),
    fontWeight: 600,
  },

  font500: {
    fontWeight: 500,
  },

  font800: {
    fontWeight: 800,
  },

  // Figma-exact styles for Allocation Plan Name label
  allocationPlanNameLabel: {
    fontFamily: "Manrope, sans-serif",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    color: "#60697d",
  },

  gapIS: {
    gap: rem(20),
  },
  btnWrapper: {
    paddingLeft: "1px",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& > div": {
      width: "15rem",
    },
  },

  lineSep: {
    height: rem(20),
    border: "1px solid #D4D4D4",
  },

  marginVertical: {
    margin: `${rem(19)} 0`,
  },

  // DECISION DASHBOARD STYLES
  // allocation dates

  datesContainer: {
    fontSize: rem(12),
    fontWeight: 400,
    color: "#ACACAC",
    wordWrap: "break-word",
  },

  datesContainerValue: {
    fontFamily: "Manrope",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "16px",
    color: "#31416E",
  },

  // NEW KPI STYLES

  kpisContainerNew: {
    display: "grid",
    gridAutoFlow: "column",
    gap: "32px",
    overflowX: "scroll",
    marginTop: rem(20),
    marginBottom: rem(40),
    alignItems: "center",
    padding: ` ${rem(8)} 0`,
  },

  kpisContainerRL: {
    display: "grid",
    gridAutoFlow: "column",
    gap: "32px",
    overflowX: "scroll",
    marginTop: rem(20),
    marginBottom: rem(40),
    alignItems: "center",
    padding: ` ${rem(8)} 0`,
  },

  kpiCards: {
    display: "flex",

    alignItems: "center",
    width: rem(253),
    maxHeight: rem(105),
    padding: rem(16),
    borderRadius: rem(4),
    boxShadow: "0px 0px 8px rgba(0, 0, 0, 0.12)",
  },

  cardArrowLeft: {
    position: "absolute",
    left: 0,
    width: rem(40),
    height: rem(40),
    color: "#D4D4D4",
    zIndex: 9999999,
  },
  cardArrowRight: {
    position: "absolute",
    right: 0,
    width: rem(40),
    height: rem(40),
    color: "#D4D4D4",
    zIndex: 9999999,
  },

  kpiIconContainer: {
    marginRight: rem(20),
  },

  // kpiIconNew :{
  //   width:rem(22),
  //   height:rem(22)
  // },

  kpiArrowContainer: {
    height: "30px",
    width: "30px",
    borderRadius: "50%",
    border: "0.8px solid #758490",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  kpiArrowCard: {
    height: "100%",
    background: "white",
    width: rem(32),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9,
    position: "absolute",
  },

  kpiActual: {
    color: "#758490",
    fontSize: "14px",
    fontFamily: "Poppins",
    fontWeight: 400,
    letterSpacing: "0.14px",
    wordWrap: "break-word",
    textTransform: "lowercase", // Added textTransform property
  },

  kpiNumberValue: {
    fontSize: rem(24),
    fontWeight: "600",
    color: "#1D1D1D",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  // kpi

  kpiContainer: {
    width: "auto",
    padding: `1rem ${theme.typography.pxToRem(3)}`,
  },
  kpiContainerOverflow: {
    display: "-webkit-box",
    flexWrap: "nowrap",
    width: "auto",
    // padding: `1rem ${theme.typography.pxToRem(3)}`,
  },
  newkpiContainer: {
    gap: "32px",
    display: "grid",
    padding: "0 2rem",
    marginTop: "1.25rem",
    overflowX: "hidden",
    alignItems: "center",
    marginBottom: "2.5rem",
    gridAutoFlow: "column",
    position: "relative",
    overflow: "hidden",
  },

  expandedKpisContainer: {
    display: "flex",
    gap: rem(32),
    padding: `0 ${rem(32)}`,
    marginTop: rem(20),
    marginBottom: rem(40),
    overflow: "hidden",
  },

  kpiLabelIS: {
    color: "#394960",
    fontSize: "14px",
    fontFamily: "Poppins",
    fontWeight: 400,
    letterSpacing: "0.16px",
    wordWrap: "break-word",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    // maxHeight: 44,
    "-webkit-line-clamp": 1,
    "-webkit-box-orient": "vertical",
  },

  kpiItem: {
    padding: "1rem",
    minHeight: "10rem",
  },

  kpiItemRightAlign: {
    position: "absolute",
    right: 0,
  },
  KPIPercentage: {
    display: "inline-block",
    position: "relative",
    top: `${theme.typography.pxToRem(5)}`,
  },
  kpiPADVertical: {
    padding: "0.5rem 0",
  },
  kpiLabel: {
    color: "#394960",
    fontSize: "16px",
    fontFamily: "Poppins",
    fontWeight: 400,
    letterSpacing: "0.16px",
    wordWrap: "break-word",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    // maxHeight: 44,
    "-webkit-line-clamp": 1,
    "-webkit-box-orient": "vertical",
  },
  kpiValueLabel: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    maxHeight: 44,
    wordWrap: "break-word",
    "-webkit-line-clamp": 1,
    "-webkit-box-orient": "vertical",
  },
  kpiSubLabel: {
    fontSize: "0.85rem",
    fontWeight: "500",
    color: theme.palette.textColours.slateGrayLight,
  },
  kpiSubValue: {
    fontSize: "1rem",
    fontWeight: "500",
    color: theme.palette.primary.main,
  },
  kpiNumberBig: {
    fontSize: "1.25rem",
    fontWeight: "500",
    color: theme.palette.primary.main,
    // overflow: "hidden",
    // textOverflow: "ellipsis",
  },
  kpiIcon: {
    color: theme.palette.primary.main,
  },
  kpiContainerPadTop: {
    padding: "0.5rem 0 0",
  },
  kpiMainHead: {
    position: "relative",
    textTransform: "capitalize",
    left: `${theme.typography.pxToRem(6)}`,
    top: `${theme.typography.pxToRem(3)}`,
  },

  kpiEucalyptusColor: {
    color: theme.palette.success.main,
  },

  kpiRomanColor: {
    color: theme.palette.error.main,
  },

  kpiUPArrowMark: {
    fontSize: `${theme.typography.pxToRem(20)}`,
    color: theme.palette.success.main,
  },

  kpiUPDownMark: {
    fontSize: `${theme.typography.pxToRem(20)}`,
    color: theme.palette.error.main,
  },
  kpiCard: {
    overflowX: "auto",
    paddingLeft: `${rem(16)}`,
  },
  kpiCardContainer: {
    padding: `1rem`,
    border: `1px solid ${theme.palette.colours.checboxBorder}`,
    borderRadius: "8px",
  },
  newkpiCardContainer: {
    width: `15.8125rem`,
    border: `1px solid #e5e5e5`,
    display: "flex",
    padding: "1rem",
    boxShadow: "0px 0px 8px rgba(0, 0, 0, 0.12)",
    maxHeight: "6.5625rem",
    alignItems: "center",
    borderRadius: "0.625rem",
  },
  kpiItemIcon: {
    // display: flex,
    padding: "8px",
    background: "#E6F2FF",
    borderRadius: "8px",
    marginRight: "1rem",
  },
  kpiGridItem: {
    borderRight: `1px solid ${theme.palette.colours.checboxBorder}`,
  },
  kpiLabelBody: {
    marginRight: "8px",
  },
  kpiValue: {
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    fontWeight: "500",
  },
  // kpiForecastValue: {
  //   width: "44px",
  // },
  kpiValueText: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    marginLeft: "4px",
  },

  // OMS KPI CARD CSS Styles
  omsKpiCardContainer: {
    padding: "0",
    border: `1px solid ${theme.palette.colours.checboxBorder}`,
    borderRadius: "0.5rem",
    marginTop: "0.5rem",
  },
  omsKpiHalfWidth: {
    width: "50%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  omsKpiSubtextBorder: {
    borderRight: `1px solid ${theme.palette.background.primary}`,
    borderTop: `1px solid ${theme.palette.background.primary}`,
    borderBottom: `1px solid ${theme.palette.background.primary}`,
    [theme.breakpoints.up("lg")]: {
      borderTop: "none",
      borderBottom: "none",
    },
  },
  omsKpiSubtextBackground: {
    backgroundColor: theme.palette.colours.silderDisabledRail,
  },
  omsKpiSubtext: {
    marginBottom: 0,
    display: "block",
    padding: "0.625rem 0.5rem 0.625rem 0.5rem",
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: "0.875rem",
    lineHeight: "0.875rem",
  },
  omsKpiHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    height: "100%",
  },
  omsKpiRightSeparator: {
    borderRight: `1px solid ${theme.palette.background.primary}`,
  },
  omsKpiBottomSeparator: {
    borderBottom: `1px solid ${theme.palette.background.primary}`,
  },
  omsKpiTopSeparator: {
    borderTop: `1px solid ${theme.palette.background.primary}`,
  },
  omsKpiTotalSeparator: {
    borderTop: `1px solid ${theme.palette.background.primary}`,
    [theme.breakpoints.up("lg")]: {
      borderTop: "none",
    },
  },
  omsKpiLabel: {
    fontWeight: 500,
    width: "100%",
    textAlign: "left",
    height: "100%",
    borderRight: `1px solid ${theme.palette.background.primary}`,
  },
  omsKpiTotalBig: {
    //fontSize: "0.925rem - Removing For Signet",
    fontSize: "1.20rem",
    fontWeight: "500",
    color: theme.palette.primary.main,
  },
  omsKpiNumberBig: {
    fontSize: "1.25rem",
    fontWeight: "500",
    color: theme.palette.primary.main,
  },
  omsKpiFirstRow: {
    paddingTop: "1rem",
    paddingBottom: "1rem",
  },
  omsKpiLastRow: {
    paddingBottom: "0.8rem",
    paddingTop: "0.8rem",
  },
  omsKpiEndColumn: {
    paddingRight: "1rem",
    paddingLeft: "1rem",
  },

  omsKpiCardContainerSm: {
    overflow: "auto",
    whiteSpace: "nowrap",
    display: "flex",
    borderRadius: " 0.5rem",
    paddingBottom: "1rem",
  },
  omsKpiCardItemSm: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    textDecoration: "none",
    color: `${theme.palette.text.primary}`,
    borderTop: `1px solid ${theme.palette.colours.checboxBorder}`,
    borderRight: `1px solid ${theme.palette.colours.checboxBorder}`,
    borderBottom: `1px solid ${theme.palette.colours.checboxBorder}`,
    "&:last-child": {
      borderTopRightRadius: " 0.5rem",
      borderBottomRightRadius: " 0.5rem",
      flexBasis: "100%",
    },
    "&:first-child": {
      borderTopLeftRadius: " 0.5rem",
      borderBottomLeftRadius: " 0.5rem",
      borderLeft: `1px solid ${theme.palette.colours.checboxBorder}`,
    },
  },
  omsKpiCardGradeContainerSm: {
    display: "flex",
    flexDirection: "row",
    textAlign: "center",
    textDecoration: "none",
  },
  omsKpiCardGradeItemSm: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  omsKpiCardGradeTitle: {
    padding: "0.8rem 0.5rem",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "40px",
    fontWeight: 500,
  },
  omsKpiCardGradeMemoSm: {
    borderLeft: `1px solid ${theme.palette.background.primary}`,
  },
  omsKpiCardGradeValueSm: {
    color: `${theme.palette.text.primary}`,
    padding: "0.8rem 0.8rem",
    borderTop: `1px solid ${theme.palette.background.primary}`,
    width: "100%",
    display: "flex",
    justifyContent: "flex-end",
  },
  omsKpiCardGradeSumSm: {
    fontWeight: "500",
    color: theme.palette.primary.main,
  },
  omsKpiCardGradeTotalSm: {
    fontWeight: "500",
    color: theme.palette.primary.main,
    fontSize: "1.25rem",
    padding: "0.55rem 1rem 0.55rem 1.5rem",
    borderTop: `1px solid ${theme.palette.background.primary}`,
    width: "100%",
    display: "flex",
    justifyContent: "flex-end",
  },
  omsKpiCardGradeNameSm: {
    display: "flex",
    alignSelf: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    backgroundColor: theme.palette.colours.silderDisabledRail,
    fontWeight: 500,
  },

  //Inventory Details styles

  inventoryDetailsPanel: {
    width: "895px !important",
    fontFamily: "Manrope",
    "& .impact_drawer_container_large": {
      width: "895px !important",
    },
    "& .impact_accordion_main_container": {
      background: "#fff !important",
    },
  },
  aiFilterChipsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  aiFilterChip: {
    flexShrink: 0,
    "& .MuiChip-filled": {
      backgroundColor: "#FFFFFF !important",
      border: "1px solid #6962EF !important",
      borderRadius: "9999px !important",
    },
    "& .MuiChip-label": {
      color: "#6962EF !important",
      paddingRight: "6px !important",
    },
    "& .MuiChip-filled:hover": {
      backgroundColor: "#EEF0FF !important",
      borderColor: "#6962EF !important",
    },
    "& .MuiChip-filled:hover .MuiChip-label": {
      color: "#6962EF !important",
    },
    "& .MuiChip-deleteIcon": {
      color: "#A9A4F5 !important",
      fontSize: "16px",
      margin: "0 6px 0 0 !important",
      transition: "color 0.2s ease",
    },
    "& .MuiChip-deleteIcon:hover": {
      color: "#6962EF !important",
    },
  },
  aiFilterChipActive: {
    "& .MuiChip-filled": {
      backgroundColor: "#6962EF !important",
      border: "1px solid #6962EF !important",
      borderRadius: "9999px !important",
    },
    "& .MuiChip-label": {
      color: "#FFFFFF !important",
      fontWeight: 600,
      paddingRight: "6px !important",
    },
    "& .MuiChip-filled:hover": {
      backgroundColor: "#5b54e6 !important",
      borderColor: "#5b54e6 !important",
    },
    "& .MuiChip-filled:hover .MuiChip-label": {
      color: "#FFFFFF !important",
    },
    "& .MuiChip-deleteIcon": {
      color: "rgba(255, 255, 255, 0.7) !important",
      fontSize: "16px",
      margin: "0 6px 0 0 !important",
      transition: "color 0.2s ease",
    },
    "& .MuiChip-deleteIcon:hover": {
      color: "#FFFFFF !important",
    },
  },
  inventoryDetailsBtnContainer: {
    borderRadius: "8px",
    padding: "1px",
    background:
      "linear-gradient(136.31deg, #2AC2EE 12.23%, #6962EF 49.23%, #F26921 88.52%)",

    "& .inventory-details-btn": {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "5px 11px",
      borderRadius: "8px",
      cursor: "pointer",
      background: "#FFF",
      transition: "all 0.3s ease",
      fontFamily: "Manrope",
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "20px",
      position: "relative",
      overflow: "hidden",
      animation: "none",
      color: "#0D152C",

      "& svg": {
        width: 18,
        height: 18,
      },
      "&:hover": {
        color: "#1F2B4D",
        background: "#FFF",
        animation: "none",
        "& path": {
          fill: "currentColor",
        },
      },
    },
  },

  disableInvDetails: {
    background: "none",
    border: "1px solid #d9dde7",
    "& .inventory-details-btn": {
      backgroundColor: "#f8f9fb",
      color: "#b4bac7",
      cursor: "not-allowed",
      animation: "none",
      "& path": {
        fill: "#b4bac7",
      },
      "&:hover": {
        color: "#b4bac7",
        background: "#d9dde7",
        animation: "none",
        "& path": {
          fill: "#b4bac7",
        },
      },
    },
  },

  "@keyframes gradientShift": {
    "0%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
    "100%": { backgroundPosition: "0% 50%" },
  },

  // 4 visual states mapped to the provided references
  "@keyframes inventoryDetailsCycle": {
    "0%": {
      background: "linear-gradient(160deg, #2AC2EE 0%, #FFF 40%, #FFF 100%)",
    },
    "5%": {
      background: "linear-gradient(168deg, #44ADEE 0%, #FFF 40%, #FFF 100%)",
    },
    "10%": {
      background: "linear-gradient(176deg, #5D98ED 0%, #FFF 40%, #FFF 100%)",
    },
    "15%": {
      background: "linear-gradient(184deg, #677FEE 0%, #FFF 40%, #FFF 100%)",
    },
    "20%": {
      background: "linear-gradient(192deg, #6B6BEF 0%, #FFF 40%, #FFF 100%)",
    },
    "25%": {
      background: "linear-gradient(200deg, #6962EF 0%, #FFF 40%,#FFF 100%)",
    },
    "30%": {
      background: "linear-gradient(228deg, #8660E0 0%, #FFF 40%,#FFF 100%)",
    },
    "35%": {
      background: "linear-gradient(256deg, #A25ED0 0%, #FFF 40%,#FFF 100%)",
    },
    "40%": {
      background: "linear-gradient(284deg, #BE5DC0 0%, #FFF 40%,#FFF 100%)",
    },
    "45%": {
      background: "linear-gradient(312deg, #DA5BB0 0%, #FFF 40%,#FFF 100%)",
    },
    "50%": {
      background: "linear-gradient(340deg, #F26921 0%,#FFF 40%, #FFF 100%)",
    },
    "55%": {
      background: "linear-gradient(347deg, #DA5BB0 0%,#FFF 40%, #FFF 100%)",
    },
    "60%": {
      background: "linear-gradient(354deg, #BE5DC0 0%,#FFF 40%, #FFF 100%)",
    },
    "65%": {
      background: "linear-gradient(1deg, #A25ED0 0%,#FFF 40%, #FFF 100%)",
    },
    "70%": {
      background: "linear-gradient(8deg, #8660E0 0%,#FFF 40%, #FFF 100%)",
    },
    "75%": {
      background: "linear-gradient(15deg, #6962EF 0%,#FFF 40%,#FFF 100%)",
    },
    "80%": {
      background: "linear-gradient(44deg, #5F7FF0 0%,#FFF 40%,#FFF 100%)",
    },
    "85%": {
      background: "linear-gradient(73deg, #559BEE 0%,#FFF 40%,#FFF 100%)",
    },
    "90%": {
      background: "linear-gradient(102deg, #4BB4EF 0%,#FFF 40%,#FFF 100%)",
    },
    "95%": {
      background: "linear-gradient(131deg, #41C9EF 0%,#FFF 40%,#FFF 100%)",
    },
    "100%": {
      background: "linear-gradient(160deg, #2AC2EE 0%,#FFF 40%,#FFF 100%)",
    },
  },

  "@keyframes fadeInSlide": {
    from: {
      opacity: 0,
      transform: "translateX(10px)",
    },
    to: {
      opacity: 1,
      transform: "translateX(0)",
    },
  },

  animatedTopRightButton: {
    animation: "$fadeInSlide 0.3s ease-in-out",
    opacity: 1,
  },

  productDetailsContainer: {
    backgroundColor: theme.palette.colours.athensGray1,
    borderRadius: "8px",
    color: "#60697D",
    fontSize: "12px",
    lineHeight: "16px",
    fontFamily: "Manrope",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    flex: "1 0 0",
    alignItems: "flex-start",
    fontFamily: "Manrope",
    "& .header": {
      fontSize: "16px",
      fontWeight: "800",
      lineHeight: "24px",
      color: "#0D152C",
      background: "transparent",
      display: "block",
      width: "auto",
      height: "auto",
      minWidth: 0,
      padding: 0,
      gap: 0,
      borderRadius: 0,
    },
  },

  productDetailsTile1: {
    padding: "0px 16px",
    display: "flex",
    alignItems: "center",
    flex: "1 0 0",
    gap: "8px",
    borderRadius: "8px",
    border: "1px solid  #D9DDE7",
    background: "#FFF",
    height: "54px",
    "&> svg": {
      minWidth: "20px",
    },
    "& .details": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    "& .details p:first-child": {
      whiteSpace: "nowrap",
    },
    "& .details p:nth-child(2)": {
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "20px",
      color: "#1F2B4D",
      maxWidth: "60%",
    },
    "& .productIcon": {
      scale: "1.5",
    },
  },

  productDetailsTile2: {
    display: "flex",
    padding: "8px 16px",
    flex: "1 0 0",
    alignItems: "center",
    gap: "8px",
    borderRadius: "8px",
    border: "1px solid #D9DDE7",
    background: " #FFF",
    "& .calendar_svg__b": {
      fill: "#60697D",
    },
    "& > svg": {
      minWidth: "20px",
    },
    "& .details": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      gap: "8px",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    "& .details p:nth-child(2)": {
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "20px",
      color: "#1F2B4D",
    },
  },
  waterFallChartContainer: {
    width: "100%",
    borderRadius: "8px",
    background: "#FFF",
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    color: "#0D152C",
  },
  waterFallChartTitle: {
    fontSize: "12px",
    lineHeight: "16px",
    color: "#0D152C",
    fontWeight: "500",
  },

  donutGraphContainer: {
    padding: "16px",
    borderRadius: "8px",
    background: "#FFF",
    width: "50%",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    color: "#0D152C",
    boxShadow: "0px 0px 2px 0px rgba(0, 0, 0, 0.12)",
  },
  wosComparison: {
    padding: "12px",
    borderRadius: "8px",
    background: "#FFF",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    color: "#0D152C",
    width: "207px",
    minWidth: "207px",
    maxWidth: "207px",
    flexShrink: 0,
    boxShadow: "0 0 2px 0 rgba(0, 0, 0, 0.12)",
    height: "auto",
    position: "relative",
    color: "#31416E",
    alignItems: "center",
    "&> .outerCircle": {
      width: "120px",
      height: "120px",
      position: "relative",
      marginTop: "26px",
      "& svg": {
        position: "absolute",
        top: 0,
        left: 0,
      },
      "& .twosLabel": {
        position: "absolute",
        top: "0px",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        "& .labelBox": {
          background: "#f4f1f9",
          color: "#977cc1",
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
          marginBottom: "4px",
        },
        "& .labelLine": {
          width: "2px",
          height: "20px",
          background: "#bfafd9",
        },
      },
      "& .cwosLabel": {
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        "& .labelBox": {
          background: "#FDF0EC",
          color: "#f19579",
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
          marginBottom: "4px",
        },
        "& .labelLine": {
          width: "2px",
          height: "20px",
          background: "#f19579",
        },
      },
      "& .cwosLabelDynamic": {
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: "translate(-50%, -50%) rotate(var(--rotation))",
        "& .labelBox": {
          background: "#FDF0EC",
          color: "#f19579",
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
          marginBottom: "4px",
          transform: "rotate(var(--counter-rotation))",
        },
        "& .labelLine": {
          width: "2px",
          height: "20px",
          background: "#f19579",
        },
      },
    },
    "&> .header": {
      fontSize: "16px",
      fontWeight: "600",
      lineHeight: "24px",
      color: "#0D152C",
      alignSelf: "flex-start",
      fontFamily: "Manrope",
      background: "transparent",
      display: "block",
      width: "auto",
      height: "auto",
      minWidth: 0,
      padding: 0,
      gap: 0,
      borderRadius: 0,
    },
    "& .legends": {
      display: "flex",
      justifyContent: "center",
      gap: "24px",
      marginTop: "16px",
    },
    "& .legendItem": {
      display: "flex",
      alignItems: "center",
      gap: "6px",
    },
    "& .legendDash": {
      width: "8px",
      height: "8px",
      borderRadius: "100px",
    },
    "& .cwosDash": {
      background: "#f19579",
    },
    "& .targetDash": {
      background: "#bfafd9",
    },
    "& .legendText": {
      fontSize: "12px",
      color: "#60697D",
      fontWeight: "500",
      fontFamily: "Manrope",
      lineHeight: "16px",
    },
  },

  barGraphContainer: {
    padding: "16px",
    borderRadius: "8px",
    background: "#FFF",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    color: "#0D152C",
    width: "50%",
    boxShadow: "0px 0px 2px 0px rgba(0, 0, 0, 0.12)",
  },
  lineChartContainer: {
    padding: "12px",
    borderRadius: "8px",
    background: "#FFF",
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    color: "#0D152C",
    height: "auto",
    /* Extra small */
    boxShadow: "0 0 2px 0 rgba(0, 0, 0, 0.12)",
    overflow: "hidden",
    "& .header": {
      fontSize: "16px",
      fontWeight: "600",
      lineHeight: "24px",
      color: "#0D152C",
      fontFamily: "Manrope",
      background: "transparent",
      alignSelf: "flex-start",
      display: "block",
      width: "auto",
      height: "auto",
      minWidth: 0,
      padding: 0,
      gap: 0,
      borderRadius: 0,
    },
  },

  // Remove grey background from tabs
  tabsContainer: {
    "& .MuiTabs-root": {
      backgroundColor: "transparent",
    },
    "& .MuiTab-root": {
      backgroundColor: "transparent",
      "&:hover": {
        backgroundColor: "transparent",
      },
    },
    "& .Mui-selected": {
      backgroundColor: "transparent",
    },
  },

  // OMS ORDER REPOSITORY KPI CARD CSS Styles
  omsRepoSubLabel: {
    color: theme.palette.textColours.slateGrayLight,
    fontSize: "0.85rem",
  },

  // product rules
  matTabSubTab: {
    "&.MuiTabPanel-root": {
      padding: 0,
    },
  },

  textEllipsis: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  // reports - card summary metrics
  summaryContainer: {
    padding: "1rem",
    minHeight: "6rem",
  },
  textEllipsis: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  highlightRow: {
    background: "rgb(0 85 175 / 30%)",
  },
  customAccordion: {
    position: "relative",

    // This classes are over-riden because KPI container for some screen becomes small and calendar is not visible fully
    "& .DateRangePicker": {
      position: "unset",

      "& .DateRangePickerInput": {
        position: "unset",

        "& .DateRangePicker_picker": {
          position: "absolute",
          top: "88px !important",
          left: "112px !important",
          zIndex: 1,
        },

        "& .DateRangePickerInput_clearDates": {
          margin: 0,
          padding: 6,
          top: "unset",
          right: "unset",
          transform: "none",
        },
      },
    },
  },
  capacityButtonGroupWrapper: {
    display: "flex",
    justifyContent: "end",
    gap: "16px",
  },
  storeDownloadButton: {
    display: "flex",
    margin: "0 2rem 2rem 0",
    justifyContent: "flex-end",
  },
  downloadButtonBox: {
    display: "flex",
    margin: "0px 0px 8px 0px",
    justifyContent: "flex-end",
  },
  iconButton: {
    minWidth: "20px",
  },
  // Auto Allocation Rules

  autoFlexRow: {
    display: "flex",
    alignItems: "center",
    gap: "36px",
    justifyContent: "flex-start",
  },

  frequencyWrapper: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },

  frequencySelector: {
    paddingLeft: "1px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  monthWeekWrapper: {
    display: "flex",
    gap: "2rem",
    alignItems: "center",
  },

  weekSelectionMargin: {
    margin: "5px",
  },

  weekSelectionCustomBorder: {
    border: "solid 1px #0051A8",
  },

  autoAllocationDatePicker: {
    width: "15vw",
    margin: "1px 0",
    "& .MuiInputBase-input": {
      padding: "10px",
    },
  },

  autoAllocationTextField: {
    width: "10vw",
    margin: "1px 0",
    "& .MuiInputBase-input": {
      padding: "10px",
    },
  },

  monthlyFreqSelector: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(60px, 6rem))",
    gap: "5px",
  },

  // Date grid (1-31) for Monthly/Quarterly/Yearly - Figma-aligned uniform 6-column grid
  dateGridSelector: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 70px)",
    gap: "12px",
    "& .MuiChip-root": {
      minWidth: "70px !important",
      width: "100%",
      maxWidth: "100%",
    },
  },

  marginAround: {
    margin: "1rem",
  },
  cardContentVisibility: {
    visibility: "hidden",
  },
  customFieldStyleContainer: {
    "& .MuiFormGroup-root": {
      display: "flex",
      flexDirection: "row",
    },
    marginTop: "20px",
    minHeight: "150px",
  },
  actionButtons: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
    justifyContent: "center",
  },
  alignFlexStart: {
    display: "flex",
    margin: "2rem 0rem",
    alignItems: "center",
  },
  alignFlexStartText: {
    display: "flex",
    margin: "1rem 0rem",
    alignItems: "center",
  },
  ruleName: {
    display: "flex",
    alignItems: "center",
    flexBasis: "30%",
    gap: "1rem",
    "& .MuiTypography-root.required::after": {
      content: '" *"',
      color: "red",
    },
  },
  ruleBarContainer: {
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    minHeight: "50px",
    marginTop: "1rem",
    marginBottom: "1rem",
    padding: "0rem 1rem",
    background: "#f5f6fa",
    fontFamily: "Manrope",
  },
  // Operator banner between rules (AND/OR separator)
  ruleOperatorWrapper: {
    marginTop: "8px",
    marginBottom: "8px",
    display: "flex",
    justifyContent: "flex-start",
    fontFamily: "Manrope",
  },
  // Segmented toggle for AND/OR (left aligned) - matches Figma pill toggle
  ruleOperatorToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0px",
    borderRadius: "12px",
    background: "#FFFFFF",
  },
  ruleOperatorBtn: {
    appearance: "none",
    border: "none",
    outline: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    fontFamily: "Manrope",
    lineHeight: "20px",
    minWidth: "56px",
    maxHeight: "24px",
    padding: "2px 12px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    borderRadius: "8px",
    "&:disabled": {
      pointerEvents: "none",
      background: "transparent",
      color: "#b4bac7",
    },
  },
  // Specific styles per operator per figma
  ruleOperatorBtnOr: {
    color: "#31935F",
  },
  ruleOperatorBtnOrActive: {
    background: "#EBF7F1",
    color: "#31935F",
  },
  ruleOperatorBtnAnd: {
    color: "#3649C6",
  },
  ruleOperatorBtnAndActive: {
    background: "#ECEEFD",
    color: "#3649C6",
  },
  ruleStructure: {
    // overflow: "auto",
    flexBasis: "65%",
    "& .MuiOutlinedInput-input": {
      background: "white",
      minWidth: "4rem",
    },
    "& .MuiInputBase-root": {
      marginLeft: "1rem",
    },
  },
  alignTextField: {
    margin: "0",
    "& .MuiFormControl-root": {
      margin: "0 8px",
    },
    "& .MuiOutlinedInput-input": {
      padding: "0.75rem",
    },
  },

  createRulesContainer: {
    padding: "16px",
    borderRadius: "8px",
    background: "white",
  },

  // DC Store Strategy Rules -> Create rules (Figma-aligned)
  dcCreateRulesCard: {
    background: "#fff",
    borderRadius: "8px",
    padding: "12px 16px",
    fontFamily: "Manrope",
  },
  dcCreateRulesHeader: {
    margin: "0 0 16px 0",
    fontFamily: "Manrope",
    fontWeight: 700,
    fontSize: "14px",
    lineHeight: "21px",
    color: "#0d152c",
  },
  dcRuleNameDefRow: {
    display: "flex",
    flexDirection: "row",
    // Top-align so the Rule definition helper text (below its input) doesn't
    // vertically offset the two input boxes relative to each other
    alignItems: "flex-start",
    gap: "12px",
    margin: "0 0 16px 0",
  },
  dcInputBox: {
    display: "flex",
    flexDirection: "row",
    // Top-align so the label lines up with the input (not the taller
    // FormControl that includes the helper text below the definition input)
    alignItems: "flex-start",
    gap: "6px",
    margin: 0,
  },
  dcFieldLabel: {
    display: "flex",
    alignItems: "center",
    // Match the input height so the label vertically centers against the input
    height: "32px",
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    color: "#60697d",
    whiteSpace: "nowrap",
    margin: 0,
    "& .dcReq": {
      color: "#e15554",
    },
  },
  dcRuleNameField: {
    "& .MuiFormControl-root": {
      width: "250px",
      margin: 0,
    },
    // Value text is bold to match Figma
    "& .MuiOutlinedInput-input": {
      fontWeight: "600 !important",
    },
  },
  dcRuleDefField: {
    "& .MuiFormControl-root": {
      width: "469px",
      margin: 0,
    },
    // Value text is bold to match Figma
    "& .MuiOutlinedInput-input": {
      fontWeight: "600 !important",
    },
  },
  dcRuleBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "8px",
    borderRadius: "8px",
    background: "#f5f6fa",
    marginBottom: "16px",
    fontFamily: "Manrope",
  },
  dcRuleLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: "1 1 auto",
    minWidth: 0,
  },
  dcRuleName: {
    display: "flex",
    alignItems: "center",
    gap: "23px",
    flex: "0 0 auto",
  },
  dcRuleIndexLabel: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    color: "#60697d",
    whiteSpace: "nowrap",
  },
  // Rule names (Rule 1..5) are not editable -> render as plain text, not an input box
  dcRuleNameValue: {
    display: "flex",
    alignItems: "center",
    height: "32px",
    minWidth: "250px",
    width: "250px",
    boxSizing: "border-box",
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "20px",
    color: "#1f2b4d",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  dcRuleStructure: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: "0 1 auto",
    minWidth: 0,
    "& .MuiFormControlLabel-root": {
      margin: 0,
      gap: "23px",
    },
    "& .MuiFormControlLabel-label": {
      fontFamily: "Manrope",
      fontWeight: 500,
      fontSize: "12px",
      lineHeight: "16px",
      color: "#60697d",
      margin: 0,
      whiteSpace: "nowrap",
    },
    "& .ia-select-styled-dropdown-main-button": {
      minWidth: "250px !important",
      width: "250px !important",
    },
    // Dependent input (e.g. percent / "-" value) -> compact 135px x 32px to match Figma
    "& .MuiFormControl-root": {
      width: "135px",
      minWidth: "135px",
      margin: 0,
    },
    "& .MuiOutlinedInput-root": {
      height: "32px",
      minHeight: "32px",
      marginLeft: 0,
    },
    "& .MuiOutlinedInput-input": {
      height: "32px",
      boxSizing: "border-box",
      paddingTop: 0,
      paddingBottom: 0,
    },
    "& .right-input-icon": {
      color: "#1f2b4d",
    },
    // Fix number input width to match visible border (prevent spinner arrows from floating away)
    "& .rule-number-input-wrapper input": {
      minWidth: "0 !important",
    },
    // Yes/No radio spacing + typography to match Figma (node 28793:193174)
    "& .ia-radioGroup.orientation-row": {
      gap: "16px",
    },
    "& .ia-radioButton.MuiFormControlLabel-root": {
      marginLeft: 0,
      marginRight: 0,
      // Override the 23px gap that the shared .MuiFormControlLabel-root rule applies;
      // radio circle -> label spacing is handled by the button padding below (8px)
      gap: 0,
    },
    // 8px gap between the radio circle and its label
    "& .ia-radioButton .MuiButtonBase-root": {
      paddingLeft: "0 !important",
      paddingRight: "8px !important",
    },
    // Radio label: Manrope Medium 14px, #1f2b4d (overrides the 12px/#60697d field-label rule above)
    "& .ia-radioButton .MuiFormControlLabel-label": {
      fontFamily: "Manrope",
      fontWeight: 500,
      fontSize: "14px",
      lineHeight: "20px",
      color: "#1f2b4d",
    },
  },
  dcRuleActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  },
  ruleDefinitionInput: {
    width: "500px",
    "& .MuiInputBase-input": {
      width: "500px !important",
    },
  },
  frequencyDetailsContainer: {
    minHeight: "100px",
    padding: "12px 8px",
    borderRadius: "8px",
    background: "#f5f6fa",
  },

  // Auto allocation scheduler create panel (Figma-aligned)
  schedulerPanelBody: {
    padding: "0px 0px 0px 0px",
  },
  schedulerFieldsRow: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
    flexWrap: "nowrap",
    marginBottom: "16px",
  },
  schedulerInputBox: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
  },
  schedulerNameField: {
    "& .MuiFormControl-root": {
      width: "350px",
      margin: 0,
    },
  },
  schedulerDefField: {
    "& .MuiFormControl-root": {
      width: "320px",
      margin: 0,
    },
  },
  schedulerFieldLabel: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
    color: "#60697d",
    whiteSpace: "nowrap",
  },
  requiredAsterisk: {
    "&::after": {
      content: '" *"',
      color: "#d32f2f",
    },
  },
  schedulerRepeatsLabel: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "32px",
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: "14px",
    lineHeight: "21px",
    color: "#000",
    whiteSpace: "nowrap",
    "&::after": {
      content: '" *"',
      color: "#d32f2f",
    },
  },
  schedulerLabelDivider: {
    width: "1px",
    height: "32px",
    flexShrink: 0,
    backgroundImage: "linear-gradient(#d9dde7, #d9dde7)",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    backgroundSize: "1px 12px",
  },
  repeatsOnColumn: {
    flex: "1 1 0",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  chipWrapRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "6px",
  },
  monthChipCell: {
    display: "inline-flex",
  },

  selectRuleAction: {
    padding: "20px",
    width: "100%",
    border: "1px solid #f6f6f6",
    height: "auto",
    background: "white",
    borderRadius: "8px",
    zIndex: "1000 !important",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  weekSelectionContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flex: "1 1 0",
    minWidth: 0,
    gap: "6px",
  },
  formControl: {
    minWidth: 120,
  },
  dynamicCardHeight: {
    height: "15rem",
  },
  tabHeaderDesign: {
    display: "flex",
    justifyContent: "space-between",
  },
  alignCenter: {
    alignSelf: "center",
  },
  link: {
    cursor: "pointer",
    margin: "1rem",
    color: "#646CE7",
    "&:hover": {
      textDecoration: "underline",
    },
  },
  linkDisabled: {
    pointerEvents: "none",
    color: theme.palette.action.disabled,
    margin: "1rem",
  },
  alignRight: {
    display: "flex",
    justifyContent: "flex-end",
    margin: "0.5rem 0",
    marginTop: "3px",
    marginBottom: "12px",
  },
  constraintsStepperContainer: {
    padding: "50px 100px",
  },
  constraintsStepperSteps: {
    minHeight: "350px",
  },
  constraintsDivider: {
    marginTop: "20px",
  },
  paddingLeft: {
    paddingLeft: "20px",
  },
  negetiveMarginLeft: {
    marginLeft: "-25px",
  },
  marginVertical50px: {
    marginTop: "50px",
  },
  excessTag: {
    fontSize: "10px",
    borderRadius: "5px",
    marginLeft: "5px",
    color: "red",
    padding: "4px",
    border: `1px solid red`,
  },
  deficitTag: {
    fontSize: "10px",
    borderRadius: "5px",
    marginLeft: "5px",
    color: "blue",
    padding: "4px",
    border: `1px solid blue`,
  },
  uploadButtonStyle: {
    height: "34px",
    minHeight: "34px",
    padding: "6px 16px",
  },
  bottomButtonsContainer: {
    position: "fixed",
    zIndex: 10,
    bottom: 0,
    left: "60px",
    width: "calc(100% - 60px)",
    backgroundColor: theme.palette.common.white,
    padding: "16px 24px",
  },
  bottomButtonsWrapper: {
    position: "fixed",
    zIndex: 10,
    bottom: 0,
    left: "64px", // Updated to match Figma (64px instead of 60px)
    width: "calc(100% - 64px)", // Updated to match Figma
  },
  bottomButtonsGreyBar: {
    height: "24px",
    backgroundColor: "#EFF2FA",
    width: "100%",
  },
  bottomButtonsContainer24: {
    backgroundColor: theme.palette.common.white,
    padding: "12px 24px",
    justifyContent: "space-between",
  },
  bottomButtonsContainer24px: {
    backgroundColor: "white",
    borderTop: "1px solid #d9dde7", // Added top border as per Figma
    padding: "16px 24px", // Updated padding to match Figma (16px vertical, 24px horizontal)
    justifyContent: "flex-end",
    display: "flex",
    alignItems: "center",
  },
  paddingBottom2rem: {
    paddingBottom: "2rem",
  },
  storeDetailsTable: {
    "& .impact-table-main-header-left": {
      gap: "6px !important",
    },
  },
  marginBottom5: {
    marginBottom: "5rem",
  },
  marginRight: {
    marginRight: "10px !important",
  },
  marginTop2: {
    marginTop: "2rem",
  },
  marginTop05: {
    marginTop: "0.5rem",
  },
  rowLevelContainer: {
    display: "flex",
    flexDirection: "row",
    gap: "2rem",
  },
  monthlyFrequencyWrapper: {
    display: "flex",
    flexDirection: "row",
    gap: "12px",
    alignItems: "flex-start",
  },
  repeatsOnWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  planWrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 16px",
    background: "white",
    borderRadius: "8px",
  },
  invisibleDialogStyle: {
    background: "#f5f6fa",
    marginBottom: "0px",
    overflow: "hidden",
  },
  toggleButton: {
    position: "relative",
    top: "10px",
    padding: "10px",
    alignSelf: "center",
    display: "flex",
    gap: "5px",
  },
  infoIcon: {
    color: theme.palette.textColours.greyHelperText,
    cursor: "pointer",
  },

  alertsWrapper: {
    height: "auto",
    padding: "20px",
    paddingBottom: "32px",
    marginBottom: "16px",
  },
  alertsLinkStyles: {
    cursor: "pointer",
    pointerEvents: "pointer",
    color: "#3649C6",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "20px",
    textDecoration: "none",
  },
  alertsLinkDisabledStyles: {
    cursor: "cursor",
    pointerEvents: "none",
    color: "gray",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "20px",
    textDecoration: "none",
    marginTop: "1px",
  },
  alertsValuesStyles: {
    color: "#0D152C",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "21px",
  },
  textOverFlowStyles: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    display: "inline-block",
    minWidth: 0,
    flexShrink: 1,
  },
  alertsContentWrapper: {
    display: "inline-flex",
    gap: 8,
    minWidth: 0,
    maxWidth: "100%",
    "& .setting-icon": {
      height: "21px",
      width: "21px",
      flexShrink: 0,
    }
  },
  // Min distribution cell styles (used in AllRulesTable)
  minDistributionCell: {
    display: "flex",
    alignItems: "center",
  },
  minDistributionCellContent: {
    flex: "0 1 auto",
    minWidth: 0,
  },
  minDistributionIconBtn: {
    display: "inline-flex",
    alignItems: "center",
    cursor: "pointer",
    marginLeft: "4px",
  },
  minDistributionIcon: {
    width: "16px",
    height: "16px",
  },
  alertsIconWrapper: {
    marginTop: "4px",
    flexShrink: 0,
  },
  alertsLabelWrapper: {
    flexShrink: 0,
  },
  alertsLabelStyles: {
    color: "#60697D",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "21px",
  },
  alertsRowsStyles: {
    gap: 24,
    height: "32px",
    padding: "5.5px 24px",
    background: "#f5f6fa",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    "&:not(:last-child)": {
      marginBottom: "8px",
    },
  },
  alertsTextWrapper: {
    display: "flex",
    gap: 5,
    minWidth: 0,
    flexShrink: 1,
    alignItems: "center",
  },
  noPointer: {
    cursor: "cursor",
    pointerEvents: "none",
  },
  marginBottom24: {
    marginBottom: "24px",
  },
  marginTop24: {
    marginTop: "24px",
  },
  footerLeft: {
    justifyContent: "flex-end",
    display: "flex",
  },
  dividerLine: {
    width: "1px",
    height: "12px",
    backgroundColor: "#d9dde7",
  },
  headerDataStyle: {
    color: "#60697D",
    fontFamily: "Manrope",
    fontSize: "12px",
    fontStyle: "normal",
    fontWeight: 500,
    lineHeight: "16px",
  },
  headerValueDataStyle: {
    color: "#1F2B4D",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 800,
    lineHeight: "21px",
  },
  headerTopLeftOptions: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  headerMetricGroup: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  headerInfoIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    padding: 0,
    border: "none",
    borderRadius: "8px",
    backgroundColor: "transparent",
    cursor: "pointer",
    flexShrink: 0,
    "&:hover": {
      backgroundColor: "#eceefd",
    },
    "& svg": {
      width: "16px",
      height: "16px",
    },
  },
  headerRefreshIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    padding: 0,
    border: "none",
    borderRadius: "8px",
    backgroundColor: "transparent",
    cursor: "pointer",
    flexShrink: 0,
    "&:hover": {
      backgroundColor: "#eceefd",
    },
    "& svg": {
      width: "16px",
      height: "16px",
    },
  },
  titleSubTitle: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#60697D",
    textTransform: "capitalize",
  },
  titleSubTitleValue: {
    fontSize: "14px",
    fontWeight: "800",
    color: "#1F2B4D",
  },
  paddingBottom16: {
    paddingBottom: "16px",
  },
  leftSideContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  rightSideDetails: {
    minWidth: "200px",
  },
  // Review Forecast Panel Styles
  forecastPanel: {
    width: "800px !important",
    fontFamily: "Manrope",
    "& .impact_drawer_container_large": {
      width: "800px !important",
    },
    "& .impact_accordion_main_container": {
      background: "#fff !important",
    },
  },
  flex_1: {
    flex: "1 0 0",
  },
  panelContainer: {
    padding: "20px 0px",
    background: "#fff",
    borderRadius: "8px",
  },
  icon_container: {
    flexBasis: "auto",
    marginRight: "1.5rem",
  },
  chart_tooltip: {
    boxShadow: "0px 0px 12px 0 rgba(26, 39, 124, 0.14)",
    borderRadius: "8px",
    padding: "16px",
    fontFamily: "Manrope",
  },
  // Review Forecast Chart Styles
  containerCards: {
    border: "1px solid #ebebf0",
    borderRadius: "12px",
    backgroundColor: "#fff",
    padding: "20px",
  },
  chartContainer: {
    position: "relative",
  },
  weekLabels: {
    display: "flex",
    position: "relative",
    marginBottom: "10px",
    paddingLeft: "60px", // Account for y-axis space
    paddingRight: "20px",
    zIndex: 10,
    height: "20px",
  },
  pastWeekLabel: {
    position: "absolute",
    left: "15%",
    fontSize: "14px",
    color: "#666",
    fontWeight: "500",
    zIndex: 11,
    backgroundColor: "#fff",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  thisWeekLabel: {
    position: "absolute",
    left: "60%", // Position above the separator line
    fontSize: "14px",
    color: "#666",
    fontWeight: "500",
    zIndex: 11,
    backgroundColor: "#fff",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  weekLabel: {
    fontSize: "14px",
    color: "#666",
    fontWeight: "500",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a1a1a",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  avgDiscount: {
    fontSize: "14px",
    color: "#666",
  },
  iconButton: {
    padding: "4px",
    color: "#666",
    "&:hover": {
      backgroundColor: "#f5f5f5",
    },
  },
  noInventoryDetailsContainer: {
    padding: "12px 0",
    width: "100%",
    minHeight: "70vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  noInventoryDetails: {
    fontSize: "16px",
    color: "#60697D",
  },
  marginTopBtm: {
    margin: "12px 0",
  },
  viewByLabel: {
    fontSize: "12px",
    alignSelf: "center",
  },

  // Refresh Dates Ticker Styles
  refreshDatesTickerContainer: {
    minWidth: rem(56),
    height: rem(32),
    borderRadius: rem(8),
    background: "#F5F6FA",
  },
  refreshDatesLabel: {
    color: "#31416E",
    fontFamily: "Manrope",
    fontSize: rem(12),
    fontWeight: 700,
    lineHeight: rem(20),
  },
  refreshDatesItemLabel: {
    fontFamily: "Manrope",
    fontSize: rem(12),
    fontWeight: 500,
    lineHeight: rem(16),
    color: "#60697D",
  },

  // Alerts Container Styles
  alertsContainerMultiTab: {
    borderRadius: rem(8),
    background: "#FFF",
  },
  alertsContainerSingleTab: {
    borderRadius: rem(8),
    background: "#FFF",
  },

  // Inventory Details Panel Styles
  idpStickyHeader: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    backgroundColor: "#fff",
    boxShadow: "0 -24px 0 0 #fff",
  },

  // Figma-exact button styles for ArticlesTable actions
  setAllButton: {
    backgroundColor: "white !important",
    border: "1px solid #4259ee !important",
    color: "#4259ee !important",
    maxHeight: "32px",
    minWidth: "56px",
    padding: "6px 12px",
    borderRadius: "8px",
    fontFamily: "Manrope, sans-serif !important",
    fontWeight: "500 !important",
    fontSize: "14px !important",
    lineHeight: "20px !important",
    textTransform: "none !important",
    "&:hover": {
      backgroundColor: "#f8f9ff !important",
      borderColor: "#4259ee !important",
    },
    "&:disabled": {
      backgroundColor: "#f5f6fa !important",
      borderColor: "#d9dde7 !important",
      color: "#b4bac7 !important",
    },
  },
  reviewForecastButton: {
    backgroundColor: "#4259ee !important",
    border: "1px solid #4259ee !important",
    color: "white !important",
    maxHeight: "32px",
    minWidth: "56px",
    padding: "6px 12px",
    borderRadius: "8px",
    fontFamily: "Manrope, sans-serif !important",
    fontWeight: "500 !important",
    fontSize: "14px !important",
    lineHeight: "20px !important",
    textTransform: "none !important",
    "&:hover": {
      backgroundColor: "#3347d9 !important",
      borderColor: "#3347d9 !important",
    },
    "&:disabled": {
      backgroundColor: "#f5f6fa !important",
      borderColor: "#d9dde7 !important",
      color: "#b4bac7 !important",
    },
  },
  paddingBottom24: {
    paddingBottom: "24px",
  },
  rightArrowIcon: {
    color: "white",
    fontSize: "18px",
    lineHeight: 1,
    height: "18px",
  },
  leftArrowIcon: {
    color: "#1f2b4d",
    fontSize: "18px !important",
    lineHeight: 1,
    height: "18px",
  },

  // Figma-exact footer button style
  footerReviewButton: {
    backgroundColor: "#4259ee !important",
    border: "1px solid #4259ee !important",
    color: "white !important",
    maxHeight: "32px",
    minWidth: "56px",
    padding: "6px 12px",
    borderRadius: "8px",
    fontFamily: "Manrope, sans-serif !important",
    fontWeight: "500 !important",
    fontSize: "14px !important",
    lineHeight: "20px !important",
    textTransform: "none !important",
    gap: "4px", // Gap between text and icon as per Figma
    display: "flex !important",
    alignItems: "center !important",
    justifyContent: "center !important",
    "&:hover": {
      backgroundColor: "#3347d9 !important",
      borderColor: "#3347d9 !important",
    },
    "&:disabled": {
      backgroundColor: "#f5f6fa !important",
      borderColor: "#d9dde7 !important",
      color: "#b4bac7 !important",
    },
    "& .MuiButton-endIcon": {
      marginLeft: "4px",
      "& svg": {
        width: "16px !important",
        height: "16px !important",
      },
    },
  },

  // Alert Group Header Styles
  alertGroupHeader: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "0px 16px 12px 0px",
    gap: "12px",
    height: "24px",
    flex: "none",
    order: 0,
    alignSelf: "stretch",
    flexGrow: 0,
  },

  alertGroupIcon: {
    width: "24px",
    height: "24px",
    flex: "none",
    order: 0,
    flexGrow: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  alertGroupTitle: {
    fontFamily: "Manrope",
    fontStyle: "normal",
    fontWeight: 700,
    fontSize: "14px",
    lineHeight: "21px",
    textTransform: "capitalize",
    color: "#1F2B4D",
    flex: "none",
    order: 1,
    flexGrow: 0,
  },

  alertGroupSeparatorLine: {
    height: "0px",
    border: "1px solid #D9DDE7",
    flex: "none",
    order: 2,
    flexGrow: 1,
  },

  alertsBlockContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "0px",
    gap: "12px",
    flex: "none",
    order: 1,
    alignSelf: "stretch",
    flexGrow: 0,
  },

  alertsGroupContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "0px",
    gap: "8px",
    flex: "none",
    alignSelf: "stretch",
    flexGrow: 0,
  },
  borderContainer: {
    border: "1px solid #E5E7EB",
    borderRadius: "12px",
    padding: "12px 16px",
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: "100%",
    overflow: "visible",
  },
  masterDetailPadding: {
    padding: "16px 24px 0px 24px",
    marginTop: "-16px",
    marginBottom: "-16px",
    background: "#FFFFFF",
    "& .ia-basic-table-layout.table-v32 .impact-table-main-container .impact-table-main-header": {
      padding: "0px 0px 10px 0px",
    },
    "& .css-makeStyles-title-21542": {
      marginLeft: "0px",
    },
    "& .ia-basic-table-layout.table-v32 .ag-root": {
      borderLeft: "none",
    },
  },
  removeFrozenBorder: {
    "& .ia-basic-table-layout.table-v32 .ag-pinned-left-cols-container": {
      boxShadow: "none",
      borderRight: "none",
    },
  },
  partialSetAllHrDivider: {
    border: "none",
    borderTop: "1px solid #E0E3EB",
    margin: "24px 0",
  },
  partialSetAllNewFlowFields: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  partialSetAllOldFlowFields: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  partialSetAllWosWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    width: "100%",
  },
  noBottomMarginOnTable: {
      "& .impact-table-main-container": {
        marginBottom: "8px !important",
      },
    },
    marginBottom44: {
      marginBottom: "44px",
    },
    setAllCard: {
      "& .ia-styles.ia-card": {
        padding: "0 !important",
      },
    },
    setAllCardContainer: {
      boxShadow: "0 0 12px 8px rgba(0, 0, 0, 0.06) !important",
      marginLeft: "10px !important",
      border: "none !important",
      display: "flex !important",
      flexDirection: "column !important",
      width: "593px !important",
      maxWidth: "593px !important",
      position: "relative !important",
      "& .ia-styles.ia-card": {
        width: "593px !important",
        maxWidth: "593px !important",
      },
    },
    setAllCardHeader: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      fontSize: "16px",
      fontWeight: 800,
      lineHeight: "16px",
      padding: "12px 16px",
      backgroundColor: "#ECEEFD",
      alignItems: "center",
      flexShrink: 0,
    },
    setAllCardBody: {
      flex: 1,
      overflow: "auto",
      minHeight: 0,
      paddingBottom: "60px",
      maxHeight: "510px",
    },
    setAllCardContent: {
      padding: "12px 16px",
    },
    setAllCardFooter: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: "12px",
      padding: "12px 16px",
      borderTop: "1px solid #D9DDE7",
      flexShrink: 0,
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#fff",
    },
    setAllCloseButton: {
      padding: "4px",
    },
    setAllCloseIcon: {
      fontSize: "18px",
      cursor: "pointer",
    },
    constraintsTabsContent: {
      maxHeight: "calc(100vh - 140px)",
      marginLeft: "-24px",
      marginRight: "-24px",
      width: "calc(100% + 48px)",
      boxSizing: "border-box",
    },
    constraintsContentPadding: {
      paddingLeft: "24px",
      paddingRight: "24px",
      boxSizing: "border-box",
      "& .main-container": {
        marginLeft: "-24px !important",
        marginRight: "-24px !important",
        width: "calc(100% + 48px)",
      },
    },
}));

import { makeStyles } from "@mui/styles";
import { borderColor } from "@mui/system";

const rem = (px) => `${px / 16}rem`;

export const useStyles = makeStyles((theme) => ({
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
  button: {
    margin: `0 ${theme.typography.pxToRem(5)}`,
    "&:nth-of-type(1)": {
      marginLeft: 0,
    },

    "&:last-child()": {
      marginRight: 0,
    },
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
    fontWeight: 600,
    color: theme.palette.textColours.slateGrayLight,
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

  "@keyframes gradientShift": {
    "0%": { backgroundPosition: "0% 50%" },
    "50%": { backgroundPosition: "100% 50%" },
    "100%": { backgroundPosition: "0% 50%" },
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
    "& .productIcon > path": {
      fill: "#20ACCF",
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
  },
  wosComparison: {
    padding: "12px 16px",
    borderRadius: "8px",
    background: "#FFF",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    color: "#0D152C",
    width: "35%",
    boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.12)",
    height: "285px",
    position: "relative",
    color: "#31416E",
    alignItems: "center",
    "&> .outerCircle": {
      width: "150px",
      height: "150px",
      position: "relative",
      marginTop: "20px",
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
          background: "#E6E6FA",
          color: "#6B46C1",
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
          marginBottom: "4px",
        },
        "& .labelLine": {
          width: "2px",
          height: "20px",
          background: "#E6E6FA",
        },
      },
      "& .cwosLabel": {
        position: "absolute",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        "& .labelBox": {
          background: "#FDF0EC",
          color: "#F19579",
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "12px",
          fontWeight: "600",
          marginBottom: "4px",
        },
        "& .labelLine": {
          width: "2px",
          height: "20px",
          background: "#F19579",
        },
      },
    },
    "&> .header": {
      fontSize: "14px",
      fontWeight: "600",
      alignSelf: "flex-start",
      fontFamily: "Manrope",
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
      gap: "8px",
    },
    "& .legendDash": {
      width: "10px",
      height: "2px",
      borderRadius: "2px",
    },
    "& .cwosDash": {
      background: "#F19579",
    },
    "& .targetDash": {
      background: "#6B46C1",
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
    padding: "12px 16px",
    borderRadius: "8px",
    background: "#FFF",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    color: "#0D152C",
    width: "50%",
  },
  lineChartContainer: {
    padding: "12px 16px",
    borderRadius: "8px",
    background: "#FFF",
    width: "65%",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    color: "#0D152C",
    height: "285px",
    /* Extra small */
    boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.12)",
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
    gap: "16px",
    alignItems: "center",
  },

  frequencySelector: {
    paddingLeft: "1px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    "& > div": {
      width: "15rem",
    },
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
  // Operator banner between rules (AND separator)
  ruleOperatorWrapper: {
    marginTop: "0.5rem",
    marginBottom: "0.5rem",
    display: "flex",
    justifyContent: "flex-start",
    fontFamily: "Manrope",
  },
  // Segmented toggle for AND/OR (left aligned)
  ruleOperatorToggle: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0px",
    borderRadius: "9999px",
    background: "transparent",
  },
  ruleOperatorBtn: {
    appearance: "none",
    border: "none",
    outline: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700,
    fontFamily: "Manrope",
    padding: "6px 12px",
    lineHeight: 1,
    background: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    "&:disabled": {
      pointerEvents: "none",
      backgroundColor: "#FFFFF",
      color: "grey",
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
    padding: "15px",
    borderRadius: "8px",
    background: "white",
  },
  ruleDefinitionInput: {
    width: "500px",
    "& .MuiInputBase-input": {
      width: "500px !important",
    },
  },
  frequencyDetailsContainer: {
    minHeight: "100px",
    padding: "15px",
    borderRadius: "8px",
    background: "#f5f6fa",
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
    gap: "0.5rem",
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
    width: "-webkit-fill-available",
    backgroundColor: theme.palette.common.white,
    padding: "16px 24px",
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
    gap: "1rem",
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
    padding: "20px",
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
    background: "white",
    borderRadius: "8px",
    padding: "20px",
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
    marginTop: "1px",
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
    height: "24px",
    marginTop: "1px",
  },
  textOverFlowStyles: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    display: "inline-block",
    minWidth: 0,
    flexShrink: 1,
  },
  alertsLabelStyles: {
    color: "#60697D",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "21px",
    height: "24px",
    marginTop: "1px",
  },
  alertsRowsStyles: {
    gap: 20,
    height: "32px",
    background: "#f5f6fa",
    borderRadius: "8px",
    marginBottom: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
  },
  alertsTextWrapper: {
    display: "flex",
    gap: 5,
    minWidth: 0,
    flexShrink: 1,
    alignItems: "center",
    height: "24px",
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
  marginTopBtm: {
    margin: "12px 0",
  },
  viewByLabel: {
    fontSize: "12px",
    alignSelf: "center",
  },
  vendorDCDashboardTabWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  paddingLayout: {
    padding: "12px 24px",
  },
  padding24: {
    paddingTop: "24px",
    paddingBottom: "24px",
  },
}));

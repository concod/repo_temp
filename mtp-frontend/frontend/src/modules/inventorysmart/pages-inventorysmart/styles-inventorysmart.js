import { makeStyles } from "@mui/styles";

export const useStyles = makeStyles((theme) => ({
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
    width: "15%",
  },
  inputStyle: {
    minWidth: 220,
  },
  textFieldWrapper: {
    padding: "0 2rem",
    margin: "0 0 2rem",
  },
  stepperWrapper: {
    marginBottom: "2rem",
  },
  listWrapper: {
    paddingLeft: "1px",
    marginTop: "2rem",
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

  // kpi

  kpiContainer: {
    overflowY: "scroll",
    width: "auto",
    overflowZ: "auto",
    padding: `1rem ${theme.typography.pxToRem(3)}`,
  },
  kpiContainerOverflow: {
    display: "-webkit-box",
    overflowY: "scroll",
    flexWrap: "nowrap",
    width: "auto",
    overflowZ: "auto",
    padding: `1rem ${theme.typography.pxToRem(3)}`,
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
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    maxHeight: 44,
    wordWrap: "break-word",
    "-webkit-line-clamp": 2,
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
    fontWeight: "100",
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
    overflowY: "scroll",
    overflowZ: "auto",
    padding: `0 ${theme.typography.pxToRem(3)}`,
  },
  kpiCardContainer: {
    padding: `1rem`,
    border: `1px solid ${theme.palette.colours.checboxBorder}`,
    borderRadius: "8px",
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
  },
  omsKpiSubtextBorder: {
    borderRight: `1px solid ${theme.palette.background.primary}`,
  },
  omsKpiSubtextBackground: {
    backgroundColor: "#f7f7f7",
  },
  omsKpiSubtext: {
    marginBottom: 0,
    padding: "0.625rem 0.75rem 0.625rem 0.625rem",
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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
  omsKpiLabel: {
    fontWeight: 500,
    width: "100%",
    textAlign: "left",
    height: "100%",
    [theme.breakpoints.up("md")]: {
      borderRight: `1px solid ${theme.palette.background.primary}`,
    },
  },
  omsKpiNumberBig: {
    marginBottom: 0,
    textAlign: "right",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  omsKpiFirstRow: {
    paddingTop: "1.3rem",
    paddingBottom: "0.8rem",
  },
  omsKpiLastRow: {
    paddingBottom: "1.1rem",
    paddingTop: "1.2rem",
  },
  omsKpiEndColumn: {
    paddingRight: "1rem",
    paddingLeft: "1rem",
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
  tickerText: {
    fontStyle: "italic",
    marginRight: "1rem",
    color: theme.palette.textColours.slateGrayLight,
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
}));

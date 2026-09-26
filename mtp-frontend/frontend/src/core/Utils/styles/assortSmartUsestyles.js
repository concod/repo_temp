import makeStyles from "@mui/styles/makeStyles";
import { flexbox} from "@mui/system";
import colours from "core/Styles/colours";

const textAlign = {
  alignItems: "center",
  margin: "1rem",
  textAlign: "center",
};
const buttonStyles = {
  marginRight: "0.5rem",
};
export const useStyles = makeStyles((theme) => ({
  tableFooterLeftCell: {
    "& .ag-floating-bottom .ag-cell-last-left-pinned": {
      width: "134px",
      maxWidth: "134px",
      minWidth: "134px",
      height: "43px !important",
    },
  },
  smallPrimaryButton: {
    marginRight: "0.5rem",
  },
  buttonFitContent: {
    ...buttonStyles,
    width: "fit-content",
    marginLeft: "0.5rem",
    padding: "0.5rem",
    "&:first-child": {
      marginBottom: "1rem",
    },
  },
  graphCard: {
    flex: "1",
    minWidth: "500px",
    height: "45rem",
    "&.MuiCard-root": {
      overflow: "overlay",
    },
  },
  minHeightForDiv:{
    height:"35rem"
  },
  inputLableStyle: {
    marginTop: "-0.8rem",
    marginRight: "1rem",
  },
  indexFactorInput: {
    width: "18%",
    "& .MuiFormControl-root": {
      width: "100%",
    },
    "& .MuiInputBase-input": {
      padding: "10px",
    },
    marginBottom: "1rem",
  },
  hindsightGraphCard: {
    "&.MuiCard-root": {
      boxShadow:
        "0px 2px 1px -1px rgba(0, 0, 0, 0.1), 0px 1px 1px 0px rgba(0, 0, 0, 0.07), 0px 1px 3px 0px rgba(0, 0, 0, 0.06)",
    },
  },
  textCenter: {
    ...textAlign,
  },
  textCenterWithBackground: {
    ...textAlign,
    backgroundColor: "#41A6F7",
    color: "#fff",
  },
  createNew: {
    height: "2.4rem",
    marginLeft: "0.6rem",
    textTransform: "none",
  },
  activeBtn: {
    marginLeft: "0px !important",
    backgroundColor: "#41A6F7 !important",
    color: "#fff !important",
    width: "5rem",
    height: "2.4rem",
    borderRadius: "5%",
    border: "1px solid #41A6F7",
    cursor: "pointer",
  },
  outlinePrimary: {
    marginLeft: "0px !important",
    color: "#41A6F7",
    borderColor: "#41A6F7",
    width: "5rem",
    height: "2.4rem",
    borderRadius: "5%",
    border: "1px solid #41A6F7",
    cursor: "pointer",
  },
  btnGroup: {
    position: "relative",
    display: "inline-flex",
    cursor: "pointer",
  },
  addIcon: {
    backgroundColor: "#41a6f7",
    color: "white",
    "&:hover": {
      backgroundColor: "#41a6f7",
    },
  },
  buttonDiv: {
    textAlign: "center",
    marginTop: 20,
  },
  scaleUpDownBtn: {
    marginLeft: "0.5rem",
    marginRight: "0.5rem",
  },
  hyperLink: {
    cursor: "pointer",
    fontWeight: "bold",
    color: "darkblue",
    textDecoration: "underline",
  },
  iconBlue: {
    fontSize: theme.typography.pxToRem(25),
    color: theme.palette.primary.main,
    marginTop: "-5px",
    cursor: "pointer",
  },
  reviewIcon: {
    fontSize: theme.typography.pxToRem(25),
    color: theme.palette.primary.main,
    marginTop: "8px",
    cursor: "pointer",
  },
  secondaryHeading: {
    fontSize: "20px",
    fontWeight: 600,
  },
  heading: {
    alignItems: "center",
    display: "flex",
    marginBottom: "1.5rem",
    whiteSpace: "nowrap",
  },
  flexAlignEndCenter: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  dFlex: {
    alignItems: "center",
    display: "flex",
    margin: "0.5rem 0",
  },
  TextField: {
    width: "100%",
    "& .MuiFormControl-root": {
      width: "100%",
    },
    "& .MuiInputBase-input": {
      padding: "10px",
    },
    marginBottom: "1rem",
  },
  legend: {
    fontSize: "0.8rem",
    color: "#727c87",
  },
  smallButtonDiv: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  // Dialog box styles
  content: {
    padding: "0",
  },
  dialog: {
    "& .MuiDialog-paperWidthLg": {
      overflowY: "visible",
      position: "absolute",
    },
  },
  contentBody: {
    overflowY: "visible",
  },
  // store swap table styles
  resultContainer: {
    display: "flex",
    justifyContent: "space-between",
    textAlign: "",
    gap: "10px",
  },
  tableLayout: {
    width: "45%",
  },
  formWidth: {
    width: "60%",
    marginBottom: "15px",
  },
  typographyMarginBottom: {
    marginBottom: "20px",
  },
  receiptDrawerButton: {
    marginTop: "60px",
    minWidth: "45px",
    maxWidth: "45px",
    boxShadow: "0 1px 15px 1px rgba(62, 57, 107, 0.17)",
    height: "50px",
    position: "fixed",
    zIndex: "500",
    right: 0,
    borderRadius: "50%",
    transform: "translateY(-50%)",
    textAlign: "center",
    paddingTop: "10px",
    marginRight: "50px",
  },
  bopButton: {
    marginTop: "175px",
    marginRight: "50px",
  },
  nonLinearButton: {
    marginTop: "120px",
    marginRight: "50px",
  },
  ccButton: {
    marginTop: "5px",
    marginRight: "50px",
  },
  receiptDrawerButtonEnabled: {
    background: theme.palette.primary.main,
    cursor: "pointer",
    color: "#fff",
    zIndex: 1000,
  },
  receiptDrawerButtonDisabled: {
    color: "#ffffff !important",
    background: "grey !important",
    pointerEvents: "none",
  },
  dialogGrid: { width: "100%", padding: "0 10px", marginBottom: "1rem" },
  planFinalizeHeaderContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  planFinalizeFormContainer: {
    width: "65%",
    margin: "0px 10px 10px 30px",
    "& .dropdown-height": {
      "& .ScrollCheck": {
        maxHeight: "8rem",
      },
    },
    "& .dropdown-multi-height": {
      "& .ScrollCheck": {
        maxHeight: "5rem",
      },
    },
  },
  secondaryLabel: {
    color: "#9299A2",
    marginBottom: "0.3rem",
  },
  actionIcon: {
    padding: "0px",
  },
  assortSingleFilterView: {
    paddingLeft: "32px",
    "& .dropdown-height": {
      height: "12.5rem",
      overflow: "auto",
      "& .ScrollCheck": {
        maxHeight: "10rem",
      },
    },
  },
  assortMultiFilterView: {
    paddingLeft: "32px",
    "& .dropdown-height": {
      height: "12.5rem",
      overflow: "auto",
      "& .ScrollCheck": {
        maxHeight: "7.5rem",
      },
    },
  },
  groupHeaderFilterView: {
    paddingLeft: "5px",
    height: "18rem",
    "& .dropdown-multi-height": {
      position: "inherit",
      "& .ScrollCheck": {
        maxHeight: "8.5rem",
      },
    },
  },
  groupHeaderButtonView: {
    borderTop: `1px solid ${colours.alto}`,
    display: "flex",
    height: "4rem",
    alignItems: "center",
    justifyContent: "space-around",
  },
  depthMultiplierDivContainer: {
    width: "80%",
    margin: "0 auto",
  },
  inputGroup: {
    marginBottom: theme.spacing(1),
  },
  emptyDiv: {
    marginRight: "15rem",
  },
  filtersCont: {
    display: "flex",
  },
  dashboardFilterContainer: {
    display: "flex",
  },
  dashboardFiltersBtnsDiv: {
    display: "flex",
    alignSelf: "end",
    justifyContent: "flex-end",
    margin: "18px 26px",
  },
  filterContainer: {
    marginBottom: "20px",
  },
  depthChoiceFlex: {
    display: "flex",
    gap: "2rem",
  },
  clusterNotes: {
    color: theme.palette.primary.main,
  },
  cardGrid: {
    width: "130%",
  },
  headerDiv: {
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "row",
    gap: "8px",
  },
  paperStyle: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  createBtn: {
    padding: theme.typography.pxToRem(10),
    borderRadius: "50%",
    minWidth: "auto",
  },
  createLabel: {
    marginTop: 5,
    fontSize: 20,
  },
  centerBtn: {
    justifyContent: "center !important",
  },
  marginBottom15: {
    marginBottom: "15px",
  },
  marginPaddingGraphSettings: {
    marginBottom: "15px",
    paddingLeft: "1.67rem",
    paddingRight: "1.67rem",
  },
  firstTabPadding: {
    "& .MuiTabs-indicator": {
      left: "6px !important",
    },
  },
  tabPanelFirstTab: {
    left: "1.67 rem !important",
  },
  marginTop10: {
    marginTop: "30px",
  },
  bottomButtonDiv: {
    marginTop: "30px",
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  bottomButton: {
    marginLeft: "10px",
  },
  button: {
    marginRight: "10px",
  },
  omniMappingFilterDiv: {
    justifyContent: "space-between",
    display: "flex",
    margin: "1rem",
  },
  omniMappingFilter: {
    display: "flex",
    flexWrap: "wrap",
    margin: "0 1rem",
    whiteSpace: "break-spaces",
  },
  omniMappingFilterRow: {
    display: "flex",
    flexDirection: "row",
  },
  flexRowContentCenter:{
    display: "flex",
    flexDirection: "row",
    alignItems:"center",
    marginTop:"1rem",
  },
  choiceHeading: {
    display: "flex",
    justifyContent: "space-between",
    margin: "30px 0px",
  },
  choiceBtnAlignRight: {
    float: "right",
  },
  choiceActionDiv: {
    marginBottom: "70px",
    marginTop: "15px",
  },
  choiceLabel: {
    fontWeight: "600",
    fontSize: "1.05rem",
    marginTop: "2rem",
  },
  choiceTable: {
    zIndex: "1",
    position: "relative",
  },
  packFilter: {
    display: "flex",
    "& input": {
      height: "1rem",
      padding: "10px 14px",
    },
  },
  createSetOptDiv: {
    border: "1px solid #eaeef3",
    borderRadius: 5,
    background: "#f9fafc",
    paddingTop: 8,
    paddingBottom: 8,
    textAlign: "center",
    "&:hover": {
      cursor: "pointer",
    },
  },
  createSetOptText: {
    marginLeft: 5,
  },
  createAddNewOpt: {
    color: "#1976d2",
  },
  switchContainer: {
    display: "flex",
    alignItems: "center",
    "& > span": {
      marginRight: theme.typography.pxToRem(5),
    },
  },
  ORTextGrid: {
    display: "flex",
    alignSelf: "center",
    justifyContent: "center",
  },
  searchGrid: {
    display: "flex",
    flexDirection: "row",
  },
  ORText: {
    color: theme.palette.colours.filterLabelColor,
  },
  rightEnd: {
    marginLeft: "auto",
    display: "flex",
    height: "fit-content",
  },
  buttonFitMargin: {
    ...buttonStyles,
    width: "fit-content",
    marginLeft: "0.5rem",
    marginBottom: "1rem",
    padding: "0.5rem",
  },
  NLEFooter: {
    justifyContent: "space-between",
    margin: "0 20px",
  },
  deletePlanDiv: {
    width: "100%",
  },
  buyUnitsDivBackground: {
    backgroundColor: colours.navajoWhite,
  },
  formContainer: {
    width: "25%",
    marginLeft: "20px",
    marginBottom: "20px",
    // "& .MuiInputLabel-root": {
    //   fontWeight: 700,
    // },
    "& .dropdown-height": {
      "& .ScrollCheck": {
        maxHeight: "10rem",
      },
    },
    "& .dropdown-multi-height": {
      "& .ScrollCheck": {
        color: "yellow",
        maxHeight: "3.5rem",
      },
    },
  },
  closeIcon: {
    position: "absolute",
    right: 10,
    top: 8,
  },
  scaleBtn: {
    display: "flex",
    justifyContent: "end",
    margin: "inherit",
  },
  depthTableWidth: {
    margin: `0 ${theme.typography.pxToRem(50)}`,
  },
  inputLabel: {
    display: "flex",
    lineHeight: "normal",
    minHeight: "1rem",
    color: theme.palette.colours.filterLabelColor,
    lineHeight: "1.6",
    letterSpacing: "0px",
    opacity: 1,
    fontSize: "0.80rem",
    paddingBottom: "0.4rem",
    "& span:nth-child(1)": {
      maxWidth: "90%",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    "& span:nth-child(2)": {
      maxWidth: "10%",
    },
    marginRight: "10px",
    paddingTop: "10px",
  },
  bucketInputLabel: {
    display: "flex",
    lineHeight: "normal",
    minHeight: "1rem",
    color: theme.palette.colours.filterLabelColor,
    lineHeight: "1.6",
    letterSpacing: "0px",
    opacity: 1,
    fontSize: "0.80rem",
    paddingBottom: "0.5rem",
    marginRight: "10px",
    paddingTop: "15px",
  },
  typographyMarginTop: {
    marginTop: "0.5rem",
  },
  tableWidth: {
    margin: `0 ${theme.typography.pxToRem(250)}`,
  },
  chartComponent: {
    display: "flex",
    flexWrap: "wrap",
    gap: "2rem",
  },
  paperStyleCreate: {
    border: "1px solid #e3ecf4",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "fit-content",
  },
  iconDisabled: {
    fontSize: theme.typography.pxToRem(14),
    margin: "0 0.5rem",
    color: theme.palette.text.disabled,
    cursor: "pointer",
  },
  tableBtn: {
    marginBottom: "4px",
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
  },
  tickerText: {
    fontStyle: "italic",
    marginRight: "1rem",
    color: theme.palette.textColours.slateGrayLight,
  },
  divMargin: {
    margin: "1rem",
    width: "260px",
  },
  iconPadding: {
    padding: "10px",
  },
  kpiCardContainer: {
    margin: "0.5rem 0.5rem",
    padding: "0.5rem",
    width: "100%",
    height: "100%",
    boxShadow: "0px 0px 2px 2px rgba(0,0,0,0.2)",
  },
  metricsContainer: {
    display: "flex",
    justifyContent: "flex-start",
    paddingBottom: "20px",
  },
  filtersContainer: {
    padding: "20px",
  },
  kpiCardContainer: {
    display: "inline-flex",
    gap: "12px",
    padding: "0.75rem",
    width: "calc(100% - 0.25rem)",
    height: "120px",
    boxShadow: "0px 0px 8px 0px #0000001F",
    borderRadius: "4px",
  },
  kpiGridItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "0 5px",
  },
  kpiBorder: {
    borderRight: `1px solid #E2E4ED `,
    height: "46.5px",
    marginTop: "5px",
  },
  kpiHeading: {
    fontSize: "14px",
    fontWeight: "600",
    wordWrap: "break-word",
    margin: "6px",
  },
  kpiLabel: {
    color: "#758490",
    fontSize: "14px",
    fontWeight: "400",
    marginBottom: "0.5rem",
  },
  nodataWrapper: {
    color: theme.palette.textColours.slateGrayLight,
    fontSize: "0.8rem",
    marginBottom: "0.5rem",
    textAlign: "center",
  },
  kpiBox: {
    marginRight: "0",
  },
  kpiSubValue: {
    color: "#1D1D1D",
    fontSize: "1rem",
    fontWeight: "500",
    letterSpacing: "0.20px",
    wordWrap: "break-word",
  },
  metricsContainer: {
    display: "flex",
    justifyContent: "flex-start",
    paddingBottom: "20px",
  },
  filtersContainer: {
    padding: "20px",
  },
  graphContent: {
    marginLeft: "1.67rem",
    marginRight: "1.67rem",
    padding: "0 0px 20px",
    borderBottom: "1px solid lightGray",
    marginBottom: "15px",
    //boxShadow: "0px 0px 20px 0px rgba(0, 0, 0, 0.12)",
  },
  graphContentHierarchy: {
    paddingTop: "20px",
  },
  graphContentSetting: {
    paddingBottom: "10rem",
  },
  rightAlignButtonAssort: {
    textAlign: "right",
    marginBottom: "1rem",
    marginTop: "1rem",
  },
  graphFiltersPopup: {
    "& .MuiPopover-paper": {
      width: "30% !important",
    },
  },
  graphSummaryContainer: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid lightGray",
    paddingBottom: "24px",
  },
  graphSummaryDiv: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  graphOut: {
    boxShadow: "2px 0px 8px 2px rgba(0,0,0,0.18)",
  },
  graphSummaryLabel: {
    color: "#758490",
  },
  graphStyles: {
    fontSize: "12px",
    fontWeight: "400",
    wordWrap: "break-word",
  },
  graphQuadrantLabel: {
    color: "#1D1D1D",
    marginBottom: "8px",
    paddingTop: "24px",
  },
  kpiDivMargin: {
    marginTop: "1rem",
    marginBottom: "1rem",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    gap: "20px",
  },
  dropdownContainer: {
    display: "inline-block",
  },
  graphSummary: {
    width: "100%",
    minHeight: "450px",
    height: "auto",
    padding: "19px",
    boxShadow: "0px 0px 8px 0px #0000001F",
  },
  graphFilterMinHeight: {
    minHeight: "12rem",
  },
  rightAlignButtonAssort: {
    textAlign: "right",
    marginBottom: "1rem",
    marginTop: "1rem",
  },
  kpiHeader: {
    color: "#1D1D1D",
    fontSize: "1rem",
    fontWeight: "600",
    wordWrap: "break-word",
  },
  kpiPosition: {
    padding: "9px 0px 9px 5px",
  },
  graphHeader: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0 0 1rem 0",
    position: "relative",
  },
  graphSummaryBorder: {
    borderBottom: 0,
  },
  graphSummaryValueLabel: {
    fontSize: "14px",
  },
  primaryButtonStyle: {
    fontSize: "14px",
    fontWeight: "400",
    borderRadius: "4px",
  },
  secondaryButtonStyle: {
    fontSize: "14px",
    fontWeight: "500",
    border: "0 !important",
    backgroundColor: "white !important",
  },
  settingButton: {
    borderRadius: "4px",
  },
  settingBtn: {
    height: "37px",
    width: "36px",
    color: "#0055AF",
    backgroundColor: "white",
    borderRadius: "4px",
    border: "1px solid #0055AF",
    cursor: "pointer",
  },
  settingBtnIcon: {
    paddingTop: "2px",
  },
  downloadButton: {
    height: "37px",
    width: "36px",
    backgroundColor: "white",
    color: "#0055AF",
    borderRadius: "4px",
    border: "1px solid #0055AF",
    cursor: "pointer",
  },
  downloadBtnIcon: {
    paddingTop: "3px",
  },
  TableViewOutlinedIcon: {
    color: "#0055AF",
  },
  totalValueLabel: {
    paddingLeft: "20px",
    paddingTop: "10px",
  },
  filterChipsStyle: {
    borderRadius: "4px",
    margin: "0 5px",
    fontSize: "14px",
  },
  filterChipLabel: {
    paddingRight: "10px",
    borderRight: "1px solid lightGray",
    paddingTop: "5px",
  },
  dropdownWidth: {
    width: "300px",
  },
  strategyPaper: {
    marginBottom: "1rem",
    padding: "1.5rem 1rem",
    width: "100%",
  },
  strategyCardDivMargin: {
    marginTop: "1rem",
    marginBottom: "1rem",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    gap: "35px",
  },
  strategyCard: {
    padding: "12px 2px 12px 8px",
    width: "227px",
  },
  strategyGrid: {
    margin: "10px",
    boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.12)",
    width: "215px",
  },
  strategyKPILabel: {
    fontWeight: "500",
    fontSize: "12px",
    lineHeight: "15px",
    color: "#758490",
    width: "25%",
  },
  strategyKPILabelValue: {
    fontWeight: "400",
    fontSize: "13px",
    lineHeight: "18px",
    color: "#758490",
    width: "44%",
    display: "grid",
    justifyContent: "flex-start",
    padding: "4px 0px",
  },
  strategyKPIValue: {
    fontWeight: "400",
    fontSize: "13px",
    lineHeight: "18px",
    color: "#758490",
    width: "25%",
    display: "grid",
    justifyContent: "flex-start",
    padding: "4px 0px",
  },
  strategyLabelHalfWidth: {
    width: "50%",
  },
  verticalLine: {
    borderRight: `1px solid ${colours.alto}`,
    margin: "0px 20px",
  },
  gridButton: {
    display: "flex",
    alignItems: "end",
  },
  hindsightGraphForm: {
    "& .selected-text": {
      color: "darkslategray !important",
    },
    "& .MuiGrid-item": {
      paddingTop: "6px",
    },
    "& .ScrollCheck": {
      maxHeight: "4rem !important",
    },
  },
  repositionGraph: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
  },
  nleDropdownContainer: {
    display: "flex",
  },
  paretoGraph: {
    width: "50%",
    marginTop: "30px",
  },
  performanceGraph: {
    width: "50%",
    marginTop: "30px",
  },
  clearanceGraph: {
    width: "50%",
    marginTop: "45px",
  },
  stmarginGraph: {
    width: "50%",
    marginTop: "45px",
  },
  graphCardHeight: {
    height: "600px",
    overflowY: "scroll",
  },
  customePageSize: {
    height: 35,
    minWidth: 50,
    color: "#758490",
    padding: "7px 15px",
  },
  NoDataText: {
    textAlign: "center",
  },
  dropdownList: {
    listStyle: "none",
    padding: "0",
    margin: "0",
    position: "absolute",
    backgroundColor: "#f9f9f9",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
    zIndex: 1,
    width: "100px",
    marginTop: "12px",
    right: "1px",
  },
  dropdownListItem: {
    fontSize: "15px",
    padding: "5px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dropdownListItemHover: {
    backgroundColor: "#ddd",
  },
  downloadListIcon: {
    paddingTop: "3px",
    marginRight: "5px",
  },
  stickyBottomButtons: {
    top: "calc(100% - 3.5rem)",
    padding: "15px 10px",
    zIndex: "800",
    position: "sticky",
    background: "#FFFFFF",
    boxShadow: "0px 4px 10px 0px rgba(0, 0, 0, 0.12)",
    flexDirection: "row",
    width: "100%",
    display: "flex",
    justifyContent: "flex-end",
  },
  paperPadding: {
    padding: "1.5rem 2rem 4rem 2rem",
  },
  hindsightFilter: {
    "& .DateRangePicker": {
      "& input":{
        fontWeight: 400,
        fontFamily: "Poppins, sans-serif",
        padding: "0.5rem 0.4rem"
      },
      "& .DateInput": {
        marginLeft: "10px"
      }
    }
  }
}));

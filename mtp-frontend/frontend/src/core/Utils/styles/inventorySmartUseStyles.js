import { makeStyles } from "@mui/styles";
import { fontWeight } from "@mui/system";

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

  // NEW General Styles

  labelPrimary : {
    fontSize : rem(16),
    fontWeight : 600,
  },

  font500 : {
    fontWeight : 500,
  },

  gapIS : {
    gap : rem(20),
  },

  lineSep : {
    height : rem(20),
    border: '1px solid #D4D4D4',
  },

  marginVertical:{
    margin:`${rem(19)} 0`
  },

  // DECISION DASHBOARD STYLES
  // allocation dates

  datesContainer : {
    fontSize : rem(12),
    fontWeight : 400,
    color: '#ACACAC',
    wordWrap: 'break-word',
  },

  datesContainerValue : {
    fontWeight : 600,
    color: theme.palette.textColours.slateGrayLight,
  },

  marginAllSide :{
    margin :'1.2rem 1.3rem'
  },

  // NEW KPI STYLES

  kpisContainerNew :{
    display : 'grid',
    gridAutoFlow:'column',
    gap:'32px',
    overflowX:'hidden',
    marginTop:rem(20),
    marginBottom:rem(40), 
    alignItems:'center',
    padding:`0 ${rem(32)} `,
    
  },

  expandedKpisContainer :{
    display : 'flex',
    gap: rem(32),
    padding: `0 ${rem(32)}`,
    marginTop:rem(20),
    marginBottom:rem(40), 
  },

  kpiArrowCard :{
    height : '100%',
    background: "white",
    width:rem(32),
    display :'flex',
    alignItems:'center',
    justifyContent:'center',
    zIndex:9,
    position:'absolute',
  },

  kpiArrowContainer :{
  height :'30px',
  width :'30px',
  borderRadius:'50%',
  border : '0.8px solid #758490',
  display : 'flex',
  justifyContent : 'center',
  alignItems : 'center'
  },

  kpiArrow :{
    fontSize:rem(16),
    color:'#394960',
  },

  kpiCards:{
    display:'flex',
    border:'1px solid red',
    alignItems:'center',
    width:rem(253),
    maxHeight:rem(105),
    padding:rem(16),
    borderRadius:rem(10),
    boxShadow: '0px 0px 8px rgba(0, 0, 0, 0.12)',
    border:'1px solid #e5e5e5'
  },

  kpiIconContainer : {
    marginRight : rem(20),
  },

  kpiLabelIS: {
    color: '#394960',
    fontSize: '14px',
    fontFamily: 'Poppins',
    fontWeight: 400,
    letterSpacing: '0.16px',
    wordWrap: 'break-word',
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    // maxHeight: 44,
    "-webkit-line-clamp": 1,
    "-webkit-box-orient": "vertical",
  },

  kpiActual :{
      color: '#758490',
      fontSize: '14px',
      fontFamily: 'Poppins',
      fontWeight: 400,
      letterSpacing: '0.14px',
      wordWrap: 'break-word',
      textTransform: 'lowercase' // Added textTransform property
        
  },

  kpiNumberValue:{
    fontSize: rem(24),
    fontWeight: "500",
    color: '#1D1D1D',
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
    color: '#394960',
    fontSize: '16px',
    fontFamily: 'Poppins',
    fontWeight: 400,
    letterSpacing: '0.16px',
    wordWrap: 'break-word',
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
    gap: "5vw",
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
    gridTemplateColumns: "repeat(7, minmax(60px, 1fr))",
    gap: "5px",
    maxWidth: "240px",
  },

  marginAround: {
    margin: "1rem",
  },
  
  supersessionUploadButton: {
    marginRight: "1rem",
  },

  priorityCodeSetAllButton: {
    float: 'right',
    margin: '0 10px !important',
  },

  alignButtons: {
    display: "flex",
    justifyContent: "flex-end",
  },

  timePeriodFormStyle: {
    padding: "1rem",
    display: "flex",
    alignItems: "center",
  },
  
  timePeriodFormContainer: {
    width: "20%",
    marginRight: "1rem",
  },
}));

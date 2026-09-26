import makeStyles from "@mui/styles/makeStyles";

export const useBudgetStyles = makeStyles((theme) => ({
  budgetTableContainerRoot: {
    padding: "0px 16px 16px",

    "& .ag-root-wrapper": {
      boxShadow: "none",
    },
  },
  customAccordionSummary: {
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "inherit",
    padding: 0,
    margin: 0,
  },
  tabs_titles: {
    listStyle: "none",
    padding: "0px",
    margin: "0",
  },
  tab_title: {
    backgroundColor: "#fff",
    display: "inline-block",
    padding: "20px",
    paddingBottom: "15px",
    color: "#050505",
    cursor: "pointer",
    marginLeft: "1px",
  },
  tab_title__active: {
    borderBottom: "3px solid black",
    backgroundColor: "#fcfcfc",
    color: "#00070a",
    display: "inline-block",
    padding: "14px",
    paddingBottom: "14px",
    cursor: "pointer",
    marginLeft: "1px",
  },
  tab_content: {
    backgroundColor: "#fcfcfc",
    padding: "5px",
    margin: "0",
  },
  alignItemsWithMargin: {
    flexDirection: "row",
    display: "flex",
    alignItems: "flex-start",
    padding: "10px",
    justifyContent: "space-between",
  },
  flex: { flexDirection: "row", display: "flex", alignItems: "center" },
  width100: {
    width: "100%",
  },
  horizontalLine: {
    border: "1px solid #DCDCDC",
    margin: "0",
    marginBottom: "20px",
  },
  paddingFlexContent: {
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
  },
  planDetailsHeader: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
    paddingLeft: "10px",
  },
  planDetailsWrapper: {
    fontSize: "14px",
    lineHeight: "20px",
    fontFamily: "Poppins",
    letterSpacing: "0px",
    color: "#7E8995",
    width: "60%",
  },
  matchWithBox: {
    display: "flex",
    alignItems: "center",
  },
  matchWithBoxText: {
    marginRight: "4px",
  },
  planDetails: {
    color: theme.palette.common.black,

    fontSize: "18px",
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "normal",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,

    "& .MuiInputBase-root": {
      height: 37,
      minWidth: 300,
      fontSize: 14,
      fontStyle: "normal",
      fontWeight: 400,
      lineHeight: "normal",
    },

    "& .plan_display_name": {
      width: "max-content",
    },
  },
  paddingTabContent: {
    paddingBottom: "2rem",
  },
  cellRenderStyle: {
    height: "60px",
    padding: "10px",
    lineHeight: "3.5",
  },
  selectConfig: {
    margin: "10px",
    padding: "5px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  selectLabel: {
    marginRight: "3%",
    paddingTop: "0.7%",
  },
  budgetTableFilterField: {
    width: "80%",
  },
  tableSelectionWrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px",
    width: "100%",
  },
  rootTab: {
    marginBottom: "0px",
    width: "100%",
  },
  planNameWrapper: {
    display: "flex",
  },
  planNameTextEllipsis: {
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    overflow: "hidden",
    width: "320px",
  },
  metricVersionSelectContainer: {
    padding: "0.5rem",
  },
  alignToEnd: {
    display: "flex",
    justifyContent: "flex-end",
    marginRight: "5px",
    gap: "10px",
  },
  button: {
    margin: "2px",
  },
  alignToRow: {
    width: "30%",
    "@media (max-width: 1550px)": {
      width: "40%",
    },
  },
  weekHeader: {
    "& * .ag-header-cell-text": {
      fontSize: "13px",
      whiteSpace: "normal",
      textAlign: "center",
    },
  },
}));

export const tableStyle = {
  tableCell: {},
};

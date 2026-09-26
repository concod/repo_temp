import makeStyles from "@mui/styles/makeStyles";

export const useStyles = makeStyles((theme) => ({
  root: {
    padding: "0 1rem",
  },
  dashboardTableWrapper: {
    marginTop: theme.spacing(3),
  },
  dashboardTools: {
    backgroundColor: theme.palette.common.white,
    display: "flex",
    flexDirection: "row-reverse",
    justifyContent: "flex-start",
    flexWrap: "wrap",
  },
  flexEnd: {
    justifyContent: "end",
  },
  buttonsWrapper: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  button: {
    margin: "0 5px",

    "&:nth-of-type(1)": {
      marginLeft: 0,
    },

    "&:last-child()": {
      marginRight: 0,
    },
  },
  plansmartIconButton: {
    height: 37,
    width: 37,

    "&.small-icon": {
      height: 23,
      width: 23,
    },
    minWidth: "unset",
    padding: 0,
    backgroundColor: theme.palette.primary.main,

    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
    },

    // styles to add color to non mui icons
    "& svg": {
      height: "16px",
      width: "16px",
    },
    "& path": {
      fill: theme.palette.common.white,
    },
  },
  tabPannel: {
    "& .table-toolbar": {
      padding: ".3125rem 0",
    },
  },
  generateButton: {
    marginBottom: theme.spacing(2),
  },
  cancelButton: {
    marginLeft: "auto!important",
  },
  createDetailsWarapper: {
    padding: "1rem",
  },
  createDetailsTitle: {
    alignSelf: "flex-start",
    color: "#091624",
    ...theme.typography.body2,
  },
  createDetailsFooter: {
    borderTop: "1px solid #D8E0E8",
    padding: "1rem",
    display: "flex",
    justifyContent: "center",
  },
  detailsForm: {
    maxWidth: "1200px",
    display: "flex",
    justifyContent: "space-between",
    margin: "0 auto",
    flexWrap: "wrap",

    "& .DateRangePicker": {
      display: "block",
    },

    "& .DateRangePickerInput": {
      alignSelf: "center",
      display: "flex",
      alignItems: "center",
      padding: "2px 20px 2px 0",

      "& .DateRangePickerInput_calendarIcon, & .DateRangePickerInput_clearDates": {
        alignSelf: "center",
        marginRight: "2px",
        paddingTop: 0,
        paddingBottom: 0,
      },
    },
  },
  filterBoardWrapper: {
    padding: "1rem 2rem",
  },
  filterBoardHeader: {
    display: "flex",
    justifyContent: "space-between",
  },
  filterBoardMain: {
    display: "flex",
    width: "100%",

    "& .DateRangePickerInput": {
      alignSelf: "center",
      display: "flex",
      alignItems: "center",
      padding: "2px 20px 2px 0",

      "& .DateRangePickerInput_calendarIcon, & .DateRangePickerInput_clearDates": {
        alignSelf: "center",
        marginRight: "2px",
        paddingTop: 0,
        paddingBottom: 0,
      },
    },
  },
  filterButtons: {
    display: "flex",
    alignSelf: "center",
  },
  filterMasterPlanBtn: {
    justifyContent: "end",
    marginTop: "10px",
  },
  required: {
    color: "#E83939",
  },
  overFlow: {
    overflow: "visible",
  },
  actionBtnGroup: {
    "& button:not(:first-child)": {
      marginLeft: "1rem",
    },
  },
  hide: {
    display: "none",
  },
  alignButtons: {
    display: "flex",
    width: "100%",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "10px",
    marginRight: "10px",
  },
  dashboardCopyPlanModal: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    width: "100%",

    "& .copy-text": {
      fontSize: 14,
      fontStyle: "normal",
      fontWeight: 600,
      lineHeight: "normal",
    },

    "& .MuiInputBase-root": {
      height: 37,
      minWidth: 300,
      fontSize: 14,
      fontStyle: "normal",
      fontWeight: 400,
      lineHeight: "normal",
    },
  },
}));

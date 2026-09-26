import makeStyles from "@mui/styles/makeStyles";

export const ApiDetailsStyling = makeStyles((theme) => ({
  page: {
    minHeight: "calc(100vh - 180px)",
    padding: "16px 24px",
  },
  container: {
    width: "100%",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "20px",
    backgroundColor: theme.palette.background.paper,
    borderRadius: "8px",
    boxShadow: "0px 0px 4px 0px #0000001F",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    paddingBottom: "12px",
    borderBottom: `1px solid ${theme.palette.background.separaterColor}`,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  titleIcon: {
    fontSize: "28px",
    color: theme.palette.primary.main,
  },
  title: {
    fontWeight: "bold",
    fontSize: "22px",
    color: theme.palette.text.primary,
  },
  subtitle: {
    color: theme.palette.text.secondary,
    fontSize: "13px",
    marginLeft: "38px",
  },
  tabs: {
    minHeight: "36px",
    "& .MuiTabs-indicator": {
      height: "3px",
      borderRadius: "3px 3px 0 0",
    },
  },
  tab: {
    textTransform: "none",
    fontWeight: 600,
    fontSize: "13px",
    minHeight: "36px",
    padding: "6px 16px",
    gap: "6px",
  },
  textArea: {
    "& .MuiInputBase-root": {
      borderRadius: "8px",
      alignItems: "flex-start",
      fontFamily: "'Consolas', 'Courier New', monospace",
      fontSize: "12px",
      lineHeight: 1.6,
    },
  },
  buttonWrap: {
    display: "flex",
    justifyContent: "center",
    padding: "4px 0",
  },
  generateBtn: {
    minWidth: "160px",
    textTransform: "none",
    fontWeight: 600,
    borderRadius: "8px",
    padding: "8px 24px",
  },
  outputSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  summaryRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "10px 14px",
    backgroundColor: theme.palette.background.appBackground,
    borderRadius: "6px",
    border: `1px solid ${theme.palette.background.separaterColor}`,
    flexWrap: "wrap",
  },
  summaryItem: {
    fontSize: "13px",
    color: theme.palette.text.secondary,
    "& strong": {
      color: theme.palette.primary.main,
      fontWeight: 700,
    },
  },
  summaryItemMono: {
    fontSize: "12px",
    color: theme.palette.text.grey,
    fontFamily: "'Consolas', 'Courier New', monospace",
    wordBreak: "break-all",
  },
  actionBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionBarLeft: {
    display: "flex",
    gap: "4px",
  },
  toggleBtn: {
    textTransform: "none",
    fontSize: "11px",
    fontWeight: 500,
    color: theme.palette.text.grey,
    padding: "2px 8px",
    minWidth: "auto",
  },
  outputActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  exportBtn: {
    textTransform: "none",
    fontSize: "11px",
    fontWeight: 600,
    color: theme.palette.primary.main,
    padding: "2px 8px",
    minWidth: "auto",
    "&:hover": {
      backgroundColor: theme.palette.primary.lighter,
    },
  },
  // API Input tab styles
  apiInputSection: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  apiSelectorRow: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
  },
  apiSelector: {
    flex: 1,
    "& .MuiInputBase-root": {
      fontSize: "13px",
    },
  },
  methodSelect: {
    minWidth: "110px",
  },
  apiOptionRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    overflow: "hidden",
  },
  methodChip: {
    fontWeight: 700,
    fontSize: "11px",
    minWidth: "50px",
    height: "22px",
  },
  apiOptionPath: {
    fontFamily: "'Consolas', 'Courier New', monospace",
    fontSize: "12px",
    color: "#333",
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  apiOptionTag: {
    fontSize: "11px",
    color: "#999",
    fontStyle: "italic",
    flexShrink: 0,
  },
  formFieldsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    borderRadius: "8px",
    border: `1px solid ${theme.palette.background.separaterColor}`,
    backgroundColor: theme.palette.background.appBackground,
  },
  formFieldsTitle: {
    fontWeight: 600,
    fontSize: "13px",
    color: theme.palette.text.secondary,
    marginBottom: "4px",
  },
  formField: {
    "& .MuiInputBase-root": {
      fontSize: "13px",
      fontFamily: "'Consolas', 'Courier New', monospace",
    },
  },
  noFieldsMessage: {
    fontSize: "13px",
    color: theme.palette.text.grey,
    fontStyle: "italic",
    padding: "12px 0",
  },
  errorBanner: {
    padding: "10px 14px",
    borderRadius: "6px",
    backgroundColor: theme.palette.error.light,
    border: `1px solid ${theme.palette.error.main}`,
  },
  errorText: {
    fontSize: "12px",
    color: theme.palette.error.main,
    fontFamily: "'Consolas', 'Courier New', monospace",
    wordBreak: "break-word",
  },
  queryList: {
    border: `1px solid ${theme.palette.background.separaterColor}`,
    borderRadius: "6px",
    overflow: "hidden",
  },
  queryCard: {
    borderBottom: `1px solid ${theme.palette.background.separaterColor}`,
    "&:last-child": {
      borderBottom: "none",
    },
  },
  queryHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    cursor: "pointer",
    userSelect: "none",
    "&:hover": {
      backgroundColor: theme.palette.background.appBackground,
    },
  },
  expandIcon: {
    fontSize: "18px",
    color: theme.palette.text.grey,
  },
  queryNumber: {
    fontSize: "12px",
    fontWeight: 700,
    color: theme.palette.primary.main,
    minWidth: "24px",
  },
  queryType: {
    fontSize: "11px",
    fontWeight: 500,
    color: theme.palette.text.secondary,
  },
  queryDot: {
    color: theme.palette.text.grey,
    fontSize: "14px",
    lineHeight: 1,
  },
  queryTime: {
    fontSize: "12px",
    fontWeight: 600,
    color: theme.palette.text.grey,
  },
  queryRows: {
    fontSize: "12px",
    fontWeight: 500,
    color: theme.palette.text.grey,
  },
  queryHeaderSpacer: {
    flex: 1,
  },
  copyBtn: {
    padding: "3px",
    color: theme.palette.text.grey,
    "&:hover": {
      color: theme.palette.primary.main,
    },
  },
  queryPre: {
    margin: 0,
    padding: "12px 12px 12px 42px",
    backgroundColor: theme.palette.background.appBackground,
    borderTop: `1px solid ${theme.palette.background.separaterColor}`,
    color: theme.palette.text.primary,
    fontFamily: "'Consolas', 'Courier New', monospace",
    fontSize: "12px",
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowX: "auto",
    maxHeight: "400px",
    overflowY: "auto",
  },
  loadingSection: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    padding: "24px 0",
  },
  progressBar: {
    borderRadius: "4px",
    height: "4px",
  },
  loadingContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "20px 0",
  },
  loadingText: {
    fontSize: "15px",
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  loadingSubtext: {
    fontSize: "12px",
    color: theme.palette.text.grey,
  },
}));

import makeStyles from "@mui/styles/makeStyles";

export const useStoreViewStyles = makeStyles(() => ({
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  nestedPanel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflow: "visible",
    minHeight: 400,
  },
  nestedSlot: {
    "& .nested-table-container": {
      overflow: "visible",
    },
    "& .impact-table-main-container.card-container": {
      overflow: "visible",
    },
  },
  headerBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: "Manrope",
    fontWeight: 700,
    fontSize: 14,
    lineHeight: "21px",
    color: "#0d152c",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  verticalDivider: {
    width: 0,
    height: 12,
    borderLeft: "1px solid #c3c8d4",
    flexShrink: 0,
  },
  headerStoreWrap: {
    display: "flex",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  headerStoreLabel: {
    fontFamily: "Manrope",
    fontWeight: 700,
    fontSize: 14,
    lineHeight: "21px",
    color: "#60697d",
    whiteSpace: "nowrap",
    "& span": {
      color: "#31416e",
    },
  },
  topRightRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  editByLabel: {
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: 12,
    lineHeight: "normal",
    color: "#60697d",
    whiteSpace: "nowrap",
  },
  chipsRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
}));

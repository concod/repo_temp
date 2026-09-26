import makeStyles from "@mui/styles/makeStyles";

const selectFill = {
  "& .ia-select-main-container-v3, & .ia-select-styled-dropdown-main-button": {
    width: "100% !important",
    minWidth: "0 !important",
    maxWidth: "100% !important",
  },
};

export const useSetAllMinDistributionStyles = makeStyles({
  rootSetAll: {
    width: "100%",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "8px",
  },
  rootPartial: {
    width: "100%",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  blockSetAll: {
    background: "#FFFFFF",
    borderRadius: "8px",
    padding: "8px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  blockPartial: {
    background: "#F5F6FA",
    border: "1px solid #D9DDE7",
    borderRadius: "8px",
    padding: "8px",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  },
  row: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-end",
    width: "100%",
    minWidth: 0,
  },
  selectCol: {
    flex: "1 1 0",
    minWidth: 0,
    maxWidth: "272.5px",
    ...selectFill,
  },
  unitsGroup: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  unitsCol: {
    width: "88px",
    flexShrink: 0,
    overflow: "hidden",
    "& .impact_inputbox_container, & .impact_inputbox_container .MuiInputBase-root": {
      width: "88px !important",
      maxWidth: "88px !important",
      overflow: "hidden",
    },
  },
  sizeSection: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    width: "100%",
    minWidth: 0,
  },
  sizesCol: {
    position: "relative",
    width: "100%",
    maxWidth: "272.5px",
    minWidth: 0,
    ...selectFill,
  },
  sizesColOpen: {
    zIndex: 20,
  },
  label: {
    margin: "0 0 6px",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "16px",
    color: "#60697D",
  },
  hint: {
    margin: 0,
    paddingBottom: "8px",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "16px",
    color: "#7A8294",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  sizeSelectDropdown: {
    "& .ia-select-search-box::placeholder, & .ia-select-search-box:focus::placeholder": {
      color: "#B4BAC7 !important",
      opacity: 1,
    },
  },
});

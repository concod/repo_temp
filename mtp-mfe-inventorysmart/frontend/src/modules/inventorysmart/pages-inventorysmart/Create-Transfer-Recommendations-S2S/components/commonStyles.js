import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";

const storeToStoreEditStyles = makeStyles(() => ({
  tableEditWrapperStyles: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: "10px",
    "& .ia-basic-table-layout.table-v32 > div": {
      margin: 0,
    },
    "& [data-testid='resultContainer']": {
      width: "100%",
    },
    "& .MuiInputBase-input::-webkit-inner-spin-button": {
      display: "none",
    },
    "& .row-disabled": {
      backgroundColor: "#FAFAFA !important",
      "& .ag-cell": {
        color: `${colours.neutralText} !important`,
      },
      "& .ag-checkbox-input-wrapper": {
        "&::after": {
          backgroundColor: "#FAFAFA !important",
          cursor: "not-allowed",
        },
        "&:hover::after": {
          border: `1px solid ${colours.chips}`,
        },
        "& input": {
          cursor: "not-allowed",
        },
      },
    },
    "& .ag-floating-top .ag-pinned-left-floating-top .ag-row:first-child .ag-cell[aria-colindex='2']": {
      width: "calc(var(--product-view-width, 0px)) !important",
      left: "0 !important",
      background: `${colours.whiteLilac} !important`,
    },
    "& .selection-disabled": {
      "& .ag-checkbox-input-wrapper": {
        "&::after": {
          backgroundColor: "#FAFAFA !important",
          cursor: "not-allowed",
        },
        "&:hover::after": {
          border: `1px solid ${colours.chips}`,
        },
        "& input": {
          cursor: "not-allowed",
        },
      },
    },
    "& .store-2-store-size-warning": {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      "& .waring-icon": {
        display: "flex",
      },
      "& .storetostore-tooltip": {
        color: "#F5F5F5",
        fontFamily: "Manrope",
        fontSize: "14px",
        fontStyle: "normal",
        fontWeight: 500,
        lineHeight: "20px",
        "& .store-tooltip-title": {
          paddingBottom: "20px",
        },
      },
    },
    "& .new-badge-container": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "100%",
      "& .new-badge": {
        borderRadius: "1000px",
        background: "#F4FFF7",
        padding: "2px 8px",
        overflow: "hidden",
        color: "#108431",
        fontFamily: "Manrope",
        fontSize: "14px",
        fontStyle: "normal",
        fontWeight: 500,
        lineHeight: "20px",
        maxWidth: "45px",
      },
    },
  },
}));

export const commonTableContainerStyle = makeStyles(() => ({
  commonContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    borderRadius: "8px",
    backgroundColor: colours.white,
    width: "100%",
    "& .impact-table-main-container": {
      borderRadius: "8px",
    },
    "& .ag-floating-top": {
      overflowY: "hidden !important",
      "&::-webkit-scrollbar": {
        display: "none !important",
      },
    },
    "& .ag-cell": {
      "& .ag-row-group-leaf-indent.ag-row-group-indent-1": {
        paddingLeft: "0",
        "& .ag-group-value": {
          width: "100%",
        },
      },
      "& .ag-row-group-leaf-indent.ag-row-group-indent-2": {
        paddingLeft: "28px",
        "& .ag-group-value": {
          width: "100%",
        },
      },
      "& .ag-row-group-leaf-indent.ag-row-group-indent-3": {
        paddingLeft: "56px",
        "& .ag-group-value": {
          width: "100%",
        },
      },
      "& .ag-row-group-leaf-indent.ag-row-group-indent-4": {
        paddingLeft: "84px",
        "& .ag-group-value": {
          width: "100%",
        },
      },
    },
    "& .ag-pinned-right-header:not(:has(.inv-up-icon))": {
      width: "63px !important",
      minWidth: "63px !important",
      maxWidth: "63px !important",
    },
    "& .ag-pinned-right-header:has(.inv-up-icon)": {
      width: "93px !important",
      minWidth: "93px !important",
      maxWidth: "93px !important",
    },
    "& .capacity-progress-bar-container": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      height: "100%",
      "& .capacity-progress-bar": {
        flex: 1,
        minWidth: 0,
        height: "8px",
        borderRadius: "4px",
        overflow: "hidden",
        background: colours.palePurple,
        maxWidth: "calc(100% - 66px)",
      },
      "& .capacity-progress": {
        height: "100%",
      },
      "& .MuiBadge-root, & .impact-badge": {
        maxWidth: "55px",
        minWidth: "55px",
      },
    },
    "& .flex-align-between-center": {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    "& .s2s-review-badge-container": {
      height: "100%",
      display: "flex",
      alignItems: "center",
      "& .s2s-review-badge": {
        padding: "2px 8px",
        gap: "10px",
        borderRadius: "1000px",
        border: "1px solid",
        background: colours.white,
        fontFamily: "Manrope",
        fontSize: "14px",
        fontWeight: 500,
        lineHeight: "20px",
        height: "24px",
        width: "fit-content",
      },
    },
  },
}));

export default storeToStoreEditStyles;

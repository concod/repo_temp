import { makeStyles } from "@mui/styles";

// Plain style objects for use in module-level cell renderers (outside React hooks)
export const cellStyles = {
  constraintDateCell: { margin: "0px 1rem" },
  minDistributionText: { color: "#60697D" },
  statusBadgeRow: { display: "flex", gap: "4px", alignItems: "center", flexWrap: "nowrap", whiteSpace: "nowrap" },
  groupCellContainer: { display: "flex", alignItems: "center", gap: "8px", overflow: "visible", width: "100%", minWidth: 0 },
  groupCellNameWrapper: { flex: 1, minWidth: 0, overflow: "hidden" },
  groupCellToggleWrapper: { position: "relative", display: "inline-flex", overflow: "visible", flexShrink: 0 },
  groupCellUpdatedDot: {
    position: "absolute",
    top: "0px",
    left: "1px",
    width: "6px",
    height: "6px",
    borderRadius: "6px",
    background: "var(--Colors-Info-Surface-Default, #1E6BFF)",
    zIndex: 1,
  },
  groupCellToggleButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid #E0E0E0",
    background: "#F5F5F5",
    cursor: "pointer",
    transition: "transform 0.2s",
    padding: 0,
  },
  groupCellIcon: { fontSize: "16px", color: "#333" },
  bottomSheetFooter: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-start",
    width: "100%",
    paddingLeft: "16px",
  },
  bottomSheetFooterActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "flex-end",
    width: "100%",
  },
};

export const useRuleGroupStyles = makeStyles(() => ({
  dividerLine: {
    width: "1px",
    height: "12px",
    backgroundColor: "#d9dde7",
  },
  detailPanelWrapper1: {
    padding: "0px 0px 12px 0px",
    borderRadius: "8px",
  },
  detailPanelWrapper: {
    padding: "0.75rem",
    background: "#f5f6fa",
    borderRadius: "8px",
    "& .impact-table-main-container": {
      borderRadius: "8px",
    },
    "& .ia-basic-table-layout.table-v32 > div": {
      marginBottom: "0 !important",
    },
    "& .rule-group-exception-empty-state": {
      width: "100%",
      background: "#FFFFFF",
      padding: "12px",
      borderRadius: "8px",
      "& .rule-group-exception-header": {
        display: "flex",
        gap: "16px",
      },
      "& .rule-group-content": {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        marginTop: "16px",
        "& .empty-msg": {
          color:  "#0D152C",
          textAlign: "center",
          fontFamily: "Manrope",
          fontSize: "16px",
          fontWeight: 800,
          lineHeight: "24px",
        }
      }
    }
  },
  topRightOptionsContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  editModalContent: {
    display: "flex",
    flexDirection: "column",
    gap: "32px",
  },
  editModalHalfWidth: {
    width: "50%",
  },
  editModalFullWidth: {
    width: "100%",
    "& textarea:focus": {
      outline: "none",
      boxShadow: "none",
    },
    "& .impact_textarea_layout": {
      width: "100%",
      "& textarea": {
        width: "100% !important",
        maxWidth: "100% !important",
      }
    },
  },
  centeredAlert: {
    "& .ia-styles.ia-alert": {
      paddingLeft: "45% !important",
    },
    "& .ia-styles.ia-alert .MuiAlert-message .ia-alert-body > .MuiTypography-root": {
      fontWeight: "700 !important",
      lineHeight: "21px !important",
    }
  },
}));

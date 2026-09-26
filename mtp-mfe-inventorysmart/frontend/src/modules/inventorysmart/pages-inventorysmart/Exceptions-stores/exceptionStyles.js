const { makeStyles } = require("@mui/styles");

export const useExceptionStyles = makeStyles(() => ({
  grid_align: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: "16px",
    "& .MuiButton-root": {
      margin: "4px",
    },
  },
  alignStepper: {
    display: "flex",
    justifyContent: "center",
    "& .MuiStepConnector-horizontal": {
      flex: "0 0 10rem",
    },
  },
  // New-flow store step: stepper shares the CoreComponentScreen header row with the filter toggle.
  storeStepHeader: {
    // Breadcrumb is on its own row above, so keep the header row compact.
    "& .paddingBottom12": { paddingBottom: "0px !important" },
    // 16px gap around the full-bleed filter strip when open (no-op while it is display:none).
    "& .main-container": { marginTop: "16px", marginBottom: "16px" },
    // Fixed toggle slot so its label width can't nudge the centered stepper.
    "& .paddingBottom12 > div:last-child": { flex: "0 0 132px", justifyContent: "flex-end" },
  },
  // Core always puts marginBottom_12 on the filter/alert wrapper; drop it on this step.
  storeStepFilterWrapper: {
    marginBottom: "0 !important",
  },
  // Invisible left slot mirroring the toggle slot width so the stepper stays centered.
  stepperHeaderSpacer: { width: "132px", flexShrink: 0 },
  // Zero-height anchor + absolutely centered float 31px below the stepper.
  storeStepAlertAnchor: { position: "relative", height: 0, zIndex: 5 },
  storeStepAlertFloat: {
    position: "absolute",
    top: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    minWidth: "370px",
    maxWidth: "70%",
    width: "max-content",
  },
  delete: {
    marginRight: "16px",
    cursor: "pointer",
  },
  add_margin_top: {
    marginTop: "20px",
  },
  minDistributionPanel: {
    width: "100% !important",
    height: "auto !important",
    position: "relative",
    "& .container": {
      display: "flex",
      fontFamily: "Manrope",
      flexDirection: "column",
      gap: "24px",
      minHeight: "400px",
      maxHeight: "calc(90vh - 130px)",
      overflowY: "auto",
      "& ._loading_overlay_wrapper": {
        minHeight: "unset",
      },
      "& .style-details": {
        display: "flex",
        gap: "12px",
        alignItems: "center",
        fontSize: "12px",
        fontWeight: "500",
        lineHeight: "16px",
        color: "#1F2B4D",
        "& .style-name": {
          display: "flex",
          alignItems: "center",
          gap: "6px",
          "& p:nth-child(2)": {
            fontSize: "14px",
            fontWeight: "800",
            lineHeight: "21px",
            textAlign: "right",
          },
        },
        "& .min-input-section": {
          display: "flex",
          alignItems: "center",
          gap: "6px",
        },
      },
    },
  },
  minDistributionSelection: {
    display: "flex",
    alignItems: "center",
    gap: "36px",
  },
  distributionStrategyTable: {
    width: "100%",
    minHeight: "300px",
  },
  infoMessage: {
    display: "flex",
    padding: "8px 16px",
    gap: "80px",
    alignItems: "flex-start",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#E2F4FF",
    fontWeight: 600,
    "& .info-message-text": {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    "& .close-icon": {
      cursor: "pointer",
      color: "#60697D",
      height: "20px",
      width: "20px",
    },
    "& svg": {
      color: "#4259EE",
    },
  },
  unitsPerSizeSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "24px",
    fontFamily: "Manrope",
    "& .form-container": {
      display: "flex",
      flexDirection: "column",
      padding: "8px 16px",
      justifyContent: "center",
      alignItems: "flex-start",
      gap: "12px",
      borderRadius: "8px",
      background: "#F5F6FA",
      marginBottom: "24px",
      "& p": {
        color: "#0D152C",
        fontSize: "14px",
        fontWeight: "500",
      },
      "& .MuiFormGroup-root": {
        display: "flex",
        flexDirection: "row",
      },
    },
  },
  sizeDistributionTable: {
    width: "100%",
    minHeight: "400px",
    marginBottom: "50px",
  },
  stylePreviewTable: {
    width: "100%",
  },
  // Four equal cards: chip + 3 MUI steps share one flex row (connectors are 24px, not flex).
  equalWidthStepperRow: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    minWidth: 0,
  },
  equalWidthStepper: {
    display: "contents",
    "& .MuiStepper-root": {
      display: "contents",
    },
    "& .ia-stepper .MuiStep-horizontal": {
      flex: "1 1 0",
      minWidth: 0,
      width: "auto !important",
    },
    "& .ia-stepper .MuiStepConnector-horizontal": {
      flex: "0 0 24px",
    },
  },
  baseRuleSavedConnector: {
    flex: "0 0 24px",
    height: 0,
    borderTop: "1px dashed #B4BAC7",
    alignSelf: "center",
  },
  baseRuleSavedContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "12px",
    padding: "10px 12px",
    boxSizing: "border-box",
    borderRadius: "8px",
    borderBottom: "1px solid #D9DDE7",
    backgroundColor: "#FFF",
    alignSelf: "stretch",
    flex: "1 1 0",
    minWidth: 0,
  },
  baseRuleSavedCheckIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
    height: "24px",
    borderRadius: "6px",
    backgroundColor: "#D9DDE7",
    flexShrink: 0,
    "& svg": {
      width: "13px",
      height: "9px",
      display: "block",
    },
  },
  baseRuleSavedLabel: {
    flex: "0 1 184px",
    width: "184px",
    minWidth: 0,
    color: "#60697D",
    fontFamily: "Manrope",
    fontSize: "14px",
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "21px",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  baseRuleSavedInfoWrap: {
    display: "inline-flex",
    flexShrink: 0,
    width: "24px",
    height: "24px",
  },
  baseRuleSavedInfoIcon: {
    width: "24px",
    height: "24px",
    color: "#9E9E9E",
    cursor: "pointer",
    flexShrink: 0,
  },
  exceptionBottomSheet: {
    "& .ia_modalBody": {
      padding: "24px 16px !important",
    },
  },
  exceptionBottomSheetHeight: {
    "& .ia_modalBody": {
      minHeight: "790px",
    },
  },
  exceptionBottomSheetTableHeight: {
    "& .ia_modalBody": {
      height: "100%",
    },
  },
  exceptionStickyFooter: {
    left: "0px !important",
    width: "100% !important",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px"
  },
  exceptionConfirmBox: {
    "& .ia-styles.ia-prompt .MuiDialogContent-root": {
      padding: "24px 0px 12px !important",
    },
  },
  exceptionTableContainer: {
    display: "flex",
    flexDirection: "row",
  },
  exceptionTableGridWrapper: {
    width: "100%",
  },
  exceptionTableGridWrapperWithModal: {
    width: "calc(100% - 603px)",
  },
}));

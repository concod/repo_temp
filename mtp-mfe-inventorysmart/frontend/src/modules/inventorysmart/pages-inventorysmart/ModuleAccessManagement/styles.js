import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";

export const useStyles = makeStyles(() => ({

  /* ── Page Wrapper ── */
  pageWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "16px 0",
  },

  /* ── Summary Banner ── */
  summaryBanner: {
    background: "linear-gradient(90deg, #1F2B4D 0%, #2A474D 74.04%, #37382A 100%);",
    borderRadius: "12px",
    margin: "12px 24px 0px 24px",
    display: "flex",
    alignItems: "center",
    gap: "40px",
    boxShadow: "0 0 18px 5px rgba(0, 0, 0, 0.06)",
  },
  bannerSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    paddingLeft: "40px",
    borderLeft: "1px dashed var(--Colors-Neutrals-Text-icon-Icon, #60697D)",
  },
  bannerSectionFirst: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "20px",
    borderRadius: "8px",
    background: "linear-gradient(280deg, rgba(255, 255, 255, 0.00) 16.5%, rgba(0, 152, 111, 0.40) 93.74%)",
  },
  bannerIconWrapper: {},
  bannerTitle: {
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: "24px",
    fontFamily: "Manrope",
    color: "var(--Colors-Neutrals-Surface-Lighter, #F5F6FA)",
  },
  bannerSubtitle: {
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "21px",
    fontFamily: "Manrope",
    color: "var(--Colors-Neutrals-Text-icon-Placeholder-text, #C3C8D4)",
    alignSelf: "stretch",
  },
  /* icon + title row inside each banner stat block */
  bannerIconRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  /* SVG stat icons (Modules, AddUser) */
  bannerStatIcon: {
    width: 16,
    height: 16,
    flexShrink: 0,
  },

  /* ── Define Roles Section ── */
  sectionCard: {
    background: colours.white,
    borderRadius: "12px",
    border: "1px solid #E8EAF0",
    padding: "16px",
    margin: "0px 24px",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: colours.cloudBurst,
    margin: 0,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  /* wrapper that gives the Add Role button its relative positioning anchor */
  addRoleBtnWrapper: {
    position: "relative",
  },
  addRoleBtn: {
    display: "flex",
    minWidth: "56px",
    maxHeight: "32px",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    padding: "6px 12px",
    border: "none",
    borderRadius: "8px",
    background: colours.brightRoyalBlue,
    fontSize: "14px",
    fontWeight: 500,
    color: colours.white,
    cursor: "pointer",
    fontFamily: "'Manrope', sans-serif",
    "&:hover": { background: "#3449D1" },
  },
  /* MUI AddIcon size inside the Add Role button */
  addIcon: {
    fontSize: 15,
  },
  rolesRow: {
    display: "flex",
    gap: "16px",
    flexWrap: "nowrap",
    overflowX: "auto",
    paddingBottom: "4px",
    scrollbarWidth: "none",       
    msOverflowStyle: "none",      
    "&::-webkit-scrollbar": {
      display: "none",            
    },
  },
  roleCard: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "8px 16px 8px 8px",
    border: "1.5px solid #E8EAF0",
    borderRadius: "10px",
    background: "#FAFBFF",
    minWidth: "278px",
    maxWidth: "342px",
    height: "56px",
    flexShrink: 0,
    cursor: "pointer",
    "&:hover": { borderColor: "#C7CFF8" },
  },
  /* text area to the right of the role icon */
  roleCardContent: {
    flex: 1,
    minWidth: 0,
  },
  /* row holding the role name (and any badges) */
  roleNameRow: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  roleIconCircle: {
    display: "flex",
    padding: "10px",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    borderRadius: "8px",
    flexShrink: 0,
    fontWeight: 700,
    fontSize: "14px",
    width: "40px",
    height: "40px",
  },
  roleName: {
    fontSize: "14px",
    fontStyle: "normal",
    fontFamily: "Manrope",
    lineHeight: "21px",
    fontWeight: 700,
    color: "var(--Colors-Neutrals-Text-icon-Title, #0D152C)",
  },
  roleActions: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    marginLeft: "auto",
  },
  /* position: relative anchor used for the "…" menu and the Add Role popup */
  menuAnchor: {
    position: "relative",
  },
  /* MUI MoreHorizIcon size */
  moreIcon: {
    fontSize: 16,
  },

  toggle: {
    position: "relative",
    width: "32px",
    height: "18px",
    background: colours.brightRoyalBlue,
    borderRadius: "9px",
    cursor: "pointer",
    flexShrink: 0,
    "&::after": {
      content: '""',
      position: "absolute",
      top: "3px",
      left: "16px",
      width: "12px",
      height: "12px",
      background: colours.white,
      borderRadius: "50%",
      transition: "left 0.2s",
    },
  },
  toggleOff: {
    background: colours.tierDivider,
    "&::after": { left: "3px" },
  },

  /* ── Role Card "…" Dropdown ── */
  moreBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    color: "#9CA3AF",
    display: "flex",
    alignItems: "center",
  },
 
  dropdownMenu: {
    position: "fixed",
    top: "var(--menu-top, 0px)",
    right: "var(--menu-right, 0px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "2px",
    width: "180px",
    minWidth: "180px",
    maxWidth: "240px",
    padding: "8px 6px",
    borderRadius: "12px",
    background: "var(--Colors-Neutrals-Surface-White, #FFF)",
    boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.12)",
    zIndex: 9999,
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: colours.cloudBurst,
    cursor: "pointer",
    boxSizing: "border-box",
    "&:hover": { background: "#F4F6FC" },
  },
  dropdownItemDanger: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "8px 10px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    color: "#DC2626",
    cursor: "pointer",
    boxSizing: "border-box",
    "&:hover": { background: "#FEF2F2" },
  },
 
  renamePortalWrapper: {
    position: "fixed",
    top: "var(--rename-top, 0px)",
    right: "var(--rename-right, 0px)",
    zIndex: 9999,
  },

  /* ── Add Role Popup ── */
  addRolePopup: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    zIndex: 1000,
    display: "flex",
    width: 240,
    minWidth: 200,
    maxWidth: 472,
    boxSizing: "border-box",
    padding: 12,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    background: "var(--Colors-Neutrals-Surface-White, #FFF)",
    boxShadow: "0 0 var(--Sizes-S-04, 4px) 0 rgba(0, 0, 0, 0.12)",
  },

  /* ── Shared: Add Role + Rename Role popups ── */
  popupHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  popupCloseBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 2,
    color: "#9CA3AF",
    display: "flex",
    alignItems: "center",
  },
  popupInput: {
    display: "flex",
    height: "var(--Size-Sz5, 32px)",
    padding: "var(--Padding-Pd-16, 16px) var(--Padding-Pd-12, 12px)",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
    alignSelf: "stretch",
    borderRadius: "var(--Radius-R08, 8px)",
    border: "1px solid var(--Colors-Neutrals-Border-Default, #C3C8D4)",
    background: "var(--Colors-Neutrals-Surface-White, #FFF)",
    boxSizing: "border-box",
    outline: "none",
    fontSize: 13,
    fontFamily: "'Manrope', sans-serif",
    color: colours.cloudBurst,
    width: "100%",
  },

  /* ── Add Role Popup (specific) ── */
  addRoleTitle: {
    fontWeight: 700,
    fontSize: 14,
    color: colours.cloudBurst,
    fontFamily: "'Manrope', sans-serif",
  },
  popupBtnRow: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    width: "100%",
    marginTop: "8px",
  },
  /* Override impact-ui-v3 Button styles. && doubles specificity to win over component styles. */
  cancelBtnStyle: {
    "&&": {
      border: `1px solid ${colours.tierDivider}`,
      color: colours.cloudBurst,
      whiteSpace: "nowrap",
    },
  },
  addBtnStyle: {
    "&&": {
      whiteSpace: "nowrap",
    },
  },

  /* ── Rename Role Popup ── */
  renamePopup: {
    position: "relative",
    zIndex: 9999,
    width: 240,
    minWidth: 200,
    maxWidth: 472,
    boxSizing: "border-box",
    padding: 12,
    borderRadius: 12,
    background: "var(--Colors-Neutrals-Surface-White, #FFF)",
    boxShadow: "0 0 4px 0 rgba(0, 0, 0, 0.12)",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
  },
  renameTitle: {
    fontWeight: 800,
    fontSize: 14,
    color: colours.darkBlack,
    fontFamily: "'Manrope', sans-serif",
  },
  renameBtnRow: {
    display: "flex",
    justifyContent: "flex-end",
    width: "100%",
  },
  /* Disabled/base state for Apply & Save */
  applySaveBtn: {
    width: 108,
    height: 28,
    padding: "0 12px",
    border: "none",
    borderRadius: 8,
    background: "#C7CFF8",
    fontSize: 13,
    fontWeight: 600,
    color: colours.white,
    cursor: "not-allowed",
    fontFamily: "'Manrope', sans-serif",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  },
  /* Active override applied when canSave is true */
  applySaveBtnEnabled: {
    background: colours.brightRoyalBlue,
    cursor: "pointer",
  },

  /* ── Module Access Matrix ── */
  matrixCard: {
    margin: "0 24px",
  },
  moduleCellContainer: {
    padding: "2px 0",
    minWidth: 0,
    width: "100%",
    overflow: "hidden",
  },
  moduleCellName: {
    fontWeight: 600,
    fontSize: 13,
    color: colours.cloudBurst,
    lineHeight: 1.2,
  },
  moduleCellDesc: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
    lineHeight: 1.2,
  },

  accessOptionLabel: {
    "&&": {
      display: "flex",
      alignItems: "center",
      gap: 6,
    },
  },
 
  accessOptionIcon: {
    flexShrink: 0,
    display: "inline-block",
    verticalAlign: "middle",
  },
  /* icon shown inside the Select trigger when a value is selected */
  accessSelectIcon: {
    flexShrink: 0,
    display: "inline-block",
    verticalAlign: "middle",
    marginRight: 6,
  },
}));

export const useRoleCardStyles = makeStyles(() => ({
  roleCardOverrides: ({ gradient, enabled }) => ({
    opacity: enabled ? 1 : 0.5,
    background: gradient,
    border: "0.5px solid var(--Colors-Neutrals-Border-Subtle, #D9DDE7)",
  }),
  roleIconDynamic: ({ bg, iconColor }) => ({
    background: bg,
    color: iconColor,
  }),
}));

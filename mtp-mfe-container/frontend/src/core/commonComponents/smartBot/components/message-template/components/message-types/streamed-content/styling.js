import { makeStyles } from "@mui/styles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles((theme) => ({
  cursor: {
    display: "inline-block",
    width: pxToRem(4),
    height: pxToRem(16),
    backgroundColor: theme.palette.primary.main,
    marginLeft: pxToRem(2),
    animation: "$blink 1s infinite",
  },
  "@keyframes blink": {
    "0%": { opacity: 1 },
    "50%": { opacity: 0 },
    "100%": { opacity: 1 },
  },
  dropdownArrow: {
    fontSize: pxToRem(12),
    color: "#6B7280",
    transition: "transform 0.2s ease",
    fontWeight: "bold",
    "&.expanded": {
      transform: "rotate(180deg)",
    },
  },
  thoughtDropdown: {
    marginBottom: pxToRem(12),
  },
  thoughtHeader: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(6),
    padding: `${pxToRem(6)} ${pxToRem(8)}`,
    backgroundColor: "#F3F4F6",
    borderRadius: pxToRem(6),
    cursor: "pointer",
    border: "1px solid #E5E7EB",
    "&:hover": {
      backgroundColor: "#E5E7EB",
    },
  },
  thoughtIcon: {
    fontSize: pxToRem(16),
    color: "#6B7280",
  },
  thoughtHeaderText: {
    fontFamily: "Manrope",
    fontSize: pxToRem(12),
    fontWeight: 500,
    color: "#6B7280",
    flex: 1,
  },
  thoughtContent: {
    padding: `${pxToRem(12)} ${pxToRem(16)}`,
    backgroundColor: "#FAFBFC",
    border: "1px solid #E1E4E8",
    borderTop: "none",
    borderRadius: `0 0 ${pxToRem(6)} ${pxToRem(6)}`,
    maxHeight: pxToRem(200),
    overflowY: "auto",
    "&::-webkit-scrollbar": {
      width: pxToRem(4),
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "#F1F3F4",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "#C1C8CD",
      borderRadius: pxToRem(2),
    },
  },
  thoughtText: {
    fontFamily: "var(--Colors-Neutrals-Text-icon-Label, #6B6B70)",
    fontSize: pxToRem(14),
    fontWeight: 400,
    lineHeight: "22.4px",
    color: "#6B6B70",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  stopButton: {
    marginTop: pxToRem(8),
    marginBottom: pxToRem(8),
    backgroundColor: "#ef4444",
    color: "white",
    fontSize: pxToRem(12),
    padding: `${pxToRem(4)} ${pxToRem(12)}`,
    minWidth: "auto",
    "&:hover": {
      backgroundColor: "#dc2626",
    },
  },
  streamContainer: {
    position: "relative",
    background: colours.white,
  },
  retryContainer: {
    marginTop: pxToRem(8),
  },
  retryMessage: {
    fontFamily: "Manrope",
    fontSize: pxToRem(13),
    fontWeight: 500,
    color: "#374151",
  },
}));

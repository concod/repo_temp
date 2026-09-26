import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles(() => ({
  commentCard: {
    display: "flex",
    gap: pxToRem(30),
    marginTop: pxToRem(40),
    "&:first-child": {
      marginTop: pxToRem(0),
    },
  },
  commentCardNameInitials: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minWidth: pxToRem(60),
    height: pxToRem(60),
    background: `${colours.crusta} 0% 0% no-repeat padding-box`,
    borderRadius: pxToRem(4),
    textAlign: "center",
    font: `normal normal 600 ${pxToRem(20)}/${pxToRem(30)} Poppins`,
    letterSpacing: pxToRem(0.12),
    color: colours.white,
    textTransform: "uppercase",
  },

  commentCardCommentInfo: {
    borderBottom: `${pxToRem(1)} solid ${colours.gallery}`,
    paddingBottom: pxToRem(14),
  },

  commentCardNameTime: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(18),
  },

  commentCardNameTimeName: {
    font: `normal normal medium ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0.08),
    color: colours.codGray,
    textTransform: "capitalize",
  },

  commentCardNameTimeTime: {
    font: `normal normal normal ${pxToRem(12)}/${pxToRem(18)} Poppins`,
    letterSpacing: pxToRem(0),
    color: colours.lightslategray,
  },

  commentCardSubject: {
    marginTop: pxToRem(20),
    font: `normal normal 600 ${pxToRem(16)}/${pxToRem(25)} Poppins`,
    letterSpacing: pxToRem(0.1),
    color: colours.codGray,
  },

  commentCardDescription: {
    marginTop: pxToRem(8),
    font: `normal normal normal ${pxToRem(14)}/${pxToRem(21)} Poppins`,
    letterSpacing: pxToRem(0.08),
    color: colours.codGray,
  },

  commentCardAttachments: {
    marginTop: pxToRem(14),
    display: "flex",
    alignItems: "center",
    gap: pxToRem(16),
  },

  commentCardAttachmentsIcon: {
    "& svg": {
      width: pxToRem(8),
      height: pxToRem(16),
    },
  },

  commentCardAttachmentsGroupImages: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(10),
    border: `${pxToRem(1)} solid ${colours.gallery}`,
    borderRadius: pxToRem(3),
    padding: pxToRem(10),
  },

  commentCardAttachmentsGroupImage: {
    boxShadow: `${pxToRem(0)} ${pxToRem(0)} ${pxToRem(4)} ${colours.boxShadow}`,
    borderRadius: pxToRem(3),
  },
}));

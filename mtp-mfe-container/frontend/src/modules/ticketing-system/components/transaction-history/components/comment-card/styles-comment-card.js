import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles((theme) => ({
  commentCard: {
    display: "flex",
    gap: pxToRem(30),
    borderBottom: `1px solid ${theme.palette.background.separaterColor}`,
    paddingBottom:pxToRem(16),
    maxWidth:pxToRem(649)
  },
  commentCardNameInitials: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minWidth: pxToRem(30),
    height: pxToRem(30),
    aspectRatio: "1/1",
    background: theme?.palette?.colours?.blue_01,
    borderRadius: pxToRem(4),
    textAlign: "center",
    font: `600 ${pxToRem(14)} Manrope`,
    color: theme?.palette?.common?.white,
    textTransform: "uppercase",
  },

  // commentCardCommentInfo: {

  //   paddingBottom: pxToRem(14),
  // },

  commentCardNameTime: {
    display: "flex",
    alignItems: "center",
    gap: pxToRem(18),
  },

  name: {
    font: `500 ${pxToRem(14)} Manrope`,
    color: theme?.palette?.textColours?.lightNeutrals,
    textTransform: "capitalize",
  },

  time: {
    font: `500 ${pxToRem(12)} Manrope`,
    color: theme?.palette?.textColours?.greyHelperText,
  },

  subject: {
    marginTop: pxToRem(21),
    font: `600 ${pxToRem(16)} Manrope`,
    color: theme?.palette?.textColours?.lightNeutrals,
  },

  description: {
    marginTop: pxToRem(9),
    font: `500 ${pxToRem(14)} Manrope`,
    color: colours.codGray,
    maxWidth:pxToRem(560)
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
    overflowX: 'auto',
    display: "flex",
    alignItems: "center",
    gap: pxToRem(10),
    border: `${pxToRem(1)} solid ${colours.gallery}`,
    borderRadius: pxToRem(3),
    padding: pxToRem(10),
    maxWidth:pxToRem(530),
    "&::-webkit-scrollbar": {
      width: pxToRem(0.1),
      /* Width of the scrollbar */
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
    "&::-webkit-scrollbar-track": {
      backgroundColor: "transparent",
      /* Background color of the scrollbar */
    },
  },

  commentCardAttachmentsGroupImage: {
    boxShadow: `${pxToRem(0)} ${pxToRem(0)} ${pxToRem(4)} ${colours.boxShadow}`,
    borderRadius: pxToRem(3),
  },
}));

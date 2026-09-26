import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles((theme) => ({
  parentContainer: {
    margin: 0,
    padding: `${pxToRem(30)} ${pxToRem(15)} ${pxToRem(24)} ${pxToRem(21)}`,
  },
  title: {
    color: theme.palette.text.primary,
    font: `normal normal 600 ${pxToRem(18)}/normal Poppins`,
  },
  headerContainer: {
    marginTop: pxToRem(13),
  },
  backButton: {
    padding: "0.5rem 1.5rem",
    borderRadius: "0.25rem",
    alignSelf: "flex-end",
  },
  header: {
    color: theme.palette.text.primary,
    font: `normal normal 500 1rem/1.5rem Poppins`,
  },
  screenHeader: {
    fontWeight: 600,
  },
  card: {
    boxShadow: "0px 0px 8px 0px rgba(0, 0, 0, 0.12)",
    borderRadius: "0.25rem",
  },
  cardContent: {
    padding: "1.25rem",
  },
  cardHeader: {
    color: theme.palette.text.primary,
    font: `normal normal 500 1rem/1.5rem Poppins`,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  customTooltip: {
    backgroundColor: theme.palette.colours.tooltipColor,
    fontSize: theme.typography.pxToRem(14),
    lineHeight: theme.typography.pxToRem(18),
    fontWeight: 400,
    padding: "0.5rem 1rem",
    boxShadow: "0 0.25rem 0.75rem 0 #00000014",
    borderRadius: "0.25rem",
    "& .MuiTooltip-arrow::before": {
      backgroundColor: theme.palette.colours.tooltipColor,
    },
  },
  cardSubHeader: {
    color: theme.palette.primary.main,
    font: `normal normal 500 0.75rem/normal Poppins`,
    cursor: "pointer",
  },
  customButton: {
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  cardHeaderOptions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardParagraph: {
    color: theme.palette.textColours.slateGrayLight,
    font: `normal normal 400 ${pxToRem(14)}/normal Poppins`,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box", //displays the text as a block container
    "-webkit-line-clamp": 2, // Limit the number of lines to 2
    "-webkit-box-orient": "vertical",
    marginTop: pxToRem(10),
  },
  cardLearnmore: {
    color: theme.palette.primary.main,
    font: `normal normal 500 0.75rem/normal Poppins`,
    padding: "0",
    marginTop: "0.5rem",
  },

  cardActions: {
    padding: "0",
  },
  progressBar: {
    height: pxToRem(6),
  },
  listHeader: {
    color: theme.palette.text.primary,
    font: `normal normal 500 0.75rem/normal Poppins`,
  },
  listSubHeader: {
    color: theme.palette.textColours.subHeader,
    font: `normal normal 400 0.75rem/normal Poppins`,
  },
  gridContainer: {
    marginTop: pxToRem(13),
  },
  divider: {
    marginTop: "1.5rem",
  },
  rotatedIcon: {
    transform: "rotate(90deg)",
  },
}));

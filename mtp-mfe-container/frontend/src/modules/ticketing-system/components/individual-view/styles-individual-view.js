import makeStyles from "@mui/styles/makeStyles";
import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles(() => ({
  filterContainer: {
    position: "static",
    paddingRight: "22px",
    paddingLeft: "20px",
  },
  ticketVolumeRecentActivityContainer: {
    display: "flex",
    justifyContent: "space-between",
    gap: pxToRem(36),
    marginTop: pxToRem(2),
  },
}));

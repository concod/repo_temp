import { pxToRem } from "core/Utils/functions/utils";
import makeStyles from "@mui/styles/makeStyles";

export const useStyles = makeStyles((theme) => ({
  container: {
    padding: pxToRem(25),
  },
}));

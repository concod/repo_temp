import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";

export const useStyles = makeStyles((theme) => ({
  moduleBody: {
    background: "#ECEEFD",
    width: "100%",
    height: `calc(100vh - ${theme.customVariables.headerHeight})`,
  },
  formWrapper: {
    width: pxToRem(870),
    height: pxToRem(480),
    borderRadius: pxToRem(15),
    borderWidth: pxToRem(1),
    padding: `${pxToRem(24)} ${pxToRem(65)}`,
    background: theme?.palette?.common?.white,
    justifyContent: "start",
    padding: pxToRem(24),
  },
  headerText: {
    fontWeight: 800,
    fontSize: pxToRem(20),
    lineHeight: pxToRem(30),
    marginTop: pxToRem(10),
  },
  helperText: {
    fontWeight: 500,
    fontSize: pxToRem(16),
    lineHeight: pxToRem(24),
    textAlign: "center",
    color: theme?.palette?.textColours?.greyHelperText,
    marginTop: pxToRem(4),
  },
  helperSubText: {
    marginTop: pxToRem(32),
    fontWeight: 500,
    fontSize: pxToRem(14),
    lineHeight: pxToRem(20),
    color: theme?.palette?.textColours?.greyHelperText,
  },
  emailText: {
    fontWeight: 600,
    color: theme?.palette?.textColours?.lightNeutrals,
  },
  emailVector: {
    width: pxToRem(100),
    aspectRatio: "1/1",
  },
  otpInputWrapper: {
    gap: pxToRem(8),
    marginTop: pxToRem(12),
  },
  otpInput: {
    minWidth: `${pxToRem(40)}`,
    maxWidth: `${pxToRem(40)}`,
    height: `${pxToRem(40)}!important`,
    "& input": {
      minWidth: `${pxToRem(40)}!important`,
      padding: `${pxToRem(0)} ${pxToRem(15)}!important`,
      maxWidth: `${pxToRem(40)}!important`,
    },
  },
  buttonWrapper: {
    gap: pxToRem(12),
  },
  separator: {
    minWidth: pxToRem(704),
    border: `${pxToRem(1)} solid ${theme?.palette?.colours?.greyishBlue}`,
    marginTop: pxToRem(32),
    marginBottom: pxToRem(20),
  },
  helperMsg: {
    fontWeight: 400,
    fontSize: pxToRem(14),
    lineHeight: pxToRem(16),
    color: `${theme?.palette?.colours?.neutralGrey}`,
  },
  resendIcon: {
    margin: `${pxToRem(20)} 0px!important`,
    "& .ia-btn-icon":{
      marginBottom:"unset"
    }
  },
}));

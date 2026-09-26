import colours from "core/Styles/colours";
import { pxToRem } from "core/Utils/functions/utils";
const styles = {
  loginBtn:{
    margin: `0 auto ${pxToRem(24)} !important`,
  },
  "@media (min-width: 1200px)": {
    hrTextMobile: {
      display: "none",
    },
  },

  "@media (max-width: 1200px)": {
    mainIABody: {
      display: "block",
      "& .marketing-container": {
        display: "none !important",
      },
    },

    signinFormContainer: {
      padding: 0,
      "& .login-options": {
        width: "90% !important",
        padding: "1.25rem",
        boxSizing: "border-box",
        margin: "0 auto",
      },
    },

    loginOptions: {},

    signInText: {
      marginBottom: "1rem",
      textAlign: "center",
      fontFamily: "Poppins",
      fontSize: pxToRem(16),
      fontStyle: "normal",
      fontWeight: 500,
      lineHeight: "normal",
    },

    hrTextDesktop: {
      display: "none",
    },

    hrTextMobile: {
      textAlign: "center",
      fontFamily: "Poppins",
      fontSize: pxToRem(14),
      fontStyle: "normal",
      fontWeight: 400,
      marginTop: pxToRem(20),
      color: colours.lighGrey,
    },

    contact: {
      fontSize: pxToRem(14),
      fontWeight: 400,
      fontFamily: "Poppins",
    },

    firebaseOverrides: {
      "& .firebaseui-idp-list": {
        width: "100%",
      },
      "& .firebaseui-idp-button": {
        maxWidth: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      "& .firebaseui-idp-icon-wrapper": {
        position: "static",
        marginRight: 0,
      },
      "& .firebaseui-idp-text": {
        textAlign: "center",
      },
      "& .firebaseui-idp-text-short": {
        color:  colours.darkBlack + " !important",
        textAlign: "center",
        fontFamily: "Poppins",
        fontSize: `${pxToRem(14)} !important`,
        fontStyle: "normal",
        fontWeight: "500 !important",
        lineHeight: "normal !important",
      }
    },
  },
};

export default styles;

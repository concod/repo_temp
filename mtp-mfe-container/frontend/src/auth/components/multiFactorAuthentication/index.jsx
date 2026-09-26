import React, { useState, useEffect, useRef } from "react";
import { Typography } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { useDispatch, useSelector } from "react-redux";
import LoginHeader from "../loginHeader";
import { useStyles } from "./mfa-styles";
import globalStyles from "core/Styles/globalStyles";
import { Input, Button } from "impact-ui-v3";
import ResendIcon from "assets/resend.svg";
import EmailIcon from "assets/email.png";
import { createOtp } from "./services";
import { logoutUser } from "core/actions/authActions";
import { displaySnackMessages } from "core/Utils/utils";
import {
  handleInputChange,
  handleVerifyOTP,
  handleResendOtp,
  handleOtpPaste,
} from "./utils";
import { USER_ALREADY_VERIFIED_MSG } from "./constants";

const MFA = () => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const inputRef = useRef([]);
  const [values, setValues] = useState(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState({
    verify: true,
    resend: false,
  });
  const [resendTimer, setResendTimer] = useState(30);
  const [isMfaVerified, setIsMfaVerified] = useState(() => {
    try {
      return sessionStorage.getItem("mfaVerified") === "true";
    } catch (e) {
      return false;
    }
  });
  const navState = location?.state || {};
  const flow = navState.flow || sessionStorage.getItem("mfaFlow") || null;
  const email = navState.email || sessionStorage.getItem("mfaEmail") || "";

  const isAuthenticated = useSelector(
    (state) => state.authReducer?.isAuthenticated
  );
  const isTokenVerified = useSelector(
    (state) => state.authReducer?.isTokenVerified
  );
  const landingPage = useSelector((state) => state.authReducer?.landingPage);

  // Strict guard: only authenticated users can access /mfa (for login MFA)           This has been commented out for now for better solutions to this error
  // useEffect(() => {
  // //   if (!isAuthenticated) {
  // //     navigate("/login");
  //   // }
  // }, [isAuthenticated]);

  // Function to navigate back to login for different scenarios
  const handleLogoutAndLoginRedirect = () => {
    dispatch(logoutUser());
    navigate("/login");
  };

  // UseEffect to redirect to home when user is already authenticated and verified and still lands on MFA screen
  useEffect(() => {
    const mfaVerified =
      isMfaVerified || sessionStorage.getItem("mfaVerified") === "true";
    if (isTokenVerified && isAuthenticated && mfaVerified) {
      displaySnackMessages(USER_ALREADY_VERIFIED_MSG, "success", dispatch);
      navigate(landingPage || "/home");
    }
  }, [isAuthenticated, isTokenVerified]);

  // Useeffect to generate OTP
  useEffect(() => {
    if (!email || !flow) return;
    (async () => {
      try {
        const response = await createOtp({ purpose: flow });
        const cooldownCreate = parseInt(
          response?.data?.resend_cooldown_seconds ??
            response?.data?.cooldown_seconds,
          10
        );
        if (!Number.isNaN(cooldownCreate) && cooldownCreate > 0) {
          setResendTimer(cooldownCreate);
        }
      } catch (err) {
        console.error("Error generating OTP", err);
      }
    })();
  }, []);

  // UseEffect to update the cooldown timer.
  useEffect(() => {
    if (resendTimer <= 0) return;
    const intervalId = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [resendTimer]);

  // UseEffect to reset disable the verify button after exhausting the number of allowed attempts
  useEffect(() => {
    if (sessionStorage.getItem("mfaResendRemaining") === 0) {
      setIsLoading((prevIsLoading) => ({
        ...prevIsLoading,
        verify: true,
      }));
    }
  }, [sessionStorage.getItem("mfaResendRemaining")]);

  const renderInput = (index) => {
    return (
      <Input
        key={index}
        className={classes.otpInput}
        ref={(el) => (inputRef.current[index] = el)}
        value={values[index]}
        inputProps={{ inputMode: "numeric", maxLength: 1 }}
        onPaste={(e) =>
          handleOtpPaste(
            e.clipboardData.getData("text"),
            values,
            inputRef,
            setValues,
            setIsLoading
          )
        }
        onKeyDown={(e) =>
          handleInputChange(
            e.key,
            index,
            values,
            inputRef,
            setValues,
            setIsLoading
          )
        }
      />
    );
  };

  return (
    <>
      <LoginHeader />
      <div className={`${classes.moduleBody} ${globalClasses.centerAlign}`}>
        <div
          className={`${classes.formWrapper} ${globalClasses.centerAlign} ${globalClasses.flexColumn}`}
        >
          <img src={EmailIcon} className={classes.emailVector} />
          <Typography className={classes.headerText}>
            Multi-Factor Authentication
          </Typography>
          <Typography className={classes.helperText}>
            6-digit verification code has been sent to{" "}
            <span className={classes.emailText}>
              {localStorage.getItem("name") || ""}
            </span>
          </Typography>
          <Typography className={classes.helperSubText}>
            Enter the code below
          </Typography>
          <div
            className={`${globalClasses.centerAlign} ${classes.otpInputWrapper}`}
          >
            {Array.from({ length: 6 }).map((_, index) => renderInput(index))}
          </div>
          <Button
            className={classes.resendIcon}
            icon={<ResendIcon />}
            iconPlacement="left"
            size="large"
            variant="url"
            onClick={() =>
              handleResendOtp(
                flow,
                setResendTimer,
                displaySnackMessages,
                setIsLoading,
                dispatch,
                handleLogoutAndLoginRedirect
              )
            }
            disabled={resendTimer > 0 || isLoading.resend}
          >
            Resend {resendTimer > 0 && `in ${resendTimer} sec`}
          </Button>
          <div
            className={`${globalClasses.centerAlign} ${classes.buttonWrapper}`}
          >
            <Button
              size="large"
              variant="secondary"
              onClick={handleLogoutAndLoginRedirect}
            >
              Back to sign in
            </Button>
            <Button
              className=""
              disabled={isLoading.verify}
              size="large"
              type="default"
              variant="primary"
              onClick={() =>
                handleVerifyOTP(
                  values,
                  flow,
                  setIsLoading,
                  setIsMfaVerified,
                  dispatch,
                  displaySnackMessages,
                  navigate,
                  handleLogoutAndLoginRedirect,
                  landingPage
                )
              }
            >
              Verify
            </Button>
          </div>
          <div className={classes.separator}></div>
          <Typography className={classes.helperMsg}>
            Didn't receive the email? Check your spam folder
          </Typography>
        </div>
      </div>
    </>
  );
};

export default MFA;

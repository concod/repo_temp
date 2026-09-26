import { cloneDeep } from "lodash";
import { verifyOtp, resendOtp } from "./services";
import { isUndefined, isNaN } from "lodash";
import {
  OTP_VERIFICATION_FAILED_MSG,
  OTP_RESEND_FAILURE_MSG,
  MAX_OTP_VERIFY_ATTEMPTS_MSG,
  DEFAULT_COOLDOWN_SECONDS,
  MAX_RESEND_ATTEMPTS,
} from "./constants";

/**
 * Function to check the format integrity of the otp
 * @param {Array} otpValue - Array of 6 numbers of the otp
 * @returns {Boolean} - Return true if otp is in valid format, false if it isn't
 */
const isOtpComplete = (otpValue) => {
  if (otpValue.length !== 6) return false;
  return otpValue.every((value) => {
    if (value === "" || value === null || value === undefined) return false;
    if (typeof value !== "number" && isNaN(Number(value))) return false;
    return true;
  });
};

/**
 * Function to handle pasting otp from clipboard
 * @param {string} val - 6 Digit otp values
 * @param {Array} values - array of otp integer values
 * @param {ElementRef} inputRef - Ref of 6 input fields for otp input
 * @param {Function} setValues - method to set the otp value
 * @param {Function} setIsLoading - Method to update the loading state value
 */
export const handleOtpPaste = (
  val,
  values,
  inputRef,
  setValues,
  setIsLoading
) => {
  const valuesCopy = cloneDeep(values);
  const otp = val?.split("");
  for (let i = 0; i < 6; i++) {
    valuesCopy[i] = otp[i];
  }
  if (isOtpComplete(otp)) {
    inputRef.current[5].focus();
    setValues(valuesCopy);
  }
  setIsLoading((prevIsLoading) => ({
    ...prevIsLoading,
    verify: !isOtpComplete(otp),
  }));
};

/**
 * Function to handle the input change when user interacts with the otp intput fields
 * @param {Number/String} val - Value entered in the inputfield
 * @param {Number} index - Index of the input field being interacted with
 * @param {Array} values - array of otp integer values
 * @param {ElementRef} inputRef - Ref of 6 input fields for otp input
 * @param {Function} setValues - method to set the otp value
 * @param {Function} setIsLoading - Method to update the loading state value
 * @returns
 */
export const handleInputChange = (
  val,
  index,
  values,
  inputRef,
  setValues,
  setIsLoading
) => {
  const valuesCopy = cloneDeep(values);
  if (val === "Backspace") {
    if (valuesCopy[index] === "" && index !== 0) {
      inputRef.current[index - 1].focus();
      return;
    }
    valuesCopy[index] = "";
    setValues(valuesCopy);
    setIsLoading((prevIsLoading) => ({
      ...prevIsLoading,
      verify: !isOtpComplete(valuesCopy),
    }));
    return;
  }
  if (typeof Number(val) !== "number") return;
  if (isNaN(Number(val))) return;
  valuesCopy[index] = Number(val);
  setValues(valuesCopy);
  setIsLoading((prevIsLoading) => ({
    ...prevIsLoading,
    verify: !isOtpComplete(valuesCopy),
  }));
  if (index !== 5) {
    inputRef.current[index + 1].focus();
  }
};

//Method to verify the OTP
export const handleVerifyOTP = async (
  values,
  flow,
  setIsLoading,
  setIsMfaVerified,
  dispatch,
  displaySnackMessages,
  navigate,
  handleLogoutAndLoginRedirect,
  landingPage
) => {
  setIsLoading((prevIsLoading) => ({
    ...prevIsLoading,
    verify: true,
  }));
  try {
    const response = await verifyOtp({
      otp_code: values?.join(""),
      purpose: flow,
    });
    if (response?.data?.success) {
      if (flow === "login") {
        sessionStorage.setItem("mfaVerified", "true");
        sessionStorage.removeItem("mfaFlow");
        sessionStorage.removeItem("mfaResendRemaining");
        sessionStorage.removeItem("mfaPending");
        setIsMfaVerified(true);
        navigate(landingPage || "/home");
      }
    }
  } catch (error) {
    if (error?.response?.data?.hasOwnProperty("remaining_attempts")) {
      if (error?.response?.data?.remaining_attempts === 0) {
        displaySnackMessages(MAX_OTP_VERIFY_ATTEMPTS_MSG, "error", dispatch);
        handleLogoutAndLoginRedirect();
        return;
      }
      displaySnackMessages(
        `${error?.response?.data?.message}. Remainging attempts - ${error?.response?.data?.remaining_attempts}` ||
          "Invalid OTP code",
        "error",
        dispatch
      );
    } else if (
      error?.response?.status === 404 ||
      isUndefined(error?.response)
    ) {
      displaySnackMessages(OTP_VERIFICATION_FAILED_MSG, "error", dispatch);
      handleLogoutAndLoginRedirect();
    }
    console.error("handleVerifyOTP error", error);
  } finally {
    setIsLoading((prevIsLoading) => ({
      ...prevIsLoading,
      verify: false,
    }));
  }
};
//Method to resend the OTP
export const handleResendOtp = async (
  flow,
  setResendTimer,
  displaySnackMessages,
  setIsLoading,
  dispatch,
  handleLogoutAndLoginRedirect
) => {
  setIsLoading((prevIsLoading) => ({
    ...prevIsLoading,
    resend: true,
  }));
  try {
    const remainingResendsCount =
      sessionStorage.getItem("mfaResendRemaining") || MAX_RESEND_ATTEMPTS;
    if (remainingResendsCount > 0) {
      const response = await resendOtp({ purpose: flow });
      setResendTimer(
        response?.data?.resend_cooldown_seconds || DEFAULT_COOLDOWN_SECONDS
      );
      sessionStorage.setItem(
        "mfaResendRemaining",
        response?.data?.remaining_resends || 4
      );
      displaySnackMessages(
        `OTP has been sent to ${localStorage.getItem("name") || "your email"}`,
        "success",
        dispatch
      );
      setIsLoading((prevIsLoading) => ({
        ...prevIsLoading,
        resend: false,
      }));
    } else if (remainingResendsCount === 0) {
      displaySnackMessages(MAX_OTP_VERIFY_ATTEMPTS_MSG, "error", dispatch);
    }
  } catch (err) {
    if (err?.response?.status === 400) {
      displaySnackMessages(MAX_OTP_VERIFY_ATTEMPTS_MSG, "error", dispatch);
      handleLogoutAndLoginRedirect();
    } else {
      console.error("handleResendOtp Error:", err);
      displaySnackMessages(OTP_RESEND_FAILURE_MSG, "error", dispatch);
    }
  }
};

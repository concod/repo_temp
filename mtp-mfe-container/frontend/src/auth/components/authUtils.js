import { VALID_EMAIL } from "../regex";
import { firebaseobj } from "../firebase";
import { displaySnackMessages } from "core/Utils/utils";
import { MFA_FLOW } from "core/commonComponents/layout/authenticationConstants";

/**
 * Validates login form fields.
 * Returns an error object if validation fails, or null if valid.
 */
export const validateLoginFields = (email, password, passwordResetflag = false) => {
  let error = {};
  if (!email || !VALID_EMAIL.test(email)) {
    error.email = "Please input valid email id";
  }
  if (!password && !passwordResetflag) {
    error.password = "Please enter password";
  }
  if (password.length > 20 && !passwordResetflag) {
    error.password = "Password length cannot exceed 20 characters";
  }
  return Object.keys(error).length ? error : null;
};

/**
 * Sends a password reset email via Firebase with a continue URL.
 */
export const resetPasswordWithContinueUrl = (emailAddress, dispatch) => {
  const baseUrl = localStorage.getItem("baseUrl") || window.location.hostname;
  const continueUrl = `https://${baseUrl}`;
  firebaseobj
    .auth()
    .sendPasswordResetEmail(emailAddress, {
      url: continueUrl,
      handleCodeInApp: false,
    })
    .then(() => {
      displaySnackMessages("Password reset link sent to the registered email successfully!", "success", dispatch);
    })
    .catch((error) => {
      displaySnackMessages(error?.message || "Failed to send reset email", "error", dispatch);
    });
};

/**
 * Initializes MFA session in sessionStorage.
 */
export const initMfaSession = (email) => {
  sessionStorage.setItem("mfaFlow", MFA_FLOW.login);
  sessionStorage.setItem("mfaEmail", email);
  sessionStorage.setItem("mfaCreatedAt", String(Date.now()));
  sessionStorage.setItem("mfaPending", "true");
};

/**
 * Clears all MFA-related sessionStorage items.
 */
export const clearMfaSession = () => {
  sessionStorage.removeItem("mfaFlow");
  sessionStorage.removeItem("mfaVerified");
  sessionStorage.removeItem("mfaEmail");
  sessionStorage.removeItem("mfaResendRemaining");
  sessionStorage.removeItem("mfaPending");
};

/**
 * Handles Google sign-in using Firebase popup.
 */
export const handleGoogleSignIn = async (dispatch) => {
  const provider = new firebaseobj.auth.GoogleAuthProvider();
  try {
    sessionStorage.setItem("ssoLoginInProgress", "true");
    await firebaseobj.auth().signInWithPopup(provider);
  } catch (error) {
    sessionStorage.removeItem("ssoLoginInProgress");
    displaySnackMessages(error.message, "error", dispatch);
    console.error("Google sign-in error:", error);
  }
};

/**
 * Handles SSO/SAML sign-in using Firebase popup.
 */
export const handleSSOSignIn = async (providerId, dispatch) => {
  const provider = new firebaseobj.auth.SAMLAuthProvider(providerId);
  try {
    sessionStorage.setItem("ssoLoginInProgress", "true");
    await firebaseobj.auth().signInWithPopup(provider);
  } catch (error) {
    sessionStorage.removeItem("ssoLoginInProgress");
    displaySnackMessages(error.message, "error", dispatch);
    console.error("SSO sign-in error:", error);
  }
};

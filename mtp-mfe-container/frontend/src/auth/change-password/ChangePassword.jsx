import { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
} from "@mui/material";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useDispatch } from "react-redux";
import { useLocation, useHistory } from "react-router-dom";
import { addSnack } from "core/actions/snackbarActions";
import firebaseobj from "auth/firebase";
import { ChangePasswordStyling } from "./ChangePasswordStyling";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Returns true if the given URL origin is trusted for redirect (same origin or same registrable domain).
 * Prevents open redirect: only allow redirect to current host or sibling envs (e.g. *.impactsmartsuite.com).
 */
const isTrustedRedirectOrigin = (targetUrl) => {
  try {
    const target = typeof targetUrl === "string" ? new URL(targetUrl) : targetUrl;
    const current = window.location.hostname;
    if (target.origin === window.location.origin) return true;
    const baseDomain = current.split(".").slice(-2).join(".");
    const targetHost = target.hostname;
    return (
      targetHost === baseDomain || targetHost.endsWith(`.${baseDomain}`)
    );
  } catch (_) {
    return false;
  }
};

/**
 * Firebase action URL is not env-specific, so the email link may open the wrong env.
 * We pass continueUrl (env-specific) when sending the reset email; Firebase adds it to the link.
 * Per Firebase docs: use continueUrl to redirect the user back to the app after the action.
 * So we stay on the current (possibly wrong) env until the user enters password and clicks Save;
 * after successful reset we redirect to the correct env's login using continueUrl.
 * @see https://firebase.google.com/docs/auth/custom-email-handler
 */
const getQueryParams = (search) => {
  const params = new URLSearchParams(search);
  return {
    oobCode: params.get("oobCode") || null,
    tenantId: params.get("tenantId") || null,
    continueUrl: params.get("continueUrl") || null,
  };
};

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [isValidCode, setIsValidCode] = useState(null);
  const [codeError, setCodeError] = useState(null);
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();
  const classes = ChangePasswordStyling();

  const getParams = () => getQueryParams(location.search);

  useEffect(() => {
    const { oobCode, tenantId } = getQueryParams(location.search);
    if (!oobCode) return;
    if (tenantId) {
      firebaseobj.auth().tenantId = tenantId;
    }
    firebaseobj
      .auth()
      .verifyPasswordResetCode(oobCode)
      .then(() => setIsValidCode(true))
      .catch(() => {
        setIsValidCode(false);
        setCodeError("This password reset link has expired or is invalid.");
      });
  }, [location.search]);

  const showSnack = (message, variant = "success") => {
    dispatch(
      addSnack({
        message,
        options: { variant },
      })
    );
  };

  const validate = () => {
    const nextErrors = {};
    if (!newPassword.trim()) {
      nextErrors.newPassword = "Please enter a new password";
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      nextErrors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    const { oobCode, tenantId, continueUrl } = getParams();

    try {
      if (oobCode) {
        if (!isValidCode) {
          showSnack(
            codeError || "Please wait while we verify your reset link.",
            "error"
          );
          setSubmitting(false);
          return;
        }
        if (tenantId) {
          firebaseobj.auth().tenantId = tenantId;
        }
        await firebaseobj.auth().confirmPasswordReset(oobCode, newPassword);
        showSnack("Your password has been reset. You can sign in with your new password.");
        if (continueUrl) {
          try {
            const target = new URL(continueUrl);
            if (
              /^https?:$/i.test(target.protocol) &&
              isTrustedRedirectOrigin(target)
            ) {
              window.location.href = `${target.origin}/login`;
              return;
            }
            } catch (_) {
                showSnack("This password reset link has expired or is invalid", "error");
              // fall through to in-app redirect
            }
        }
        history.push("/login");
      } else {
        showSnack("Please use the password reset link from your email.", "warning");
      }
    } catch (error) {
      const message = error?.message || "Failed to update password. Please try again.";
      showSnack(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const { oobCode } = getParams();
  const isVerifying = oobCode && isValidCode === null;

  return (
    <div className={classes.container}>
      <Typography className={classes.title}>Change Password</Typography>
      <Typography className={classes.subtitle}>
        Enter your new password and confirm it below.
      </Typography>
      {codeError && (
        <Typography className={classes.errorText} sx={{ mt: 1, mb: 1 }}>
          {codeError}
        </Typography>
      )}
      {isVerifying && (
        <Typography color="text.secondary" sx={{ mt: 1, mb: 1 }}>
          Verifying reset link...
        </Typography>
      )}
      <form className={classes.form} onSubmit={handleSubmit} noValidate>
        <div className={classes.inputGroup}>
          <label htmlFor="new-password" className={classes.label}>
            New password
          </label>
          <TextField
            id="new-password"
            name="newPassword"
            type={showNewPassword ? "text" : "password"}
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            error={Boolean(errors.newPassword)}
            autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle new password visibility"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    onMouseDown={(e) => e.preventDefault()}
                    size="small"
                    edge="end"
                  >
                    {showNewPassword ? (
                      <VisibilityOutlinedIcon fontSize="small" />
                    ) : (
                      <VisibilityOffOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {errors.newPassword && (
            <p className={classes.errorText}>{errors.newPassword}</p>
          )}
        </div>
        <div className={classes.inputGroup}>
          <label htmlFor="confirm-password" className={classes.label}>
            Confirm new password
          </label>
          <TextField
            id="confirm-password"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            error={Boolean(errors.confirmPassword)}
            autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle confirm password visibility"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    onMouseDown={(e) => e.preventDefault()}
                    size="small"
                    edge="end"
                  >
                    {showConfirmPassword ? (
                      <VisibilityOutlinedIcon fontSize="small" />
                    ) : (
                      <VisibilityOffOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {errors.confirmPassword && (
            <p className={classes.errorText}>{errors.confirmPassword}</p>
          )}
        </div>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          className={classes.submitButton}
          disabled={submitting || (oobCode && !isValidCode)}
          fullWidth
        >
          {submitting ? "Updating…" : isVerifying ? "Verifying…" : "Update password"}
        </Button>
      </form>
      <Typography className={classes.linkToLogin}>
        <a href="/login" onClick={(e) => { e.preventDefault(); history.push("/login"); }}>Back to sign in</a>
      </Typography>
    </div>
  );
};

export default ChangePassword;

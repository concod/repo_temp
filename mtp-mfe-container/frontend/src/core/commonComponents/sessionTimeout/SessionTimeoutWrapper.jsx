import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import useSessionManager from "core/Utils/session/useSessionManager";
import useUserActivity from "core/Utils/session/useUserActivity";
import { Prompt, useTranslation } from "impact-ui-v3";
import { logoutUser } from "core/actions/authActions";

const SessionTimeoutWrapper = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const isAuthenticated = useSelector((state) => state.authReducer.isAuthenticated);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);

  const { isUserActive } = useUserActivity();

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const onShowWarning = useCallback((seconds) => {
    setCountdown(seconds);
    setShowWarning(true);
  }, []);

  const { stayLoggedIn } = useSessionManager({
    isUserActive,
    onShowWarning,
  });

  // Countdown timer
  useEffect(() => {
    if (!showWarning || countdown <= 0) {
      clearCountdown();
      return;
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearCountdown();
          dispatch(logoutUser());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearCountdown();
  }, [showWarning]);

  const handleStaySignedIn = useCallback(() => {
    clearCountdown();
    setShowWarning(false);
    stayLoggedIn();
  }, [stayLoggedIn, clearCountdown]);

  const handleSignOut = useCallback(() => {
    clearCountdown();
    setShowWarning(false);
    dispatch(logoutUser());
  }, [dispatch, clearCountdown]);

  if (!isAuthenticated) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timeDisplay = minutes > 0
    ? t("sessionTimeout.approximatelyMinute", { count: minutes, plural: minutes > 1 ? "s" : "" })
    : t("sessionTimeout.seconds", { count: seconds, plural: seconds !== 1 ? "s" : "" });

  return (
    <Prompt
      isOpen={showWarning}
      title={t("sessionTimeout.title")}
      primaryButtonLabel={t("sessionTimeout.staySignedIn")}
      onPrimaryButtonClick={handleStaySignedIn}
      secondaryButtonLabel={t("sessionTimeout.signOut")}
      onSecondaryButtonClick={handleSignOut}
      variant="warning"
      handleClose={handleStaySignedIn}
    >
      {t("sessionTimeout.message", { timeDisplay })}
    </Prompt>
  );
};

export default SessionTimeoutWrapper;

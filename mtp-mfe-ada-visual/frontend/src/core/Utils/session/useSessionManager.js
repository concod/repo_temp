import { useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { refreshSession } from "core/services/sessionService";
import { SET_SESSION_DATA } from "core/actions/types";
import { logoutUser } from "core/actions/authActions";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

const useSessionManager = ({ isUserActive, onShowWarning }) => {
    const dispatch = useDispatch();
    const expiresAt = useSelector((state) => state.authReducer.expiresAt);
    const isAuthenticated = useSelector((state) => state.authReducer.isAuthenticated);

    const refreshTimerRef = useRef(null);
    const logoutTimerRef = useRef(null);

    const clearTimers = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
    }, []);

    const handleRefresh = useCallback(async () => {
        try {
            const response = await refreshSession();
            const { expires_at } = response.data.data;
            localStorage.setItem("session_expires_at", expires_at);
            dispatch({
                type: SET_SESSION_DATA,
                payload: {
                    expiresAt: expires_at,
                },
            });
        } catch (error) {
            console.error("Session refresh failed:", error);
            dispatch(logoutUser());
        }
    }, [dispatch]);

    const scheduleTimers = useCallback(() => {
        clearTimers();

        if (!expiresAt || !isAuthenticated) return;

        const expiresAtMs = new Date(expiresAt).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiresAtMs - now;
        const timeUntilRefresh = timeUntilExpiry - REFRESH_BUFFER_MS;

        if (timeUntilExpiry <= 0) {
            // Already expired
            dispatch(logoutUser());
            return;
        }

        if (timeUntilRefresh <= 0) {
            // Less than 5 min left, refresh immediately or warn
            if (isUserActive()) {
                handleRefresh();
            } else {
                onShowWarning(Math.floor(timeUntilExpiry / 1000));
            }
            return;
        }

        // Schedule the refresh check
        refreshTimerRef.current = setTimeout(() => {
            if (isUserActive()) {
                handleRefresh();
            } else {
                onShowWarning(Math.floor((expiresAtMs - Date.now()) / 1000));

                // Schedule hard logout at expiry
                const remainingMs = expiresAtMs - Date.now();
                logoutTimerRef.current = setTimeout(() => {
                    dispatch(logoutUser());
                }, remainingMs);
            }
        }, timeUntilRefresh);
    }, [expiresAt, isAuthenticated, isUserActive, onShowWarning]);

    // Re-schedule whenever expiresAt changes
    useEffect(() => {
        scheduleTimers();
        return () => clearTimers();
    }, [expiresAt,isAuthenticated,isUserActive,onShowWarning]);

    // Expose for "Stay Logged In" button in the popup
    const stayLoggedIn = useCallback(() => {
        handleRefresh();
    }, [handleRefresh]);

    return { stayLoggedIn };
};

export default useSessionManager;
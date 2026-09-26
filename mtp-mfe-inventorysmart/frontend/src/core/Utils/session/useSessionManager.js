import { useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { refreshSession } from "core/services/sessionService";
import { SET_SESSION_DATA, SESSION_CHANNEL_NAME } from "core/actions/types";
import { logoutUser } from "core/actions/authActions";

const ACTIVITY_WINDOW_MS = 10 * 60 * 1000; // 10 min before expiry — start tracking
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

const useSessionManager = ({ isUserActive, onShowWarning }) => {
    const dispatch = useDispatch();
    const expiresAt = useSelector((state) => state.authReducer.expiresAt);
    const isAuthenticated = useSelector((state) => state.authReducer.isAuthenticated);

    const refreshTimerRef = useRef(null);
    const logoutTimerRef = useRef(null);
    const activityWindowTimerRef = useRef(null);
    const wasActiveDuringWindowRef = useRef(false);
    const channelRef = useRef(null);

    const clearTimers = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
        if (activityWindowTimerRef.current) {
            clearTimeout(activityWindowTimerRef.current);
            clearInterval(activityWindowTimerRef.current);
            activityWindowTimerRef.current = null;
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
            channelRef.current?.postMessage({ type: "SESSION_REFRESHED", expires_at });
        } catch (error) {
            console.error("Session refresh failed:", error);
            dispatch(logoutUser());
        }
    }, []);

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

        // Schedule activity polling during the 50–55 min window
        const timeUntilActivityWindow = timeUntilExpiry - ACTIVITY_WINDOW_MS;
        wasActiveDuringWindowRef.current = false;

        if (timeUntilActivityWindow > 0) {
            activityWindowTimerRef.current = setTimeout(() => {
                // Poll for activity every 30s until the refresh decision at 55th min
                activityWindowTimerRef.current = setInterval(() => {
                    if (isUserActive()) {
                        wasActiveDuringWindowRef.current = true;
                        clearInterval(activityWindowTimerRef.current);
                        activityWindowTimerRef.current = null;
                    }
                }, 30 * 1000);
            }, timeUntilActivityWindow);
        } else if (timeUntilRefresh > 0) {
            // Already inside the activity window — start polling immediately
            activityWindowTimerRef.current = setInterval(() => {
                if (isUserActive()) {
                    wasActiveDuringWindowRef.current = true;
                    clearInterval(activityWindowTimerRef.current);
                    activityWindowTimerRef.current = null;
                }
            }, 30 * 1000);
        }

        // Schedule the refresh decision at 55th min
        refreshTimerRef.current = setTimeout(() => {
            if (wasActiveDuringWindowRef.current || isUserActive()) {
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

    // Setup BroadcastChannel for cross-tab session sync
    useEffect(() => {
        channelRef.current = new BroadcastChannel(SESSION_CHANNEL_NAME);
        channelRef.current.onmessage = (event) => {
            if (event.data.type === "SESSION_REFRESHED" && event.data.expires_at) {
                localStorage.setItem("session_expires_at", event.data.expires_at);
                dispatch({ type: SET_SESSION_DATA, payload: { expiresAt: event.data.expires_at } });
            }
        };
        return () => {
            channelRef.current?.close();
            channelRef.current = null;
        };
    }, []);

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
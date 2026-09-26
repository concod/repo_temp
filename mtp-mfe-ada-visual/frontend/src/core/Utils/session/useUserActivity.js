import { useEffect, useRef, useCallback } from "react";

const ACTIVITY_EVENTS = ["click", "keydown", "mousemove", "scroll", "touchstart"];
const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const useUserActivity = () => {
  const lastActivityRef = useRef(Date.now());

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  const isUserActive = useCallback(() => {
    return Date.now() - lastActivityRef.current < INACTIVITY_THRESHOLD_MS;
  }, []);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  return { isUserActive, markActivity };
};

export default useUserActivity;

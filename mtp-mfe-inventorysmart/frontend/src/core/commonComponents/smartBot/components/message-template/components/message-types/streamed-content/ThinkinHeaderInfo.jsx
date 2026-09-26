import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';

/**
 * Formats elapsed seconds into "Xm:Ys" display string.
 * e.g. 0 -> "0m:00s", 65 -> "1m:05s", 130 -> "2m:10s"
 */
const formatElapsedTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m:${String(seconds).padStart(2, '0')}s`;
};

const ThinkinHeaderInfo = (props) => {

  const thinkingContext = useSelector((state) => {
    return state.smartBotReducer.thinkingContext;
  });
  const { streamStartTime, isStreamCompleted, finalElapsedSeconds, thinkingHeaderMessage } = thinkingContext;

  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  // Once this instance sees "completed", freeze it permanently so a future
  // chat's streamStartTime doesn't cause it to start ticking again.
  const frozenRef = useRef(false);
  const frozenTextRef = useRef(null);
  const streamStartTimeRef = useRef(null); // Track streamStartTime changes to unfreeze

  useEffect(() => {
    // If already frozen (stream completed), NEVER unfreeze.
    // This prevents a new chat's streamStartTime from restarting this timer.
    if (frozenRef.current) return;

    // Track streamStartTime changes for non-frozen instances
    if (streamStartTimeRef.current !== streamStartTime) {
      streamStartTimeRef.current = streamStartTime;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isStreamCompleted && typeof finalElapsedSeconds === 'number') {
      // Freeze this instance — it will never tick again
      frozenRef.current = true;
      frozenTextRef.current = `Completed in ${formatElapsedTime(finalElapsedSeconds)}`;
      setElapsed(finalElapsedSeconds);
    } else if (streamStartTime && !isStreamCompleted) {
      // Live timer — update every second
      const tick = () => {
        const now = Date.now();
        const diffSeconds = Math.floor((now - streamStartTime) / 1000);
        setElapsed(diffSeconds);
      };
      tick(); // immediate first tick
      intervalRef.current = setInterval(tick, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [streamStartTime, isStreamCompleted, finalElapsedSeconds]);

  // Determine display text
  let displayText = thinkingHeaderMessage || '';
  if (frozenRef.current && frozenTextRef.current) {
    displayText = frozenTextRef.current;
  } else if (streamStartTime && !isStreamCompleted) {
    displayText = `Working for ${formatElapsedTime(elapsed)}`;
  } else if (isStreamCompleted && typeof finalElapsedSeconds === 'number') {
    displayText = `Completed in ${formatElapsedTime(finalElapsedSeconds)}`;
  }

  return (
    <div className="thinkin-header-info">
      {displayText}
    </div>
  );
};

export default ThinkinHeaderInfo;

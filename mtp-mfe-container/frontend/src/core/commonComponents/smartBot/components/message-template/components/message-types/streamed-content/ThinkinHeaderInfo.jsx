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
  const [frozenText, setFrozenText] = useState(/** @type {string | null} */(null));
  const intervalRef = useRef(/** @type {ReturnType<typeof setInterval> | null} */(null));
  // Once this instance sees "completed", freeze it permanently so a future
  // chat's streamStartTime doesn't cause it to start ticking again.
  const frozenRef = useRef(false);
  const frozenTextRef = useRef(/** @type {string | null} */(null));
  // The streamStartTime this instance latched onto. Used to detect when a
  // different stream has taken over (e.g. the user asked a new question while
  // this message's step form was still waiting for input).
  const ownStartTimeRef = useRef(/** @type {number | null} */(null));

  /**
   * Freezes this instance permanently on a final label and elapsed value.
   * @param {string} text
   * @param {number} seconds
   */
  const freeze = (text, seconds) => {
    frozenRef.current = true;
    frozenTextRef.current = text;
    setFrozenText(text);
    setElapsed(seconds);
  };

  useEffect(() => {
    // If already frozen (stream completed), NEVER unfreeze.
    // This prevents a new chat's streamStartTime from restarting this timer.
    if (frozenRef.current) return;

    // Adopt the first non-null streamStartTime we see as this instance's own
    if (ownStartTimeRef.current === null && streamStartTime) {
      ownStartTimeRef.current = streamStartTime;
    }
    const ownStartTime = ownStartTimeRef.current;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isStreamCompleted && typeof finalElapsedSeconds === 'number') {
      // Freeze this instance - it will never tick again
      freeze(`Completed in ${formatElapsedTime(finalElapsedSeconds)}`, finalElapsedSeconds);
    } else if (ownStartTime !== null && streamStartTime !== ownStartTime) {
      // A different stream has started (new question) while this one never
      // completed - typically an abandoned step form. Freeze on this
      // instance's OWN elapsed time instead of following the new stream.
      const ownElapsed = Math.floor((Date.now() - ownStartTime) / 1000);
      freeze(`Completed in ${formatElapsedTime(ownElapsed)}`, ownElapsed);
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
  if (frozenText || (frozenRef.current && frozenTextRef.current)) {
    displayText = frozenText || frozenTextRef.current;
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

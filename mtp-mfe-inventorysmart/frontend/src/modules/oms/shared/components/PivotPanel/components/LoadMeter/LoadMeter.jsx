import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import LoadMeterInfoIcon from "assets/Info.svg";
import "./LoadMeter.scss";

const getLoadCategory = ({ volume }) => {
  if (volume <= 100) {
    return "Low";
  }
  if (volume <= 200) {
    return "Medium";
  }
  return "High";
};

export default function LoadMeter({ isDisabled, volume }) {
  const currentConfig = useMemo(() => {
    const safeVolume = Number.isFinite(volume) ? volume : 0;
    return {
      volume: safeVolume,
      category: getLoadCategory({ volume: safeVolume })
    };
  }, [volume]);

  const pendingConfigRef = useRef(currentConfig);
  pendingConfigRef.current = currentConfig;

  const [displayConfig, setDisplayConfig] = useState(currentConfig);

  useEffect(() => {
    if (isDisabled) {
      return;
    }
    setDisplayConfig(currentConfig);
  }, [isDisabled, currentConfig]);

  useEffect(() => {
    if (isDisabled) {
      return;
    }
    setDisplayConfig(pendingConfigRef.current);
  }, [isDisabled]);

  const categoryLower = displayConfig.category.toLowerCase();

  return (
    <div className="loadMeter">
      {isDisabled ? (
        <>
          <div className="loadMeter__header">
            <div className="loadMeter__title" data-disabled="true">
              <span>Load meter</span>
              <LoadMeterInfoIcon className="loadMeter__infoIcon" />
            </div>
          </div>
          <div className="loadMeter__disabledText" data-disabled="true">
            Create a valid pivot table to enable load meter
          </div>
        </>
      ) : (
        <>
          <div className="loadMeter__header">
            <div className="loadMeter__title" data-disabled="false">
              <span>Load meter</span>
              <LoadMeterInfoIcon className="loadMeter__infoIcon" />
            </div>

            <div className="loadMeter__category">
              <span
                className={`loadMeter__categoryDot loadMeter__categoryDot--${categoryLower}`}
              />
              <span
                className={`loadMeter__categoryText loadMeter__categoryText--${categoryLower}`}
              >
                {displayConfig.category}
              </span>
            </div>

            {/* <div className="loadMeter__volume">
              <div className="loadMeter__volumeValue">{displayConfig.volume}</div>
              <div className="loadMeter__volumeLabel">Volume</div>
            </div> */}
          </div>

          <div className="loadMeter__bar">
            <div className="loadMeter__barTrack" />
            <div
              className={`loadMeter__barFill loadMeter__barFill--${categoryLower}`}
              data-category={categoryLower}
            />
          </div>
        </>
      )}
    </div>
  );
}

LoadMeter.propTypes = {
  isDisabled: PropTypes.bool.isRequired,
  volume: PropTypes.number
};

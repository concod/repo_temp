import React from "react";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const RangeSlider = (props) => {
  const classes = useStyles();

  const handleChange = (e) => {
    props.onRangeSliderChange(e.target.value, props.cellData);
  };
  return (
    <div className={classes.sliderContainer}>
      <input
        type="range"
        min="1"
        max="100"
        value={props?.value}
        onChange={handleChange}
      />
    </div>
  );
};

export default RangeSlider;

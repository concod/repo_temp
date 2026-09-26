import PropTypes from "prop-types";
import withStyles from "@mui/styles/withStyles";
import { Slider, Tooltip } from "@mui/material";

const StyleTooltip = withStyles((theme) => ({
  tooltip: {
    ...theme.typography.body2,
    backgroundColor: `${theme.palette.common.black}B2`,
  },
  arrow: {
    color: `${theme.palette.common.black}B2`,
  },
}))(Tooltip);

function ValueLabelComponent(props) {
  const { children, open, value } = props;

  return (
    <StyleTooltip
      open={open}
      enterTouchDelay={0}
      placement="top"
      title={value}
      arrow={true}
    >
      {children}
    </StyleTooltip>
  );
}

ValueLabelComponent.propTypes = {
  children: PropTypes.element.isRequired,
  open: PropTypes.bool.isRequired,
  value: PropTypes.number.isRequired,
};

const ThemedSlider = withStyles((theme) => ({
  root: {
    color: theme.palette.primary.main,

    "&.Mui-disabled": {
      color: theme.palette.colours.silderDisabledRail,

      "& .MuiSlider-track": {
        background: theme.palette.action.disabledBackground,
      },

      "& .MuiSlider-rail": {
        background: theme.palette.colours.silderDisabledRail,
      },
    },
  },
  thumb: {
    border: `1px solid ${theme.palette.primary.dark}`,
    height: "1rem",
    marginTop: 0,
    marginLeft: 0,
    top: "50%",
    transform: "translate(-50%, -50%)",
    transformOrigin: "top",
    width: "1rem",

    "&::before": {
      backgroundColor: theme.palette.common.white,
      borderRadius: "50%",
      content: "' '",
      height: ".5rem",
      position: "absolute",
      width: ".5rem",
    },

    "&.Mui-disabled": {
      height: "1rem",
      marginTop: 0,
      marginLeft: 0,
      width: "1rem",
      borderColor: theme.palette.action.disabledBackground,
      background: theme.palette.action.disabled,

      "&::before": {
        display: "none",
      },
    },
  },
  rail: {
    height: 4,
    borderRadius: 2,
    background: theme.palette.colours.sliderRail,
    opacity: 1,
  },
  track: {
    height: 4,
    borderRadius: 2,
    background: theme.palette.primary.main,
  },
  valueLabel: {
    fontSize: "0.8125rem",
    lineHeight: 1.25,
    letterSpacing: 0,
  },
}))(Slider);

const StyledSlider = (props) => {
  return (
    <ThemedSlider components={{ ValueLabel: ValueLabelComponent }} {...props} />
  );
};

export default StyledSlider;

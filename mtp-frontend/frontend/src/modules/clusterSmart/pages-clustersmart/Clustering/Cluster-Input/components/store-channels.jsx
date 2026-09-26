import React from "react";
import { StyledRadio, StyledCheckbox } from "core/Utils/selection/selection";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles({
  radioGrp: {
    marginLeft: "5rem",
  },
});
const StoreChannels = (props) => {
  const classes = useStyles();
  const handleChange = (event) => {
    props.onChange(event.target.value);
  };

  const renderCheckboxChannel = () => {
    return (
      <div>
        {props.storeChannels.map((channel) => {
          let isDefaultChecked = props.selectedChannel?.includes(channel?.value);
          return (
            <FormControlLabel
              disabled={channel.isDisabled}
              value={channel.value}
              control={
                <StyledCheckbox
                  color="primary"
                  checked={isDefaultChecked}
                  onChange={handleChange}
                />
              }
              label={channel.label}
            />
          );
        })}
      </div>
    );
  };

  const renderRadioChannel = () => {
    return (
      <RadioGroup
        row
        className={classes.radioGrp}
        aria-label="store-channel-radio-group"
        name="store-channel-radio-buttons-group"
      >
        {props.storeChannels.map((channel) => {
          let isDefaultChecked = props.selectedChannel?.includes(channel.value);
          return (
            <FormControlLabel
              disabled={channel.isDisabled}
              value={channel.value}
              control={
                <StyledRadio
                  color="primary"
                  checked={isDefaultChecked}
                  onChange={handleChange}
                />
              }
              label={channel.label}
            />
          );
        })}
      </RadioGroup>
    );
  };

  return (
    <FormControl id="assortClusterChannelRadioGrp" component="fieldset">
      {props.storeChannelType === "multiple"
        ? renderCheckboxChannel()
        : renderRadioChannel()}
    </FormControl>
  );
};

export default StoreChannels;

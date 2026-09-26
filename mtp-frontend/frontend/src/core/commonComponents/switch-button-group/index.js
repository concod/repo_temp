import React from "react";
import { Button, ButtonGroup } from "@mui/material";
import colours from "core/Styles/colours";
import { makeStyles } from "@mui/styles";

const SwitchBtnGroup = ({ selected, setSelected, data }) => {
  const classes = useStyles();

  return (
    <ButtonGroup
      className={classes.buttonGroup}
      variant="text"
      aria-label="outlined primary button group"
      fullWidth
      size="small"
      disableElevation
    >
      {data?.map((el) => {
        return (
          <Button
            disabled={el.disabled}
            sx={{
              color: "black",
              backgroundColor:
                selected?.value === el?.value
                  ? colours.lightGray
                  : colours.aircraftWhite,
            }}
            onClick={() => setSelected(el)}
          >
            {el?.label}
          </Button>
        );
      })}
    </ButtonGroup>
  );
};

export default SwitchBtnGroup;

const styles = () => ({
  buttonGroup: {
    backgroundColor: "#e9eff7",
  },
});

const useStyles = makeStyles(styles);

import React from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { ButtonGroup } from "impact-ui-v3";
import { useSelector } from "react-redux";

const DemandManageToggle = (props) => {
  const { onChange, value } = props;

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const classes = useStyles();

  const handleChange = (event, newValue) => {
    // console.log("🚀 ~ handleChange ~ newValue:", newValue);
    if (newValue !== null) {
      onChange && onChange(newValue);
    }
  };

  const isDisabled = !!adaReducer?.loaderComponentCount;
  // console.log("🚀 ~ DemandManageToggle ~ isDisabled:", isDisabled);

  const handleWrappedChange = (event, newValue) => {
    if (isDisabled) {
      return; // Don't process changes when disabled
    }
    handleChange(event, newValue);
  };

  let searchParams = new URLSearchParams(window.location.search);

  let typeFromUrl = searchParams.get("type");
  const isInventoryRedirection = typeFromUrl === "adaPayloadFromInventory";

  if (
    !adaReducer?.isFiltersValid
    // ||
    // props?.location?.isInventoryRedirection ||
    // isInventoryRedirection
  ) {
    return null;
  }

  return (
    <div
      className={
        value === "manage_forecast" ? classes.rootNoMargin : classes.root
      }
    >
      <div className={isDisabled ? classes.disabledWrapper : ""}>
        <ButtonGroup
          onChange={handleWrappedChange}
          options={[
            {
              value: "demand_selection",
              label: "Demand selection",
            },
            {
              value: "manage_forecast",
              label: "Manage forecast",
            },
          ]}
          selectedOption={value}
          className={isDisabled ? classes.disabled : ""}
        />
      </div>
    </div>
  );
};

export default DemandManageToggle;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "25px 0",
  },
  rootNoMargin: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "10px 0",
  },
  disabledWrapper: {
    position: "relative",
    pointerEvents: "none",
    opacity: 0.6,
    cursor: "not-allowed",
  },
  disabled: {
    opacity: 0.6,
  },
  group: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: 20,
    padding: 2,
    border: `1px solid ${theme.palette.textColours?.tiara || "#E3E8EF"}`,
    boxShadow: "0 1px 2px rgba(16, 24, 40, 0.04)",
    height: 36,
  },
  toggle: {
    textTransform: "none",
    lineHeight: 1,
    padding: "6px 14px",
    border: "none !important",
    color: theme.palette.textColours?.slateGray || "#667085",
    fontWeight: 500,
    "&.Mui-selected": {
      backgroundColor: theme.palette.common.white,
      color: theme.palette.primary.main,
      boxShadow: "inset 0 0 0 1px currentColor",
    },
    "&:not(.Mui-selected)": {
      backgroundColor: theme.palette.common.white,
    },
  },
}));

import React from "react";
import MUIMenu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import "./Menu.styles.scss";

export const Menu = ({
  open,
  anchorEl,
  selected,
  onClose,
  options,
  iconPlacement = "left",
  ...args
}) => {
  return (
    <MUIMenu
      id="basic-menu"
      className="ia-styles ia-menu"
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      MenuListProps={{
        "aria-labelledby": "basic-button",
      }}
      {...args}
    >
      {options.map((opt) => {
        return iconPlacement === "left" ? (
          <MenuItem
            onClick={opt.onClick}
            key={opt.label}
            disableRipple
            disableTouchRipple
            disabled={opt.disabled}
            selected={selected === opt.value}
          >
            {opt.icon}
            {opt.label}
          </MenuItem>
        ) : (
          <MenuItem
            onClick={opt.onClick}
            key={opt.label}
            disableRipple
            disableTouchRipple
            disabled={opt.disabled}
            selected={selected === opt.value}
          >
            {opt.label}
            {opt.icon}
          </MenuItem>
        );
      })}
    </MUIMenu>
  );
};

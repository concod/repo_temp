import React, { useState } from "react";
import {
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography
} from "@mui/material";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import CheckIcon from "@mui/icons-material/Check";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  columnMenu: {
    minWidth: "230px !important"
  },
  menuItemStyle: {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 15px 8px 15px"
  }
}));

const TableViewColumnMenu = (props) => {
  const { columnAttributes, onColumnMenuAction } = props;
  const [anchorEl, setAnchorEl] = useState(null);
  const [nestedAnchorEl, setNestedAnchorEl] = useState(null);
  const classes = useStyles();

  const handleMenuClick = (event) => {
    event?.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event) => {
    event?.stopPropagation();
    setAnchorEl(null);
  };

  const handleNestedMenuClick = (event) => {
    event?.stopPropagation();
    setNestedAnchorEl(event.currentTarget);
  };

  const handleNestedMenuClose = (event) => {
    event?.stopPropagation();
    setNestedAnchorEl(null);
  };

  const handleMenuOptionClick = (action, event) => {
    event?.stopPropagation();
    handleMenuClose();
    onColumnMenuAction(action, columnAttributes);
  };

  const handleNestedOptionClick = (action) => {
    handleMenuClose();
    handleNestedMenuClose();
    onColumnMenuAction(action, columnAttributes);
  };

  return (
    <div>
      <IconButton
        aria-label="more"
        aria-controls="custom-menu"
        aria-haspopup="true"
        onClick={handleMenuClick}
        fontSize="small"
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        id="custom-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        slotProps={{
          paper: { style: { minWidth: "230px" } }
        }}
      >
        <MenuItem style={{ textAlign: "center" }}>
          <Typography variant="h6">Column Settings</Typography>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={(event) => handleMenuOptionClick("is_frozen", event)}
          className={classes.menuItemStyle}
        >
          <Typography variant="body1">
            {columnAttributes?.is_frozen ? "Unfreeze Column" : "Freeze Column"}
          </Typography>
        </MenuItem>
        <MenuItem
          onClick={(event) => handleMenuOptionClick("auto_all_columns", event)}
          className={classes.menuItemStyle}
        >
          <Typography variant="body1">Autosize All Columns</Typography>
        </MenuItem>
        <MenuItem
          onClick={handleNestedMenuClick}
          className={classes.menuItemStyle}
        >
          <Typography variant="body1">Column Width</Typography>

          <KeyboardArrowRightIcon fontSize="small" />
        </MenuItem>
      </Menu>
      <Menu
        id="nested-menu"
        anchorEl={nestedAnchorEl}
        keepMounted
        open={Boolean(nestedAnchorEl)}
        onClose={handleNestedMenuClose}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left"
        }}
      >
        <MenuItem
          style={{
            display: "flex",
            padding: "8px 15px 8px 15px"
          }}
          onClick={() => handleNestedOptionClick("auto_column")}
        >
          <ListItemIcon>
            {!columnAttributes?.extra?.width ? (
              <CheckIcon fontSize="small" />
            ) : null}
          </ListItemIcon>
          <Typography variant="body1">Auto Adjust</Typography>
        </MenuItem>
        <MenuItem
          style={{
            display: "flex",
            padding: "8px 15px 8px 15px"
          }}
          onClick={() => handleNestedOptionClick("custom_column")}
        >
          <ListItemIcon>
            {columnAttributes?.extra?.width ? (
              <CheckIcon fontSize="small" />
            ) : null}
          </ListItemIcon>
          <Typography variant="body1">Custom Width</Typography>
        </MenuItem>
      </Menu>
    </div>
  );
};

export default TableViewColumnMenu;

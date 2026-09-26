import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "core/Utils/functions/utils";
import { Typography, Button, OutlinedInput } from "@mui/material";
import PropTypes from "prop-types";
import ToggleLogo from "assets/Vector.svg?url";
import { useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import colours from "core/Styles/colours";
import { NavLink } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  breadcrumb: {
    marginTop: pxToRem(16),
  },
  breadcrumbColor: {
    color: theme.palette.primary.main,
    textDecoration: "none",
  },
  keyBoardShortcut: {
    height: pxToRem(37),
    margin: `${pxToRem(16)} ${pxToRem(10)} ${pxToRem(16)} ${pxToRem(0)}`,
  },
  svgIcon: {
    width: pxToRem(15),
    height: pxToRem(8.33),
  },

  keyboardShortcutCollapsible: {
    width: pxToRem(36),
    height: pxToRem(37),
    borderRadius: pxToRem(4),
    border: `${pxToRem(1)} solid #0055AF`,
    cursor: "pointer",
  },
  toogleButton: {
    width: pxToRem(94),
    height: pxToRem(37),
    border: "1px solid gray",
  },
  windowButton: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  macButton: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeftWidth: 0,
  },
  buttonContainer: {
    marginRight: pxToRem(16),
  },
  inActive: {
    color: theme.palette.text.secondary,
  },
  searchBar: {
    width: pxToRem(348),
    height: pxToRem(37),
    padding: `${pxToRem(8)} ${pxToRem(16)}`,
    borderRadius: pxToRem(4),
    border: pxToRem(1),
    marginRight: pxToRem(16),
    "&.Mui-focused": {
      borderColor: colours.endavour,
    },
  },
  separator: {
    minHeight: pxToRem(20),
    border: "0.5px solid",
    borderColor: colours.gallery,
    marginRight: pxToRem(16),
  },
}));

const KeyboardShortcutHeading = ({
  toggleComponent,
  showToggleButton,
  toggleButtonState,
  handleTableSearch,
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [isWindow, setIsWindow] = useState(true);

  const onWindowButtonClick = () => {
    setIsWindow(true);
    toggleButtonState(true);
  };

  const onMacButtonClick = () => {
    setIsWindow(false);
    toggleButtonState(false);
  };
  const handleChange = (e) => {
    handleTableSearch(e.target.value);
  };
  return (
    <>
      <div className={`${classes.breadcrumb}`}>
        <Typography variant="breadcrumb" component="div">
          <NavLink to="/home" className={`${classes.breadcrumbColor}`}>
            Home
          </NavLink>
          <span> / Keyboard Shortcuts</span>
        </Typography>
      </div>
      <div
        className={`${globalClasses.flexAlignBetweenCenter} ${classes.keyBoardShortcut}`}
      >
        <Typography variant="h3" component="div" sx={{ fontSize: pxToRem(18) }}>
          Keyboard Shortcuts
        </Typography>
        <div className={`${globalClasses.flexAlignBetweenCenter}`}>
          <OutlinedInput
            type={"text"}
            className={classes.searchBar}
            placeholder={"Search..."}
            endAdornment={<SearchIcon />}
            onChange={handleChange}
          />
          <div className={classes.separator}></div>
          {showToggleButton && (
            <div className={classes.buttonContainer}>
              <Button
                className={`${classes.toogleButton} ${classes.windowButton} ${
                  !isWindow && classes.inActive
                }`}
                onClick={onWindowButtonClick}
                variant={isWindow && "contained"}
                disableRipple
                disableFocusRipple
              >
                Windows
              </Button>
              <Button
                className={`${classes.toogleButton} ${classes.macButton} ${
                  isWindow && classes.inActive
                }`}
                onClick={onMacButtonClick}
                variant={!isWindow && "contained"}
                disableFocusRipple
                disableRipple
              >
                Mac
              </Button>
            </div>
          )}
          <div
            className={`${globalClasses.centerAlign} ${classes.keyboardShortcutCollapsible}`}
            onClick={toggleComponent}
          >
            <img
              src={ToggleLogo}
              alt="ToggleLogo"
              className={classes.svgIcon}
            />
          </div>
        </div>
      </div>
    </>
  );
};

KeyboardShortcutHeading.propTypes = {
  toggleComponent: PropTypes.func.isRequired,
};

export default KeyboardShortcutHeading;

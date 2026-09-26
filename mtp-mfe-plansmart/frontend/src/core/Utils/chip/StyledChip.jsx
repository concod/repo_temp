import React from "react";
import makeStyles from "@mui/styles/makeStyles";
import PropTypes from "prop-types";
import { Chip } from "@mui/material";

const pxToRem = (pxValue) => {
  try {
    return pxValue / 16 + "rem";
  } catch (error) {
    console.error("pxToRem error:", error);
  }
};

const useStyles = makeStyles((theme) => ({
  root: (props) => {
    let rules = {
      borderRadius: 4,
      ...theme.typography.text,
      padding: `${pxToRem(5)} ${pxToRem(8)} ${pxToRem(4)}`,
      font: `normal normal normal ${pxToRem(12)}/${pxToRem(18)} Poppins`,
      "& .MuiChip-label": {
        paddingLeft: 0,
        paddingRight: 0,
      },
    };
    let iconColorOnHover = {
      "& .MuiChip-icon": {
        color: theme.palette.common.white,
      },
    };
    switch (props.color) {
      case "success":
        rules = {
          ...rules,
          background: theme.palette.success.light,
          color: theme.palette.success.main,
          border: `${pxToRem(1)} solid ${theme.palette.success.main}`,
          "& .MuiChip-icon": {
            color: theme.palette.success.main,
          },

          "&.MuiChip-clickable": {
            "&:hover, &:focus": {
              background: theme.palette.success.main,
              color: theme.palette.common.white,
              ...iconColorOnHover,
            },
          },
        };
        break;
      case "error":
        rules = {
          ...rules,
          background: theme.palette.error.light,
          color: theme.palette.error.main,
          border: `${pxToRem(1)} solid ${theme.palette.error.main}`,
          "& .MuiChip-icon": {
            color: theme.palette.error.main,
          },

          "&.MuiChip-clickable": {
            "&:hover, &:focus": {
              background: theme.palette.error.main,
              color: theme.palette.common.white,
              ...iconColorOnHover,
            },
          },
        };
        break;
      case "warning":
        rules = {
          ...rules,
          background: theme.palette.warning.light,
          color: theme.palette.warning.main,
          border: `${pxToRem(1)} solid ${theme.palette.warning.main}`,
          "& .MuiChip-icon": {
            color: theme.palette.warning.main,
          },

          "&.MuiChip-clickable": {
            "&:hover, &:focus": {
              background: theme.palette.warning.main,
              color: theme.palette.common.white,
              ...iconColorOnHover,
            },
          },
        };
        break;
      case "info":
        rules = {
          ...rules,
          background: theme.palette.primary.lightest,
          color: theme.palette.primary.light,
          border: `${pxToRem(1)} solid ${theme.palette.primary.light}`,
          "& .MuiChip-icon": {
            color: theme.palette.primary.light,
          },

          "&.MuiChip-clickable": {
            "&:hover, &:focus": {
              background: theme.palette.primary.lightest,
              color: theme.palette.primary.light,
              ...iconColorOnHover,
            },
          },
        };
        break;
      case "warning-light":
        rules = {
          ...rules,
          background: theme.palette.warning.lightest,
          color: theme.palette.warning.lighter,
          border: `${pxToRem(1)} solid ${theme.palette.warning.lighter}`,
          "& .MuiChip-icon": {
            color: theme.palette.warning.lighter,
          },

          "&.MuiChip-clickable": {
            "&:hover, &:focus": {
              background: theme.palette.warning.lightest,
              color: theme.palette.warning.lighter,
              ...iconColorOnHover,
            },
          },
        };
        break;
      case "warning-gold":
        rules = {
          ...rules,
          background: theme.palette.warning.lightest,
          color: theme.palette.warning.gold,
          border: `${pxToRem(1)} solid ${theme.palette.warning.lighter}`,
          "& .MuiChip-icon": {
            color: theme.palette.warning.lighter,
          },

          "&.MuiChip-clickable": {
            "&:hover, &:focus": {
              background: theme.palette.warning.lightest,
              color: theme.palette.warning.lighter,
              ...iconColorOnHover,
            },
          },
        };
        break;
      case "tertiary":
        rules = {
          ...rules,
          background: theme.palette.tertiary.light,
          color: theme.palette.tertiary.main,
          border: `${pxToRem(1)} solid ${theme.palette.tertiary.main}`,
          "& .MuiChip-icon": {
            color: theme.palette.tertiary.main,
          },

          "&.MuiChip-clickable": {
            "&:hover, &:focus": {
              background: theme.palette.tertiary.light,
              color: theme.palette.tertiary.main,
              ...iconColorOnHover,
            },
          },
        };
        break;
      case "primary":
        rules = {
          ...rules,
          background: theme.palette.primary.lighter,
          color: theme.palette.primary.main,
          border: `${pxToRem(1)} solid ${theme.palette.primary.main}`,
          "& .MuiChip-icon": {
            color: theme.palette.primary.main,
          },

          "&.MuiChip-clickable": {
            "&:hover, &:focus": {
              background: theme.palette.primary.lighter,
              color: theme.palette.primary.main,
              ...iconColorOnHover,
            },
          },
        };
        break;
      case "secondary":
        rules = {
          ...rules,
          background: theme.palette.colours.secondary,
          color: theme.palette.common.white,
          border: `${pxToRem(1)} solid ${theme.palette.colours.secondary}`,
          "& .MuiChip-icon": {
            color: theme.palette.common.white,
          },

          "&.MuiChip-clickable": {
            "&:hover, &:focus": {
              background: theme.palette.colours.secondary,
              color: theme.palette.common.white,
              ...iconColorOnHover,
            },
          },
        };
        break;
      default:
        rules = {
          ...rules,
          background: theme.palette.primary.lighter,
          color: theme.palette.primary.dark,
          "& .MuiChip-icon": {
            color: theme.palette.primary.dark,
          },

          "&.MuiChip-clickable": {
            "&:hover, &:focus": {
              background: theme.palette.primary.dark,
              color: theme.palette.common.white,
              ...iconColorOnHover,
            },
          },
        };
    }

    if (props.isiconvariant) {
      rules["& .MuiChip-icon"] = {
        ...rules["& .MuiChip-icon"],
        width: theme.typography.pxToRem(13),
        height: theme.typography.pxToRem(13),
      };
    }

    if (props.textonly) {
      rules.background = "transparent";
      if (props.color === "secondary") {
        rules.color = theme.palette.colours.secondary;
        rules["& .MuiChip-icon"] = {
          ...rules["& .MuiChip-icon"],
          color: theme.palette.colours.secondary,
        };
      }
    }
    return rules;
  },
}));

const StyledChip = ({ isiconvariant, textonly, ...props }) => {
  const { color = "primary" } = { ...props };
  const classes = useStyles({ color, isiconvariant, textonly });
  const chipProps = { ...props };
  /**
   * The reason we delete the color is because
   * MUI Chip doesn't take any color except
   * 'default' | 'primary' | 'secondary' |
   * 'error' | 'info' | 'success' | 'warning',
   * and if we add any other variation it throws
   * error, so we just delete the color i.e we don't
   * pass the color prop to the Chip as the
   * styling part is anyways handled by us
   */
  delete chipProps.color;
  return <Chip label="Basic" className={classes.root} {...chipProps} />;
};

StyledChip.propTypes = {
  isiconvariant: PropTypes.bool,
  textonly: PropTypes.bool,
};

StyledChip.defaultProps = {
  isiconvariant: false,
  textonly: false,
};

export default StyledChip;

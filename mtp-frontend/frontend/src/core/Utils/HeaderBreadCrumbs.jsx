import React from "react";
import withStyles from "@mui/styles/withStyles";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Container from "@mui/material/Container";
import Chip from "@mui/material/Chip";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";

const useStyles = makeStyles((theme) => ({
  breadcrumbContainer: {
    background: theme.palette.background.default,
    marginBottom: theme.spacing(2),
    position: "sticky",
    top: theme.customVariables.headerHeight,
    zIndex: 9,
    boxShadow: "0px 0px 3px #00000029",
    "& .MuiBreadcrumbs-ol": {
      columnGap: "0.5rem"
    },
  },
}));

const StyledBreadcrumb = withStyles((theme) => ({
  root: {
    backgroundColor: "transparent",
    color: theme.palette.text.secondary,
    fontWeight: theme.typography.fontWeightRegular,
    padding: 0,
  },
  label: {
    padding: "0",
    ...theme.typography.breadcrumb,
  },
  clickable: {
    color: theme.palette.primary.main,
    cursor: "pointer",

    "&:hover, &:focus, &:active": {
      backgroundColor: "transparent",
      boxShadow: "none",
      color: theme.palette.primary.main,
    },
  },
}))(Chip);

function handleClick(event, action) {
  event.preventDefault();
  action();
}

export default function HeaderBreadCrumbs({ options }) {
  const classNames = useStyles();
  const globalClasses = globalStyles();
  return (
    <Container maxWidth={false} className={`${classNames.breadcrumbContainer} ${globalClasses.paddingHorizontal}`}>
      <Breadcrumbs aria-label="breadcrumb">
        {options.map((option, i) => {
          let clickable = options.length - 1 !== i;
          return (
            <StyledBreadcrumb
              key={i}
              id={option.id}
              label={option.label}
              icon={option.icon}
              onClick={(event) => {
                if (clickable) {
                  handleClick(event, option.action);
                }
              }}
              disableRipple={true}
              clickable={clickable}
            />
          );
        })}
      </Breadcrumbs>
    </Container>
  );
}

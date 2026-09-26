import React from "react";
import { Accordion } from "impact-ui";
import globalStyles from "core/Styles/globalStyles";
import { makeStyles } from "@mui/styles";
const CustomAccordion = ({
  children,
  label,
  customheader: Customheader,
  defaultExpanded = true,
  isMandatory,
  onChange,
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const Label = isMandatory ? (
    <span>
      {label}
      <span className={classes.mandatoryStyle}>*</span>
    </span>
  ) : (
    label
  );
  return (
    <div className={globalClasses.accordianWrapper}>
      <Accordion
        defaultExpanded={defaultExpanded}
        label={Label}
        onChange={(e, expanded) => {
          if (onChange) {
            onChange(e, expanded);
          }
        }}
      >
        <div className={classes.customheader}>{Customheader}</div>

        {children}
      </Accordion>
    </div>
  );
};
const styles = (theme) => ({
  mandatoryStyle: {
    position: "absolute",
    color: theme.palette.error.main,
  },
  customheader: {
    position: "relative",
    float: "right",
  },
});
const useStyles = makeStyles(styles);
export default CustomAccordion;

import React from "react";
import { makeStyles } from "@mui/styles";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import classNames from "classnames";
import globalStyles from "core/Styles/globalStyles";

const CustomAccordion = ({
  children,
  label,
  customClass,
  customheader: Customheader,
  defaultExpanded = true,
  isMandatory,
  onChange,
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      className={classNames(classes.accordionSummaryRoot, customClass)}
      onChange={(e, expanded) => {
        if (onChange) {
          onChange(e, expanded);
        }
      }}
    >
      <div
        className={classNames(
          globalClasses.flexRow,
          globalClasses.layoutAlignBetweenCenter
        )}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          className={classes.filtersHeader}
          aria-controls="panel1a-content"
          id="panel1a-header"
        >
          <div className={classes.filtersHeaderTitleContainer}>
            <p className={classes.filtersHeaderTitle}>{label}</p>
            {isMandatory && <span className={classes.mandatoryStyle}>*</span>}
          </div>
        </AccordionSummary>
        {Customheader}
      </div>
      <AccordionDetails classes={{ root: classes.accordionDetails }}>
        {children}
      </AccordionDetails>
    </Accordion>
  );
};

export default CustomAccordion;

const styles = (theme) => ({
  accordionSummaryRoot: {
    minHeight: theme.typography.pxToRem(10),
    borderRadius: `${theme.typography.pxToRem(3)} `,
    boxShadow: theme.shadows[0],
    border: `${theme.typography.pxToRem(1)} solid ${
      theme.palette.colours.accordionBorder
    }`,
  },
  accordionSummaryContent: {
    margin: "12px 0 !important",
  },
  accordionDetails: {
    border: "none",
    paddingLeft: "2.5rem",
    paddingTop: 0,
  },
  filtersHeader: {
    border: "none",
  },
  filtersHeaderTitleContainer: {
    marginLeft: theme.typography.pxToRem(10),
    padding: theme.typography.pxToRem(10),
  },
  filtersHeaderTitle: {
    ...theme.typography.h4,
    fontSize: "1rem",
    lineHeight: "1.5rem",
    margin: "0",
    fontWeight: 400,
    display: "inline-flex",
  },
  accordionBorderLeft: {
    borderLeft: `${theme.typography.pxToRem(3)} solid ${
      theme.palette.primary.main
    }`,
  },
  mandatoryStyle: {
    position: "absolute",
    color: theme.palette.error.main,
  },
});

const useStyles = makeStyles(styles);

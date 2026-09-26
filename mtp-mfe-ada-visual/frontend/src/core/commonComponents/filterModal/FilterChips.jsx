import makeStyles from "@mui/styles/makeStyles";
import { Typography } from "@mui/material";
import { Tag } from "impact-ui-v3";
import { useRef, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import SavedFilterDropdownDemo from "../coreComponentScreen/NewCoreComponentScreen/SavedFilterDropdown/SavedFilterDropdownDemo";

const useStyles = makeStyles((theme) => ({
  paddingLeft: {
    paddingLeft: "0.5rem",
  },
  separater: {
    width: "1px",
    height: "16px",
    background: theme.palette.background.separaterColor,
  },
  tagSeparater: {
    gap: "0.75rem",
  },
  gap4: {
    gap: "0.25rem",
  },
  filterPopOver: {
    margin: "0.2rem",
  },
  requiredSection: {
    color: theme.palette.error.main,
  },
  tagContainer: {
    background: `${theme.palette.background.tagBackground} !important`,
    "& .tag-text": {
      color: theme.palette.text.secondary,
      fontSize: theme.typography.pxToRem(10),
      lineHeight: theme.typography.pxToRem(18),
      fontWeight: 600,
    },
  },
  filterName: {
    textTransform: "capitalize",
    display: "inline-block",
    fontSize: "0.75rem",
    lineHeight: theme.typography.pxToRem(15),
    fontWeight: 500,
    color: theme.palette.text.grey,
  },
  menuPopover: {
    "& .MuiPopover-paper": {
      width: "400px",
      maxHeight: "300px",
      overflowX: "auto",
      padding: "10px",
      borderRadius: "4px",
      boxShadow: "rgba(0, 0, 0, 0.25) 0px 0px 6px",
    },
    "& .MuiPaper-root": {
      position: "absolute",
      top: "32px",
    },
  },
}));

const FilterChips = (props) => {
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  const classes = useStyles();
  const globalClasses = globalStyles();
  const chipRef = useRef(null);

  const {
    section,
    filterSection,
    label,
    filtersSummary,

    setOpenModal,
  } = props;

  return (
    <div className={`${globalClasses.centerAlign}`}>
      <div className={`${globalClasses.centerAlign} ${classes.tagSeparater}`}>
        <span className={classes.separater} />
        <div className={`${globalClasses.centerAlign} ${classes.gap4}`}>
          <Typography component="span" className={classes.filterName}>
            {filterSection.filterName}
            <span className={classes.requiredSection}>*</span>
          </Typography>
          <Tag className={classes.tagContainer} label={label} />
          {section?.length > 1 ? (
            <Tag
              ref={chipRef}
              label={`+${section?.length - 1}`}
              onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
            />
          ) : null}
          {isFilterPopoverOpen && (
            <SavedFilterDropdownDemo
              chipRef={chipRef}
              list={filterSection.values}
              setOpenModal={setOpenModal}
              setIsFilterPopoverOpen={setIsFilterPopoverOpen}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterChips;

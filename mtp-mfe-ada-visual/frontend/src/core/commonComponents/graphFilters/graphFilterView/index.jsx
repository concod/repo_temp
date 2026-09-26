import { useState, useRef, useEffect } from "react";
import { useStyles } from "./graphFilterViewStyles";
import { Popover, Typography } from "@mui/material";
import FilterRow from "./FilterRow";
import globalStyles from "core/Styles/globalStyles";
import clsx from "clsx";

const GraphFilterView = (props) => {
  const globalClasses = globalStyles();
  const { selectedGraphFilters, onViewAllFilterAction } = props;
  const classes = useStyles();
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [activeFilterLength, setActiveFilterLength] = useState(0);
  const showMoreChipRef = useRef(null);

  // Checking the length of selected filters
  const activeFiltersLengthHandler = () => {
    selectedGraphFilters?.length > 5
      ? setActiveFilterLength(5)
      : setActiveFilterLength(selectedGraphFilters?.length);
  };
  const handleViewAllFilters = () => {
    if (onViewAllFilterAction && typeof onViewAllFilterAction === "function") {
      onViewAllFilterAction();
      setShowFilterPopover(false);
    }
  };
  useEffect(() => {
    activeFiltersLengthHandler();
  }, [selectedGraphFilters]);
  return (
    <>
      {!!(selectedGraphFilters.length > 0) && (
        <div
          className={clsx(
            classes.snackbarLayoutWrapper,
            globalClasses.flexRow,
            globalClasses.verticalAlignCenter
          )}
        >
          <Typography className={classes.label}>Filters : </Typography>
          <div>
            <div
              className={clsx(
                classes.selectedFilterWrapper,
                globalClasses.flexRow,
                globalClasses.verticalAlignCenter
              )}
            >
              <Typography className={classes.selectedField} variant="text">
                {selectedGraphFilters?.[0]?.field}
              </Typography>
              <div
                className={clsx(
                  classes.selectedFieldWrapper,
                  globalClasses.flexRow,
                  globalClasses.verticalAlignCenter
                )}
              >
                <Typography className={classes.selectedValue} variant="text">
                  {selectedGraphFilters?.[0]?.selectedValues?.[0]}
                </Typography>
                {!!(selectedGraphFilters?.[0]?.selectedValues?.length > 1) && (
                  <Typography className={classes.selectedValue} variant="text">
                    + {selectedGraphFilters?.[0]?.selectedValues?.length - 1}
                  </Typography>
                )}
              </div>
              <Popover
                className={classes.popoverBody}
                open={showFilterPopover}
                onClose={() => {
                  setShowFilterPopover(false);
                }}
                anchorEl={showMoreChipRef.current}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
              >
                <div className={classes.popoverWapper}>
                  {selectedGraphFilters
                    ?.slice(0, activeFilterLength)
                    ?.map((element, index) => (
                      <FilterRow
                        info={element}
                        isPopoverVisible={showFilterPopover}
                        key={`filter-row-${index}`}
                      />
                    ))}
                  {!!(selectedGraphFilters?.length > 5) &&
                    onViewAllFilterAction && (
                      <Typography
                        className={classes.viewMoreText}
                        onClick={handleViewAllFilters}
                        variant="text"
                      >
                        View All Filters
                      </Typography>
                    )}
                </div>
              </Popover>
            </div>
          </div>

          {!!(selectedGraphFilters.length > 1) && (
            <p
              className={globalClasses.ellipsisChip}
              ref={showMoreChipRef}
              onClick={() => setShowFilterPopover(true)}
            >
              ...
            </p>
          )}
        </div>
      )}
    </>
  );
};

export default GraphFilterView;

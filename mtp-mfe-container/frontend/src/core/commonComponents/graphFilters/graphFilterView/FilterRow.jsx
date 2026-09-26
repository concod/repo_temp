import { useStyles } from "./graphFilterViewStyles";
import globalStyles from "core/Styles/globalStyles";
import { useEffect, useState, useRef } from "react";
import clsx from "clsx";
import { Typography } from "@mui/material";
const FilterRow = ({ info, showFilterPopover }) => {
  const globalClasses = globalStyles();
  const [visibleChips, setVisibleChips] = useState(
    info?.selectedValues?.length
  );
  const [additionalFilters, setAdditionalFilters] = useState(0);
  const filterChipWrapperRef = useRef(null);
  const classes = useStyles();
  const FilterChip = ({ value }) => {
    return <p className={globalClasses.grayFilterChip}>{value}</p>;
  };
  const calculateChipsToFit = () => {
    const wrapperWidth = 270; // Width of the wrapper div to display the filterChips
    const wrapper = filterChipWrapperRef?.current;
    if (wrapper) {
      let totalWidth = 0;
      let lastIndex = 0;
      const additionalChipMinWidth = 36; // Minimum width of the chip to display the remaining number of selected values
      const columnGap = parseFloat(
        window?.getComputedStyle(wrapper)?.columnGap
      );
      for (let i = 0; i < wrapper?.children?.length; i++) {
        const chipWidth = Math.round(
          wrapper?.children[i]?.getBoundingClientRect()?.width
        );
        totalWidth += chipWidth + columnGap;
        lastIndex += 1;
        // Checking how many elements can be fitted in the div without getting cropped out
        if (totalWidth >= wrapperWidth) {
          setVisibleChips(lastIndex - 2);
          setAdditionalFilters(info?.selectedValues?.length - (lastIndex - 2));
          break;
        }
      }
    }
  };
  useEffect(() => {
    calculateChipsToFit();
  }, [info, showFilterPopover]);
  return (
    <div
      className={clsx(
        classes.filterRow,
        globalClasses.flexRow,
        globalClasses.verticalAlignCenter
      )}
    >
      <Typography className={classes.filterLabel}>{info?.field}</Typography>
      <div className={classes.filterChipWrapper} ref={filterChipWrapperRef}>
        {info?.selectedValues?.slice(0, visibleChips)?.map((value, index) => (
          <FilterChip value={value} key={`filter-chip-${index}`} />
        ))}
        {additionalFilters > 0 && (
          <p className={globalClasses.grayFilterChip}>+ {additionalFilters}</p>
        )}
      </div>
    </div>
  );
};
export default FilterRow;

import makeStyles from "@mui/styles/makeStyles";
import { Popover, Typography } from "@mui/material";
import { Tag } from "impact-ui";
import { useRef, useState, useEffect } from "react";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";
import { throttle } from "lodash";
import IconButton from "@mui/material/IconButton";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

const useStyles = makeStyles((theme) => ({
  summaryContainer: {
    border: `1px solid ${theme.palette.colours.disabledBadge}`,
    margin: `1rem 0`,
    padding: `${theme.typography.pxToRem(1)} 0.25rem ${theme.typography.pxToRem(
      1
    )} 0.5rem`,
    borderRadius: theme.typography.pxToRem(5),
    gap: "0.25rem 0.5rem",
  },
  filterPopOver: {
    margin: "0.2rem",
  },
  tagWrapper: {
    background: theme.palette.background.chipBackground,
    borderRadius: theme.typography.pxToRem(3),
    padding: "0.3125rem 0.5rem",
    gap: "0.5rem",
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
  camelCase: {
    textTransform: "capitalize",
    display: "inline-block",
    fontSize: "0.75rem",
    lineHeight: theme.typography.pxToRem(21),
    fontWeight: 500,
    color: theme.palette.textColours.slateGrayLight,
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
  },
  chipsContainer: {
    overflowX: "auto",
    WebkitOverflowScrolling: "touch", //smooth scroll
    scrollbarWidth: "none",
    msOverflowStyle: "none", //for older versions
  },
  scrollButtonsContainer: {
    gap: theme.typography.pxToRem(2),
  },
  scrollButtonsStyle: {
    background: `${theme.palette.colours.disabledSelectBackground} !important`,
    color: theme.palette.text.secondary,
    padding: `${theme.typography.pxToRem(5)} ${theme.typography.pxToRem(6)}`,
    height: theme.typography.pxToRem(35),
    width: "1.25rem",
  },
  leftScrollButton: {
    borderRadius: "0.25rem 0 0 0.25rem",
  },
  rightScrollButton: {
    borderRadius: "0 0.25rem 0.25rem 0",
  },
}));
const GetChips = ({ dimension, filtersSummary, showFilterListPopOver }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const chipRef = useRef(null);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  if (filtersSummary?.[dimension]?.length) {
    return (
      <>
        {filtersSummary?.[dimension]?.map((filterSection) => {
          const section = filterSection?.values;
          let label = "";
          label = section?.[0]?.label ? section?.[0]?.label : section?.[0];
          label = replaceSpecialCharacter(label);
          if (section?.length > 1) label += ` +${section?.length - 1}`;
          return (
            <div
              className={`${classes.tagWrapper} ${globalClasses.centerAlign}`}
            >
              {showFilterListPopOver && section?.length > 1 && (
                <Popover
                  className={classes.menuPopover}
                  anchorEl={chipRef.current}
                  open={isFilterPopoverOpen}
                  onClose={() => setIsFilterPopoverOpen(false)}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "left",
                  }}
                >
                  <div className={globalClasses.flexRow}>
                    {section?.map((sectionObj) => {
                      return (
                        <Tag
                          className={`${classes.filterPopOver} ${classes.tagContainer}`}
                        >
                          {sectionObj.label}
                        </Tag>
                      );
                    })}
                  </div>
                </Popover>
              )}
              <Typography
                variant="h6"
                component="span"
                className={classes.camelCase}
              >
                {filterSection.filterName}
              </Typography>
              <Tag
                ref={chipRef}
                className={classes.tagContainer}
                onClick={
                  showFilterListPopOver &&
                  filtersSummary?.[dimension]?.[0]?.values?.length > 1 &&
                  (() => setIsFilterPopoverOpen(true))
                }
              >
                {label}
              </Tag>
            </div>
          );
        })}
      </>
    );
  } else {
    return <></>;
  }
};
const FiltersSummary = ({ filtersSummary, showFilterListPopOver }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [disableLeft, setDisableLeft] = useState(true);
  const [disableRight, setDisableRight] = useState(true);

  const containerRef = useRef(null);

  // Throttled function to handle scroll event
  const handleScroll = throttle(() => {
    updateScrollButtons();
  }, 100);

  useEffect(() => {
    if (containerRef.current) {
      // Add scroll & resize event listener to container element
      containerRef.current.addEventListener("scroll", handleScroll);
      window.addEventListener("resize", updateScrollButtons);

      // Perform initial check of button states
      updateScrollButtons();

      // Create a mutation observer instance
      const observer = new MutationObserver(updateScrollButtons);

      // Configure the observer to watch for changes in child elements of the container
      const observerConfig = {
        childList: true, // Watch for additions/removals of child nodes
        subtree: true, // Watch all descendant nodes as well
      };

      // Start observing the container for mutations
      observer.observe(containerRef.current, observerConfig);

      // Cleanup function to disconnect the observer when component unmounts
      return () => {
        observer.disconnect();
        containerRef.current.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, []);

  const updateScrollButtons = () => {
    if (containerRef.current) {
      // Check if there's room to scroll left
      setDisableLeft(containerRef.current.scrollLeft <= 0);
      // Check if there's room to scroll right
      setDisableRight(
        containerRef.current.scrollLeft + containerRef.current.clientWidth >=
          containerRef.current.scrollWidth
      );
    }
  };

  const handleScrollLeft = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const scrollLeft = container.scrollLeft;
      const chipGap = parseInt(window.getComputedStyle(container).columnGap);
      let sum = 0;
      let SCROLL_AMOUNT = 0;

      for (let i = 0; i < container.children.length; i++) {
        const chip = container.children[i];
        const chipWidth = chip.getBoundingClientRect().width;
        sum += chipWidth;
        // Check if the total width exceeds the visible portion of the container
        if (sum > scrollLeft || Math.abs(sum + chipGap - scrollLeft) < 1) {
          SCROLL_AMOUNT =
            container.getBoundingClientRect().left -
            chip.getBoundingClientRect().left;
          if (Math.abs(SCROLL_AMOUNT) < 1 && i - 1 >= 0)
            SCROLL_AMOUNT =
              chipGap + container.children[i - 1].getBoundingClientRect().width;

          break;
        }
        sum += chipGap;
      }
      containerRef.current.scrollBy({
        left: -Math.ceil(SCROLL_AMOUNT),
        behavior: "smooth",
      });
      updateScrollButtons();
    }
  };

  const handleScrollRight = () => {
    if (containerRef.current) {
      const container = containerRef.current;
      const containerWidth = container.getBoundingClientRect().width; // to get precise container width
      const scrollLeft = container.scrollLeft;
      const chipGap = parseInt(window.getComputedStyle(container).columnGap);
      let sum = 0;
      let SCROLL_AMOUNT = 0;

      for (let i = 0; i < container.children.length; i++) {
        const chip = container.children[i];
        const chipWidth = chip.getBoundingClientRect().width;
        sum += chipWidth;

        // Check if the total width exceeds the visible portion of the container
        if (sum > scrollLeft + containerWidth) {
          SCROLL_AMOUNT = sum - (scrollLeft + containerWidth);
          if (SCROLL_AMOUNT < 1 && i + 1 < container.children.length)
            SCROLL_AMOUNT =
              chipGap + container.children[i + 1].getBoundingClientRect().width;
          break;
        }
        sum += chipGap;
      }

      containerRef.current.scrollBy({
        left: Math.ceil(SCROLL_AMOUNT),
        behavior: "smooth",
      });
      updateScrollButtons();
    }
  };

  return (
    <div
      className={`${classes.summaryContainer} ${globalClasses.flexRow} ${globalClasses.verticalAlignCenter} ${globalClasses.whiteSpace}`}
    >
      <Typography component="span">Selected filters:</Typography>
      <div
        ref={containerRef}
        className={`${globalClasses.flexRow} ${globalClasses.flex} ${globalClasses.gapHalf} ${classes.chipsContainer}`}
      >
        {Object.keys(filtersSummary)?.map((dimension, index) => (
          <GetChips
            dimension={dimension}
            filtersSummary={filtersSummary}
            showFilterListPopOver={showFilterListPopOver}
          />
        ))}
      </div>
      <div
        className={`${globalClasses.centerAlign} ${classes.scrollButtonsContainer}`}
      >
        <IconButton
          aria-label="left-scroll"
          className={`${classes.scrollButtonsStyle} ${classes.leftScrollButton}`}
          disableFocusRipple
          disableRipple
          disabled={disableLeft}
          onClick={handleScrollLeft}
        >
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          aria-label="right-scroll"
          className={`${classes.scrollButtonsStyle} ${classes.rightScrollButton}`}
          disableFocusRipple
          disableRipple
          disabled={disableRight}
          onClick={handleScrollRight}
        >
          <ChevronRightIcon />
        </IconButton>
      </div>
    </div>
  );
};

export default FiltersSummary;

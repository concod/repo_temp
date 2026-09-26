import makeStyles from "@mui/styles/makeStyles";
import { Typography } from "@mui/material";
import { Tag, Tooltip, useTranslation } from "impact-ui-v3";
import { useRef, useState, useEffect } from "react";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";
import { throttle } from "lodash";
import IconButton from "@mui/material/IconButton";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import FilterChips from "./FilterChips";

const useStyles = makeStyles((theme) => ({
  summaryContainer: {
    background: theme.palette.common.white,
    width: "calc(100% - 85px)",
  },
  paddingLeft: {
    paddingLeft: "0.5rem",
  },
  maxWidth: {
    maxWidth: "200px",
  },
  paddingLeft12: {
    paddingLeft: "0.75rem",
  },
  mainHeading: {
    fontSize: "14px",
    lineHeight: "20px",
    color: theme.palette.text.grey,
    fontWeight: 500,
  },
  tagSeparater: {
    gap: "0.75rem",
  },
  chipsContainer: {
    overflowX: "auto",
    WebkitOverflowScrolling: "touch", //smooth scroll
    scrollbarWidth: "none",
    msOverflowStyle: "none", //for older versions
    width: "60vw",
  },
  scrollButtonsContainer: {
    gap: theme.typography.pxToRem(2),
  },
  scrollButtonsStyle: {
    background: `${theme.palette.background.appBackground} !important`,
    padding: `${theme.typography.pxToRem(5)} ${theme.typography.pxToRem(6)}`,
    height: "2rem",
    width: "1.25rem",
  },
  leftScrollButton: {
    borderRadius: "0.25rem 0 0 0.25rem",
  },
  rightScrollButton: {
    borderRadius: "0 0.25rem 0.25rem 0",
  },
}));
const GetChips = ({
  dimension,
  filtersSummary,
  showFilterListPopOver,
  setOpenModal,
}) => {
  if (filtersSummary?.[dimension]?.length) {
    return (
      <>
        {filtersSummary?.[dimension]?.map((filterSection) => {
          const section = filterSection?.values;
          let label = "";
          // Special handling for range-picker (selling period)
          if (filterSection.filterName === "Selling Period" && section?.length > 1) {
            // Format the date range as a single value
            const startDate = section?.[0]?.label || section?.[0];
            const endDate = section?.[1]?.label || section?.[1];
            label = `${startDate} to ${endDate}`;
          } else {
            // Normal handling for other filters
            label = section?.[0]?.label ? section?.[0]?.label : section?.[0];
            label = replaceSpecialCharacter(label);
            if (section?.length > 1 && filterSection.filter_id !== "range-picker") {
              label += ` +${section?.length - 1}`;
            }
          }
          
          return (
            <FilterChips
              key={label}
              showFilterListPopOver={showFilterListPopOver}
              section={section}
              dimension={dimension}
              filterSection={filterSection}
              label={label}
              filtersSummary={filtersSummary}
              setOpenModal={setOpenModal}
            />
          );
        })}
      </>
    );
  } else {
    return <></>;
  }
};
const FiltersSummary = ({
  filtersSummary,
  showFilterListPopOver,
  savedFilterDataRef,
  savedFilterClickRef,
  selectedFilterValueRef,
  setOpenModal,
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const { t } = useTranslation();
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
        observer?.disconnect();
        containerRef?.current?.removeEventListener("scroll", handleScroll);
        window?.removeEventListener("resize", updateScrollButtons);
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

  // const filtersCount =
  //   Object.keys(filtersSummary).reduce(
  //     (curr, acc) => filtersSummary[acc].length + curr,
  //     0
  //   ) || 0;

  return (
    <div
      className={`${classes.summaryContainer} ${globalClasses.flexRow} ${globalClasses.verticalAlignCenter}`}
    >
      <div className={`${globalClasses.centerAlign} ${globalClasses.gapHalf} `}>
        <Typography className={classes.mainHeading} component="span">
          {t("filters.filtersApplied")}
        </Typography>
        {selectedFilterValueRef?.current ? (
          <Tooltip title={selectedFilterValueRef?.current} variant="secondary">
            <div className={classes.maxWidth}>
              <Tag label={selectedFilterValueRef?.current} size="small" />
            </div>
          </Tooltip>
        ) : null}
      </div>
      <div
        ref={containerRef}
        className={`${globalClasses.flexRow} ${classes.paddingLeft12} ${globalClasses.flex} ${classes.tagSeparater} ${classes.chipsContainer}`}
      >
        {Object.keys(filtersSummary)?.map((dimension, index) => (
          <GetChips
            key={index}
            dimension={dimension}
            filtersSummary={filtersSummary}
            showFilterListPopOver={showFilterListPopOver}
            setOpenModal={setOpenModal}
          />
        ))}
      </div>
      <div
        className={`${globalClasses.centerAlign} ${classes.tagSeparater} ${classes.paddingLeft}`}
      >
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
    </div>
  );
};

export default FiltersSummary;

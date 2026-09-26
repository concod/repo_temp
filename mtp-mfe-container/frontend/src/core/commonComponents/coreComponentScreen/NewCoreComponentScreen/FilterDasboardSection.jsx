import { useEffect, useRef, useState } from "react";
import { Button } from "impact-ui-v3";
import FilterChips from "core/commonComponents/filters/filterChips";
import globalStyles from "core/Styles/globalStyles";
import FilterPanelDashobard from "../FilterPanelDashobard";
import "./FilterSection.scss";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) => ({
  stackedFiltersPanel: {
    background: "none !important",
  },
}));

const FilterDasboardSection = (props) => {
  const {
    dateFilter,
    isDateLabelDerivedFromDimension,
    showFilters,
    openModal,
    setOpenModal,
    dispatchSetShowFilters,
    disableFilterModal,
    stackedFiltersPanelConfigs,
    appliedFilterChipsRef,
    reducerIsFilterApplied,
  } = props;

  const globalClasses = globalStyles();

  const classes = useStyles();

  const [filterDependencyChips, setFilterDependencyChips] = useState([]);

  const savedFilterDataRef = useRef([]);
  const savedFilterClickRef = useRef(() => {});
  const selectedFilterValueRef = useRef({});
  const applyFilterHandlerRef = useRef(() => {});
  const activeFilterDimensionRef = useRef({});
  const savedRecentFiltersListRef = useRef([]);

  useEffect(() => {
    if (filterDependencyChips.length) {
      dispatchSetShowFilters(true);
    }
    appliedFilterChipsRef.current = filterDependencyChips;
  }, [filterDependencyChips]);

  return (
    <>
      <div
        className={`main-container ${
          disableFilterModal
            ? stackedFiltersPanelConfigs
              ? classes.stackedFiltersPanel
              : "main-container-without-modal"
            : ""
        } ${
          showFilters || disableFilterModal
            ? ""
            : `${globalClasses.displayNone}`
        } ${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}
      >
        {showFilters && !disableFilterModal && (reducerIsFilterApplied ||
          props?.showStrip ||
          savedFilterDataRef?.current?.length > 0) && (
          <FilterChips
            filterConfig={filterDependencyChips}
            filterConfigKey={props.filterConfigKey}
            dateFilter={dateFilter}
            savedFilterDataRef={savedFilterDataRef}
            savedFilterClickRef={savedFilterClickRef}
            selectedFilterValueRef={selectedFilterValueRef}
            isDateLabelDerivedFromDimension={isDateLabelDerivedFromDimension}
            setOpenModal={setOpenModal}
            applyFilterHandlerRef={applyFilterHandlerRef}
            activeFilterDimensionRef={activeFilterDimensionRef}
            savedRecentFiltersListRef={savedRecentFiltersListRef}
            hideSavedFilterSection={props.hideSavedFilterSection}
            hideSelectedFilterBadge={props.hideAllFiltersButton}
            defaultDateFormat={
              props.defaultDateFormat ? props.defaultDateFormat : null
            }
          />
        )}
        <FilterPanelDashobard
          {...props}
          alignClearButton={props.alignClearButton}
          openModal={openModal}
          savedFilterDataRef={savedFilterDataRef}
          savedFilterClickRef={savedFilterClickRef}
          selectedFilterValueRef={selectedFilterValueRef}
          setOpenModal={setOpenModal}
          filterDependencyChips={filterDependencyChips}
          setFilterDependencyChips={setFilterDependencyChips}
          applyFilterHandlerRef={applyFilterHandlerRef}
          activeFilterDimensionRef={activeFilterDimensionRef}
          savedRecentFiltersListRef={savedRecentFiltersListRef}
        />
      </div>
    </>
  );
};

export default FilterDasboardSection;

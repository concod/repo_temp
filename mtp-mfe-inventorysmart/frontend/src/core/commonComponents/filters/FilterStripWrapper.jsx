import { FiltersStrip } from "impact-ui-v3";
import {
  getFilterChips,
  getFilterChipsofSavedFilters,
} from "./filterChipsUtils";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { displaySnackMessages } from "core/Utils/utils";
import { calculateNumberOfAppiledFilters } from "./filterStripWrapperUtils";
import { useTranslation } from "impact-ui-v3";

const FilterStripWrapper = (props) => {
  const {
    filtersSummary,
    setOpenModal,
    savedFilterDataRef,
    selectedFilterValueRef,
    filterConfigKey,
    applyFilterHandlerRef,
    activeFilterDimensionRef,
    savedRecentFiltersListRef,
    hideSelectedFilterBadge = false,
    hideSavedFilterSection = false,
  } = props;

  const [selectedFilter, setSelectedFilter] = useState(
    selectedFilterValueRef?.current?.selectedFilter || ""
  );
  const [selectedFilterValue, setSelectedFilterValue] = useState(
    selectedFilterValueRef?.current?.selectedFilter || calculateNumberOfAppiledFilters(filtersSummary)
  );

  const [selectedBadge, setSelectedBadge] = useState("All");

  const dispatch = useDispatch();
  const { t } = useTranslation();

  useEffect(() => {
    setSelectedFilter(selectedFilterValueRef?.current?.selectedFilter || "");
    setSelectedFilterValue(
      selectedFilterValueRef?.current?.selectedFilter || calculateNumberOfAppiledFilters(filtersSummary)
    );
  }, [selectedFilterValueRef?.current?.selectedFilter, filtersSummary]);

  const filterDashboardConfiguration = useSelector(
    (state) =>
      state.filterReducer.filterDashboardConfiguration[filterConfigKey]
        ?.filterConfig
  );

  const applyFilter = (filterSelected) => {
    applyFilterHandlerRef?.current?.(filterSelected);
  };

  const requiredFilters = {};

  filterDashboardConfiguration?.[0]?.filterDashboardData?.forEach((item) => {
    requiredFilters[item.label] = item.is_mandatory;
  });

  const recentFiltersList = savedRecentFiltersListRef?.current?.map((item) => ({
    filterSet: [{ id: item, label: item }],
    id: item,
    handleRecentFilter: (data) => {
      if (data.id != selectedFilterValueRef?.current?.selectedFilter) {
        applyFilter(data.id);
      } else {
        displaySnackMessages(t("snackbarMessages.savedFilterAlreadyApplied"), "info", dispatch);
      }
    },
  }));

  const handleViewAllClick = (data) => {
    if (!hideSelectedFilterBadge) {
      setOpenModal(true);
      activeFilterDimensionRef.current = {
        label: data.label,
        dimension: data.dimension,
      };
    }
  };

  return (
    <FiltersStrip
      filterButtonClick={
        hideSelectedFilterBadge ? null : () => setOpenModal(true)
      }
      filterButtonLabel={hideSelectedFilterBadge ? "" : t("filters.allFilters")}
      filterTags={getFilterChips(
        filtersSummary,
        requiredFilters,
        handleViewAllClick
      )}
      handleApplyFilter={() => applyFilter(selectedFilter)}
      handleCancelFilter={() => {}}
      recentFilters={recentFiltersList}
      savedFilterLists={getFilterChipsofSavedFilters(
        savedFilterDataRef?.current,
        selectedBadge
      )}
      savedFiltersBadge={[
        {
          id: 1,
          label: t("filters.all"),
        },
        {
          id: 2,
          label: t("filters.global"),
        },
        {
          id: 1,
          label: t("filters.personal"),
        },
      ]}
      handleBadgeChange={(value) => setSelectedBadge(value.label)}
      selectedFilter={selectedFilterValue}
      setSelectedFilter={(value) => setSelectedFilter(value)}
      savedFilterSelectedBadge={selectedBadge}
      hideSelectedFilterBadge={
        hideSelectedFilterBadge || hideSavedFilterSection
      }
    />
  );
};

export default FilterStripWrapper;

import { formatStringDate } from "core/Utils/functions/utils";
import moment from "moment";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import FilterStripWrapper from "./FilterStripWrapper";

const { tenantDateFormat } = getTenantTimeZoneDetails();
const chipDateFormat = tenantDateFormat || "MM-DD-YYYY";
//util function to format Date
export function formatDate(date, defaultDateFormat = null) {
  const dateFormat = defaultDateFormat || tenantDateFormat || "MM-DD-YYYY";
  return moment(date).format(dateFormat);
}

/* util function for common date filter object
filterName will be overridden as per use */
function dateFilterObject(dateFilter, defaultDateFormat) {
  try {
    return {
      values: [
        `${formatDate(
          dateFilter?.start_date,
          defaultDateFormat
        )} to ${formatDate(dateFilter?.end_date, defaultDateFormat)}`,
      ],
      label: `${formatDate(
        dateFilter?.start_date,
        defaultDateFormat
      )}-${formatDate(dateFilter?.end_date, defaultDateFormat)}`,
      id: `${formatDate(
        dateFilter?.start_date,
        defaultDateFormat
      )}-${formatDate(dateFilter?.end_date, defaultDateFormat)}`,
      filterName: "Date",
    };
  } catch (error) {
    console.error("Error creating date filter object:", error);
    return null;
  }
}

const FilterChips = ({
  filterConfig,
  filterConfigKey,
  dateFilter,
  isDateLabelDerivedFromDimension,
  showFilterListPopOver,
  savedFilterDataRef,
  savedFilterClickRef,
  selectedFilterValueRef,
  setOpenModal,
  applyFilterHandlerRef,
  activeFilterDimensionRef,
  savedRecentFiltersListRef,
  hideSelectedFilterBadge,
  hideSavedFilterSection,
  defaultDateFormat,
  ...props
}) => {
  var dateFilters = {};
  const isFiscalCalendar = (currentConfig) => {
    const filterDates =
      currentConfig?.values?.length > 0
        ? currentConfig?.values[0]?.value
        : currentConfig?.values;

    if (filterDates) {
      const keys = Object.keys(filterDates);

      return (
        keys?.length &&
        keys.indexOf("fiscalInfoStartDate") > -1 &&
        keys.indexOf("fiscalInfoEndDate") > -1
      );
    }

    return false;
  };

  let filtersSummary = filterConfig.reduce((accumulator, currentConfig) => {
    if (!isFiscalCalendar(currentConfig)) {
      if (accumulator[currentConfig.dimension]) {
        // push the label(filterName) as well along with the value
        accumulator[currentConfig.dimension].push({
          values: currentConfig.values,
          filterName: currentConfig?.filter_name || currentConfig?.dimension,
        });
      } else {
        if (
          currentConfig?.display_type === "rangePicker" ||
          currentConfig?.display_type === "DateTimeField"
        ) {
          let data = currentConfig.values.map((item) => {
            let formattedDate = formatStringDate(
              item.value,
              false,
              false,
              chipDateFormat
            );
            return {
              values: [formattedDate],
              label: formattedDate,
              id: formattedDate,
              filterName:
                currentConfig?.filter_name || currentConfig?.dimension,
            };
          });
          /* if data array represents a range then merge them into a single value
          so that startDate and endDate don't appear seperately */
          if (data?.length > 1) {
            const initialData = data[0];
            const lastData = data[data.length - 1];
            data = [
              {
                values: [`${initialData.values[0]} to ${lastData.values[0]}`],
                label: `${initialData.label}-${lastData.label}`,
                id: `${initialData.id}-${lastData.id}`,
                filterName: initialData.filterName,
              },
            ];
          }
          accumulator[currentConfig.dimension] = data;
        } else {
          accumulator[currentConfig.dimension] = [
            {
              values: currentConfig.values,
              filterName:
                currentConfig?.filter_name || currentConfig?.dimension,
            },
          ];
        }
      }
    } else {
      const dates = currentConfig?.values?.fiscalInfoStartDate
        ? currentConfig?.values
        : currentConfig?.values[0]?.value;
      if (
        dates?.fiscalInfoStartDate?.hasOwnProperty("calendar_week_start_date")
      ) {
        dateFilter = {
          start_date: formatStringDate(
            dates?.fiscalInfoStartDate?.calendar_week_start_date,
            true,
            false
            // dateFormat
          ),
          end_date: formatStringDate(
            dates?.fiscalInfoEndDate?.calendar_week_start_date,
            true,
            true
          ).endOf("week"),
        };
      } else {
        dateFilter = {
          start_date: formatStringDate(
            dates?.fiscalInfoStartDate,
            true,
            false
            // dateFormat
          ),
          end_date: formatStringDate(dates?.fiscalInfoEndDate, true, false),
        };
      }
      // maintaining consistency of data format
      dateFilters[currentConfig.dimension] = [
        {
          ...dateFilterObject(dateFilter, defaultDateFormat),
          filterName: currentConfig?.dimension || currentConfig?.filter_name,
        },
      ];
    }

    return accumulator;
  }, {});

  // Append date filter incase of custom date ranges
  // The array name should be the filterName
  if (dateFilter && !isDateLabelDerivedFromDimension) {
    filtersSummary = {
      ...filtersSummary,
      Date: [dateFilterObject(dateFilter, defaultDateFormat)],
    };
  }

  if (isDateLabelDerivedFromDimension) {
    filtersSummary = {
      ...filtersSummary,
      ...dateFilters,
    };
  }

  if (props.getCustomFilterChipsData) {
    filtersSummary = props.getCustomFilterChipsData(filtersSummary);
  }
  return (
    <FilterStripWrapper
      filtersSummary={filtersSummary}
      setOpenModal={setOpenModal}
      savedFilterDataRef={savedFilterDataRef}
      selectedFilterValueRef={selectedFilterValueRef}
      filterConfigKey={filterConfigKey}
      applyFilterHandlerRef={applyFilterHandlerRef}
      activeFilterDimensionRef={activeFilterDimensionRef}
      savedRecentFiltersListRef={savedRecentFiltersListRef}
      hideSelectedFilterBadge={hideSelectedFilterBadge}
      hideSavedFilterSection={hideSavedFilterSection}
    />
  );
};

export default FilterChips;

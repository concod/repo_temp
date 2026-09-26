import React from "react";
import FiltersSummary from "core/commonComponents/filterModal/filters-summary";
import { formatStringDate } from "core/Utils/functions/utils";
import moment from "moment";

//util function to format Date
export function formatDate(date, format = "MM-DD-YYYY") {
  return moment(date).format(format);
}

/* util function for common date filter object
filterName will be overridden as per use */
function dateFilterObject(dateFilter) {
  try {
    return {
      values: [
        `${formatDate(dateFilter?.start_date)} to ${formatDate(
          dateFilter?.end_date
        )}`,
      ],
      label: `${formatDate(dateFilter?.start_date)}-${formatDate(
        dateFilter?.end_date
      )}`,
      id: `${formatDate(dateFilter?.start_date)}-${formatDate(
        dateFilter?.end_date
      )}`,
      filterName: "Date",
    };
  } catch (error) {
    console.error("Error creating date filter object:", error);
    return null;
  }
}

const FilterChips = ({
  filterConfig,
  dateFilter,
  isDateLabelDerivedFromDimension,
  showFilterListPopOver,
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
      const filterName = currentConfig.attribute_name;
      if (filterName) {
        // Create a new array in the accumulator if it doesn't exist
        if (!accumulator[filterName]) {
          accumulator[filterName] = [];
        }
        // Push the current values along with the filter name
        accumulator[filterName].push({
          values: currentConfig.values,
          filterName: filterName
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
              "MM-DD-YYYY"
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
      dateFilter = {
        start_date: formatStringDate(
          dates?.fiscalInfoStartDate?.calendar_week_start_date,
          true,
          false,
          "MM-DD-YYYY"
        ),
        end_date: formatStringDate(
          dates?.fiscalInfoEndDate?.calendar_week_start_date,
          true,
          true
        )
          .endOf("week")
          .format("MM-DD-YYYY"),
      };
      // maintaining consistency of data format
      dateFilters[currentConfig.dimension] = [
        {
          ...dateFilterObject(dateFilter),
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
      Date: [dateFilterObject(dateFilter)],
    };
  }

  if (isDateLabelDerivedFromDimension) {
    filtersSummary = {
      ...filtersSummary,
      ...dateFilters,
    };
  }

  return (
    <FiltersSummary
      filtersSummary={filtersSummary}
      showFilterListPopOver={showFilterListPopOver}
    />
  );
};

export default FilterChips;

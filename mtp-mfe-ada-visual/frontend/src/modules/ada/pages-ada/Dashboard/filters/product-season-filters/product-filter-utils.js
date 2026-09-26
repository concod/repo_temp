import {
  getCombinedCrossDimensionalDataV3,
  setProductSeasonFiltersYearWeek,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";

export const getPayload = (attributeData, selectedDateRange, filtersData) => {
  const filters = filtersData
    .filter(
      (filter) =>
        filter.attribute_name !== "fiscal_year_week" &&
        filter.selectedOptions?.length > 0
    )
    .map((filter) => {
      return {
        filter_name: filter.label,
        filter_id:
          filter.attribute_name === "fiscal_week"
            ? "fiscal_year_week"
            : filter.attribute_name,
        filter_type: "cascaded",
        dimension: "fiscal_date",
        display_type: "dropdown",
        is_mandatory: false,
        values: filter.selectedOptions.map((option) => option.value),
        attribute_name:
          filter.attribute_name === "fiscal_week"
            ? "fiscal_year_week"
            : filter.attribute_name,
        operator: "in",
      };
    });

  return {
    attributes: [
      {
        attribute_name: "fiscal_year_week",
        dimension: "fiscal_date",
        filter_type: "cascaded",
      },
      ...attributeData,
    ],
    filters: [
      {
        filter_name: "Fiscal Year Week",
        filter_id: "fiscal_year_week",
        filter_type: "cascaded",
        dimension: "fiscal_date",
        display_type: "calender",
        is_mandatory: true,
        values: selectedDateRange,
        attribute_name: "fiscal_year_week",
        operator: "range",
      },
      ...filters,
    ],
    filter_type: "cascaded",
    is_urm_filter: false,
    screen_name: "ada-visual",
    application_code: 11,
  };
};

export const getAllFilterAttributes = (productSeasonFilters) => {
  return productSeasonFilters
    .map((filter) => ({
      attribute_name: filter.attribute_name,
      dimension: filter.dimension,
      filter_type: filter.filter_type,
    }))
    .filter((filter) => filter.attribute_name !== "fiscal_week");
};

export const areArraysDifferent = (arr1, arr2) => {
  if (arr1.length !== arr2.length) return true;

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i].value !== arr2[i].value) {
      return true;
    }
  }

  return false;
};

export const getRangeBetweenSelected = (options = [], selected = []) => {
  if (!selected.length) return [];

  const selectedVals = selected.map((s) => s.value);

  // Find all selected indices in the full options list
  const indices = options
    .map((opt, index) => (selectedVals.includes(opt.value) ? index : -1))
    .filter((i) => i !== -1);

  if (indices.length === 0) return [];

  const start = Math.min(...indices);
  const end = Math.max(...indices);

  return options.slice(start, end + 1);
};

const getFirstAndLast = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return [];

  const first = arr[0];
  const last = arr[arr.length - 1];
  return [first, last];
};

// Helper function to map season-related options and sort by the first fiscal year week
const mapSeasonOptions = (data) => {
  return data
    .map((item) => {
      const key = Object.keys(item)[0];
      return {
        label: key,
        value: key,
        fiscal_year_week: item[key].fiscal_year_week,
      };
    })
    .sort((a, b) => a.fiscal_year_week[0] - b.fiscal_year_week[0]);
};

/**
 * Fetches or updates product season filter data from the API.
 * - Can fetch all filters or update a single filter
 * - Updates Redux store with fiscal year week range
 * - Returns updated filter list with new options
 */
export const fetchOrUpdateProductSeasonFiltersData = async ({
  attributeData = {}, // Filter attribute to update (if not fetching all)
  fetchAllFilters = false, // Flag: fetch all filters or just one
  allFiltersData = [], // Current filters state
  selectedDate, // Selected date range object
  dispatch, // Redux dispatch function
  setYearWeek = true, // Flag: whether to update year-week in Redux
}) => {
  // Prepare filter attributes for the payload
  const allFilterAttributes = getAllFilterAttributes(allFiltersData);

  // If fetching a single filter, extract only that one from all filters
  const payloadAttData = allFilterAttributes.filter(
    (filter) => filter.attribute_name === attributeData?.attribute_name
  );

  // Prepare the date range for the payload (in fiscal year week format)
  const selectedDateRange = [
    [
      selectedDate.fiscalInfoStartDate.fiscal_year_week,
      selectedDate.fiscalInfoEndDate.fiscal_year_week,
    ],
  ];

  // Build the payload for the API request
  const payload = getPayload(
    fetchAllFilters ? allFilterAttributes : payloadAttData,
    selectedDateRange,
    allFiltersData,
    fetchAllFilters
  );

  try {
    // Fetch data from API
    const response = await getCombinedCrossDimensionalDataV3(payload);

    // Extract fiscal year week from response
    const fiscalYearWeek = response.data.data["fiscal_year_week"];

    // Update Redux store with first & last fiscal year week (if required)
    if (setYearWeek && dispatch) {
      dispatch(
        setProductSeasonFiltersYearWeek(getFirstAndLast(fiscalYearWeek))
      );
    }

    // Map through existing filters to update options
    const updatedFilters = allFiltersData.map((filter) => {
      // Update only if fetching all or if it's the target attribute
      if (
        fetchAllFilters ||
        filter.attribute_name === attributeData.attribute_name
      ) {
        let newOptions = [];

        const attrName =
          filter.attribute_name === "fiscal_week"
            ? "fiscal_year_week"
            : filter.attribute_name;
        const attrData = response.data.data[attrName];

        // Special handling for product season filters: map & sort by fiscal year week
        if (
          attrName === "product_season_name" ||
          attrName === "product_sub_season"
        ) {
          newOptions = mapSeasonOptions(attrData);
        } else {
          // Default mapping for other attributes
          newOptions = attrData.map((item) => ({
            label: item,
            value: item,
          }));
        }

        // Return updated filter with new options
        return {
          ...filter,
          options: newOptions,
          selectedOptions:
            filter.selectedOptions.length > 0
              ? newOptions //select all new options
              : filter.selectedOptions, // Keep existing selection if present
        };
      }

      // If filter doesn't match, return unchanged
      return filter;
    });

    return updatedFilters;
  } catch (error) {
    // Handle API errors
    console.log("error", error);
  }
};

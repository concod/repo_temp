import { isEmpty } from "lodash";

export const calculateNumberOfAppiledFilters = (filters) => {
  try {
    if (!isEmpty(filters)) {
      let appliedFiltersCount = 0;
      for (const filter in filters) {
        if (filters[filter]?.length > 0) {
          appliedFiltersCount = appliedFiltersCount + filters[filter]?.length;
        }
      }
      return appliedFiltersCount;
    }
    return 0;
  } catch (error) {
    console.error("Error in calculateNumberOfAppiledFilters", error);
    return 0;
  }
};

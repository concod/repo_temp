import { replaceSpecialCharacter } from "core/Utils/functions/utils";

export const getFilterChips = (
  filterConfig,
  requiredFilters,
  handleViewAllClick
) => {
  let filterChips = [];
  Object.entries(filterConfig)?.map(([dimension, filterTags]) => {
    filterTags?.forEach((filter) => {
      filterChips?.push({
        handleViewAll: (data) => handleViewAllClick(data),
        id: filter.filterName || filter.label,
        label: filter.filterName || filter.label,
        required: requiredFilters?.[filter.filterName || filter.label] || false,
        values: filter.values.map((item) => {
          if (typeof item !== "string") {
            let newObj = {};
            if (Array.isArray(item.id)) {
              newObj = {
                id: replaceSpecialCharacter(item.id[0]),
                label: replaceSpecialCharacter(item.label[0]),
                value: replaceSpecialCharacter(item.value[0]),
              };
            } else {
              newObj = {
                id: replaceSpecialCharacter(item.id),
                label: replaceSpecialCharacter(item.label),
                value: replaceSpecialCharacter(item.value),
              };
            }
            return newObj;
          } else {
            return {
              id: replaceSpecialCharacter(item),
              label: replaceSpecialCharacter(item),
              value: replaceSpecialCharacter(item),
            };
          }
        }),
        dimension,
      });
    });
  });
  return filterChips;
};

export const selectedSavedFilter = (filter, selectedBadge) => {
  return selectedBadge === "All"
    ? true
    : selectedBadge === "Global"
    ? filter.is_broadcast
    : !filter.is_broadcast;
};

export const getFilterChipsofSavedFilters = (
  savedFilterData,
  selectedBadge
) => {
  const savedFilter = [];
  savedFilterData?.forEach((filter) => {
    if (selectedSavedFilter(filter, selectedBadge)) {
      savedFilter.push({
        id: filter.name,
        label: filter.name,
        value: filter.name,
      });
    }
  });
  return savedFilter;
};

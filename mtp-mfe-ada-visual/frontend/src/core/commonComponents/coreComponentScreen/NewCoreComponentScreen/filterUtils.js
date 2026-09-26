export const getSavedFilterData = (filterName, savedFilter) => {
  return savedFilter.filter((item) => item.name === filterName)?.[0] || {};
};

export const getFiltersDataDict = (filtersList = []) => {
  return filtersList.reduce(
    (obj, item) => Object.assign(obj, { [item.column_name]: { ...item } }),
    {}
  );
};

import { isEmpty } from "lodash";

export const transformFilterPayload = (filters, screenName, fields) => {
  const filtersList = [
    {
      attribute_name: "plansmart_season_type",
      operator: "in",
      filter_type: "non-cascaded",
      dimension: "plan",
      values: [screenName]
    }
  ];
  const filterSchema = {
    attribute_name: "",
    operator: "in",
    filter_type: "cascaded",
    values: []
  };

  fields.forEach((item) => {
    if (filters[item.accessor]) {
      const values = Array.isArray(filters[item.accessor])
        ? filters[item.accessor]
        : [filters[item.accessor]];

      if (values.length > 0) {
        // Check if values array is not empty
        filtersList.push({
          ...filterSchema,
          attribute_name: item.accessor,
          label: item.label,
          values
        });
      }
    }
  });

  return filtersList;
};

export const getMasterPlanFilterChips = (filters) => {
  return filters
    .filter((filter) => filter?.values?.length > 0)
    .map((filter) => {
      if (!isEmpty(filter.values)) {
        // Replace `attribute_name` with `label` and remove `filter_type` and `operator`
        const newFilter = {
          // Use `label` if available, otherwise fallback to `attribute_name`
          attribute_name: filter.label || filter.attribute_name,
          values: filter.values
        };

        return newFilter;
      }
    });
};

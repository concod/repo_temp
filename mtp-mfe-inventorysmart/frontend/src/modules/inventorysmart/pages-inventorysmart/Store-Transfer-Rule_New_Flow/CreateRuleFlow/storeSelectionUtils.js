import { configureAttributeOptions } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";
import { mapStoreGroupPoolOptions } from "modules/inventorysmart/pages-inventorysmart/Logistics-Configuration/logisticsConfigUtils";
import {
  DEFAULT_STORE_SELECTION_OPTIONS,
  DEFAULT_STORE_SELECTION_TABS,
  DEFAULT_POOL_METHOD_TABS,
  NO_GEOGRAPHICAL_RESTRICTION,
  POOL_METHOD_TAB,
  STORE_GROUP_GEOGRAPHICAL_RESTRICTION_VALUE,
  STORE_SELECTION_TAB,
} from "../constants";

export const parseStoreTransferOptions = (responseData) => {
  if (!responseData || typeof responseData !== "object") {
    return {
      tabs: DEFAULT_STORE_SELECTION_TABS,
      options: DEFAULT_STORE_SELECTION_OPTIONS,
    };
  }

  return {
    tabs: DEFAULT_STORE_SELECTION_TABS,
    options: {
      attribute_filters: responseData.attribute_filters || [],
      hierarchy_filters: responseData.hierarchy_filters || [],
      filter_by_attributes: responseData.filter_by_attributes || [],
      geographical_restrictions: responseData.geographical_restrictions || [],
    },
  };
};

export const getGeographicalRestrictionOptions = (
  restrictions = [],
  { includeStoreGroupOption = true } = {}
) => [
  NO_GEOGRAPHICAL_RESTRICTION,
  ...restrictions
    .filter(
      (restriction) =>
        includeStoreGroupOption ||
        restriction.value !== STORE_GROUP_GEOGRAPHICAL_RESTRICTION_VALUE
    )
    .map((restriction) => ({
      label: restriction.label,
      value: restriction.value,
    })),
];

export const extractStoreTransferFilterValues = (responseData) =>
  responseData?.data?.values ?? responseData?.values ?? [];

export const mapStoreTransferFilterOptions = (values = []) => {
  if (!Array.isArray(values) || !values.length) {
    return [];
  }

  if (typeof values[0] === "object" && values[0]?.code !== undefined) {
    return mapStoreGroupPoolOptions(values);
  }

  return configureAttributeOptions(values);
};

export const buildHierarchyFiltersPayload = (
  hierarchyFilters = [],
  selectedValues = {}
) => {
  const filters = {};

  hierarchyFilters.forEach((filter) => {
    const selected = selectedValues[filter.column];
    if (selected?.length) {
      filters[filter.column] = [
        {
          type: "list",
          operator: "in",
          values: selected.map((option) => option.value),
        },
      ];
    }
  });

  return filters;
};

export const buildStoreTransferFilterPayload = ({
  tab,
  get,
  hierarchyFilters = [],
  selectedValues = {},
  currentColumn = null,
}) => {
  const payload = { tab, get };

  if (!currentColumn || !hierarchyFilters.length) {
    return payload;
  }

  const currentIndex = hierarchyFilters.findIndex(
    (filter) => filter.column === currentColumn
  );

  const filters = {};
  hierarchyFilters.slice(0, currentIndex).forEach((filter) => {
    const selected = selectedValues[filter.column];
    if (selected?.length) {
      filters[filter.column] = [
        {
          type: "list",
          operator: "in",
          values: selected.map((option) => option.value),
        },
      ];
    }
  });

  if (Object.keys(filters).length) {
    payload.filters = filters;
  }

  return payload;
};

export const buildPoolStoreGroupFilterPayload = (selectedStoreGroup = []) => {
  const payload = {
    tab: STORE_SELECTION_TAB.STORE_GROUPS,
    get: "store_groups",
  };
  const sgCodes = selectedStoreGroup.map((option) => option.value);

  if (sgCodes.length) {
    payload.sg_codes = sgCodes;
  }

  return payload;
};

export const hasHierarchySelections = (
  hierarchyFilters = [],
  selectedValues = {}
) =>
  hierarchyFilters.some(
    (filter) => (selectedValues[filter.column] || []).length > 0
  );

export const buildGeneralInfoHierarchyCacheKey = (
  hierarchyFilters = [],
  selectedValues = {}
) =>
  hierarchyFilters
    .map((filter) => {
      const values = (selectedValues[filter.column] || [])
        .map((option) => option.value)
        .sort()
        .join(",");
      return `${filter.column}:${values}`;
    })
    .join("|");

export const buildPoolHierarchyPriorFilters = (
  hierarchyFilters = [],
  selectedValues = {},
  currentColumn = null
) => {
  if (!currentColumn || !hierarchyFilters.length) {
    return {};
  }

  const currentIndex = hierarchyFilters.findIndex(
    (filter) => filter.column === currentColumn
  );
  const filters = {};

  hierarchyFilters.slice(0, currentIndex).forEach((filter) => {
    const selected = selectedValues[filter.column];
    if (selected?.length) {
      filters[filter.column] = [
        {
          type: "list",
          operator: "in",
          values: selected.map((option) => option.value),
        },
      ];
    }
  });

  return filters;
};

/**
 * Pool selections narrow the General Information scope, they do not replace it.
 * A column selected in the pool overrides the same column from General
 * Information (3 states in General Information + 1 chosen in the pool sends
 * that 1 state); every other General Information column is still sent.
 */
export const mergeHierarchyFilters = (
  generalInfoFilters = {},
  poolFilters = {}
) => ({
  ...generalInfoFilters,
  ...poolFilters,
});

export const buildHierarchyTabPoolHierarchyApiContext = ({
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  poolHierarchyFilters = [],
  poolHierarchySelections = {},
  currentColumn = null,
}) => {
  const generalInfoFilters = buildHierarchyFiltersPayload(
    generalInfoHierarchyFilters,
    generalInfoHierarchySelections
  );
  const poolPriorFilters = buildPoolHierarchyPriorFilters(
    poolHierarchyFilters,
    poolHierarchySelections,
    currentColumn
  );

  return {
    filters: mergeHierarchyFilters(generalInfoFilters, poolPriorFilters),
    cacheKey: `${buildGeneralInfoHierarchyCacheKey(
      generalInfoHierarchyFilters,
      generalInfoHierarchySelections
    )}||${buildHierarchyFilterCacheKey(
      currentColumn,
      poolHierarchyFilters,
      poolHierarchySelections
    )}`,
  };
};

export const buildPoolSectionHierarchyFilters = ({
  generalInfoTab,
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  poolHierarchyFilters = [],
  poolHierarchySelections = {},
}) => {
  if (generalInfoTab === STORE_SELECTION_TAB.HIERARCHY) {
    return mergeHierarchyFilters(
      buildHierarchyFiltersPayload(
        generalInfoHierarchyFilters,
        generalInfoHierarchySelections
      ),
      buildHierarchyFiltersPayload(
        poolHierarchyFilters,
        poolHierarchySelections
      )
    );
  }

  if (generalInfoTab === STORE_SELECTION_TAB.ATTRIBUTES) {
    return buildHierarchyFiltersPayload(
      poolHierarchyFilters,
      poolHierarchySelections
    );
  }

  return buildHierarchyFiltersPayload(
    poolHierarchyFilters,
    poolHierarchySelections
  );
};

export const buildPoolHierarchyFilterPayload = ({
  generalInfoTab,
  get,
  generalInfoStoreGroup = [],
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  hierarchyFilters = [],
  selectedValues = {},
  currentColumn = null,
}) => {
  const payload = { tab: generalInfoTab, get };

  if (generalInfoTab === STORE_SELECTION_TAB.STORE_GROUPS) {
    const poolPriorFilters = buildPoolHierarchyPriorFilters(
      hierarchyFilters,
      selectedValues,
      currentColumn
    );

    if (Object.keys(poolPriorFilters).length) {
      payload.filters = poolPriorFilters;
    }

    const sgCodes = generalInfoStoreGroup.map((option) => option.value);
    if (sgCodes.length) {
      payload.sg_codes = sgCodes;
    }

    return payload;
  }

  if (generalInfoTab === STORE_SELECTION_TAB.HIERARCHY) {
    const { filters } = buildHierarchyTabPoolHierarchyApiContext({
      generalInfoHierarchyFilters,
      generalInfoHierarchySelections,
      poolHierarchyFilters: hierarchyFilters,
      poolHierarchySelections: selectedValues,
      currentColumn,
    });

    if (Object.keys(filters).length) {
      payload.filters = filters;
    }

    return payload;
  }

  return buildStoreTransferFilterPayload({
    tab: generalInfoTab,
    get,
    hierarchyFilters,
    selectedValues,
    currentColumn,
  });
};

export const buildPoolHierarchyFilterCacheKey = ({
  generalInfoTab,
  generalInfoStoreGroup = [],
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  column,
  hierarchyFilters = [],
  selectedValues = {},
}) => {
  if (generalInfoTab === STORE_SELECTION_TAB.STORE_GROUPS) {
    const sgCodes = generalInfoStoreGroup
      .map((option) => option.value)
      .sort()
      .join(",");
    const hierarchyKey = buildHierarchyFilterCacheKey(
      column,
      hierarchyFilters,
      selectedValues
    );

    return `${sgCodes}|${hierarchyKey}`;
  }

  if (generalInfoTab === STORE_SELECTION_TAB.HIERARCHY) {
    return buildHierarchyTabPoolHierarchyApiContext({
      generalInfoHierarchyFilters,
      generalInfoHierarchySelections,
      poolHierarchyFilters: hierarchyFilters,
      poolHierarchySelections: selectedValues,
      currentColumn: column,
    }).cacheKey;
  }

  return buildHierarchyFilterCacheKey(column, hierarchyFilters, selectedValues);
};

export const buildPoolStoreGroupCacheKey = (selectedStoreGroup = []) =>
  `store_groups:${selectedStoreGroup
    .map((option) => option.value)
    .sort()
    .join(",")}`;

export const getPoolFilterByAttributeSgCodes = (
  poolStoreGroup = [],
  generalInfoStoreGroup = []
) => {
  const source = poolStoreGroup.length ? poolStoreGroup : generalInfoStoreGroup;
  return source.map((option) => option.value);
};

export const buildPoolFilterByAttributePayload = ({
  generalInfoTab,
  column,
  poolStoreGroup = [],
  generalInfoStoreGroup = [],
  poolHierarchyFilters = [],
  poolHierarchySelections = {},
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  useGeneralInfoSgCodesOnly = false,
}) =>
  buildPoolSectionFilterPayload({
    generalInfoTab,
    get: column,
    poolStoreGroup,
    generalInfoStoreGroup,
    poolHierarchyFilters,
    poolHierarchySelections,
    generalInfoHierarchyFilters,
    generalInfoHierarchySelections,
    useGeneralInfoSgCodesOnly,
  });

export const buildPoolSectionFilterPayload = ({
  generalInfoTab,
  get,
  poolStoreGroup = [],
  generalInfoStoreGroup = [],
  poolHierarchyFilters = [],
  poolHierarchySelections = {},
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  useGeneralInfoSgCodesOnly = false,
}) => {
  const payload = {
    tab: generalInfoTab,
    get,
  };

  if (generalInfoTab === STORE_SELECTION_TAB.STORE_GROUPS) {
    const sgCodes = useGeneralInfoSgCodesOnly
      ? generalInfoStoreGroup.map((option) => option.value)
      : getPoolFilterByAttributeSgCodes(poolStoreGroup, generalInfoStoreGroup);

    if (sgCodes.length) {
      payload.sg_codes = sgCodes;
    }
  }

  const filters = buildPoolSectionHierarchyFilters({
    generalInfoTab,
    generalInfoHierarchyFilters,
    generalInfoHierarchySelections,
    poolHierarchyFilters,
    poolHierarchySelections,
  });

  if (Object.keys(filters).length) {
    payload.filters = filters;
  }

  return payload;
};

export const buildPoolFilterByAttributeContextKey = ({
  generalInfoTab,
  poolStoreGroup = [],
  generalInfoStoreGroup = [],
  poolHierarchyFilters = [],
  poolHierarchySelections = {},
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  useGeneralInfoSgCodesOnly = false,
}) => {
  if (generalInfoTab === STORE_SELECTION_TAB.HIERARCHY) {
    return `${buildGeneralInfoHierarchyCacheKey(
      generalInfoHierarchyFilters,
      generalInfoHierarchySelections
    )}||${buildGeneralInfoHierarchyCacheKey(
      poolHierarchyFilters,
      poolHierarchySelections
    )}`;
  }

  if (generalInfoTab === STORE_SELECTION_TAB.ATTRIBUTES) {
    return buildGeneralInfoHierarchyCacheKey(
      poolHierarchyFilters,
      poolHierarchySelections
    );
  }

  const sgPart = useGeneralInfoSgCodesOnly
    ? buildPoolStoreGroupCacheKey(generalInfoStoreGroup)
    : `${generalInfoTab}:${
        poolStoreGroup.length ? "pool" : "general"
      }:${getPoolFilterByAttributeSgCodes(poolStoreGroup, generalInfoStoreGroup)
        .sort()
        .join(",")}`;
  const filtersPart = poolHierarchyFilters
    .map((filter) => {
      const values = (poolHierarchySelections[filter.column] || [])
        .map((option) => option.value)
        .sort()
        .join(",");
      return `${filter.column}:${values}`;
    })
    .join("|");

  return filtersPart ? `${sgPart}|${filtersPart}` : sgPart;
};

export const isPoolGroupsMethodEnabled = (generalInfoTab) =>
  generalInfoTab === STORE_SELECTION_TAB.STORE_GROUPS;

export const getPoolMethodTabs = (generalInfoTab) =>
  DEFAULT_POOL_METHOD_TABS.map((tab) => ({
    ...tab,
    disabled:
      tab.value === POOL_METHOD_TAB.GROUPS &&
      !isPoolGroupsMethodEnabled(generalInfoTab),
  }));

export const isGeneralInfoComplete = ({
  generalInfoTab,
  selectedStoreGroup = [],
  hierarchyFilters = [],
  hierarchySelections = {},
  attributeTransferRestrictions = [],
  selectedGeographicalRestriction,
}) => {
  if (!selectedGeographicalRestriction) {
    return false;
  }

  if (generalInfoTab === STORE_SELECTION_TAB.STORE_GROUPS) {
    return selectedStoreGroup.length > 0;
  }

  if (generalInfoTab === STORE_SELECTION_TAB.HIERARCHY) {
    return hierarchyFilters.some(
      (filter) => (hierarchySelections[filter.column] || []).length > 0
    );
  }

  if (generalInfoTab === STORE_SELECTION_TAB.ATTRIBUTES) {
    return attributeTransferRestrictions.length > 0;
  }

  return false;
};

export const hasStoreSelectionTabData = ({
  selectedTab,
  selectedStoreGroup = [],
  hierarchyFilters = [],
  hierarchySelections = {},
  attributeTransferRestrictions = [],
  selectedGeographicalRestriction,
}) =>
  isGeneralInfoComplete({
    generalInfoTab: selectedTab,
    selectedStoreGroup,
    hierarchyFilters,
    hierarchySelections,
    attributeTransferRestrictions,
    selectedGeographicalRestriction,
  });

export const buildAttributeFilterCrossFilterPayload = (column) => ({
  attributes: [
    {
      attribute_name: column,
      dimension: "product_store",
      filter_type: "cascaded",
    },
  ],
  filter_type: "cascaded",
  is_urm_filter: true,
  screen_name: "Inventorysmart Constraints",
  application_code: 1
});

export const mapAttributeFilterChipOptions = (values = []) =>
  values.map((value) => ({
    label: value,
    value,
  }));

export const getAttributeFilterOptionsFromResponse = (values = []) =>
  values.length > 0
    ? mapAttributeFilterChipOptions(values)
    : configureAttributeOptions(values);

export const getPoolHierarchyFilters = (
  hierarchyFilters = [],
  filterByAttributes = []
) => {
  const excludedColumns = new Set(
    filterByAttributes.map((filter) => filter.column)
  );

  return hierarchyFilters.filter(
    (filter) => !excludedColumns.has(filter.column)
  );
};

export const getDefaultPoolHierarchySelections = (hierarchyFilters = []) =>
  hierarchyFilters.reduce((acc, filter) => {
    acc[filter.column] = [];
    return acc;
  }, {});

export const getEmptyGeneralInfoSelections = (hierarchyFilters = []) => ({
  selectedStoreGroup: [],
  hierarchySelections: getDefaultPoolHierarchySelections(hierarchyFilters),
  attributeTransferRestrictions: [],
});

export const buildHierarchyFilterCacheKey = (
  column,
  hierarchyFilters = [],
  selectedValues = {}
) => {
  const currentIndex = hierarchyFilters.findIndex(
    (filter) => filter.column === column
  );

  return hierarchyFilters
    .slice(0, currentIndex)
    .map((filter) => {
      const values = (selectedValues[filter.column] || [])
        .map((option) => option.value)
        .sort()
        .join(",");
      return `${filter.column}:${values}`;
    })
    .join("|");
};

/** @deprecated use parseStoreTransferOptions */
export const normalizeStoreSelectionTabs = (responseData) =>
  parseStoreTransferOptions(responseData).tabs;

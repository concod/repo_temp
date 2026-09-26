import {
  FULFILMENT_TYPE,
  NO_GEOGRAPHICAL_RESTRICTION,
  POOL_METHOD_TAB,
  STORE_SELECTION_TAB,
} from "../constants";
import {
  getPoolHierarchyFilters,
  hasHierarchySelections,
  isGeneralInfoComplete,
} from "./storeSelectionUtils";

const FULFILLMENT_TYPE_API_MAP = {
  [FULFILMENT_TYPE.NEED_BASED]: "need_based",
  [FULFILMENT_TYPE.FIXED_PUSH]: "fixed_push",
};

const mapOptionValues = (options = []) =>
  (options || []).map((option) => option.value);

const mapExcludeStoreValues = (options = []) =>
  mapOptionValues(options).map((value) => String(value));

export const mapGeographicalRestrictionForSave = (selectedValue) => {
  if (!selectedValue || selectedValue === NO_GEOGRAPHICAL_RESTRICTION.value) {
    return null;
  }

  return selectedValue;
};

export const isPoolConfigured = (
  poolState,
  { filterByAttributes = [], hierarchyFilters = [] } = {}
) => {
  if (!poolState) {
    return false;
  }

  const {
    activeMethod,
    storeGroup = [],
    poolHierarchySelections = {},
    attributeSelections = {},
    gradeFilter = [],
    excludeStores = [],
  } = poolState;

  if (activeMethod === POOL_METHOD_TAB.GROUPS && storeGroup.length > 0) {
    return true;
  }

  const poolHierarchyFilters = getPoolHierarchyFilters(
    hierarchyFilters,
    filterByAttributes
  );

  if (hasHierarchySelections(poolHierarchyFilters, poolHierarchySelections)) {
    return true;
  }

  if (gradeFilter.length > 0 || excludeStores.length > 0) {
    return true;
  }

  return filterByAttributes.some(
    (filter) => (attributeSelections[filter.column] || []).length > 0
  );
};

export const arePoolsValidForSave = (
  sourcePoolState,
  destinationPoolState,
  storeSelectionOptions = {},
  fulfilmentType
) => {
  const poolContext = {
    filterByAttributes: storeSelectionOptions.filter_by_attributes || [],
    hierarchyFilters: storeSelectionOptions.hierarchy_filters || [],
  };

  const isSourceConfigured = isPoolConfigured(sourcePoolState, poolContext);
  const isDestinationConfigured = isPoolConfigured(
    destinationPoolState,
    poolContext
  );

  if (fulfilmentType === FULFILMENT_TYPE.FIXED_PUSH) {
    return isSourceConfigured && isDestinationConfigured;
  }

  if (!isSourceConfigured && !isDestinationConfigured) {
    return true;
  }

  return isSourceConfigured && isDestinationConfigured;
};

export const isStoreSelectionValidForSave = ({
  fulfilmentType,
  selectedTab,
  selectedStoreGroup = [],
  hierarchySelections = {},
  attributeTransferRestrictions = [],
  selectedGeographicalRestriction,
  sourcePoolState,
  destinationPoolState,
  storeSelectionOptions = {},
}) => {
  const hierarchyFilters = storeSelectionOptions.hierarchy_filters || [];

  if (
    !isGeneralInfoComplete({
      generalInfoTab: selectedTab,
      selectedStoreGroup,
      hierarchyFilters,
      hierarchySelections,
      attributeTransferRestrictions,
      selectedGeographicalRestriction,
    })
  ) {
    return false;
  }

  return arePoolsValidForSave(
    sourcePoolState,
    destinationPoolState,
    storeSelectionOptions,
    fulfilmentType
  );
};

export const getStoreSelectionSaveValidationMessage = ({
  fulfilmentType,
  selectedTab,
  selectedStoreGroup = [],
  hierarchySelections = {},
  attributeTransferRestrictions = [],
  selectedGeographicalRestriction,
  sourcePoolState,
  destinationPoolState,
  storeSelectionOptions = {},
}) => {
  const hierarchyFilters = storeSelectionOptions.hierarchy_filters || [];

  if (
    !isGeneralInfoComplete({
      generalInfoTab: selectedTab,
      selectedStoreGroup,
      hierarchyFilters,
      hierarchySelections,
      attributeTransferRestrictions,
      selectedGeographicalRestriction,
    })
  ) {
    return "Please complete all mandatory fields in General information";
  }

  if (
    !arePoolsValidForSave(
      sourcePoolState,
      destinationPoolState,
      storeSelectionOptions,
      fulfilmentType
    )
  ) {
    if (fulfilmentType === FULFILMENT_TYPE.FIXED_PUSH) {
      return "Fixed Push requires at least one selection in both source and destination pools";
    }

    return "Please add at least one selection in both source and destination pools";
  }

  return null;
};

const buildFlatHierarchyFiltersForSave = (
  hierarchyFilters = [],
  hierarchySelections = {}
) => {
  const filters = {};

  hierarchyFilters.forEach((filter) => {
    const selected = hierarchySelections[filter.column];
    if (selected?.length) {
      filters[filter.column] = mapOptionValues(selected);
    }
  });

  return filters;
};

export const buildPoolSavePayload = (
  poolState,
  { filterByAttributes = [], hierarchyFilters = [] } = {}
) => {
  const {
    activeMethod,
    storeGroup = [],
    poolHierarchySelections = {},
    attributeSelections = {},
    gradeFilter = [],
    excludeStores = [],
  } = poolState;

  const poolHierarchyFilters = getPoolHierarchyFilters(
    hierarchyFilters,
    filterByAttributes
  );

  const payload = {
    tab:
      activeMethod === POOL_METHOD_TAB.GROUPS
        ? STORE_SELECTION_TAB.STORE_GROUPS
        : STORE_SELECTION_TAB.HIERARCHY,
  };

  if (activeMethod === POOL_METHOD_TAB.GROUPS) {
    payload.store_groups = mapOptionValues(storeGroup);
  } else {
    payload.filters = buildFlatHierarchyFiltersForSave(
      poolHierarchyFilters,
      poolHierarchySelections
    );
  }

  filterByAttributes.forEach((filter) => {
    payload[filter.column] = mapOptionValues(
      attributeSelections[filter.column] || []
    );
  });

  payload.psa_name = mapOptionValues(gradeFilter);
  payload.exclude_stores = mapExcludeStoreValues(excludeStores);

  return payload;
};

const buildBaseRulePayload = (formState, selectedGeographicalRestriction) => {
  const payload = {
    rule_name: formState.ruleName.trim(),
    fulfillment_type: FULFILLMENT_TYPE_API_MAP[formState.fulfilmentType],
  };

  if (formState.fulfilmentType === FULFILMENT_TYPE.NEED_BASED) {
    payload.geographical_restriction = mapGeographicalRestrictionForSave(
      selectedGeographicalRestriction
    );
  }

  const description = formState.description?.trim();
  if (description) {
    payload.rule_description = description;
  }

  return payload;
};

const appendPoolsToPayload = (
  payload,
  { sourcePoolState, destinationPoolState, storeSelectionOptions = {} }
) => {
  const { filter_by_attributes: filterByAttributes = [], hierarchy_filters = [] } =
    storeSelectionOptions;

  const poolContext = {
    filterByAttributes,
    hierarchyFilters: hierarchy_filters,
  };

  if (isPoolConfigured(sourcePoolState, poolContext)) {
    payload.source_pool = buildPoolSavePayload(sourcePoolState, poolContext);
  }

  if (isPoolConfigured(destinationPoolState, poolContext)) {
    payload.destination_pool = buildPoolSavePayload(
      destinationPoolState,
      poolContext
    );
  }

  return payload;
};

const buildStoreGroupsTabSavePayload = ({
  formState,
  selectedStoreGroup = [],
  selectedGeographicalRestriction,
  sourcePoolState,
  destinationPoolState,
  storeSelectionOptions = {},
}) => {
  const payload = {
    ...buildBaseRulePayload(formState, selectedGeographicalRestriction),
    tab: STORE_SELECTION_TAB.STORE_GROUPS,
    store_groups: mapOptionValues(selectedStoreGroup),
  };

  return appendPoolsToPayload(payload, {
    sourcePoolState,
    destinationPoolState,
    storeSelectionOptions,
  });
};

const buildHierarchyTabSavePayload = ({
  formState,
  hierarchySelections = {},
  selectedGeographicalRestriction,
  sourcePoolState,
  destinationPoolState,
  storeSelectionOptions = {},
}) => {
  const { hierarchy_filters: hierarchyFilters = [] } = storeSelectionOptions;

  const payload = {
    ...buildBaseRulePayload(formState, selectedGeographicalRestriction),
    tab: STORE_SELECTION_TAB.HIERARCHY,
    filters: buildFlatHierarchyFiltersForSave(
      hierarchyFilters,
      hierarchySelections
    ),
  };

  return appendPoolsToPayload(payload, {
    sourcePoolState,
    destinationPoolState,
    storeSelectionOptions,
  });
};

const buildAttributesTabSavePayload = ({
  formState,
  attributeTransferRestrictions = [],
  selectedGeographicalRestriction,
  sourcePoolState,
  destinationPoolState,
  storeSelectionOptions = {},
}) => {
  const { attribute_filters: attributeFilters = [] } = storeSelectionOptions;
  const attributeColumn = attributeFilters[0]?.column || "psa_name";

  const payload = {
    ...buildBaseRulePayload(formState, selectedGeographicalRestriction),
    tab: STORE_SELECTION_TAB.ATTRIBUTES,
    [attributeColumn]: attributeTransferRestrictions,
  };

  return appendPoolsToPayload(payload, {
    sourcePoolState,
    destinationPoolState,
    storeSelectionOptions,
  });
};

export const buildStoreTransferRuleSavePayload = ({
  formState,
  storeSelectionState,
}) => {
  if (!storeSelectionState) {
    return null;
  }

  const {
    selectedTab,
    selectedStoreGroup = [],
    hierarchySelections = {},
    attributeTransferRestrictions = [],
    selectedGeographicalRestriction,
    sourcePoolState,
    destinationPoolState,
    storeSelectionOptions = {},
  } = storeSelectionState;

  const sharedArgs = {
    formState,
    selectedGeographicalRestriction,
    sourcePoolState,
    destinationPoolState,
    storeSelectionOptions,
  };

  if (selectedTab === STORE_SELECTION_TAB.STORE_GROUPS) {
    return buildStoreGroupsTabSavePayload({
      ...sharedArgs,
      selectedStoreGroup,
    });
  }

  if (selectedTab === STORE_SELECTION_TAB.HIERARCHY) {
    return buildHierarchyTabSavePayload({
      ...sharedArgs,
      hierarchySelections,
    });
  }

  if (selectedTab === STORE_SELECTION_TAB.ATTRIBUTES) {
    return buildAttributesTabSavePayload({
      ...sharedArgs,
      attributeTransferRestrictions,
    });
  }

  return null;
};

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ButtonGroup } from "impact-ui-v3";
import { POOL_METHOD_TAB, STORE_SELECTION_TAB } from "../constants";
import PoolGroupsTabContent from "./PoolGroupsTabContent";
import PoolHierarchyTabContent from "./PoolHierarchyTabContent";
import {
  buildGeneralInfoHierarchyCacheKey,
  buildPoolFilterByAttributeContextKey,
  buildPoolStoreGroupCacheKey,
  getDefaultPoolHierarchySelections,
  getPoolHierarchyFilters,
  getPoolMethodTabs,
  isPoolGroupsMethodEnabled,
} from "./storeSelectionUtils";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const getDefaultAttributeSelections = (filterByAttributes = []) =>
  filterByAttributes.reduce((acc, filter) => {
    acc[filter.column] = [];
    return acc;
  }, {});

const RestrictionPoolPanel = ({
  title,
  generalInfoTab,
  generalInfoStoreGroup = [],
  generalInfoHierarchySelections = {},
  hierarchyFilters = [],
  attributeFilters = [],
  filterByAttributes = [],
  attributeTransferRestrictions = [],
  onPoolStateChange,
  isDisabled = false,
  initialPoolState = null,
}) => {
  const classes = useCreateRuleFlowStyles();
  const isGroupsMethodEnabled = isPoolGroupsMethodEnabled(generalInfoTab);
  const skipAutoResetsRef = useRef(Boolean(initialPoolState));
  const [activeMethod, setActiveMethod] = useState(() => {
    if (initialPoolState?.activeMethod) {
      return initialPoolState.activeMethod;
    }
    return isGroupsMethodEnabled
      ? POOL_METHOD_TAB.GROUPS
      : POOL_METHOD_TAB.HIERARCHY;
  });
  const [storeGroup, setStoreGroup] = useState(
    () => initialPoolState?.storeGroup || []
  );
  const [poolHierarchySelections, setPoolHierarchySelections] = useState(
    () => initialPoolState?.poolHierarchySelections || {}
  );
  const [attributeSelections, setAttributeSelections] = useState(() =>
    initialPoolState?.attributeSelections ||
    getDefaultAttributeSelections(filterByAttributes)
  );
  const [gradeFilter, setGradeFilter] = useState(
    () => initialPoolState?.gradeFilter || []
  );
  const [excludeStores, setExcludeStores] = useState(
    () => initialPoolState?.excludeStores || []
  );
  const hasRehydratedRef = useRef(false);

  useEffect(() => {
    if (!attributeTransferRestrictions.length) {
      return;
    }

    const allowedValues = new Set(attributeTransferRestrictions);
    setGradeFilter((prev) =>
      prev.filter((option) => allowedValues.has(option?.value))
    );
  }, [attributeTransferRestrictions]);

  const applyPoolState = useCallback((poolState) => {
    if (!poolState) {
      return;
    }

    if (poolState.activeMethod) {
      setActiveMethod(poolState.activeMethod);
    }
    setStoreGroup(poolState.storeGroup || []);
    setPoolHierarchySelections(poolState.poolHierarchySelections || {});
    setAttributeSelections(
      poolState.attributeSelections ||
        getDefaultAttributeSelections(filterByAttributes)
    );
    setGradeFilter(poolState.gradeFilter || []);
    setExcludeStores(poolState.excludeStores || []);
  }, [filterByAttributes]);

  const poolMethodTabs = useMemo(
    () => getPoolMethodTabs(generalInfoTab),
    [generalInfoTab]
  );

  const poolHierarchyFilters = useMemo(
    () => getPoolHierarchyFilters(hierarchyFilters, filterByAttributes),
    [hierarchyFilters, filterByAttributes]
  );

  const filterByAttributeContextKey = useMemo(
    () =>
      buildPoolFilterByAttributeContextKey({
        generalInfoTab,
        poolStoreGroup: storeGroup,
        generalInfoStoreGroup,
      }),
    [generalInfoStoreGroup, generalInfoTab, storeGroup]
  );

  const poolHierarchyFilterContextKey = useMemo(
    () =>
      buildPoolFilterByAttributeContextKey({
        generalInfoTab,
        poolStoreGroup: storeGroup,
        generalInfoStoreGroup,
        poolHierarchyFilters,
        poolHierarchySelections,
        generalInfoHierarchyFilters: hierarchyFilters,
        generalInfoHierarchySelections,
        useGeneralInfoSgCodesOnly: isGroupsMethodEnabled,
      }),
    [
      generalInfoHierarchySelections,
      generalInfoStoreGroup,
      generalInfoTab,
      hierarchyFilters,
      isGroupsMethodEnabled,
      poolHierarchyFilters,
      poolHierarchySelections,
      storeGroup,
    ]
  );

  const generalInfoStoreGroupKey = useMemo(
    () => buildPoolStoreGroupCacheKey(generalInfoStoreGroup),
    [generalInfoStoreGroup]
  );

  const generalInfoHierarchyKey = useMemo(
    () =>
      buildGeneralInfoHierarchyCacheKey(
        hierarchyFilters,
        generalInfoHierarchySelections
      ),
    [generalInfoHierarchySelections, hierarchyFilters]
  );

  useEffect(() => {
    if (skipAutoResetsRef.current) {
      return;
    }
    setAttributeSelections(getDefaultAttributeSelections(filterByAttributes));
  }, [filterByAttributes]);

  useEffect(() => {
    if (skipAutoResetsRef.current) {
      return;
    }

    if (!isGroupsMethodEnabled) {
      return;
    }

    setAttributeSelections(getDefaultAttributeSelections(filterByAttributes));
    setExcludeStores([]);
  }, [filterByAttributeContextKey, filterByAttributes, isGroupsMethodEnabled]);

  useEffect(() => {
    if (skipAutoResetsRef.current) {
      return;
    }

    const isStoreGroupsHierarchyTab =
      isGroupsMethodEnabled && activeMethod === POOL_METHOD_TAB.HIERARCHY;
    const isHierarchyOrAttributesTab =
      generalInfoTab === STORE_SELECTION_TAB.HIERARCHY ||
      generalInfoTab === STORE_SELECTION_TAB.ATTRIBUTES;

    if (!isStoreGroupsHierarchyTab && !isHierarchyOrAttributesTab) {
      return;
    }

    setAttributeSelections(getDefaultAttributeSelections(filterByAttributes));
    setGradeFilter([]);
    setExcludeStores([]);
  }, [
    activeMethod,
    filterByAttributes,
    generalInfoTab,
    isGroupsMethodEnabled,
    poolHierarchyFilterContextKey,
  ]);

  useEffect(() => {
    if (skipAutoResetsRef.current) {
      return;
    }
    setPoolHierarchySelections(
      getDefaultPoolHierarchySelections(poolHierarchyFilters)
    );
  }, [poolHierarchyFilters]);

  useEffect(() => {
    if (skipAutoResetsRef.current) {
      return;
    }

    if (!isGroupsMethodEnabled) {
      return;
    }

    setPoolHierarchySelections(
      getDefaultPoolHierarchySelections(poolHierarchyFilters)
    );
  }, [generalInfoStoreGroupKey, isGroupsMethodEnabled, poolHierarchyFilters]);

  useEffect(() => {
    if (skipAutoResetsRef.current) {
      return;
    }

    if (generalInfoTab !== STORE_SELECTION_TAB.HIERARCHY) {
      return;
    }

    setPoolHierarchySelections(
      getDefaultPoolHierarchySelections(poolHierarchyFilters)
    );
    setAttributeSelections(getDefaultAttributeSelections(filterByAttributes));
    setGradeFilter([]);
    setExcludeStores([]);
  }, [
    filterByAttributes,
    generalInfoHierarchyKey,
    generalInfoTab,
    poolHierarchyFilters,
  ]);

  useEffect(() => {
    if (skipAutoResetsRef.current) {
      return;
    }

    setActiveMethod(
      isGroupsMethodEnabled ? POOL_METHOD_TAB.GROUPS : POOL_METHOD_TAB.HIERARCHY
    );
    setStoreGroup([]);
    setPoolHierarchySelections(
      getDefaultPoolHierarchySelections(poolHierarchyFilters)
    );
    setAttributeSelections(getDefaultAttributeSelections(filterByAttributes));
    setGradeFilter([]);
    setExcludeStores([]);
  }, [filterByAttributes, generalInfoTab, isGroupsMethodEnabled, poolHierarchyFilters]);

  useEffect(() => {
    if (!initialPoolState || hasRehydratedRef.current) {
      return undefined;
    }

    // Re-apply after child mount effects (e.g. pool selects) so hydration isn't wiped.
    const timeoutId = window.setTimeout(() => {
      applyPoolState(initialPoolState);
      hasRehydratedRef.current = true;
      skipAutoResetsRef.current = false;
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [applyPoolState, initialPoolState]);

  const resetSharedPoolFilterSections = useCallback(() => {
    setAttributeSelections(getDefaultAttributeSelections(filterByAttributes));
    setGradeFilter([]);
    setExcludeStores([]);
  }, [filterByAttributes]);

  const handleMethodChange = (_event, value) => {
    if (isDisabled) {
      return;
    }

    if (
      value === POOL_METHOD_TAB.GROUPS &&
      !isPoolGroupsMethodEnabled(generalInfoTab)
    ) {
      return;
    }

    if (value && value !== activeMethod) {
      resetSharedPoolFilterSections();
      setActiveMethod(value);
    }
  };

  const handleAttributeSelectionChange = (column, options) => {
    setAttributeSelections((prev) => ({
      ...prev,
      [column]: options || [],
    }));
  };

  const handlePoolStoreGroupChange = useCallback(
    (options) => {
      setStoreGroup(options || []);
      resetSharedPoolFilterSections();
    },
    [resetSharedPoolFilterSections]
  );

  const handleHierarchySelectionChange = (column, options) => {
    setPoolHierarchySelections((prev) => ({
      ...prev,
      [column]: options || [],
    }));
  };

  const usePoolHierarchyTabApis =
    generalInfoTab === STORE_SELECTION_TAB.HIERARCHY ||
    generalInfoTab === STORE_SELECTION_TAB.ATTRIBUTES ||
    isGroupsMethodEnabled;

  useEffect(() => {
    onPoolStateChange?.({
      activeMethod,
      storeGroup,
      poolHierarchySelections,
      attributeSelections,
      gradeFilter,
      excludeStores,
    });
  }, [
    activeMethod,
    attributeSelections,
    excludeStores,
    gradeFilter,
    onPoolStateChange,
    poolHierarchySelections,
    storeGroup,
  ]);

  return (
    <div className={classes.restrictionPoolPanel}>
      <div className={classes.restrictionPoolHeader}>
        <p className={classes.restrictionPoolTitle}>{title}</p>
      </div>

      <div className={classes.restrictionPoolBody}>
        <ButtonGroup
          options={poolMethodTabs.map((tab) => ({
            ...tab,
            disabled: isDisabled || tab.disabled,
          }))}
          selectedOption={activeMethod}
          onChange={handleMethodChange}
        />

        {activeMethod === POOL_METHOD_TAB.GROUPS && isGroupsMethodEnabled ? (
          <PoolGroupsTabContent
            generalInfoTab={generalInfoTab}
            generalInfoStoreGroup={generalInfoStoreGroup}
            attributeFilters={attributeFilters}
            filterByAttributes={filterByAttributes}
            filterByAttributeContextKey={filterByAttributeContextKey}
            storeGroup={storeGroup}
            onStoreGroupChange={handlePoolStoreGroupChange}
            attributeSelections={attributeSelections}
            onAttributeSelectionChange={handleAttributeSelectionChange}
            gradeFilter={gradeFilter}
            onGradeFilterChange={setGradeFilter}
            attributeTransferRestrictions={attributeTransferRestrictions}
            excludeStores={excludeStores}
            onExcludeStoresChange={setExcludeStores}
            isDisabled={isDisabled}
          />
        ) : (
          <PoolHierarchyTabContent
            generalInfoTab={generalInfoTab}
            generalInfoStoreGroup={generalInfoStoreGroup}
            generalInfoHierarchyFilters={hierarchyFilters}
            generalInfoHierarchySelections={generalInfoHierarchySelections}
            attributeFilters={attributeFilters}
            poolHierarchyFilters={poolHierarchyFilters}
            hierarchySelections={poolHierarchySelections}
            onPoolHierarchySelectionsChange={setPoolHierarchySelections}
            onHierarchySelectionChange={handleHierarchySelectionChange}
            filterByAttributes={filterByAttributes}
            attributeSelections={attributeSelections}
            onAttributeSelectionChange={handleAttributeSelectionChange}
            gradeFilter={gradeFilter}
            onGradeFilterChange={setGradeFilter}
            attributeTransferRestrictions={attributeTransferRestrictions}
            excludeStores={excludeStores}
            onExcludeStoresChange={setExcludeStores}
            filterByAttributeContextKey={poolHierarchyFilterContextKey}
            useFilterByAttributeApi={usePoolHierarchyTabApis}
            useExcludeStoresApi={usePoolHierarchyTabApis}
            useGeneralInfoSgCodesOnly={isGroupsMethodEnabled}
            usePoolHierarchyApi={usePoolHierarchyTabApis}
            isDisabled={isDisabled}
          />
        )}
      </div>
    </div>
  );
};

export default RestrictionPoolPanel;

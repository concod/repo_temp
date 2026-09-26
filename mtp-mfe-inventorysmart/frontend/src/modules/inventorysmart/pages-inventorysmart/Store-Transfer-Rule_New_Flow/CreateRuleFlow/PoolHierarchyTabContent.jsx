import { STORE_SELECTION_TAB } from "../constants";
import {
  PoolExcludeStoresSection,
  PoolFilterByAttributesSection,
} from "./PoolSharedSections";
import PoolHierarchyFilterFields from "./PoolHierarchyFilterFields";
import RestrictionMultiSelectField from "./RestrictionMultiSelectField";
import {
  buildGeneralInfoHierarchyCacheKey,
  buildPoolStoreGroupCacheKey,
} from "./storeSelectionUtils";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const PoolHierarchyTabContent = ({
  generalInfoTab,
  generalInfoStoreGroup = [],
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  attributeFilters = [],
  poolHierarchyFilters = [],
  hierarchySelections = {},
  onPoolHierarchySelectionsChange,
  onHierarchySelectionChange,
  filterByAttributes = [],
  attributeSelections = {},
  onAttributeSelectionChange,
  gradeFilter = [],
  onGradeFilterChange,
  attributeTransferRestrictions = [],
  excludeStores,
  onExcludeStoresChange,
  filterByAttributeContextKey,
  useFilterByAttributeApi = false,
  useExcludeStoresApi = false,
  useGeneralInfoSgCodesOnly = false,
  usePoolHierarchyApi = false,
  isDisabled = false,
}) => {
  const classes = useCreateRuleFlowStyles();
  const poolHierarchyColumnsKey = poolHierarchyFilters
    .map((filter) => filter.column)
    .join(",");
  const hierarchyFieldsKey =
    generalInfoTab === STORE_SELECTION_TAB.STORE_GROUPS
      ? `${buildPoolStoreGroupCacheKey(
          generalInfoStoreGroup
        )}:${poolHierarchyColumnsKey}`
      : generalInfoTab === STORE_SELECTION_TAB.HIERARCHY
      ? `${buildGeneralInfoHierarchyCacheKey(
          generalInfoHierarchyFilters,
          generalInfoHierarchySelections
        )}:${poolHierarchyColumnsKey}`
      : poolHierarchyColumnsKey;

  return (
    <div className={classes.poolGroupsContent}>
      {poolHierarchyFilters.length > 0 &&
        (usePoolHierarchyApi ? (
          <PoolHierarchyFilterFields
            key={hierarchyFieldsKey}
            generalInfoTab={generalInfoTab}
            generalInfoStoreGroup={generalInfoStoreGroup}
            generalInfoHierarchyFilters={generalInfoHierarchyFilters}
            generalInfoHierarchySelections={generalInfoHierarchySelections}
            hierarchyFilters={poolHierarchyFilters}
            selectedValues={hierarchySelections}
            onSelectedValuesChange={onPoolHierarchySelectionsChange}
            isDisabled={isDisabled}
          />
        ) : (
          <div className={classes.poolHierarchyFiltersRow}>
            {poolHierarchyFilters.map((filter) => (
              <RestrictionMultiSelectField
                key={filter.column}
                label={filter.label}
                selectedOptions={hierarchySelections[filter.column] || []}
                onChange={(options) =>
                  onHierarchySelectionChange?.(filter.column, options)
                }
                isDisabled={isDisabled}
              />
            ))}
          </div>
        ))}

      <PoolFilterByAttributesSection
        attributeFilters={attributeFilters}
        filterByAttributes={filterByAttributes}
        attributeSelections={attributeSelections}
        onAttributeSelectionChange={onAttributeSelectionChange}
        gradeFilter={gradeFilter}
        onGradeFilterChange={onGradeFilterChange}
        attributeTransferRestrictions={attributeTransferRestrictions}
        generalInfoTab={generalInfoTab}
        generalInfoStoreGroup={generalInfoStoreGroup}
        poolHierarchyFilters={poolHierarchyFilters}
        poolHierarchySelections={hierarchySelections}
        generalInfoHierarchyFilters={generalInfoHierarchyFilters}
        generalInfoHierarchySelections={generalInfoHierarchySelections}
        useGeneralInfoSgCodesOnly={useGeneralInfoSgCodesOnly}
        filterByAttributeContextKey={filterByAttributeContextKey}
        useFilterByAttributeApi={useFilterByAttributeApi}
        isDisabled={isDisabled}
      />

      <PoolExcludeStoresSection
        excludeStores={excludeStores}
        onExcludeStoresChange={onExcludeStoresChange}
        generalInfoTab={generalInfoTab}
        generalInfoStoreGroup={generalInfoStoreGroup}
        poolHierarchyFilters={poolHierarchyFilters}
        poolHierarchySelections={hierarchySelections}
        generalInfoHierarchyFilters={generalInfoHierarchyFilters}
        generalInfoHierarchySelections={generalInfoHierarchySelections}
        useGeneralInfoSgCodesOnly={useGeneralInfoSgCodesOnly}
        sgCodesContextKey={filterByAttributeContextKey}
        useExcludeStoresApi={useExcludeStoresApi}
        isDisabled={isDisabled}
      />
    </div>
  );
};

export default PoolHierarchyTabContent;

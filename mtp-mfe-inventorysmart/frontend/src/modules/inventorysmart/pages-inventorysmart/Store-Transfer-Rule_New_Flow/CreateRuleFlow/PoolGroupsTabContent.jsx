import PoolStoreGroupSelectField from "./PoolStoreGroupSelectField";
import {
  PoolExcludeStoresSection,
  PoolFilterByAttributesSection,
} from "./PoolSharedSections";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const PoolGroupsTabContent = ({
  generalInfoTab,
  generalInfoStoreGroup = [],
  attributeFilters = [],
  filterByAttributes = [],
  filterByAttributeContextKey,
  storeGroup,
  onStoreGroupChange,
  attributeSelections = {},
  onAttributeSelectionChange,
  gradeFilter = [],
  onGradeFilterChange,
  attributeTransferRestrictions = [],
  excludeStores,
  onExcludeStoresChange,
  isDisabled = false,
}) => {
  const classes = useCreateRuleFlowStyles();

  return (
    <div className={classes.poolGroupsContent}>
      <PoolStoreGroupSelectField
        generalInfoStoreGroup={generalInfoStoreGroup}
        selectedStoreGroup={storeGroup}
        onStoreGroupChange={onStoreGroupChange}
        isDisabled={isDisabled}
      />

      <PoolFilterByAttributesSection
        attributeFilters={attributeFilters}
        filterByAttributes={filterByAttributes}
        attributeSelections={attributeSelections}
        onAttributeSelectionChange={onAttributeSelectionChange}
        gradeFilter={gradeFilter}
        onGradeFilterChange={onGradeFilterChange}
        attributeTransferRestrictions={attributeTransferRestrictions}
        generalInfoTab={generalInfoTab}
        poolStoreGroup={storeGroup}
        generalInfoStoreGroup={generalInfoStoreGroup}
        filterByAttributeContextKey={filterByAttributeContextKey}
        useFilterByAttributeApi
        isDisabled={isDisabled}
      />

      <PoolExcludeStoresSection
        excludeStores={excludeStores}
        onExcludeStoresChange={onExcludeStoresChange}
        generalInfoTab={generalInfoTab}
        poolStoreGroup={storeGroup}
        generalInfoStoreGroup={generalInfoStoreGroup}
        sgCodesContextKey={filterByAttributeContextKey}
        useExcludeStoresApi
        isDisabled={isDisabled}
      />
    </div>
  );
};

export default PoolGroupsTabContent;

import GradeFilterSelectField from "./GradeFilterSelectField";
import PoolExcludeStoresSelectField from "./PoolExcludeStoresSelectField";
import PoolFilterByAttributeSelectField from "./PoolFilterByAttributeSelectField";
import RestrictionMultiSelectField from "./RestrictionMultiSelectField";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";
import { useTranslation } from "impact-ui-v3";

const getFilterSelectLabel = (filter, t) =>
  `${t(filter.label)} ${t("inventorysmart.filter")}`;

export const PoolFilterByAttributesSection = ({
  attributeFilters = [],
  filterByAttributes = [],
  attributeSelections = {},
  onAttributeSelectionChange,
  gradeFilter = [],
  onGradeFilterChange,
  attributeTransferRestrictions = [],
  generalInfoTab,
  poolStoreGroup = [],
  generalInfoStoreGroup = [],
  poolHierarchyFilters = [],
  poolHierarchySelections = {},
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  useGeneralInfoSgCodesOnly = false,
  filterByAttributeContextKey,
  useFilterByAttributeApi = false,
  isDisabled = false,
}) => {
  const { t } = useTranslation();
  const classes = useCreateRuleFlowStyles();

  return (
    <div className={classes.poolSubSection}>
      <p className={classes.poolSubSectionTitle}>
        {t("inventorysmart.filterByAttributes")}
      </p>
      <div className={classes.poolFilterByAttributesRow}>
        {filterByAttributes.map((filter) =>
          useFilterByAttributeApi ? (
            <PoolFilterByAttributeSelectField
              key={`${filter.column}-${filterByAttributeContextKey}`}
              label={getFilterSelectLabel(filter, t)}
              column={filter.column}
              generalInfoTab={generalInfoTab}
              poolStoreGroup={poolStoreGroup}
              generalInfoStoreGroup={generalInfoStoreGroup}
              poolHierarchyFilters={poolHierarchyFilters}
              poolHierarchySelections={poolHierarchySelections}
              generalInfoHierarchyFilters={generalInfoHierarchyFilters}
              generalInfoHierarchySelections={generalInfoHierarchySelections}
              useGeneralInfoSgCodesOnly={useGeneralInfoSgCodesOnly}
              selectedOptions={attributeSelections[filter.column] || []}
              onChange={(options) =>
                onAttributeSelectionChange?.(filter.column, options)
              }
              isDisabled={isDisabled}
            />
          ) : (
            <RestrictionMultiSelectField
              key={filter.column}
              label={getFilterSelectLabel(filter, t)}
              selectedOptions={attributeSelections[filter.column] || []}
              onChange={(options) =>
                onAttributeSelectionChange?.(filter.column, options)
              }
              isDisabled={isDisabled}
            />
          )
        )}
        <GradeFilterSelectField
          attributeFilters={attributeFilters}
          attributeTransferRestrictions={attributeTransferRestrictions}
          selectedOptions={gradeFilter}
          onChange={onGradeFilterChange}
          isDisabled={isDisabled}
        />
      </div>
    </div>
  );
};

export const PoolExcludeStoresSection = ({
  excludeStores = [],
  onExcludeStoresChange,
  generalInfoTab,
  poolStoreGroup = [],
  generalInfoStoreGroup = [],
  poolHierarchyFilters = [],
  poolHierarchySelections = {},
  generalInfoHierarchyFilters = [],
  generalInfoHierarchySelections = {},
  useGeneralInfoSgCodesOnly = false,
  sgCodesContextKey,
  useExcludeStoresApi = false,
  isDisabled = false,
}) => {
  const { t } = useTranslation();
  const classes = useCreateRuleFlowStyles();

  return (
    <div className={classes.poolSubSection}>
      <p className={classes.poolSubSectionTitle}>
        {t("inventorysmart.excludeStores")}
      </p>
      {useExcludeStoresApi ? (
        <PoolExcludeStoresSelectField
          key={sgCodesContextKey}
          generalInfoTab={generalInfoTab}
          poolStoreGroup={poolStoreGroup}
          generalInfoStoreGroup={generalInfoStoreGroup}
          poolHierarchyFilters={poolHierarchyFilters}
          poolHierarchySelections={poolHierarchySelections}
          generalInfoHierarchyFilters={generalInfoHierarchyFilters}
          generalInfoHierarchySelections={generalInfoHierarchySelections}
          useGeneralInfoSgCodesOnly={useGeneralInfoSgCodesOnly}
          sgCodesContextKey={sgCodesContextKey}
          selectedOptions={excludeStores}
          onChange={onExcludeStoresChange}
          isDisabled={isDisabled}
        />
      ) : (
        <RestrictionMultiSelectField
          label={t("inventorysmart.selectStore")}
          selectedOptions={excludeStores}
          onChange={onExcludeStoresChange}
          isDisabled={isDisabled}
        />
      )}
    </div>
  );
};

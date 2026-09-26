import { useEffect } from "react";
import { Chips } from "impact-ui-v3";
import {
  NO_GEOGRAPHICAL_RESTRICTION,
  STORE_GROUP_GEOGRAPHICAL_RESTRICTION_VALUE,
  STORE_SELECTION_TAB,
} from "../constants";
import AttributeTransferRestrictionChips from "./AttributeTransferRestrictionChips";
import HierarchyFilterFields from "./HierarchyFilterFields";
import StoreGroupSelectField from "./StoreGroupSelectField";
import FieldLabel from "./FieldLabel";
import { getGeographicalRestrictionOptions } from "./storeSelectionUtils";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const GeneralInformationSection = ({
  selectedTab,
  geographicalRestrictions = [],
  hierarchyFilters = [],
  attributeFilters = [],
  attributeTransferRestrictions = [],
  onAttributeTransferRestrictionsChange,
  hierarchySelections = {},
  onHierarchySelectionsChange,
  selectedGeographicalRestriction,
  onGeographicalRestrictionChange,
  selectedStoreGroup,
  onStoreGroupChange,
  isDisabled = false,
}) => {
  const classes = useCreateRuleFlowStyles();
  const showStoreGroupField = selectedTab === STORE_SELECTION_TAB.STORE_GROUPS;
  const showHierarchyFields = selectedTab === STORE_SELECTION_TAB.HIERARCHY;
  const showAttributeFields = selectedTab === STORE_SELECTION_TAB.ATTRIBUTES;
  const includeStoreGroupGeoRestriction = showStoreGroupField;
  const geoRestrictionOptions = getGeographicalRestrictionOptions(
    geographicalRestrictions,
    { includeStoreGroupOption: includeStoreGroupGeoRestriction }
  );

  useEffect(() => {
    if (
      !includeStoreGroupGeoRestriction &&
      selectedGeographicalRestriction === STORE_GROUP_GEOGRAPHICAL_RESTRICTION_VALUE
    ) {
      onGeographicalRestrictionChange(NO_GEOGRAPHICAL_RESTRICTION.value);
    }
  }, [
    includeStoreGroupGeoRestriction,
    onGeographicalRestrictionChange,
    selectedGeographicalRestriction,
  ]);

  const renderGeographicalRestriction = (shouldGrow = false) => (
    <div
      className={`${classes.geoRestrictionField} ${
        shouldGrow ? classes.geoRestrictionFieldGrow : ""
      }`}
    >
      <FieldLabel isRequired>Geographical Restriction</FieldLabel>
      <div
        className={`${classes.geoRestrictionChips} ${
          isDisabled ? classes.chipsDisabled : ""
        }`}
      >
        {geoRestrictionOptions.map((option) => (
          <Chips
            key={option.value}
            label={option.label}
            type="single"
            isActive={selectedGeographicalRestriction === option.value}
            onClick={() => {
              if (!isDisabled) {
                onGeographicalRestrictionChange(option.value);
              }
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className={classes.sectionCard}>
      <h3 className={classes.sectionTitle}>General information</h3>
      <div className={classes.generalInfoContent}>
        {showHierarchyFields && (
          <HierarchyFilterFields
            selectedTab={selectedTab}
            hierarchyFilters={hierarchyFilters}
            selectedValues={hierarchySelections}
            onSelectedValuesChange={onHierarchySelectionsChange}
            isDisabled={isDisabled}
          />
        )}

        <div className={classes.generalInfoRow}>
          {showStoreGroupField && (
            <StoreGroupSelectField
              selectedStoreGroup={selectedStoreGroup}
              onStoreGroupChange={onStoreGroupChange}
              isDisabled={isDisabled}
            />
          )}

          {showAttributeFields && (
            <AttributeTransferRestrictionChips
              attributeFilters={attributeFilters}
              selectedValues={attributeTransferRestrictions}
              onSelectedValuesChange={onAttributeTransferRestrictionsChange}
              isDisabled={isDisabled}
            />
          )}

          {renderGeographicalRestriction(showStoreGroupField)}
        </div>
      </div>
    </div>
  );
};

export default GeneralInformationSection;

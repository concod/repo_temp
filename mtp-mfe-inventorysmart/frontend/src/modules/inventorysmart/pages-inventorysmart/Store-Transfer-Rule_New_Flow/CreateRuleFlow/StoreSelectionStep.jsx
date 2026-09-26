import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import Loader from "core/Utils/Loader/loader";
import { ButtonGroup, Prompt } from "impact-ui-v3";
import {
  DEFAULT_STORE_SELECTION_OPTIONS,
  DEFAULT_STORE_SELECTION_TABS,
  NO_GEOGRAPHICAL_RESTRICTION,
  STORE_SELECTION_TAB_SWITCH_PROMPT,
} from "../constants";
import GeneralInformationSection from "./GeneralInformationSection";
import SourceDestinationRestrictionsSection from "./SourceDestinationRestrictionsSection";
import {
  getEmptyGeneralInfoSelections,
  hasStoreSelectionTabData,
} from "./storeSelectionUtils";
import { isStoreSelectionValidForSave } from "./buildSaveRulePayload";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const StoreSelectionStep = forwardRef(({
  isLoading = false,
  fulfilmentType,
  tabOptions = DEFAULT_STORE_SELECTION_TABS,
  storeSelectionOptions = DEFAULT_STORE_SELECTION_OPTIONS,
  onValidityChange,
  isDisabled = false,
  initialStoreSelectionState = null,
}, ref) => {
  const classes = useCreateRuleFlowStyles();
  const skipGeneralInfoResetRef = useRef(Boolean(initialStoreSelectionState));
  const [selectedTab, setSelectedTab] = useState(
    () =>
      initialStoreSelectionState?.selectedTab ||
      tabOptions[0]?.value ||
      DEFAULT_STORE_SELECTION_TABS[0].value
  );
  const [selectedGeographicalRestriction, setSelectedGeographicalRestriction] =
    useState(
      () =>
        initialStoreSelectionState?.selectedGeographicalRestriction ||
        NO_GEOGRAPHICAL_RESTRICTION.value
    );
  const [selectedStoreGroup, setSelectedStoreGroup] = useState(
    () => initialStoreSelectionState?.selectedStoreGroup || []
  );
  const [hierarchySelections, setHierarchySelections] = useState(
    () => initialStoreSelectionState?.hierarchySelections || {}
  );
  const [attributeTransferRestrictions, setAttributeTransferRestrictions] =
    useState(
      () => initialStoreSelectionState?.attributeTransferRestrictions || []
    );
  const [showTabSwitchPrompt, setShowTabSwitchPrompt] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const [sourcePoolState, setSourcePoolState] = useState(
    () => initialStoreSelectionState?.sourcePoolState || null
  );
  const [destinationPoolState, setDestinationPoolState] = useState(
    () => initialStoreSelectionState?.destinationPoolState || null
  );

  useImperativeHandle(
    ref,
    () => ({
      getStoreSelectionState: () => ({
        selectedTab,
        selectedStoreGroup,
        selectedGeographicalRestriction,
        hierarchySelections,
        attributeTransferRestrictions,
        sourcePoolState,
        destinationPoolState,
        storeSelectionOptions,
      }),
    }),
    [
      attributeTransferRestrictions,
      destinationPoolState,
      hierarchySelections,
      selectedGeographicalRestriction,
      selectedStoreGroup,
      selectedTab,
      sourcePoolState,
      storeSelectionOptions,
    ]
  );

  const resetGeneralInfoSelections = useCallback(() => {
    const emptySelections = getEmptyGeneralInfoSelections(
      storeSelectionOptions.hierarchy_filters
    );
    setSelectedStoreGroup(emptySelections.selectedStoreGroup);
    setHierarchySelections(emptySelections.hierarchySelections);
    setAttributeTransferRestrictions(
      emptySelections.attributeTransferRestrictions
    );
  }, [storeSelectionOptions.hierarchy_filters]);

  useEffect(() => {
    if (skipGeneralInfoResetRef.current) {
      skipGeneralInfoResetRef.current = false;
      return;
    }
    resetGeneralInfoSelections();
  }, [storeSelectionOptions.hierarchy_filters, resetGeneralInfoSelections]);

  useEffect(() => {
    if (
      tabOptions.length &&
      !tabOptions.some((tab) => tab.value === selectedTab)
    ) {
      setSelectedTab(tabOptions[0].value);
    }
  }, [tabOptions, selectedTab]);

  useEffect(() => {
    onValidityChange?.(
      isStoreSelectionValidForSave({
        fulfilmentType,
        selectedTab,
        selectedStoreGroup,
        hierarchySelections,
        attributeTransferRestrictions,
        selectedGeographicalRestriction,
        sourcePoolState,
        destinationPoolState,
        storeSelectionOptions,
      })
    );
  }, [
    attributeTransferRestrictions,
    destinationPoolState,
    fulfilmentType,
    hierarchySelections,
    onValidityChange,
    selectedGeographicalRestriction,
    selectedStoreGroup,
    selectedTab,
    sourcePoolState,
    storeSelectionOptions,
  ]);

  const closeTabSwitchPrompt = useCallback(() => {
    setShowTabSwitchPrompt(false);
    setPendingTab(null);
  }, []);

  const applyTabSwitch = useCallback(
    (newTab) => {
      if (!newTab || newTab === selectedTab) {
        return;
      }

      resetGeneralInfoSelections();
      setSelectedTab(newTab);
    },
    [resetGeneralInfoSelections, selectedTab]
  );

  const handleTabChange = (_event, newValue) => {
    if (isDisabled || !newValue || newValue === selectedTab) {
      return;
    }

    const hasCurrentTabData = hasStoreSelectionTabData({
      selectedTab,
      selectedStoreGroup,
      hierarchyFilters: storeSelectionOptions.hierarchy_filters,
      hierarchySelections,
      attributeTransferRestrictions,
      selectedGeographicalRestriction,
    });

    if (hasCurrentTabData) {
      setPendingTab(newValue);
      setShowTabSwitchPrompt(true);
      return;
    }

    applyTabSwitch(newValue);
  };

  const handleDiscardTabSwitch = () => {
    if (pendingTab) {
      applyTabSwitch(pendingTab);
    }
    closeTabSwitchPrompt();
  };

  return (
    <>
      <div className={classes.contentWrapper}>
        <Loader loader={isLoading}>
          {!isLoading && (
            <div className={classes.stepSectionsWrapper}>
              <div className={classes.sectionCard}>
                <h3 className={classes.sectionTitle}>Store selection</h3>
                <div className={classes.storeSelectionTabsRow}>
                  <ButtonGroup
                    options={tabOptions.map((tab) => ({
                      ...tab,
                      disabled: isDisabled || tab.disabled,
                    }))}
                    selectedOption={selectedTab}
                    onChange={handleTabChange}
                  />
                </div>
              </div>

              <GeneralInformationSection
                key={selectedTab}
                selectedTab={selectedTab}
                geographicalRestrictions={
                  storeSelectionOptions.geographical_restrictions
                }
                hierarchyFilters={storeSelectionOptions.hierarchy_filters}
                attributeFilters={storeSelectionOptions.attribute_filters}
                hierarchySelections={hierarchySelections}
                onHierarchySelectionsChange={setHierarchySelections}
                attributeTransferRestrictions={attributeTransferRestrictions}
                onAttributeTransferRestrictionsChange={
                  setAttributeTransferRestrictions
                }
                selectedGeographicalRestriction={selectedGeographicalRestriction}
                onGeographicalRestrictionChange={
                  setSelectedGeographicalRestriction
                }
                selectedStoreGroup={selectedStoreGroup}
                onStoreGroupChange={setSelectedStoreGroup}
                isDisabled={isDisabled}
              />

              <SourceDestinationRestrictionsSection
                fulfilmentType={fulfilmentType}
                generalInfoTab={selectedTab}
                generalInfoStoreGroup={selectedStoreGroup}
                hierarchyFilters={storeSelectionOptions.hierarchy_filters}
                hierarchySelections={hierarchySelections}
                attributeTransferRestrictions={attributeTransferRestrictions}
                attributeFilters={storeSelectionOptions.attribute_filters}
                filterByAttributes={storeSelectionOptions.filter_by_attributes}
                selectedGeographicalRestriction={selectedGeographicalRestriction}
                onSourcePoolStateChange={setSourcePoolState}
                onDestinationPoolStateChange={setDestinationPoolState}
                isDisabled={isDisabled}
                initialSourcePoolState={
                  initialStoreSelectionState?.sourcePoolState
                }
                initialDestinationPoolState={
                  initialStoreSelectionState?.destinationPoolState
                }
              />
            </div>
          )}
        </Loader>
      </div>

      <Prompt
        isOpen={showTabSwitchPrompt}
        title={STORE_SELECTION_TAB_SWITCH_PROMPT.title}
        variant="warning"
        primaryButtonLabel={STORE_SELECTION_TAB_SWITCH_PROMPT.primaryButtonLabel}
        secondaryButtonLabel={
          STORE_SELECTION_TAB_SWITCH_PROMPT.secondaryButtonLabel
        }
        onPrimaryButtonClick={closeTabSwitchPrompt}
        onSecondaryButtonClick={handleDiscardTabSwitch}
        handleClose={closeTabSwitchPrompt}
      >
        {STORE_SELECTION_TAB_SWITCH_PROMPT.description}
      </Prompt>
    </>
  );
});

export default StoreSelectionStep;

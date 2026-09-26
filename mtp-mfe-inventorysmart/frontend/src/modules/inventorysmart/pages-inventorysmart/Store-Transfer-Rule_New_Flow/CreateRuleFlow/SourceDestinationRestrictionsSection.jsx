import { useMemo, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Accordion, Badge } from "impact-ui-v3";
import ArrowRightIcon from "assets/impactv3/arrow_right.svg";
import WarningIcon from "assets/IS_icons/IS_warning.svg";
import {
  FIXED_PUSH_SOURCE_DESTINATION_WARNING_MESSAGE,
  FULFILMENT_TYPE,
  SOURCE_DESTINATION_RESTRICTIONS_ACCORDION_ID,
} from "../constants";
import RestrictionPoolPanel from "./RestrictionPoolPanel";
import { isGeneralInfoComplete } from "./storeSelectionUtils";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const SourceDestinationRestrictionsSection = ({
  fulfilmentType,
  generalInfoTab,
  generalInfoStoreGroup = [],
  hierarchyFilters = [],
  hierarchySelections: generalInfoHierarchySelections = {},
  attributeTransferRestrictions = [],
  attributeFilters = [],
  filterByAttributes = [],
  selectedGeographicalRestriction,
  onSourcePoolStateChange,
  onDestinationPoolStateChange,
  isDisabled = false,
  initialSourcePoolState = null,
  initialDestinationPoolState = null,
}) => {
  const classes = useCreateRuleFlowStyles();
  const [expanded, setExpanded] = useState(
    SOURCE_DESTINATION_RESTRICTIONS_ACCORDION_ID
  );
  const [showFixedPushWarning, setShowFixedPushWarning] = useState(true);

  const shouldShowFixedPushWarning =
    fulfilmentType === FULFILMENT_TYPE.FIXED_PUSH && showFixedPushWarning;

  const isUnlocked = useMemo(
    () =>
      isGeneralInfoComplete({
        generalInfoTab,
        selectedStoreGroup: generalInfoStoreGroup,
        hierarchyFilters,
        hierarchySelections: generalInfoHierarchySelections,
        attributeTransferRestrictions,
        selectedGeographicalRestriction,
      }),
    [
      generalInfoTab,
      generalInfoStoreGroup,
      generalInfoHierarchySelections,
      attributeTransferRestrictions,
      hierarchyFilters,
      selectedGeographicalRestriction,
    ]
  );

  const isFixedPush = fulfilmentType === FULFILMENT_TYPE.FIXED_PUSH;

  const accordionHeader = (
    <section className={classes.restrictionsAccordionHeaderSection}>
      <div className={classes.restrictionsAccordionHeader}>
        <span className={classes.restrictionsAccordionTitle}>
          Source/Destination Restrictions
        </span>
        <Badge
          color="default"
          label={isFixedPush ? "Required" : "Optional"}
          size="small"
          variant="filled"
          sx={{
            "&.MuiChip-root": {
              backgroundColor: "#F2F3F4 !important",
              maxWidth: "164px",
              borderRadius: "1000px",
              padding: "2px 8px",
              height: "auto",
            },
            "& .MuiChip-label": {
              color: "#5F6673 !important",
              fontFamily: "Manrope, sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              lineHeight: "20px",
              textTransform: "capitalize",
              padding: 0,
            },
          }}
        />
      </div>
      {shouldShowFixedPushWarning && (
        <div className={classes.fixedPushWarningBanner}>
          <div className={classes.fixedPushWarningContent}>
            <div className={classes.fixedPushWarningIcon}>
              <WarningIcon />
            </div>
            <span className={classes.fixedPushWarningText}>
              {FIXED_PUSH_SOURCE_DESTINATION_WARNING_MESSAGE}
            </span>
          </div>
          <CloseIcon
            className={classes.fixedPushWarningCloseIcon}
            onClick={(event) => {
              event.stopPropagation();
              setShowFixedPushWarning(false);
            }}
          />
        </div>
      )}
    </section>
  );

  const accordionContent = (
    <div className={classes.restrictionsLockedContent}>
      <div
        className={`${classes.restrictionsPoolsRow} ${
          !isUnlocked ? classes.restrictionsPoolsRowLocked : ""
        }`}
      >
        <RestrictionPoolPanel
          key={`source-pool-${generalInfoTab}`}
          title="Source pool"
          generalInfoTab={generalInfoTab}
          generalInfoStoreGroup={generalInfoStoreGroup}
          generalInfoHierarchySelections={generalInfoHierarchySelections}
          hierarchyFilters={hierarchyFilters}
          attributeFilters={attributeFilters}
          filterByAttributes={filterByAttributes}
          attributeTransferRestrictions={attributeTransferRestrictions}
          onPoolStateChange={onSourcePoolStateChange}
          isDisabled={isDisabled}
          initialPoolState={initialSourcePoolState}
        />
        <div className={classes.restrictionsPoolsArrow}>
          <ArrowRightIcon />
        </div>
        <RestrictionPoolPanel
          key={`destination-pool-${generalInfoTab}`}
          title="Destination pool"
          generalInfoTab={generalInfoTab}
          generalInfoStoreGroup={generalInfoStoreGroup}
          generalInfoHierarchySelections={generalInfoHierarchySelections}
          hierarchyFilters={hierarchyFilters}
          attributeFilters={attributeFilters}
          filterByAttributes={filterByAttributes}
          attributeTransferRestrictions={attributeTransferRestrictions}
          onPoolStateChange={onDestinationPoolStateChange}
          isDisabled={isDisabled}
          initialPoolState={initialDestinationPoolState}
        />
      </div>

      {!isUnlocked && (
        <div className={classes.restrictionsLockOverlay}>
          <LockOutlinedIcon className={classes.restrictionsLockIcon} />
          <p className={classes.restrictionsLockText}>
            Select stores above to unlock this section
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className={classes.restrictionsAccordionWrapper}>
      <Accordion
        isSingleItem
        singleData={{
          header: accordionHeader,
          content: accordionContent,
          value: SOURCE_DESTINATION_RESTRICTIONS_ACCORDION_ID,
        }}
        expanded={expanded}
        onChange={(value) => {
          setExpanded(
            value ? SOURCE_DESTINATION_RESTRICTIONS_ACCORDION_ID : null
          );
        }}
      />
    </div>
  );
};

export default SourceDestinationRestrictionsSection;

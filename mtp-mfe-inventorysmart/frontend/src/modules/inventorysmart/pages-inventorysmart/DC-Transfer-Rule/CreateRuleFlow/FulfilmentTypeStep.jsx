import FulfilmentTypeIcon from "assets/IS_icons/box-fulfiment-type.svg";
import StoreIcon from "assets/Store.svg";
import { Button, useTranslation } from "impact-ui-v3";
import { FulfilmentTypeCardsRow } from "../../Common/components/FulfilmentTypeCards/FulfilmentTypeCards";
import { FULFILMENT_TYPE } from "../constants";
import DCSelectionFilters from "./DCSelectionFilters";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const hasDcFilterSelections = (filters = {}) =>
  Object.values(filters).some(
    (options) => Array.isArray(options) && options.length > 0
  );

const FulfilmentTypeStep = ({
  fulfilmentType,
  onFulfilmentTypeChange,
  dcSelectionFilters,
  onDCSelectionFiltersChange,
  onFilterFieldsChange,
  onSelectAllStateChange,
  onConfigLoadingChange,
  isDisabled = false,
}) => {
  const classes = useCreateRuleFlowStyles();
  const { t } = useTranslation();

  const fulfilmentTypeOptions = [
    {
      value: FULFILMENT_TYPE.NEED_BASED,
      label: t("inventorysmart.dcTransferRule.fulfilmentType.needBased.label"),
      description: t(
        "inventorysmart.dcTransferRule.fulfilmentType.needBased.description"
      ),
    },
    {
      value: FULFILMENT_TYPE.FIXED_PUSH,
      label: t("inventorysmart.dcTransferRule.fulfilmentType.fixedPush.label"),
      description: t(
        "inventorysmart.dcTransferRule.fulfilmentType.fixedPush.description"
      ),
    },
  ];

  const handleClearAllDcFilters = () => {
    if (isDisabled) {
      return;
    }
    onDCSelectionFiltersChange?.({});
    onSelectAllStateChange?.({});
  };

  return (
    <div className={classes.contentWrapper}>
      <div className={classes.sectionCard}>
        <div className={classes.sectionHeader}>
          <div className={classes.sectionHeaderLeft}>
            <FulfilmentTypeIcon className={classes.sectionHeaderIcon} />
            <h3 className={classes.sectionTitle}>
              {t("inventorysmart.dcTransferRule.fulfilmentType.sectionTitle")}
            </h3>
          </div>
        </div>
        <p className={classes.sectionDescription}>
          {t("inventorysmart.dcTransferRule.fulfilmentType.sectionDescription")}
        </p>
        <FulfilmentTypeCardsRow
          options={fulfilmentTypeOptions}
          selectedValue={fulfilmentType}
          onSelect={onFulfilmentTypeChange}
          isDisabled={isDisabled}
          disabledMode="blocked"
        />
      </div>

      <div className={classes.sectionCard}>
        <div className={classes.sectionHeader}>
          <div className={classes.sectionHeaderLeft}>
            <StoreIcon className={classes.sectionHeaderIcon} />
            <h3 className={classes.sectionTitle}>
              {t("inventorysmart.dcTransferRule.dcSelection.title")}
              <span className={classes.requiredMark}>*</span>
            </h3>
          </div>
          <Button
            variant="tertiary"
            className={classes.clearAllButton}
            onClick={handleClearAllDcFilters}
            disabled={isDisabled || !hasDcFilterSelections(dcSelectionFilters)}
          >
            {t("inventorysmart.dcTransferRule.dcSelection.clearAll")}
          </Button>
        </div>
        <p className={classes.sectionDescription}>
          {t("inventorysmart.dcTransferRule.dcSelection.description")}
        </p>
        <DCSelectionFilters
          selectedValues={dcSelectionFilters}
          onSelectedValuesChange={onDCSelectionFiltersChange}
          onFilterFieldsChange={onFilterFieldsChange}
          onSelectAllStateChange={onSelectAllStateChange}
          onConfigLoadingChange={onConfigLoadingChange}
          isDisabled={isDisabled}
        />
      </div>
    </div>
  );
};

export default FulfilmentTypeStep;

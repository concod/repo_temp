import { Input, TextArea } from "impact-ui-v3";
import { FulfilmentTypeCardsRow } from "../../Common/components/FulfilmentTypeCards/FulfilmentTypeCards";
import {
  DESCRIPTION_MAX_LENGTH,
  FULFILMENT_TYPE_OPTIONS,
} from "../constants";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const RuleNameStep = ({ formState, onFormChange, isDisabled = false }) => {
  const classes = useCreateRuleFlowStyles();

  const handleFulfilmentTypeChange = (fulfilmentType) => {
    if (isDisabled) {
      return;
    }
    onFormChange({ fulfilmentType });
  };

  return (
    <div className={classes.contentWrapper}>
      <div className={classes.sectionCard}>
        <h3 className={classes.sectionTitle}>Fulfillment Type Selection</h3>
        <FulfilmentTypeCardsRow
          options={FULFILMENT_TYPE_OPTIONS}
          selectedValue={formState.fulfilmentType}
          onSelect={handleFulfilmentTypeChange}
          isDisabled={isDisabled}
          disabledMode="readOnly"
        />
      </div>
    </div>
  );
};

export default RuleNameStep;

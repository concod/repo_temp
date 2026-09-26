import { connect } from "react-redux";
import RuleStructureInput from "./RuleStructureInput";
import { setCreateRulesFormData } from "modules/inventorysmart/services-inventorysmart/AutoAllocationRules/create-auto-allocation-rules-service";
import { addSnack } from "core/actions/snackbarActions";
import { useState } from "react";

const RuleStructureComponent = (props) => {
  const { rule_structure, default_value, disabledDefaultRule } = props;
  
  const [fields, setFields] = useState(Object.entries(rule_structure));

  return (
    <div>
      {fields.map(([rule_key, structure], idx) => (
        <RuleStructureInput
          rule_key={rule_key}
          structure={structure}
          default_value={default_value}
          disabledDefaultRule={disabledDefaultRule}
        />
      ))}
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  const createAutoAllocationRulesService =
    inventorysmartReducer.createAutoAllocationRulesService;
  return {
    formData: createAutoAllocationRulesService.formData,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setFormData: (payload) => dispatch(setCreateRulesFormData(payload)),
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RuleStructureComponent);

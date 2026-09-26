import { connect } from "react-redux";
import RuleStructureInput from "./RuleStructureInput";
import { setCreateRulesFormData } from "modules/inventorysmart/services-inventorysmart/DcStoreStrategyRules/create-dc-store-strategy-rules-service";
import { addSnack } from "core/actions/snackbarActions";
import React, { useEffect, useState } from "react";

const RuleStructureComponent = (props) => {
  const { rule_structure, default_value, disabledDefaultRule } = props;

  const [fields, setFields] = useState(Object.entries(rule_structure));

  return (
    <div>
      {fields.map(([rule_key, structure], idx) => (
        <RuleStructureInput
          key={rule_key}
          rule_key={rule_key}
          structure={structure}
          default_value={default_value}
          disabledDefaultRule={disabledDefaultRule}
        />
      ))}
    </div>
  );
};

const mapStateToProps = (store) => {};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RuleStructureComponent);

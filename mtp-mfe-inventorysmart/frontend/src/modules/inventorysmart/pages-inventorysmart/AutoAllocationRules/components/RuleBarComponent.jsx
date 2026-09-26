import React from "react";
import RuleStructureComponent from "./RuleStructureComponent";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import DeleteTrashIcon from "coreAssets/pageAssets/IS_deleteTrash.svg";
import { Tooltip, Button } from "impact-ui-v3";

const RuleBarComponent = (props) => {
  const {
    rule: { rule_name, rule_structure, default_value, is_mandatory },
    index,
    disableDelete = false,
    setDisplayRules,
    setOptionalRules,
    disabledDefaultRule,
  } = props;

  const classes = useStyles();
  const { operator = "AND", onOperatorChange } = props;

  const deleteRule = () => {
    setDisplayRules((prev) =>
      prev.filter((rule) => rule.rule_name !== rule_name)
    );

    setOptionalRules((prev) => {
      const updatedRules = [...prev, props.rule];
      updatedRules.sort((a, b) => a.rule_name.localeCompare(b.rule_name));
      return updatedRules;
    });
  };

  return (
    <div>
      {index > 1 && props.enableDefinitionEdit && (
        <div className={classes.ruleOperatorWrapper}>
          <div className={classes.ruleOperatorToggle}>
            <button
              type="button"
              className={`${classes.ruleOperatorBtn} ${
                classes.ruleOperatorBtnOr
              } ${operator === "OR" ? classes.ruleOperatorBtnOrActive : ""}`}
              onClick={() => onOperatorChange && onOperatorChange(index, "OR")}
              disabled={props.excludedRuleIndexes?.includes(props.index - 1)}
            >
              Or
            </button>
            <button
              type="button"
              className={`${classes.ruleOperatorBtn} ${
                classes.ruleOperatorBtnAnd
              } ${operator === "AND" ? classes.ruleOperatorBtnAndActive : ""}`}
              onClick={() => onOperatorChange && onOperatorChange(index, "AND")}
              disabled={props.excludedRuleIndexes?.includes(props.index - 1)}
            >
              And
            </button>
          </div>
        </div>
      )}
      <div className={classes.dcRuleBar}>
        <div className={classes.dcRuleLeft}>
          <div className={classes.dcRuleName}>
            <span className={`${classes.dcRuleIndexLabel}${is_mandatory ? ` ${classes.requiredAsterisk}` : ""}`}>{`Rule:${index}`}</span>
            <div className={classes.dcRuleNameValue} title={rule_name}>
              {rule_name}
            </div>
          </div>
          <div className={classes.dcRuleStructure}>
            <RuleStructureComponent
              default_value={default_value}
              rule_structure={rule_structure}
              disabledDefaultRule={disabledDefaultRule}
            />
          </div>
        </div>
        <div className={classes.dcRuleActions}>
        <Tooltip title="Delete" orientation="top" variant="tertiary">
          <Button
            variant="secondary"
            type="destructive"
            onClick={deleteRule}
            id="rulesDeleteButton"
            disabled={disableDelete || disabledDefaultRule}
            icon={<DeleteTrashIcon />}
          />
        </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default RuleBarComponent;

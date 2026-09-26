import React from "react";
import RuleStructureComponent from "./RuleStructureComponent";
import { Typography } from "@mui/material";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import DeleteTrashIcon from "coreAssets/pageAssets/IS_deleteTrash.svg";
import { Tooltip ,Button} from "impact-ui-v3";

const RuleBarComponent = (props) => {
  const {
    rule: { rule_name, rule_structure, default_value, is_mandatory },
    index,
    disableDelete = false,
    setDisplayRules,
    setOptionalRules,
    disabledDefaultRule
  } = props;

  const classes = useStyles();

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
    <div className={classes.dcRuleBar}>
      <div className={classes.dcRuleLeft}>
        <div className={classes.dcRuleName}>
          <Typography className={classes.dcRuleIndexLabel}>{`Rule:${index}`}</Typography>
          <Typography className={classes.dcRuleNameValue} title={rule_name}>
            {rule_name}
          </Typography>
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
  );
};

export default RuleBarComponent;

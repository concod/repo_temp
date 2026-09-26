import { useLogisticsConfigurationStyles } from "../logisticsConfigurationStyles";

export const LogisticsConfigRuleRow = ({ label, subLabel, value }) => {
  const classes = useLogisticsConfigurationStyles();

  return (
    <div className={classes.ruleRow}>
      <div className={classes.ruleRowLeft}>
        <div className={classes.ruleRowLabels}>
          <span className={classes.ruleRowLabel}>{label}</span>
          {subLabel && (
            <span className={classes.ruleRowSubLabel}>{subLabel}</span>
          )}
        </div>
      </div>
      <span className={classes.ruleRowValue}>{value}</span>
    </div>
  );
};

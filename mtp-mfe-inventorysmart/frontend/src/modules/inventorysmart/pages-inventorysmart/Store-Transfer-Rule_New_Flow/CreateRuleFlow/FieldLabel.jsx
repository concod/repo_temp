import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const FieldLabel = ({ children, isRequired = false }) => {
  const classes = useCreateRuleFlowStyles();

  return (
    <p className={classes.fieldLabel}>
      {children}
      {isRequired ? <span className={classes.requiredMark}>*</span> : null}
    </p>
  );
};

export default FieldLabel;

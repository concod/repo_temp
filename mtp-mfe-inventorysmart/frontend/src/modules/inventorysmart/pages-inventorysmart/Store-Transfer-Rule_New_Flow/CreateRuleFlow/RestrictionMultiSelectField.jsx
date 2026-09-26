import { useState } from "react";
import { Select } from "impact-ui-v3";
import { useCreateRuleFlowStyles } from "./useCreateRuleFlowStyles";

const RestrictionMultiSelectField = ({
  label,
  selectedOptions = [],
  onChange,
  width = "332px",
  isDisabled = false,
}) => {
  const classes = useCreateRuleFlowStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);

  const handleChange = (options) => {
    if (isDisabled) {
      return;
    }
    onChange?.(options || []);
  };

  return (
    <div className={classes.poolSelectField} style={{ width, maxWidth: "100%" }}>
      <p className={classes.fieldLabel}>{label}</p>
      <Select
        placeholder="Select"
        isMulti
        isClearable
        isWithSearch
        withPortal
        toggleSelectAll
        isDisabled={isDisabled}
        isOpen={isDisabled ? false : isOpen}
        setIsOpen={setIsOpen}
        currentOptions={[]}
        initialOptions={[]}
        selectedOptions={selectedOptions}
        setSelectedOptions={handleChange}
        handleChange={handleChange}
        isSelectAll={isSelectAll}
        setIsSelectAll={setIsSelectAll}
        minWidth={width}
        width="100%"
      />
    </div>
  );
};

export default RestrictionMultiSelectField;

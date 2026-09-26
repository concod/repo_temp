import { Select } from "impact-ui-v3";
import { useState } from "react";

const SelectFilterV3 = ({
  index,
  label = "",
  placeholder = "Select",
  columnName = "",
  currentSelectOptions,
  currentOptions,
  initialOptions,
  selectedOptions,
  handleChartFilterChange,
  setSelectedOptions = () => {},
  setCurrentOptions = () => {},
  isCloseWhenClickOutside = true,
  isMulti = false,
  ...props
}) => {
  const [open, setIsOpen] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);

  return (
    <Select
      key={index}
      label={label}
      placeholder={placeholder}
      isCloseWhenClickOutside={isCloseWhenClickOutside}
      isMulti={isMulti}
      isOpen={open}
      setIsOpen={setIsOpen}
      currentOptions={currentOptions}
      initialOptions={initialOptions}
      selectedOptions={selectedOptions}
      handleChange={(option) => handleChartFilterChange(columnName, option)}
      setSelectedOptions={setSelectedOptions}
      setCurrentOptions={setCurrentOptions}
      isSelectAll={isSelectAll}
      setIsSelectAll={setIsSelectAll}
      {...props}
    />
  );
};

export default SelectFilterV3;

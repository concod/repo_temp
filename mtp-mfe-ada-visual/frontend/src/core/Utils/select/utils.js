export const onClearAll = (setSelectedOptions, onChange, customFunction) => {
  setSelectedOptions([]);
  onChange([])
  if(customFunction) {
    customFunction();
  }
};

export const onSelectOrUnSelectAll = (
  props,
  initialOptions,
  currentOptions,
  selectedOptions,
  setSelectedOptions,
  isSelectAll
) => {
  const isUnfiltered = initialOptions.length === currentOptions.length;
  const isSomethingSelected = selectedOptions.length > 0;
  if (isUnfiltered) {
    setSelectedOptions(isSelectAll ? [] : initialOptions);
  } else {
    setSelectedOptions(isSomethingSelected ? [] : currentOptions);
  }
};

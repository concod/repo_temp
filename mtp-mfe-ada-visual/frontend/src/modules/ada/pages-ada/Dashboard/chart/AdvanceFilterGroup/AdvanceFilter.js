import React, { memo, useState } from "react";
// import { Select } from "core/commonComponents/filters";
import { Select } from "impact-ui-v3";

const AdvanceFilter = ({
  // currentSelectOptions,
  setCurrentSelectOptions,
  selectedOptions = [],
  setSelectedOptions,
  columnName,
  firstColumnSelectionDone,
  index,
  isOpen,
  setIsOpen,
  isFirstDropdownOpen,
  isFirstApiCallDoneAfterSelection,
  setIsFirstApiCallDoneAfterSelection,
  prevStateSelectedOptions = [],
  setPrevStateSelectedOptions,
  allSelectedOptions,
  isLoading,
  ...props
}) => {
  // const [isOpen, setisOpen] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);

  const handleChange = (values, _event) => {
    setSelectedOptions((prev) => {
      return {
        ...prev,
        [columnName]: values,
      };
    });
  };

  const onSelectAll = (event) => {
    setIsSelectAll(event.target.checked);
    if (event.target.checked) {
      setSelectedOptions((prev) => {
        return {
          ...prev,
          [columnName]: props?.filterProps?.initialData,
        };
      });
    } else {
      setSelectedOptions((prev) => {
        return {
          ...prev,
          [columnName]: [],
        };
      });
    }
  };

  const onDropdownClose = () => {
    setIsOpen((prev) => ({ ...prev, [index]: false }));
    console.log(
      prevStateSelectedOptions,
      "prevStateSelectedOptions",
      selectedOptions
    );

    if (
      prevStateSelectedOptions?.length === 0 &&
      selectedOptions?.length === 0
    ) {
      console.log(selectedOptions, "selectedOptions", prevStateSelectedOptions);
      return;
    }

    if (
      index === 0 &&
      !isFirstApiCallDoneAfterSelection &&
      firstColumnSelectionDone
    ) {
      setIsFirstApiCallDoneAfterSelection(true);
    }

    if (prevStateSelectedOptions !== selectedOptions) {
      setPrevStateSelectedOptions(allSelectedOptions);
      props?.updateFilters(props?.filterProps, true);
    }
  };

  const handleDisable = () => {
    if (index === 0) return false;
    if (!firstColumnSelectionDone) return true;

    if (!isFirstApiCallDoneAfterSelection) return true;
    return false;
  };

  const handleOpen = (value, event) => {
    console.log(value, "value", event);
    // setIsOpen(!isOpen);
    setIsOpen((prev) => ({ ...prev, [index]: value }));
  };

  return (
    <div>
      <Select
        currentOptions={props?.filterProps?.initialData}
        selectedOptions={selectedOptions}
        // setCurrentOptions={setCurrentOptions}
        setCurrentOptions={() => {}}
        isWithSelectAll={props?.filterProps?.initialData?.length < 3000}
        label={props?.label}
        //   handleChange={(select, event, index) => onChange(select, event, index)}
        handleChange={handleChange}
        initialOptions={[]}
        isLoading={isLoading}
        isMulti={true}
        isRequired={props.is_mandatory || props.is_required || props.required}
        isDisabled={handleDisable()}
        // isWithSearch
        toggleSelectAll
        isSelectAll={isSelectAll}
        setIsSelectAll={setIsSelectAll}
        onSelectAll={onSelectAll}
        labelOrientation={"top"}
        name={props.name}
        isClearable={!props.isDisabled && props.isClearable}
        //   onClearAll={onClearAll}
        onDropdownClose={onDropdownClose}
        onDropdownOpen={() => {
          //   console.log(selected, "zASDfc", aaa);
          if (index === 0 && !props?.filterProps?.initialData?.length) {
            props?.updateFilters(props?.filterProps);
          }

          // setisOpen(!isOpen);
          setIsOpen((prev) => ({ ...prev, [index]: true }));

          //   console.log(selected, "wsaderfgtgyb");
        }}
        //   onSearch={handleSearch}
        placeholder={props.customPlaceholder || "Select"}
        //   selectedOptions={updatedCurrentSelectedOptions}
        // selectedOptions={updatedOptions}
        isOpen={isOpen}
        setIsOpen={handleOpen}
        setSelectedOptions={() => {}}
        width={props?.width}
        minWidth={props?.minWidth}
        //   onMenuScrollToBottom={onMenuScrollToBottom}
        //   customPlaceholderAfterSelect={optionSelected?.length || 0}
        withPortal={props?.withPortal}
        // {...props?.filterProps}
      />
    </div>
  );
};

export default memo(AdvanceFilter);

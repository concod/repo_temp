import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types"; // for our bonus, see below
// eslint-disable-next-line
import ReactSelect, { components } from "react-select";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {
  checkIfEqual,
  isStringIncluded,
  replaceSpecialCharacter,
} from "../functions/utils";
import "./index.css";
import muiTheme from "core/Styles/theme";
import { Tooltip } from "@mui/material";
import { uniqBy } from "lodash";

const ValueContainer = ({ children, selectProps, ...props }) => {
  const { getValue, hasValue } = props;
  const { inputValue } = selectProps;
  const values = getValue();
  return (
    // to handle for multiple selections later as the list can have large number of values
    <components.ValueContainer {...props}>
      {children[1]}
      {!hasValue && children[0]}
      {hasValue &&
        inputValue === "" &&
        (props.hideToolTip ? (
          <span className="valueStyle">{values[0].label}</span>
        ) : (
          <Tooltip
            title={`${values
              .map((val) => val.label)
              .slice(0, 15)
              .join(", ")} ${values.length > 15 ? "..." : ""}`}
          >
            <span className="valueStyle">{values[0].label}</span>
          </Tooltip>
        ))}
      {hasValue && inputValue === "" && values.length !== 1 && (
        <span className="counterStyle">+{selectProps.value.length - 1}</span>
      )}
    </components.ValueContainer>
  );
};

/**
 * @func
 * @desc Return items as true which passes the test scenario
 * @param {Object} item
 * @param {String} input
 * @returns {Boolean}
 */
const filterOptions = (item, input) => {
  if (input) {
    const filterKeys = input.split(",");
    let isOptionTrue = false;
    for (const searchVal of filterKeys) {
      if (searchVal.replace(/\s/g, "").length) {
        //if more than one term is searched then let it be a exact search or else do a normal search
        if (filterKeys.length > 1) {
          isOptionTrue = checkIfEqual(searchVal.replace(/\s/g, ""), item.label);
        } else {
          isOptionTrue = isStringIncluded(
            searchVal.replace(/\s/g, ""),
            item.label
          );
        }
        if (isOptionTrue) break;
      }
    }
    return isOptionTrue;
  }
  return true;
};

/**
 *
 * @param {object} props //props object of react select
 * This function is called when there is no search term present and user clicks on select all/unselect all
 */
const selectAllOrUnSelectAllOptions = (props) => {
  const selectedValues = Array.isArray(props.selectProps.value)
    ? props.selectProps.value
    : [];
  const totalOptions = props.options.length;
  const limit = props.selectProps.maxMultiSelect || Infinity;

  // If all currently selected -> unselect all (always allowed)
  if (totalOptions === selectedValues.length) {
    props.setValue([]);
    return;
  }

  // Attempting to select all
  if (totalOptions <= limit) {
    props.setValue(props.options);
  } else {
    // Over limit: keep selection unchanged and notify
    if (typeof props.selectProps.onMaxLimitExceeded === "function") {
      props.selectProps.onMaxLimitExceeded(limit);
    }
  }
};

/**
 *
 * @param {object} props //props of react select
 * @param {array} currentSearchData //current filtered data based on search term
 * This function is called when the user clicks on select/unselect all when there is a
 * search term applied
 */
const selectAllOrUnSelectAllFilteredOptions = (props, currentSearchData) => {
  //Check if there is any prior selections
  //If there are any selections, it would come as array
  //Else it would be empty string
  const selectedValues = Array.isArray(props.selectProps.value)
    ? props.selectProps.value
    : [];

  //This variable stores the values of selected values except the current filtered data selections
  const filteredValues = selectedValues.filter((filter) => {
    return (
      currentSearchData.findIndex(
        (searchFilter) => searchFilter.value === filter.value
      ) === -1
    );
  });
  //This variable stores the values of selected values that are present in the current filtered data selections
  const currentSearchSelections = selectedValues.filter((filter) => {
    return (
      currentSearchData.findIndex(
        (searchFilter) => searchFilter.value === filter.value
      ) > -1
    );
  });

  //If the current search selections are all present in the current filtered data,
  //we treat it as unselect all of those current search filtered data
  if (currentSearchSelections.length === currentSearchData.length) {
    // Unselect all (allowed)
    props.setValue(filteredValues);
  } else {
    // Select all filtered with max cap
    const limit = props.selectProps.maxMultiSelect || Infinity;
    const newSelectedOptions = uniqBy(
      [...selectedValues, ...currentSearchData],
      "value"
    );
    if (newSelectedOptions.length <= limit) {
      props.setValue(newSelectedOptions);
    } else {
      if (typeof props.selectProps.onMaxLimitExceeded === "function") {
        props.selectProps.onMaxLimitExceeded(limit);
      }
      // Do nothing else; keep current selection
    }
  }
};

/**
 *
 * @param {object} props //props of react select
 */
const onSelectOrUnSelectAll = (props) => {
  //This variable will help us know if there is search term present or not
  const currentSearchData = props.options.filter((filter) =>
    filterOptions(filter, props.selectProps.inputValue)
  );
  //If there is no search applied, we do select all and unselect all based on all option values
  if (currentSearchData.length === props.options.length) {
    //helper function for all options
    selectAllOrUnSelectAllOptions(props);
  } else {
    //else if there is a search term, we apply select all and unselect all based on filtered values
    //helper function for filtered options
    selectAllOrUnSelectAllFilteredOptions(props, currentSearchData);
  }
};
const MenuList = (props) => {
  return (
    <components.MenuList {...props}>
      {props.isMulti && !!props.options.length && (
        <div
          className="select-all"
          onClick={() => {
            onSelectOrUnSelectAll(props);
          }}
        >
          Select/Unselect All
        </div>
      )}
      {props.children}
    </components.MenuList>
  );
};
const customValueStyle = (provided) => {
  const style = { position: "relative", flexWrap: "nowrap" };

  return { ...provided, ...style };
};
const DropdownIndicator = (props) => {
  return (
    <components.DropdownIndicator {...props}>
      <ArrowDropDownIcon />
    </components.DropdownIndicator>
  );
};

const Select = (props) => {
  const [pageIndex, setPageIndex] = useState(2);
  const [options, setOptions] = useState([]);
  const [listener, setListener] = useState(false);
  const selectRef = useRef();
  const bodyRef = useRef();
  const onMenuScrollToBottom = (_event) => {
    if (props.pagination) {
      props.fetchOptions(pageIndex);
      setPageIndex(pageIndex + 1);
    }
    if (props?.options?.length > 50) {
      setOptions(props.options.slice(0, options.length + 50));
    }
  };

  useEffect(() => {
    // if (props?.options?.length > 50) {
    //   setOptions(props.options.slice(0, 50));
    // } else {
    //   setOptions(props.options);
    // }
    if (props.options) {
      let options = props.options.map((item) => {
        if (item && item?.label) {
          return {
            ...item,
            label: replaceSpecialCharacter(item.label.toString()),
          };
        } else {
          return item;
        }
      });

      setOptions(options);
    }
  }, [props.options]);

  const valContainer = (inputProps) => (
    <ValueContainer {...inputProps} hideToolTip={Boolean(props.hideToolTip)} />
  );

  /**
   * @function
   * @description Callback function to the evenetlistener,
   * this determines if the target element was the dropdown or not
   * If the target element is not dropdown call the onMenuCLose event attached to dropdown ref
   * @param {Object} event 
   */
  const closeSelectDropdown = (event) => {
    if (
      bodyRef.current &&
      !selectRef.current?.select?.controlRef.contains(event.target) &&
      !selectRef.current?.select?.focusedOptionRef?.offsetParent?.contains(
        event.target
      )
    ) {
      selectRef?.current?.onMenuClose();
      bodyRef.current = null;
    }
  };

  /**
   * @function
   * @description Remove focus from dropdown and close the menu if listener is active and 
   * only if multiselect remove event listener from window once closed
   * and set local listener state to false
   */
  const onMenuClose = () => {
    if (props.isMulti && selectRef.current && listener) {
      selectRef.current.select.state.isFocused = false;
      selectRef.current?.select.blur();
      selectRef.current?.select.inputRef.blur();
      selectRef.current?.select.controlRef.offsetParent.blur();
      bodyRef.current.removeEventListener("click", closeSelectDropdown);
      setListener(false);
    }
  };

  /**
   * @function
   * @description Handle onChange of any selection from the given dropdown and
   * add a eventlistener on window when there is a change in selection and
   * set local state for listener as true to know if listner is already added
   * @param {Object} selectedOptions
   */
  const onChange = (selectedOptions, action) => {
    bodyRef.current = document.querySelector("body");
    // Enforce max selections for multi-select, if configured
    if (
      props.isMulti &&
      props.maxMultiSelect &&
      Array.isArray(selectedOptions) &&
      selectedOptions.length > props.maxMultiSelect
    ) {
      const limited = selectedOptions.slice(0, props.maxMultiSelect);
      // Inform parent about the truncation/limit breach
      if (typeof props.onMaxLimitExceeded === "function") {
        props.onMaxLimitExceeded(props.maxMultiSelect);
      }
      props.onChange(limited);
    } else {
      props.onChange(selectedOptions);
    }
    if (props.isMulti && !listener) {
      setListener(true);
      bodyRef.current.addEventListener("click", closeSelectDropdown);
    }
    if (action.action === "clear") {
      selectRef.current.state.menuIsOpen = true;
    }
  };

  return (
    <ReactSelect
      {...props}
      ref={selectRef}
      menuPlacement={"auto"}
      options={options}
      hideSelectedOptions={false}
      blurInputOnSelect={!Boolean(props.isMulti)}
      components={{
        ValueContainer: valContainer,
        MenuList,
        DropdownIndicator,
      }}
      closeMenuOnSelect={props.isMulti ? false : true}
      onChange={onChange}
      // onMenuScrollToBottom={onMenuScrollToBottom}
      onMenuClose={onMenuClose}
      styles={{
        valueContainer: (provided) => {
          return props.valueStyles
            ? props.valueStyles
            : customValueStyle(provided);
        },
        menuPortal: (provided) => ({
          ...provided,
          zIndex: "9999",
        }),
        menu: (provided, _state) => ({
          ...provided,
          zIndex: "9999",
          marginTop: "0.75rem",
        }),
        indicatorSeparator: (_provided, _state) => ({
          display: "none",
        }),
        indicatorContainer: (_provided, _state) => ({
          display: "flex",
          padding: "0 5px",
        }),
        dropdownIndicator: (provided, _state) => ({
          ...provided,
          padding: "0",
        }),
        control: (provided, _state) => {
          return { ...provided, minHeight: "2.125rem", lineHeight: "normal" };
        },
      }}
      filterOption={filterOptions}
      theme={(theme) => ({
        ...theme,
        colors: {
          ...theme.colors,
          primary25: muiTheme.palette.primary.lighter,
          primary: muiTheme.palette.primary.main,
        },
      })}
    />
  );
};

Select.propTypes = {
  options: PropTypes.array,
  value: PropTypes.any,
  onChange: PropTypes.func,
  allowSelectAll: PropTypes.bool,
  allOption: PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.string,
  }),
};

Select.defaultProps = {
  allOption: {
    label: "Select all",
    value: "*",
  },
};

export default Select;

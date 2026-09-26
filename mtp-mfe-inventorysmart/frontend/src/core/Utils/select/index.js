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
import { useDispatch, useSelector } from "react-redux";
import { SET_EDITABLE_CELL_FOCUS } from "core/actions/types";
import store from "store";
import { isObject, uniqBy, isArray } from "lodash";
import { Select as SelectComp } from "impact-ui-v3";
import { onSelectOrUnSelectAll, onClearAll } from "./utils.js";

// Obsolete
// const ValueContainer = ({ children, selectProps, ...props }) => {
//   const { getValue, hasValue } = props;
//   const { inputValue } = selectProps;
//   const values = getValue();
//   return (
//     // to handle for multiple selections later as the list can have large number of values
//     <components.ValueContainer {...props}>
//       {children[1]}
//       {!hasValue && children[0]}
//       {hasValue &&
//         inputValue === "" &&
//         (props.hideToolTip ? (
//           <span className="valueStyle">{values[0].label}</span>
//         ) : (
//           <Tooltip
//             title={`${values
//               .map((val) => val.label)
//               .slice(0, 15)
//               .join(", ")} ${values.length > 15 ? "..." : ""}`}
//           >
//             <span className="valueStyle">{values[0].label}</span>
//           </Tooltip>
//         ))}
//       {hasValue && inputValue === "" && values.length !== 1 && (
//         <span className="counterStyle">+{selectProps.value.length - 1}</span>
//       )}
//     </components.ValueContainer>
//   );
// };

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
    if (!isOptionTrue && item.label === "Select/Unselect All") {
      return true;
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
  //We compare options length and selected values length
  //If both are same, we treat it as unselect all and make the selections empty array
  if (
    props.options.length ===
    (props.selectProps.value && props.selectProps.value.length)
  ) {
    props.setValue([]);
  } else {
    //else we treat it as select all and make the selection equal to options
    props.setValue(props.options);
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
    props.setValue(filteredValues);
  } else {
    //Else we append the current filtered options of search term to the existing selected values
    const newSelectedOptions = uniqBy(
      [...props.selectProps.value, ...currentSearchData],
      "value"
    );
    props.setValue(newSelectedOptions);
  }
};

// /**
//  *
//  * @param {object} props //props of react select
//  */
// const onSelectOrUnSelectAll = (props) => {
//   //This variable will help us know if there is search term present or not
//   const currentSearchData = props.options.filter((filter) =>
//     filterOptions(filter, props.selectProps.inputValue)
//   );
//   //If there is no search applied, we do select all and unselect all based on all option values
//   if (currentSearchData.length === props.options.length) {
//     //helper function for all options
//     selectAllOrUnSelectAllOptions(props);
//     setIsSelectAll(true);
//   } else {
//     //else if there is a search term, we apply select all and unselect all based on filtered values
//     //helper function for filtered options
//     selectAllOrUnSelectAllFilteredOptions(props, currentSearchData);
//   }
// };
// const MenuList = (props) => {
//   const modifiedChildren = React.Children.map(props.children, (child) => {
//     if (!child) return null;

//     if (child.props.label === "Select/Unselect All") {
//       return React.cloneElement(child, {
//         ...child.props,
//         className: `${child.props.className || ""} select-all`,
//         innerProps: {
//           ...child.props.innerProps,
//           onClick: (e) => {
//             e.preventDefault();
//             e.stopPropagation();
//             const newProps = { ...props };
//             newProps.options = props.options.slice(1);
//             onSelectOrUnSelectAll(newProps);
//           },
//         },
//       });
//     }
//     return child;
//   });

//   return (
//     <components.MenuList {...props}>{modifiedChildren}</components.MenuList>
//   );
// };
// const customValueStyle = (provided) => {
//   const style = { position: "relative", flexWrap: "nowrap" };

//   return { ...provided, ...style };
// };
// const DropdownIndicator = (props) => {
//   return (
//     <components.DropdownIndicator {...props}>
//       <ArrowDropDownIcon />
//     </components.DropdownIndicator>
//   );
// };

const Select = (props) => {
  const [pageIndex, setPageIndex] = useState(2);
  const [options, setOptions] = useState([]);
  const [listener, setListener] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [open, setOpen] = useState(props.menuIsOpen || false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [initialOptions, setInitialOptions] = useState([]);

  const selectRef = useRef();
  const bodyRef = useRef();
  const focusedOptionIndex = useRef(-1);
  const dispatch = useDispatch();

  // Update open state when menuIsOpen prop changes
  useEffect(() => {
    if (props.menuIsOpen === true && !open) {
      setOpen(true);
    }
  }, [props.menuIsOpen]);

  // Keyboard navigation when dropdown is open
  useEffect(() => {
    if (!open) {
      focusedOptionIndex.current = -1;
      return;
    }
      const optionEls = document.querySelectorAll(".ia-select-container-v3-styled-menu .ia-select-option");
      const selectedEl = document.querySelector(".ia-select-container-v3-styled-menu .ia-select-option[aria-selected='true']");
      if (optionEls.length === 1) {
        focusedOptionIndex.current = 0;
        optionEls[0].classList.add("ia-select-option--focused");
      } else if (selectedEl) {
        const idx = Array.from(optionEls).indexOf(selectedEl);
        focusedOptionIndex.current = idx >= 0 ? idx : -1;
        if (idx >= 0) {
          selectedEl.classList.add("ia-select-option--focused");
          selectedEl.scrollIntoView({ block: "nearest" });
        }
      }
    const handleDropdownKeyNav = (event) => {
      const searchInput = document.querySelector(".ia-select-container-v3-styled-menu .ia-select-search-box");
      const isSearchFocused = searchInput && document.activeElement === searchInput;

      // Escape-> close the dropdown
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        focusedOptionIndex.current = -1;
        onMenuClose();
        return;
      }

      const options = Array.from(
        document.querySelectorAll(".ia-select-container-v3-styled-menu .ia-select-option")
      );
      if (options.length === 0) return;

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (options.length <= 1) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "ArrowDown") {
          focusedOptionIndex.current = Math.min(focusedOptionIndex.current + 1, options.length - 1);
        } else {
          focusedOptionIndex.current = Math.max(focusedOptionIndex.current - 1, 0);
        }
        options.forEach((el, i) => {
          if (i === focusedOptionIndex.current) {
            el.classList.add("ia-select-option--focused");
            el.scrollIntoView({ block: "nearest" });
          } else {
            el.classList.remove("ia-select-option--focused");
          }
        });
      } else if (event.key === "Enter") {
        if (focusedOptionIndex.current < 0 && options.length === 1) {
          focusedOptionIndex.current = 0;
        }
        if (focusedOptionIndex.current < 0) return;
        event.preventDefault();
        event.stopPropagation();
        const optionEl = options[focusedOptionIndex.current];
        if (props.isMulti) {
          const clickTarget = optionEl?.querySelector(".select-option-content") || optionEl;
          clickTarget?.click();
        } else {
          const innerDiv = optionEl?.firstElementChild || optionEl;
          innerDiv?.click();
        }
        if (!props.isMulti) {
          setOpen(false);
          focusedOptionIndex.current = -1;
          dispatch({ type: SET_EDITABLE_CELL_FOCUS, payload: false });
          const agCell = props.instance?.eGridCell;
          if (agCell) agCell.focus();
        }
      }
    };
    document.addEventListener("keydown", handleDropdownKeyNav, true);
    return () => document.removeEventListener("keydown", handleDropdownKeyNav, true);
  }, [open]);

  const onMenuScrollToBottom = (_event) => {
    if (props.pagination) {
      props.fetchOptions(pageIndex);
      setPageIndex(pageIndex + 1);
    }
    if (props?.options?.length > 50) {
      setOptions(props.options.slice(0, options.length + 50));
    }
  };

  const activeEditableCell = useSelector(
    (state) => state.tableReducer.activeEditableCell
  );
  const cellIdentifier = props?.instance
    ? `id-${(
        props.instance?.column?.colId +
        props.instance?.node?.rowIndex +
        props?.instance?.api?.gridOptionsWrapper?.domDataKey
      )?.replace(/['"\/\\`~!@#$%^&*()=+{}\[\]|:;<>?,.\t\s]/g, "")}`
    : props?.["data-testid"]
    ? props?.["data-testid"]
    : "";

  useEffect(() => {
    if (activeEditableCell === cellIdentifier) {
      setTimeout(() => {
        setOpen(true);
      }, 0);
      setTimeout(() => {
        const agCell = document.activeElement;
        if (agCell && agCell.classList.contains("ag-cell")) {
          agCell.setAttribute("tabindex", "-999");
        }
          const searchInput = document.querySelector(".ia-select-container-v3-styled-menu .ia-select-search-box");
          if (searchInput) {
            searchInput.focus({ preventScroll: true });
          } else {
            const menuContainer =
              document.querySelector(".ia-select-container-v3-styled-menu") ||
              document.querySelector(".select-renderer-portal");
            if (menuContainer) {
              menuContainer.setAttribute("tabindex", "0");
              menuContainer.focus({ preventScroll: true });
            }
          }
          if (agCell && agCell.getAttribute("tabindex") === "-999") {
              agCell.setAttribute("tabindex", "-1")
          }
      }, 0);
    }
  }, [activeEditableCell]);

  useEffect(() => {
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
      setInitialOptions(options);
    }
  }, [props.options]);

  useEffect(() => {
    if (props?.value) {
      if (props.isMultiInSubmenu) {
        // In isMultiInSubmenu mode, the selected value must retain `children` for correct checked state + uncheck behavior.
        if (Array.isArray(props.value)) {
          setSelectedOptions(props.value.length ? props.value[0] : null);
        } else {
          setSelectedOptions(props.value);
        }
        return;
      }

      let value;
      const valuesArray = Array.isArray(props.value)
        ? props.value
        : isObject(props.value) && Array.isArray(props.value.value)
        ? props.value.value
        : null;
      if (valuesArray) {
        value = props.isMulti
          ? options.filter((item) =>
              valuesArray.some((val) => val.value === item?.value)
            )
          : options.find((item) => item.value === valuesArray?.[0]?.value);
      } else {
        value = options.find((item) => item.value === props?.value?.value);
      }
      const updatedOptions = props?.isMulti
        ? Array.isArray(value)
          ? value
          : [value]
        : Array.isArray(value)
        ? value[0]
        : value;
      setSelectedOptions(updatedOptions);
      // Checking if all the values are selected.
      if (props?.isMulti) {
        const allOptionsSelected = value.length === options.length;
        if (allOptionsSelected) {
          setIsSelectAll(true);
        }
      }
    } else {
      setSelectedOptions([]);
    }
  }, [props?.value]);

  // const valContainer = (inputProps) => (
  //   <ValueContainer {...inputProps} hideToolTip={Boolean(props.hideToolTip)} />
  // );

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
    const inputField = props.instance?.eGridCell;
    if (activeEditableCell) {
      const ancestorDiv = inputField.closest("div.ag-cell");
      ancestorDiv.focus();
      setTimeout(() => {
        dispatch({
          type: SET_EDITABLE_CELL_FOCUS,
          payload: false,
        });
      }, 10);
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

    let nextSelectedOptions = selectedOptions;

    // For isMultiInSubmenu, store a single object (parent with `children`) or null.
    if (props.isMultiInSubmenu) {
      if (Array.isArray(nextSelectedOptions)) {
        nextSelectedOptions = nextSelectedOptions.length
          ? nextSelectedOptions[0]
          : null;
      }
    }

    props.onChange(nextSelectedOptions);
    if (!props.isMulti && props.onBlur) {
      //calling on blur if exist after search and select
      props.onBlur();
    }
    if (props.isMulti && !listener) {
      setListener(true);
      bodyRef.current.addEventListener("click", closeSelectDropdown);
    }
    if (props.isMulti && activeEditableCell) {
      let timer = null;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        selectRef.current?.select?.inputRef.focus();
      }, 0);
    }
  };

  const handleKeyDown = (event) => {
    // Get the currently focused option
    const focusedOption = selectRef.current?.select?.state?.focusedOption;

    if (
      event.key === "Enter" &&
      focusedOption?.label === "Select/Unselect All"
    ) {
      event.preventDefault();
      event.stopPropagation();

      let finalOptions = options[0]?.value === "*" ? options.slice(1) : options;

      const menuListProps = {
        options: finalOptions,
        selectProps: {
          value: !isSelectAll ? "" : finalOptions,
          inputValue: selectRef.current?.select?.inputRef?.value || "",
        },
        setValue: (val) => {
          onChange(val, { action: "select-option" });
        },
      };

      onSelectOrUnSelectAll(
        props,
        initialOptions,
        options,
        selectedOptions,
        setSelectedOptions,
        isSelectAll,
        setIsSelectAll
      );
      // setIsSelectAll(!isSelectAll);
    }
  };

  useEffect(() => {
    if (selectedOptions?.length === initialOptions?.length) {
      setIsSelectAll(true);
    } else {
      setIsSelectAll(false);
    }
  }, [selectedOptions]);

  return (
    <SelectComp
      {...props}
      inputId={cellIdentifier}
      openMenuOnFocus
      ref={selectRef}
      placeholder={props?.placeholder}
      isOpen={open}
      setIsOpen={setOpen}
      currentOptions={options}
      setCurrentOptions={setOptions}
      initialOptions={initialOptions}
      selectedOptions={selectedOptions}
      setSelectedOptions={setSelectedOptions}
      dropDownPortalClassName={"select-renderer-portal"}
      menuPlacement={"auto"}
      options={options}
      hideSelectedOptions={false}
      blurInputOnSelect={!Boolean(props.isMulti)}
      isClearable={props.disabledEdit ? !props.disabledEdit : props.isClearable}
      closeMenuOnSelect={props.isMulti ? false : true}
      handleChange={onChange}
      onKeyDown={handleKeyDown}
      isOptionDisabled={(_option) => props.disabledEdit}
      toggleSelectAll
      isWithSelectAll={props.isMulti && !!props.options.length}
      isSelectAll={isSelectAll}
      setIsSelectAll={setIsSelectAll}
      isCloseWhenClickOutside={false}
      onClearAll={() =>
        onClearAll(setSelectedOptions, onChange, props?.customFunction)
      }
      // onMenuScrollToBottom={onMenuScrollToBottom}
      onMenuClose={onMenuClose}
      isWithSearch={props?.isSearchable || false}
      filterOption={filterOptions}
      withPortal={props?.withPortal || false}
      menuShouldBlockScroll={props?.menuShouldBlockScroll || false}
      isMultiInSubmenu={props?.isMultiInSubmenu || false}
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

import React, { useState, useEffect, useRef } from "react";
import { components, Creatable } from "react-select";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ClearIcon from "@mui/icons-material/Clear";
import theme from "core/Styles/theme";

const selectStyles = {
  clearIndicator: (provided, state) => ({
    ...provided,
    color: theme.palette.textColours.codGray,
    paddingBlock: 0,

    ":hover": {
      color: theme.palette.textColours.codGray,
    },

    "& .MuiSvgIcon-root": {
      fontSize: "1rem",
    },
  }),
  control: (provided, state) => {
    const disabledBorder = state.isDisabled
      ? `1px solid ${theme.palette.colours.disabledSelectBackground}`
      : `1px solid ${theme.palette.colours.disabledBorder}`;

    return {
      ...provided,
      background: state.isDisabled
        ? theme.palette.colours.disabledSelectBackground
        : theme.palette.common.white,
      border: state.isFocused
        ? `1px solid ${theme.palette.primary.main}`
        : disabledBorder,
      boxShadow: "none",
      minHeight: theme.typography.pxToRem(35),

      ":hover": {
        border: state.isFocused
          ? `1px solid ${theme.palette.primary.main}`
          : disabledBorder,
      },
    };
  },
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: theme.palette.textColours.codGray,
    paddingBlock: 0,

    ":hover": {
      color: theme.palette.textColours.codGray,
    },
  }),
  menu: (provided, state) => ({
    ...provided,
    border: `1px solid ${theme.palette.background.primary}`,
    boxShadow: "0px 0px 6px rgba(0, 0, 0, 0.3)",
  }),
  menuList: (provided, state) => ({
    ...provided,
    borderRadius: theme.shape.borderRadius,
    padding: 0,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? theme.palette.primary.main
      : theme.palette.common.white,
    color: state.isSelected
      ? theme.palette.common.white
      : theme.palette.textColours.slateGrayLight,

    ":hover": {
      backgroundColor: state.isSelected
        ? theme.palette.primary.main
        : theme.palette.primary.lighter,
    },
  }),
  singleValue: (provided, state) => ({
    ...provided,
    color: theme.palette.textColours.codGray,
  }),
};

/**
 * @func
 * @desc Update the default Dropdownindicator
 * @param {Object} props
 * @returns {Object}
 */
const DropdownIndicator = (props) => {
  return (
    <components.DropdownIndicator {...props}>
      <KeyboardArrowDownIcon fontSize="small" />
    </components.DropdownIndicator>
  );
};

/**
 * @func
 * @desc Update the default ClearIndicator
 * @param {Object} props
 * @returns {Object}
 */
const ClearIndicator = (props) => {
  return (
    <components.ClearIndicator {...props}>
      <ClearIcon fontSize="small" />
    </components.ClearIndicator>
  );
};

const SearchableSelect = (props) => {
  const [isOpen, setisOpen] = useState(false);
  const [optionSelected, setoptionSelected] = useState(props.selectedOptions);
  const [initialOptions, setInitialOption] = useState(props.initialData || []);
  const searchBarRef = useRef(null);

  /**
   * @func
   * @desc Always update local state on dependency change
   */
  useEffect(() => {
    if (props.selectedOptions) {
      setoptionSelected(props.selectedOptions);
    }
  }, [props.selectedOptions]);

  /**
   * Focus on referenced element whenever isOpen is true
   */
  useEffect(() => {
    if (isOpen) {
      searchBarRef.current.focus();
    }
  }, [isOpen]);

  /**
   * @func
   * @desc Handle Changes for select and creation of values in a dropdown
   * @param {Object} newValue
   * @param {String} actionMeta
   */
  const handleChange = (newValue, actionMeta) => {
    const { action } = actionMeta;
    if (!newValue) {
      props.updateDependency(newValue);
      return;
    }
    let options = [...initialOptions];
    let option = { label: newValue.label, value: newValue.value };
    let selected = [];
    switch (action) {
      case "select-option":
        if (props.is_multiple_selection) {
          selected = [...optionSelected, newValue];
          props.updateDependency(selected);
        } else {
          props.updateDependency([option]);
          setisOpen(false);
        }
        break;
      case "create-option":
        if (props.is_multiple_selection) {
          options = [...options, option];
          selected = [...optionSelected, option];
          props.updateDependency(selected);
          setInitialOption([...options]);
        } else {
          props.updateDependency([option]);
          setInitialOption([...options, option]);
          setisOpen(false);
        }
    }
  };

  return (
    <Creatable
      menuIsOpen={isOpen}
      menuPosition={"absolute"}
      components={{
        DropdownIndicator,
        IndicatorSeparator: null,
        ClearIndicator,
      }}
      ref={searchBarRef}
      options={initialOptions}
      label={props.label}
      value={optionSelected}
      styles={selectStyles}
      hideSelectedOptions={false}
      onChange={(newValue, actionMeta) => handleChange(newValue, actionMeta)}
      clearValues={() => props.updateDependency([])}
      onFocus={() => setisOpen(true)}
      onBlur={() => setisOpen(false)}
      blurInputOnSelect={true}
      isMulti={props.is_multiple_selection ? true : false}
      isClearable={props.isClearable ? true : false}
      isDisabled={props.isDisabled ? true : false}
    />
  );
};

export default SearchableSelect;

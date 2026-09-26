import React, {
  useReducer,
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
} from "react";
import "../Filters.scss";
import { StyledCheckbox } from "core/Utils/selection/selection";
import {
  checkIfEqual,
  isStringIncluded,
  replaceSpecialCharacter,
} from "core/Utils/functions/utils";
import Select, { components } from "react-select";
import { Inbox } from "@mui/icons-material/";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import ClearIcon from "@mui/icons-material/Clear";
import axiosInstance from "../../../Utils/axios";
import { find, indexOf, cloneDeep, debounce, isNil, uniqBy } from "lodash";
import { replaceCharacter } from "core/Utils/formatter";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import SearchIcon from "@mui/icons-material/Search";
import makeStyles from "@mui/styles/makeStyles";
import ArrowTooltips from "core/Utils/ArrowTooltips";
import {
  OPTION_SET,
  OPTION_INIT,
  OPTION_ERROR,
  OPTION_SUCCESS,
  OPTION_RESET,
  SEARCH_SUCCESS,
  SEARCH_RESET,
  BATCH_SIZE,
  SCROLL_TO_BOTTOM_VARIANCE,
} from "./constants";

const useStyles = makeStyles((theme) => ({
  positionedDropdown: (props) => {
    let scrollTop = props.isViewCluster
      ? `calc((${props.anchorPostionTop}px) - 8.2rem)`
      : `calc((${props.anchorPostionTop}px) - (${theme.customVariables.headerHeight} + 2rem))`;
    if (props.shouldDropdownUp) {
      return {
        bottom:
          props.menuPosition === "fixed" ? scrollTop : "calc(100% + 0.5rem)",
      };
    } else {
      return {
        top: props.menuPosition === "fixed" ? scrollTop : "unset",
      };
    }
  },
  positionedMenu: {
    backgroundColor: theme.palette.common.white,
    borderRadius: 3,
    boxShadow: "0px 0px 6px rgba(0, 0, 0, 0.3)",
    marginTop: 8,
    minWidth: "100%",
    position: "absolute",
    zIndex: 999,
  },
  selectedLabel: {
    color: theme.palette.text.primary,
    flex: "1",
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontSize: theme.typography.pxToRem(14),
    alignSelf: "center",
  },
  dropdownButton: {
    "&:hover": {
      borderColor: theme.palette.primary.main,
    },
    "&:focus": {
      borderColor: theme.palette.primary.main,
      boxShadow: "0 0 0 3px #E5EDF7",
    },
  },
}));

const selectStyles = {
  control: (provided) => ({
    ...provided,
    minWidth: 240,
    margin: 8,
  }),
  menu: () => ({ boxShadow: "inset 0 1px 0 rgba(0, 0, 0, 0.1)" }),
  noOptionsMessage: (styles) => ({
    ...styles,
    height: "300px",
  }),
};

const reducer = (state, action) => {
  switch (action.type) {
    case OPTION_INIT:
      return { ...state, isLoading: true };
    case OPTION_ERROR:
      return { ...state, isLoading: false, isError: true };
    case OPTION_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: [...state.data, ...action.payload],
      };
    case OPTION_SET:
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: [...action.payload],
      };
    case OPTION_RESET:
      return { ...state, isLoading: false, isError: false, data: [] };
    case "SEARCH_INIT":
      return { ...state, isSearching: true };
    case SEARCH_SUCCESS:
      return {
        ...state,
        isSearching: false,
        searchData: [...action.payload],
      };
    case SEARCH_RESET:
      return { ...state, isSearching: false, searchData: [] };
    default:
      break;
  }
};

function MultiSelect(props) {
  const [isOpen, setisOpen] = useState(false);
  const [page, setpage] = useState(2);
  const [optionSelected, setoptionSelected] = useState(
    props.selectedOptions || []
  );
  const [prevDependency, setprevDependency] = useState(null);
  const [nextSet, setNextSet] = useState([]);
  const [searchPage, setsearchPage] = useState(1);
  const [searchValue, setsearchValue] = useState("");
  const [flag_edit, setFlagEdit] = useState(false);
  const searchBarRef = useRef(null);
  const firstTimeRender = useRef(true);
  const [anchorPostionTop, setAnchorPostionTop] = useState(0);
  const [menuPosition, setMenuPosition] = useState("");
  const [shouldDropdownUp, setShouldDropdownUp] = useState(false);
  const [selectedItemsinTooltip, setSelectedItemsinTooltip] = useState("");
  const [overTooltip, setOverTooltip] = useState(false);
  const isViewCluster = props.isViewCluster;
  const anchorElem = useRef(null);
  const menuElem = useRef(null);
  const classes = useStyles({
    anchorPostionTop,
    menuPosition,
    shouldDropdownUp,
    isViewCluster,
  });
  const [{ isLoading, data, isSearching, searchData }, dispatch] = useReducer(
    reducer,
    {
      isLoading: false,
      isError: false,
      data: [],
      isSearching: false,
      searchData: [],
    }
  );
  const [checkConfiguration, setCheckConfiguration] = useState([]);

  const getDependency = () => {
    //todo - calculate the dependency selections for current select
    //that is find all selected values before selecting the current

    let dependency = cloneDeep(props.dependency);
    let index = indexOf(
      dependency,
      find(dependency, { field: props.filter_keyword })
    );
    if (index !== -1) {
      dependency = dependency.slice(0, index);
      return dependency;
    } else {
      return dependency;
    }
  };

  const fetchData = useCallback(
    async (page) => {
      if (page === 1) {
        dispatch({ type: OPTION_RESET });
      }

      // dispatch({ type: 'OPTION_INIT' })
      try {
        const response = await axiosInstance({
          url: props.data_url,
          method: "POST",
          data: {
            filter_id: props.filter_keyword,
            fields_values: prevDependency,
            page: page,
            filter_type: "hierarchy",
          },
        });

        setNextSet(response.data.data.results);
        // dispatch({ type: 'OPTION_SUCCESS', payload: response.data.data.results })
        setpage(response.data.data.next_page);
      } catch (error) {
        dispatch({ type: OPTION_ERROR });
      }
    },
    [page, prevDependency]
  );

  const fetchSearch = useCallback(
    async (_searchPage, searchValue) => {
      try {
        if (searchValue) {
          /**
           * Implemented multi search function with comma seperation.
           */
          const filterKeys = searchValue.split(",");
          let filteredValues = [];
          filterKeys.forEach((searchVal) => {
            if (searchVal.replace(/\s/g, "").length) {
              const newOptions = props.initialData.filter((item) => {
                // if more than one term is searched then let it be a exact search or else do a normal search(similar to table's search functionality)
                if (filterKeys.length > 1) {
                  return checkIfEqual(searchVal, item.label);
                } else {
                  return isStringIncluded(searchVal, item.label);
                }
              });
              filteredValues = [...filteredValues, ...newOptions];
              const uniqueSet = new Set(filteredValues);
              filteredValues = Array.from(uniqueSet);
            }
          });
          dispatch({ type: SEARCH_SUCCESS, payload: filteredValues });
          if (filteredValues.length > BATCH_SIZE) {
            setDropDownOptions(
              filteredValues ? filteredValues.slice(0, BATCH_SIZE) : []
            );
          } else {
            setDropDownOptions(filteredValues ? filteredValues : []);
          }
        }
        // setsearchPage(response.data.data.next_page)
      } catch (error) {
        //dispatch({ type: 'OPTION_ERROR' })
      }
    },
    [searchPage, searchValue, prevDependency]
  );

  const addSelectedItemsToTooltip = () => {
    try {
      let itemsSelectedStr = "";
      let itemsSelectedArr = [];
      // itemsSelectedArr will contain an array of names which are currently selected by the dropdown
      itemsSelectedArr = optionSelected?.map((item) => item.label);
      // itemsSelectedStr will contain a comma seperated value of names
      itemsSelectedStr = itemsSelectedArr.join(",");
      // by doing setSelectedItemsinTooltip(itemsSelectedStr) we are assigning itemsSelectedStr to selectedItemsinTooltip which is going to be passed as prop to ArrowTooltips component
      setSelectedItemsinTooltip(itemsSelectedStr);
    } catch (error) {
      console.error("addSelectedItemsToTooltip error", error);
    }
  };

  useEffect(() => {
    if (!firstTimeRender.current) {
      fetchSearch(searchPage, searchValue);
    }
    return () => {
      //cleanup
    };
  }, [searchValue]);

  useEffect(() => {
    if (props.selectedOptions && !props.doNotUpdateDefaultValue) {
      let defaultOptions = [];
      if (Array.isArray(props.selectedOptions)) {
        defaultOptions = [...props.selectedOptions];

        defaultOptions = defaultOptions.map((item) => {
          if (item && item?.label) {
            return {
              ...item,
              label: replaceSpecialCharacter(item.label.toString()),
            };
          } else {
            return item;
          }
        });
      } else {
        defaultOptions = props.selectedOptions;
        if (defaultOptions?.label) {
          defaultOptions.label = replaceSpecialCharacter(
            defaultOptions.label.toString()
          );
        }
      }
      setoptionSelected(defaultOptions.filter((item) => item !== undefined));
    }
  }, [props.selectedOptions]);

  useEffect(() => {
    firstTimeRender.current = false;

    return () => {
      //cleanup
    };
  }, []);

  useEffect(() => {
    if (props.reset) {
      setFlagEdit(false);
      setoptionSelected([]);
      setSelectedItemsinTooltip("");
    }
  }, [props.reset]);

  useEffect(() => {
    if (
      optionSelected?.length &&
      !isNil(optionSelected[0]) &&
      !props.disableTooltip
    ) {
      addSelectedItemsToTooltip();
    } else {
      setSelectedItemsinTooltip("");
    }
  }, [optionSelected]);

  const dropdownOpen = (_params) => {
    //load the data on initial dropdown click
    // let initialData = props.filterData.filter(item => item.key === props.filter_keyword);
    const dropdownOptionsList = setDropDownOptions(
      props?.initialData || [],
      false
    );
    if (dropdownOptionsList?.length > BATCH_SIZE) {
      dispatch({
        type: OPTION_SET,
        payload: dropdownOptionsList
          ? dropdownOptionsList.slice(0, BATCH_SIZE)
          : [],
      });
    } else {
      dispatch({
        type: OPTION_SET,
        payload: dropdownOptionsList ? dropdownOptionsList : [],
      });
    }

    setprevDependency(getDependency());

    //todo - check if the dependency list of selected  value has changed or not
    // if yes set all state to initial and fire new data fetch req
    // else do nothing
    setisOpen(!isOpen);
    if (props.dropdownOpenCallback) {
      props.dropdownOpenCallback(dispatch, props);
    }
  };

  const dropdownClose = async (_params) => {
    //todo -
    // verify if there is difference between the previous selected values and current
    // if yes send selected options list to parent on close to save
    // else if selected values is null remove the option from the selected value of parent
    // else do nothing
    dispatch({ type: SEARCH_RESET });
    setsearchPage(1);
    setsearchValue("");
    if (props.initialData?.length > BATCH_SIZE) {
      dispatch({
        type: OPTION_SET,
        payload: props.initialData
          ? props.initialData.slice(0, BATCH_SIZE)
          : [],
      });
    } else {
      dispatch({
        type: OPTION_SET,
        payload: props.initialData ? props.initialData : [],
      });
    }
    if (props.pagination) {
      fetchData(2);
    }
    if (flag_edit && !props.isDisabled) {
      props.updateDependency(
        {
          filter_id: props.filter_keyword,
          filter_type: props.type,
          dimension: props.dimension,
          check_configuration: checkConfiguration,
        },
        optionSelected
      );
      setFlagEdit(false);
    }
    setisOpen(!isOpen);
  };

  const dropdownSelectedMessage = () => {
    //todo-
    // items selected
    if (optionSelected.length && !isNil(optionSelected[0])) {
      if (
        optionSelected.length === data.length &&
        searchValue === "" &&
        optionSelected.length > 1
      ) {
        return "All Selected";
      }
      if (!props.is_multiple_selection) {
        return optionSelected[0]?.label;
      } else {
        return optionSelected.length === 1
          ? optionSelected[0]?.label
          : props.extra?.showPlaceholderWithRatio &&
            props.initialData.length > 0
          ? `${optionSelected.length}/${props.initialData.length} selected`
          : `${optionSelected.length} ${
              optionSelected.length > 1 ? " items" : " item"
            } selected`;
      }
    }
    return props.customPlaceholder || "Select...";
  };

  const onSelectAll = () => {
    //todo -
    // select all options on clicked
    //If there is no search term associated, if the user does select all, we add props.initialData
    if (searchData.length) {
      //User searched for some data
      setFlagEdit(true);
      //Filter duplicate values using uniqBy
      setoptionSelected(uniqBy([...optionSelected, ...searchData], "value"));
      // updating check filter configuration
      let tempCheckConfiguration = cloneDeep(checkConfiguration);
      tempCheckConfiguration.push({
        checkAll: true,
        searchColumns: {
          searchData: {
            filter: searchValue,
            filterType: "text",
            type: "contains",
          },
        },
      });
      setCheckConfiguration(tempCheckConfiguration);
    } else {
      //User didn't do any search
      setFlagEdit(true);
      setoptionSelected(props.initialData);

      let tempCheckConfiguration = cloneDeep(checkConfiguration);
      tempCheckConfiguration.push({ checkAll: true, searchColumns: {} });
      setCheckConfiguration(tempCheckConfiguration);
    }
  };

  const onClearAll = () => {
    //todo -
    //clear all options on clicked if there is something to be cleared and user has search term
    if (optionSelected.length && searchData.length) {
      setFlagEdit(true);
      const updatedFilters = cloneDeep(optionSelected).filter(
        (selectedOption) =>
          searchData.findIndex(
            (option) => option.value === selectedOption.value
          ) === -1
      );
      setoptionSelected(updatedFilters);
      // updating check filter configuration
      let tempCheckConfiguration = cloneDeep(checkConfiguration);
      tempCheckConfiguration.push({
        unCheckAll: true,
        searchColumns: {
          searchData: {
            filter: searchValue,
            filterType: "text",
            type: "contains",
          },
        },
      });
      setCheckConfiguration(tempCheckConfiguration);
    } else if (optionSelected.length) {
      setFlagEdit(true);
      setoptionSelected([]);

      let tempCheckConfiguration = cloneDeep(checkConfiguration);
      tempCheckConfiguration.push({ unCheckAll: true, searchColumns: {} });
      setCheckConfiguration(tempCheckConfiguration);
    }
  };

  const onMenuScrollToBottom = () => {
    //if data already loading dont call fetchData again
    if (!isLoading) {
      if (searchData.length > 0) {
        if (searchData.length !== data.length) {
          let newlength = data.length + BATCH_SIZE;
          setDropDownOptions(searchData ? searchData.slice(0, newlength) : []);
        }
      } else if (
        props.initialData.length !== data.length &&
        !searchValue.length
      ) {
        const dropdownOptionsList = setDropDownOptions(
          props.initialData,
          false
        );
        let newlength = data.length + BATCH_SIZE;
        dispatch({
          type: OPTION_SET,
          payload: dropdownOptionsList
            ? dropdownOptionsList.slice(0, newlength)
            : [],
        });
      }
      //Backend pagniation code
      // dispatch({ type: 'OPTION_SUCCESS', payload: nextSet })
      // dispatch({ type: 'OPTION_SET', payload: props.initialData ? props.initialData.slice(0,BATCH_SIZE): [] })
      // if (page && props.initialData.slice(0,BATCH_SIZE)) {
      // fetchData(page)
      // }else{
      // setNextSet([])
      // }
    }
  };

  useEffect(() => {
    //Auto closing single select dropdown onChange
    if (
      flag_edit &&
      props.handleDropdownClose &&
      !props.is_multiple_selection
    ) {
      dropdownClose();
    }
  }, [flag_edit]);

  const onChange = (selected, _event) => {
    // updating check filter configuration
    if (_event.action === "select-option") {
      if (checkConfiguration.length > 0) {
        if (
          !isNil(checkConfiguration[checkConfiguration.length - 1]?.checkedRows)
        ) {
          let tempCheckConfiguration = cloneDeep(checkConfiguration);
          tempCheckConfiguration[
            tempCheckConfiguration.length - 1
          ]?.checkedRows.push(_event?.option?.value);

          setCheckConfiguration(tempCheckConfiguration);
        } else {
          let tempCheckConfiguration = cloneDeep(checkConfiguration);
          const newObj = { checkedRows: [_event?.option?.value] };
          tempCheckConfiguration.push(newObj);
          setCheckConfiguration(tempCheckConfiguration);
        }
      } else {
        let tempCheckConfiguration = cloneDeep(checkConfiguration);
        const newObj = { checkedRows: [_event?.option?.value] };
        tempCheckConfiguration.push(newObj);
        setCheckConfiguration(tempCheckConfiguration);
      }
    } else if (_event.action === "deselect-option") {
      if (checkConfiguration.length > 0) {
        if (
          !isNil(
            checkConfiguration[checkConfiguration.length - 1]?.unCheckedRows
          )
        ) {
          let tempCheckConfiguration = cloneDeep(checkConfiguration);
          tempCheckConfiguration[
            tempCheckConfiguration.length - 1
          ]?.unCheckedRows.push(_event?.option?.value);

          setCheckConfiguration(tempCheckConfiguration);
        } else {
          let tempCheckConfiguration = cloneDeep(checkConfiguration);
          const newObj = { unCheckedRows: [_event?.option?.value] };
          tempCheckConfiguration.push(newObj);
          setCheckConfiguration(tempCheckConfiguration);
        }
      } else {
        let tempCheckConfiguration = cloneDeep(checkConfiguration);
        const newObj = { unCheckedRows: [_event?.option?.value] };
        tempCheckConfiguration.push(newObj);
        setCheckConfiguration(tempCheckConfiguration);
      }
    }
    //on option selected
    if (props.isDisabled) {
      return;
    }
    if (props.is_multiple_selection) {
      setoptionSelected(selected);
    } else {
      setoptionSelected([selected]);
      setFlagEdit(true);
    }
    setFlagEdit(true);
  };

  const search = useCallback(
    debounce((searchKey) => {
      setsearchValue(searchKey);
    }, 200),
    []
  );

  const handleSearch = (event) => {
    const dropdownOptionsList = setDropDownOptions(props.initialData, false);
    //todo check if search input values are spaces or special characters
    //before calling search
    if (event.target.value.length > 0) {
      search(event.target.value);
    } else {
      setsearchValue("");
      dispatch({ type: SEARCH_RESET });
      if (dropdownOptionsList.length > BATCH_SIZE) {
        dispatch({
          type: OPTION_SET,
          payload: dropdownOptionsList
            ? dropdownOptionsList.slice(0, BATCH_SIZE)
            : [],
        });
      } else {
        dispatch({
          type: OPTION_SET,
          payload: dropdownOptionsList ? dropdownOptionsList : [],
        });
      }
    }
  };

  /**
   * @func
   * @desc Update the Position style applied and the scroll position for the anchored element when dropdown Opens
   */
  useEffect(() => {
    const scrollTop =
      anchorElem.current.getBoundingClientRect().top +
      anchorElem.current.clientHeight;
    // const l_shouldDropdownUp =
    //   window.innerHeight - menuElem?.current?.getBoundingClientRect().bottom;
    // setShouldDropdownUp(l_shouldDropdownUp < 0);
    const position = menuElem?.current
      ? getComputedStyle(menuElem.current).getPropertyValue("position")
      : false;
    if (isOpen) {
      setMenuPosition(position);
      setAnchorPostionTop(scrollTop);
      props.dropDownUp && setShouldDropdownUp(true);
      searchBarRef.current.focus();
    } else {
      shouldDropdownUp && setShouldDropdownUp(false);
    }
  }, [isOpen]);

  const onKeyDown = (e) => {
    if (isOpen) {
      const searchResults = Array.from(
        document.getElementsByClassName("multi-select__option")
      );
      let currentlyPseudoHoveredElement = -1;
      // See if one of the items already are "hovered" over
      searchResults.forEach((element, index) => {
        if (element.classList.contains("multi-select__option--is-focused")) {
          currentlyPseudoHoveredElement = index;
        }
      });
      if (e.keyCode === 13) {
        //When a enter key is pressed, currently focused element would be selected
        if (currentlyPseudoHoveredElement !== -1) {
          searchResults[currentlyPseudoHoveredElement].click();
        }
      }
    }
  };

  //this function disables the non adjacent options if the selections are supposed to be only sequntial
  const checkSequence = (option, optionSelected, sequentialCondition) => {
    return (
      optionSelected.length > 0 &&
      !optionSelected.map(
        (selOpt) =>
          selOpt[sequentialCondition] - option[sequentialCondition] === 1 ||
          option[sequentialCondition] - selOpt[sequentialCondition] === 1
      )[0] &&
      !optionSelected.some((selOpt) => selOpt.value === option.value)
    );
  };

  //check the max limit of the selected options if needed
  const checkMaxLimit = (option, optionSelected) => {
    return (
      optionSelected.length >= props.maxLimit &&
      !optionSelected.some((selOpt) => selOpt.value === option.value)
    );
  };

  // before dispatching OPTION_SET we move the selected options to the top
  const setDropDownOptions = (dropdownOptions, dispatchAction = true) => {
    let dropdownOptionsList = [];
    if (
      props.type === "non-cascaded" &&
      !props?.extra?.doNotShowSelectedOnTop
    ) {
      dropdownOptionsList = prioritizeSelectedOptions(
        optionSelected,
        dropdownOptions
      );
    } else {
      dropdownOptionsList = dropdownOptions;
    }
    if (!dispatchAction) {
      return dropdownOptionsList;
    } else {
      dispatch({
        type: OPTION_SET,
        payload: dropdownOptionsList,
      });
    }
  };

  // moves the selected options on top in the dropdownOptions
  const prioritizeSelectedOptions = (selectedOptions, dropdownOptions) => {
    const selectedSet = new Set(selectedOptions?.map((option) => option.label));
    const selected = [];
    const unselected = [];
    dropdownOptions?.forEach((option) => {
      if (selectedSet?.has(option.label)) {
        selected.push(option);
      } else {
        unselected.push(option);
      }
    });
    const prioritizedOptions = selected.concat(unselected);
    return prioritizedOptions;
  };

  return (
    <Dropdown
      isOpen={isOpen}
      onClose={dropdownClose}
      className={`dropdown-wrapper ${
        props.dropdownClass ? props.dropdownClass : ""
      }`}
      menuClasses={`${classes.positionedDropdown} ${classes.positionedMenu} ${
        props.is_multiple_selection
          ? "dropdown-multi-height"
          : "dropdown-height"
      }`}
      label={props.label}
      ref={{ anchorElem, menuElem }}
      target={
        <button
          data-testid="dropdown-button"
          onClick={dropdownOpen}
          disabled={props.disabledDropdown}
          onMouseEnter={() => {
            setOverTooltip(true);
          }}
          onBlur={() => setOverTooltip(false)}
          className={`dropdown-button ${
            !props?.isDisabled && classes.dropdownButton
          } ${props.isDisabled && "dropdown-button-disabled"}`}
        >
          <ArrowTooltips
            title={
              selectedItemsinTooltip && !isOpen && overTooltip
                ? selectedItemsinTooltip
                : ""
            }
            placement="bottom"
          >
            <span
              className={
                optionSelected?.length ? classes.selectedLabel : "selected-text"
              }
            >
              {dropdownSelectedMessage()}
            </span>
          </ArrowTooltips>
          <span className="toggle-icon">
            <KeyboardArrowDownIcon fontSize="small" />
          </span>
        </button>
      }
    >
      <div className="filter-options-group">
        {!props.isDisabled && props.isClearable && (
          <div className="filter-options-item">
            <div className="filter-options-item-icon">
              <ClearIcon />
            </div>
            <div
              data-testid="dropdown-clear"
              className="filter-options-item-text"
              onClick={onClearAll}
            >
              Clear selection
            </div>
          </div>
        )}
        {!props.isDisabled &&
          props.is_multiple_selection &&
          !props.isSelectAllButtonHidden && (
            <div className="filter-options-item">
              <div className="filter-options-item-icon">
                <PlaylistAddCheckIcon />
              </div>
              <div className="filter-options-item-text" onClick={onSelectAll}>
                Select All from <span>{props.selectAllLabel}</span>
              </div>
            </div>
          )}
      </div>
      <div>
        <div onKeyDown={onKeyDown} className="search-select__control">
          <div className="multi-select__indicators">
            <SearchIcon fontSize="small" />
          </div>
          <div className="search-select__value-container">
            <div
              className="multi-select__input"
              style={{ display: "inline-block" }}
            >
              <input
                ref={searchBarRef}
                id="search-select-input"
                autocapitalize="none"
                autocomplete="off"
                autocorrect="off"
                spellcheck="false"
                tabindex="0"
                type="text"
                aria-autocomplete="list"
                placeholder="Search..."
                onChange={handleSearch}
              />
            </div>
          </div>
        </div>
      </div>
      <Select
        //style select
        className="multi-select-container"
        classNamePrefix="multi-select"
        styles={selectStyles}
        placeholder="Search..."
        customLabel={props.customLabel}
        //dropdown behaviour change
        menuIsOpen
        autoFocus
        backspaceRemovesValue={false}
        controlShouldRenderValue={false}
        tabSelectsValue={false}
        hideSelectedOptions={false}
        isClearable={props.isClearable ? true : false}
        isMulti={props.is_multiple_selection ? true : false}
        //custom components
        components={{
          DropdownIndicator,
          IndicatorSeparator: null,
          Option,
          NoOptionsMessage,
          MenuList,
          LoadingMessage,
        }}
        //custom functions and data load
        options={data}
        value={optionSelected}
        isLoading={isLoading || isSearching}
        onMenuScrollToBottom={onMenuScrollToBottom}
        onChange={onChange}
        isOptionDisabled={(option) => {
          return (
            props.isDisabled &&
            !optionSelected.some((selOpt) => selOpt.value === option.value)
          );
        }}
        MenuProps={{ onMenuScrollToBottom }}
      />
    </Dropdown>
  );
}

export default MultiSelect;

//custom select components

const LoadingMessage = (_props) => {
  let loadingElement = [];
  loadingElement.push(
    <div className="multi-select__option" style={{ padding: " 8px 12px" }}>
      <div className="checkbox">
        <label htmlFor="checkbox">
          <span>Loading...</span>
        </label>
      </div>
    </div>
  );
  return <>{loadingElement}</>;
};

const MenuList = (props) => {
  let loadingElement = [];
  loadingElement.push(props.children);

  return (
    <div
      className="ScrollCheck"
      onScroll={(e) => {
        let element = e.target;
        const scrollBottomHeight = element.scrollHeight - element.scrollTop;
        // added +/- 1 variance while calculating scroll to bottom
        if (
          Math.abs(scrollBottomHeight - element.clientHeight) <=
          SCROLL_TO_BOTTOM_VARIANCE
        ) {
          // do something at end of scroll
          props?.selectProps?.MenuProps?.onMenuScrollToBottom?.();
          props.selectProps?.onScroll?.();
        }
      }}
    >
      <div className="checkbox">
        {props.selectProps.customLabel ? props.selectProps.customLabel : null}
      </div>
      <components.MenuList className="menulistScroll" {...props}>
        {loadingElement}
      </components.MenuList>
    </div>
  );
};

const Option = (props) => {
  return (
    <components.Option {...props} className="loading">
      <div className="checkbox">
        {props.selectProps.isMulti && (
          <StyledCheckbox
            color="primary"
            data-testid={`${props.label}select`}
            checked={props.isSelected}
            onChange={() => null}
          />
        )}
        <label
          className={
            !props.selectProps.isMulti && props.isSelected
              ? `single-select-selected-option ${
                  props?.data?.customAbbreviation
                    ? "single-select-delete-icon"
                    : ""
                }`
              : props?.data?.customAbbreviation
              ? "single-select-delete-icon"
              : null
          }
          htmlFor="checkbox"
        >
          <span
            className={props.isDisabled ? "dropdown-option-disabled" : ""}
            data-testid={props.label}
          >
            {props.label}
          </span>
          <p>{props?.data?.customAbbreviation}</p>
        </label>
      </div>
    </components.Option>
  );
};

const NoOptionsMessage = (props) => {
  return (
    <components.NoOptionsMessage {...props}>
      <div>
        <div>No Data</div>
        <Inbox size={32} />
      </div>
    </components.NoOptionsMessage>
  );
};

// component to create dropdown dropdown
const Menu = forwardRef((props, ref) => {
  return <div ref={ref} {...props} />;
});

const Blanket = (props) => (
  <div
    style={{
      bottom: 0,
      left: 0,
      top: 0,
      right: 0,
      position: "fixed",
      zIndex: 2,
    }}
    {...props}
  />
);
const Dropdown = forwardRef(
  (
    { children, isOpen, target, onClose, className, label, menuClasses },
    ref
  ) => {
    const { anchorElem, menuElem } = ref;
    return (
      <div
        id={
          label
            ? `${replaceCharacter(label.toLowerCase(), / /g, "-")}-select`
            : "select-dropdown"
        }
        style={{ position: "relative" }}
        className={className}
        ref={anchorElem}
      >
        {target}
        {isOpen ? (
          <Menu ref={menuElem} className={menuClasses}>
            {children}
          </Menu>
        ) : null}
        {isOpen ? <Blanket onClick={onClose} /> : null}
      </div>
    );
  }
);
const Svg = (p) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    focusable="false"
    role="presentation"
    {...p}
  />
);
const DropdownIndicator = (props) => {
  return (
    <components.DropdownIndicator {...props}>
      <KeyboardArrowDownIcon />
    </components.DropdownIndicator>
  );
};

const ChevronDown = () => (
  <Svg style={{ marginRight: -6 }}>
    <path
      d="M8.292 10.293a1.009 1.009 0 0 0 0 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955a1.01 1.01 0 0 0 0-1.419.987.987 0 0 0-1.406 0l-2.298 2.317-2.307-2.327a.99.99 0 0 0-1.406 0z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </Svg>
);

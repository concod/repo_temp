import {
  useReducer,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import "../Filters.scss";
import {
  checkIfEqual,
  isStringIncluded,
  replaceSpecialCharacter,
} from "core/Utils/functions/utils";
import axiosInstance from "../../../Utils/axios";
import {
  find,
  indexOf,
  cloneDeep,
  debounce,
  uniqBy,
  isArray,
  isNil,
} from "lodash";
import { Select } from "impact-ui-v3";
import { MAX_SELECTION_SIZE } from "./constants";

const reducer = (state, action) => {
  switch (action.type) {
    case "OPTION_INIT":
      return { ...state, isLoading: true };
    case "OPTION_ERROR":
      return { ...state, isLoading: false, isError: true };
    case "OPTION_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: [...state.data, ...action.payload],
        totalCount:
          state.data.length === 0 ? action.payload.length : state.data,
      };
    case "OPTION_SET":
      return {
        ...state,
        isLoading: false,
        isError: false,
        data: [...action.payload],
      };
    case "OPTION_RESET":
      return { ...state, isLoading: false, isError: false, data: [] };
    case "SEARCH_INIT":
      return { ...state, isSearching: true };
    case "SEARCH_SUCCESS":
      return {
        ...state,
        isSearching: false,
        searchData: [...action.payload],
      };
    case "SEARCH_RESET":
      return { ...state, isSearching: false, searchData: [] };
    default:
      break;
  }
};

function MultiSelect(props) {
  const { initialData = [] } = props;
  const [isOpen, setisOpen] = useState(false);
  const [page, setpage] = useState(2);
  const [optionSelected, setoptionSelected] = useState(
    props?.selectedOptions || []
  );
  const [currentSelectedOptions, setCurrentSelectedOptions] = useState(
    props?.selectedOptions && props?.selectedOptions?.length > 50
      ? props.is_multiple_selection
        ? props?.selectedOptions?.slice?.(0, 50)
        : props?.selectedOptions
      : props?.selectedOptions || []
  );
  const [searchSelectedOptions, setSearchSelectedOptions] = useState([]);

  const [prevDependency, setprevDependency] = useState(null);

  const [nextSet, setNextSet] = useState([]);
  const [searchPage, setsearchPage] = useState(1);
  const [searchValue, setsearchValue] = useState("");
  const [flag_edit, setFlagEdit] = useState(false);
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
  const [isAllSelected, setIsAllSelected] = useState(
    optionSelected.length
      ? optionSelected.length === initialData?.length
      : false
  );
  const [currentOptions, setCurrentOptions] = useState(data);
  const [checkConfiguration, setCheckConfiguration] = useState([]);

  useEffect(() => {
    setCurrentOptions(data);
    setCurrentSelectedOptions(
      data.length <= optionSelected.length
        ? searchValue && searchSelectedOptions.length
          ? searchSelectedOptions.slice(0, data.length)
          : props.is_multiple_selection
          ? optionSelected.slice(0, data.length)
          : optionSelected
        : optionSelected?.length
        ? props.is_multiple_selection
          ? optionSelected.slice(0, data.length)
          : optionSelected
        : !props.is_multiple_selection
        ? optionSelected
        : []
    );
    setIsAllSelected(optionSelected?.length > 0 ? initialData?.length === optionSelected?.length : false);
  }, [data]);

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
        dispatch({ type: "OPTION_RESET" });
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
        dispatch({ type: "OPTION_ERROR" });
      }
    },
    [page, prevDependency]
  );

  const fetchSearch = useCallback(
    async (searchValue) => {
      try {
        if (searchValue) {
          /**
           * Implemented multi search function with comma seperation.
           */
          const filterKeys = searchValue.split(",");
          let filteredValues = [];
          let searchSelectedOptions = [];
          filterKeys.forEach((searchVal) => {
            if (searchVal.replace(/\s/g, "").length) {
              const newOptions = initialData.filter((item) => {
                // if more than one term is searched then let it be a exact search or else do a normal search(similar to table's search functionality)
                if (filterKeys.length > 1) {
                  return checkIfEqual(searchVal, item.label);
                } else {
                  return isStringIncluded(searchVal, item.label);
                }
              });
              let optionSelectedCopy = Array.isArray(optionSelected) ? optionSelected : [optionSelected]
              const newSelectedOptions = optionSelectedCopy.filter((item) => {
                // if more than one term is searched then let it be a exact search or else do a normal search(similar to table's search functionality)
                if (filterKeys.length > 1) {
                  return checkIfEqual(searchVal, item.label);
                } else {
                  return isStringIncluded(searchVal, item.label);
                }
              });
              searchSelectedOptions = [
                ...searchSelectedOptions,
                ...newSelectedOptions,
              ];
              const uniqueSelecteSet = new Set(searchSelectedOptions);
              searchSelectedOptions = Array.from(uniqueSelecteSet);
              filteredValues = [...filteredValues, ...newOptions];
              const uniqueSet = new Set(filteredValues);
              filteredValues = Array.from(uniqueSet);
              setSearchSelectedOptions(searchSelectedOptions);
            }
          });
          dispatch({ type: "SEARCH_SUCCESS", payload: filteredValues });
          if (filteredValues.length > 50) {
            dispatch({
              type: "OPTION_SET",
              payload: filteredValues ? filteredValues.slice(0, 50) : [],
            });
          } else {
            dispatch({
              type: "OPTION_SET",
              payload: filteredValues ? filteredValues : [],
            });
          }
        } else {
          dispatch({ type: "SEARCH_SUCCESS", payload: initialData });
        }
        // setsearchPage(response.data.data.next_page)
      } catch (error) {
        //dispatch({ type: 'OPTION_ERROR' })
      }
    },
    [searchPage, prevDependency, initialData, optionSelected]
  );

  useEffect(() => {
    if (props.selectedOptions && !props.doNotUpdateDefaultValue) {
      let defaultOptions = [];
      let flag;
      if (Array.isArray(props.selectedOptions)) {
        let currentFilter = props?.dependency?.filter(
          (item) => item?.attribute_name === props?.column_name
        );
        flag =
          currentFilter?.[0]?.check_configuration?.length &&
          props?.selectedOptions?.length === MAX_SELECTION_SIZE;
        defaultOptions = (
          flag && !props?.isFormComponent ? initialData : props.selectedOptions
        ).map((item) => {
          if (item && item?.label) {
            return {
              ...item,
              label:
                typeof item.label === "object"
                  ? item.label
                  : replaceSpecialCharacter(item.label.toString()),
            };
          } else {
            return item;
          }
        });
      } else {
        defaultOptions = props.selectedOptions;
        if (defaultOptions?.label) {
          defaultOptions.label =
            typeof defaultOptions.label === "object"
              ? item.label
              : replaceSpecialCharacter(defaultOptions.label.toString());
        }
      }
      if (flag) {
        setoptionSelected(initialData);
      } else if (!optionSelected?.length || !defaultOptions.length) {
        setoptionSelected(defaultOptions);
      } else if (optionSelected.length > initialData.length) {
        setoptionSelected(initialData);
      } else if (!props.is_multiple_selection) {
        setoptionSelected(defaultOptions);
      } else {
        setoptionSelected(defaultOptions);
      }

      if (defaultOptions?.length > 50) {
        setCurrentSelectedOptions(defaultOptions?.slice?.(0, 50));
      } else if (defaultOptions?.length) {
        setCurrentSelectedOptions(defaultOptions);
      } else if (!props.is_multiple_selection || !defaultOptions.length) {
        setCurrentSelectedOptions(defaultOptions);
      }
    }
  }, [props.selectedOptions]);

  useEffect(() => {
    if (props.reset) {
      setFlagEdit(false);
      setoptionSelected([]);
      setCurrentSelectedOptions([]);
    }
  }, [props.reset]);

  useEffect(() => {
    if (!props.is_multiple_selection && flag_edit && !props.isDisabled) {
      props.updateDependency(
        {
          filter_id: props.filter_keyword,
          filter_type: props.type,
          dimension: props.dimension,
          check_configuration: checkConfiguration,
        },
        props.is_multiple_selection
          ? props?.isFormComponent
            ? optionSelected
            : optionSelected.slice(0, MAX_SELECTION_SIZE) // MAX_SELECTION_SIZE values since, the application starts to freeze with values more than MAX_SELECTION_SIZE
          : [optionSelected]
      );
      setFlagEdit(false);
    }
  }, [optionSelected, flag_edit]);

  const dropdownOpen = (_params) => {
    //load the data on initial dropdown click
    // let initialData = props.filterData.filter(item => item.key === props.filter_keyword);

    if (initialData?.length > 50) {
      dispatch({
        type: "OPTION_SET",
        payload: initialData ? initialData.slice(0, 50) : [],
      });
    } else {
      dispatch({
        type: "OPTION_SET",
        payload: initialData ? initialData : [],
      });
    }

    setprevDependency(getDependency());

    //todo - check if the dependency list of selected  value has changed or not
    // if yes set all state to initial and fire new data fetch req
    // else do nothing
    setisOpen(!isOpen);
    // setTimeout(() => {
    //   menuElem.current.style.opacity = 1;
    // }, 250);
    if (props.dropdownOpenCallback) {
      props.dropdownOpenCallback(dispatch, props);
    }
  };

  const dropdownClose = async (forceUpdate = false) => {
    //todo -
    // verify if there is difference between the previous selected values and current
    // if yes send selected options list to parent on close to save
    // else if selected values is null remove the option from the selected value of parent
    // else do nothing
    dispatch({ type: "SEARCH_RESET" });
    setsearchPage(1);
    setsearchValue("");

    if (initialData?.length > 50) {
      dispatch({
        type: "OPTION_SET",
        payload: initialData ? initialData.slice(0, 50) : [],
      });
    } else {
      dispatch({
        type: "OPTION_SET",
        payload: initialData ? initialData : [],
      });
    }
    if (props.pagination) {
      fetchData(2);
    }
    // We are explicitly calling the updateDependency when we clear All the options
    // from the dropdown without opening the dropdown
    const isFlagEdit = flag_edit && !props.isDisabled;
    if (isFlagEdit || forceUpdate) {
      props.updateDependency(
        {
          filter_id: props.filter_keyword,
          filter_type: props.type,
          dimension: props.dimension,
          check_configuration: checkConfiguration,
        },
        forceUpdate
          ? []
          : props.is_multiple_selection
          ? props?.isFormComponent
            ? optionSelected
            : optionSelected.slice(0, MAX_SELECTION_SIZE) // MAX_SELECTION_SIZE values since, the application starts to freeze with values more than MAX_SELECTION_SIZE
          : [optionSelected]
      );
      setFlagEdit(false);
    }
  };

  const onMenuScrollToBottom = () => {
    //if data already loading dont call fetchData again
    if (!isLoading) {
      if (searchData.length > 0) {
        if (searchData.length !== data.length) {
          let newlength = data.length + 50;
          dispatch({
            type: "OPTION_SET",
            payload: searchData ? searchData.slice(0, newlength) : [],
          });
        }
      } else if (initialData.length !== data.length && !searchValue.length) {
        let newlength = data.length + 50;
        dispatch({
          type: "OPTION_SET",
          payload: initialData ? initialData.slice(0, newlength) : [],
        });
      }
      //Backend pagniation code
      // dispatch({ type: 'OPTION_SUCCESS', payload: nextSet })
      // dispatch({ type: 'OPTION_SET', payload: initialData ? initialData.slice(0,50): [] })
      // if (page && initialData.slice(0,50)) {
      // fetchData(page)
      // }else{
      // setNextSet([])
      // }
    }
  };

  const onSelectAll = (event) => {
    if (event.target.checked) {
      //todo -
      // select all options on clicked
      //If there is no search term associated, if the user does select all, we add initialData
      if (searchData.length) {
        //User searched for some data
        setFlagEdit(true);
        //Filter duplicate values using uniqBy
        setoptionSelected(uniqBy([...optionSelected, ...searchData], "value"));
        setCurrentSelectedOptions(
          uniqBy([...currentSelectedOptions, ...searchData], "value")?.slice?.(
            0,
            data.length
          )
        );
        setIsAllSelected(true);
        // updating check filter configuration
        let tempCheckConfiguration = cloneDeep(checkConfiguration);
        tempCheckConfiguration.push({
          checkAll: true,
          meta: {
            search: [
              {
                pattern: searchValue,
                column: props.column_name,
              },
            ],
          },
        });
        setCheckConfiguration(tempCheckConfiguration);
      } else {
        //User didn't do any search
        setFlagEdit(true);
        setoptionSelected(initialData);
        setCurrentSelectedOptions(currentOptions);
        setIsAllSelected(true);

        let tempCheckConfiguration = cloneDeep(checkConfiguration);
        tempCheckConfiguration.push({ checkAll: true, meta: {} });
        setCheckConfiguration(tempCheckConfiguration);
      }
    } else {
      setoptionSelected([]);
      setCurrentSelectedOptions([]);
      setFlagEdit(true);
      setIsAllSelected(false);
    }
  };

  const onClearAll = () => {
    const updatedOptions = props.is_multiple_selection
      ? optionSelected
      : Array.isArray(optionSelected)
      ? optionSelected
      : [optionSelected];

    //todo -
    //to clear all the group filters in charts
    if (props.handleResetFlag) {
      props.handleReset();
    }
    //clear all options on clicked if there is something to be cleared and user has search term
    if (updatedOptions.length && searchData.length) {
      setFlagEdit(true);
      const updatedFilters = cloneDeep(updatedOptions).filter(
        (selectedOption) => {
          const selectedOptionIndex = searchData.findIndex(
            (option) => option.value === selectedOption.value
          );
          if (
            selectedOptionIndex > -1 &&
            searchData[selectedOptionIndex]?.isDisabled
          ) {
            return true;
          }
          return selectedOptionIndex === -1;
        }
      );
      setoptionSelected(updatedFilters);
      setCurrentSelectedOptions(updatedFilters.slice(0, 50));
      // updating check filter configuration
      let tempCheckConfiguration = cloneDeep(checkConfiguration);
      tempCheckConfiguration.push({
        unCheckAll: true,
        meta: {
          search: [
            {
              pattern: searchValue,
              column: props.column_name,
            },
          ],
        },
      });
      setCheckConfiguration(tempCheckConfiguration);
      setIsAllSelected(false);
    } else if (updatedOptions.length) {
      setFlagEdit(true);
      let updatedFilters;
      if (!isArray(optionSelected)) {
        updatedFilters = [optionSelected]?.filter(
          (selectedOption) => selectedOption.isDisabled
        );
      } else {
        updatedFilters = optionSelected?.filter(
          (selectedOption) => selectedOption.isDisabled
        );
      }
      setoptionSelected(updatedFilters);
      setCurrentSelectedOptions(updatedFilters.slice(0, 50));
      let tempCheckConfiguration = cloneDeep(checkConfiguration);
      tempCheckConfiguration.push({ unCheckAll: true, meta: {} });
      setCheckConfiguration(tempCheckConfiguration);
      setIsAllSelected(false);
    }

    if (!isOpen) dropdownClose(true);
  };

  const onChange = (selected, _event = {}, currentSelectedIndex) => {
    //on option selected
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
          const newObj = {
            checkedRows: [_event?.option?.value],
          };
          tempCheckConfiguration.push(newObj);
          setCheckConfiguration(tempCheckConfiguration);
        }
      } else {
        let tempCheckConfiguration = cloneDeep(checkConfiguration);
        const newObj = {
          checkedRows: [_event?.option?.value],
        };
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
          const newObj = {
            unCheckedRows: [_event?.option?.value],
          };
          tempCheckConfiguration.push(newObj);
          setCheckConfiguration(tempCheckConfiguration);
        }
      } else {
        let tempCheckConfiguration = cloneDeep(checkConfiguration);
        const newObj = {
          unCheckedRows: [_event?.option?.value],
        };
        tempCheckConfiguration.push(newObj);
        setCheckConfiguration(tempCheckConfiguration);
      }
    }
    if (props.isDisabled) {
      return;
    }

    let updatedSelectedOptions = props.is_multiple_selection
      ? _event.action === "select-option"
        ? [...optionSelected, _event?.option]
        : optionSelected.filter((item) => item.value !== _event?.option?.value)
      : selected;

    setCurrentSelectedOptions(selected);
    setoptionSelected(updatedSelectedOptions);
    setIsAllSelected(updatedSelectedOptions.length === initialData?.length);
    setFlagEdit(true);
  };

  const search = useMemo(() => {
    return debounce(fetchSearch, 200);
  }, [fetchSearch]);

  const handleSearch = (event) => {
    //todo check if search input values are spaces or special characters
    //before calling search
    const value = event.target.value || "";
    if (value.length > 0) {
      setsearchValue(value);
      search(value);
    } else {
      search("");
      setSearchSelectedOptions([]);
      if (initialData.length > 50) {
        dispatch({
          type: "OPTION_SET",
          payload: initialData ? initialData.slice(0, 50) : [],
        });
      } else {
        dispatch({
          type: "OPTION_SET",
          payload: initialData ? initialData : [],
        });
      }
    }
  };

  const updatedOptions = props.is_multiple_selection
    ? Array.isArray(optionSelected)
      ? optionSelected
      : [optionSelected]
    : Array.isArray(optionSelected)
    ? optionSelected[0]
    : optionSelected;
  const updatedCurrentSelectedOptions = props.is_multiple_selection
    ? Array.isArray(currentSelectedOptions)
      ? currentSelectedOptions
      : [currentSelectedOptions]
    : Array.isArray(currentSelectedOptions)
    ? currentSelectedOptions[0]
    : currentSelectedOptions;

  return (
    <Select
      currentOptions={currentOptions}
      handleChange={(select, event, index) => onChange(select, event, index)}
      initialOptions={[]}
      isLoading={isLoading}
      isMulti={props.is_multiple_selection}
      isRequired={props.is_mandatory || props.is_required || props.required}
      isDisabled={props.isDisabled}
      isWithSearch={props?.isSearchable !== false}
      toggleSelectAll
      isWithSelectAll={props.is_multiple_selection ? true : false}
      isSelectAll={isAllSelected}
      setIsSelectAll={setIsAllSelected}
      label={props.label}
      labelOrientation={props?.labelOrientation || "top"}
      name={props.name}
      isClearable={!props.isDisabled && props.isClearable}
      onClearAll={onClearAll}
      onDropdownClose={dropdownClose}
      onDropdownOpen={dropdownOpen}
      onSearch={handleSearch}
      onSelectAll={onSelectAll}
      placeholder={props.customPlaceholder || "Select"}
      selectedOptions={updatedCurrentSelectedOptions}
      // selectedOptions={updatedOptions}
      setCurrentOptions={setCurrentOptions}
      isOpen={isOpen}
      setIsOpen={setisOpen}
      setSelectedOptions={setCurrentSelectedOptions}
      width={props?.width}
      minWidth={props?.minWidth}
      onMenuScrollToBottom={onMenuScrollToBottom}
      customPlaceholderAfterSelect={optionSelected?.length || 0}
      withPortal={props?.withPortal}
      isGrouped={props?.isGrouped}
    />
  );
}

export default MultiSelect;

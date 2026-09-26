import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { Button, Modal, ButtonGroup, Prompt } from "impact-ui-v3";
import { Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import Form from "core/Utils/form";
import { addSnack } from "core/actions/snackbarActions";
import {
  setColumnSearched,
  setLastSearchType,
  setSaveSearchConfig,
  setTableRecentChanges,
  setTableSearchConfig,
} from "core/actions/tableColumnActions";
import { END_DATE, START_DATE } from "config/constants";
import { cloneDeep, isEmpty, isNull, isUndefined } from "lodash";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  collectiveTypes,
  textFilterCollectiveTypes,
} from "./constants";
import { parseRangeBody, reduceTextFilterOptions } from "./table-functions";
import { pxToRem } from "core/Utils/functions/utils";

const useStyles = makeStyles((theme) => ({
  boxPadding: {
    padding: "1.5rem 0  !important",
    display: "flex",
    justifyContent: "flex-start",
  },
  clearSeacrhBtn: {
    marginLeft: "auto",
  },
  advanceOptionDropdown: {
    display: "inline-block",
    marginInline: theme.spacing(2),
    width: "7rem",
  },
  searchDialogContent: {
    minHeight: "10rem",
  },
  dialogContentHeaderText: {
    fontSize: pxToRem(14),
    fontWeight: 500,
    color: theme?.palette?.textColours?.greyHelperText,
  },
  customDialogue: {
    "& .MuiDialog-paper": {
      background: "transparent",
      boxShadow: "none",
    },
  },
  noDataContainer: {
    display: "grid",
    justifyItems: "center",
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    right: 0,
    top: "1rem",
  },

  tabButtonWrapper: {
    marginBottom: pxToRem(16),
  },

  dialogContentWrapper: {
    gap: pxToRem(16),
    paddingTop: pxToRem(16),
  },
}));

const AgGridSearch = ({ props }) => {
  const classes = useStyles();
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchType, setSearchType] = useState("Search");
  const [searchTypeToUpdate, setSearchTypeToUpdate] = useState("Search");
  const [columnsList, setColumnsList] = useState([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const clearBtnRef = useRef();
  const [flag_edit, setFlag_edit] = useState(false);
  const [searchedColumn, setSearchedColumn] = useState(null);
  const [bottomButtons, setBottomButtons] = useState(null);
  const globalClasses = globalStyles();
  const {
    tableSearchConfig,
    recentTableConfig,
    searchedColumn: searchedColumnState,
  } = useSelector((store) => store?.tableReducer);

  useEffect(() => {
    if (props?.api?.showSearch) {
      setShowSearchDialog(props?.api?.showSearch);
      setFlag_edit(true);
      if (searchedColumnState) {
        setSearchedColumn(searchedColumnState);
      }
    }
  }, [props?.api?.showSearch]);

  /**
   * @func
   * @desc Seggregate all searchable columns
   */
  useEffect(() => {
    const columns = [];
    props.columnApi.getAllGridColumns().forEach((item) => {
      item.colDef.is_searchable && item.visible && columns.push(item.colDef);
    });
    if (
      recentTableConfig &&
        recentTableConfig[props.api.gridOptionsWrapper.domDataKey]?.hasOwnProperty("tab_code")
    ) {
      setSearchType(recentTableConfig[props.api.gridOptionsWrapper.domDataKey]?.tab_code);
    } else {
      setSearchType(tableSearchConfig?.tab_code || "Search");
    }
    setColumnsList(columns);
  }, [showSearchDialog]);

  /**
   * @func
   * @desc Prep props for tabs
   * @param {Number} index
   * @returns
   */
  const tabProps = (index) => {
    return {
      id: `search-tab-${index}`,
      "aria-controls": `search-tabpanel-${index}`,
    };
  };
  const tabNames = [
    {
      label: "Search",
      value: "Search",
    },
    {
      label: "Advanced Search",
      value: "Advanced Search",
    },
  ];
  return (
    <>
      <Modal
        size="medium"
        title="Search"
        open={showSearchDialog}
        className="advance-search-modal"
        footerOptions={bottomButtons}
        setOpen={setShowSearchDialog}
        onClose={()=>{
          props.api.showSearch = false;
          setShowSearchDialog(false)
        }}
        >
        <div
          className={`${globalClasses.flexAlignBetweenCenter} ${classes.tabButtonWrapper}`}
      >
          <ButtonGroup
            selectedOption={searchType}
          onChange={(e, val) => {
            if (flag_edit) {
              setShowPrompt(true);
              setSearchTypeToUpdate(val);
            } else {
              setSearchType(val);
              setSearchTypeToUpdate(val);
            }
          }}
            options={tabNames}
          />
          <Button
            id="clearSearch"
            variant="url"
            className={classes.clearSeacrhBtn}
            onClick={(e) => {
              e.stopPropagation();
            }}
            ref={clearBtnRef}
          >
            Clear All
          </Button>
        </div>
        <Search
          {...props}
          setShowSearchDialog={setShowSearchDialog}
          gridApi={props?.api}
          columns={columnsList}
          isAdvancedSearch={Boolean(searchType === "Advanced Search")}
          clearAll={clearBtnRef}
          setFlag_edit={setFlag_edit}
          savedSearchConfig={tableSearchConfig}
          recentSearchConfig={
            recentTableConfig
              ? cloneDeep(
                  recentTableConfig[props?.api?.gridOptionsWrapper?.domDataKey]
              )
              : {}
          }
          searchedColumn={searchedColumn}
          setBottomButtons={setBottomButtons}
          colToDelete={props?.api?.colToDelete}
        />
      </Modal>
          <Prompt
        onPrimaryButtonClick={() => {
                setSearchType(searchTypeToUpdate);
                setShowPrompt(false);
            }}
        onSecondaryButtonClick={() => {
          setShowPrompt(false);
            }}
        primaryButtonLabel="Yes"
        secondaryButtonLabel="No"
        title="Search Changes unsaved"
            variant="warning"
        isOpen={showPrompt}
      >
        Values will be lost. Do you still want to proceed?
      </Prompt>
    </>
  );
};

const Search = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const {
    columns = [],
    isAdvancedSearch,
    gridApi,
    setShowSearchDialog,
    clearAll,
    setFlag_edit,
    savedSearchConfig = {},
    recentSearchConfig,
    searchedColumn,
    setBottomButtons,
  } = props;
  const [columnsList, setColumnsList] = useState([]);
  const [formData, setFormData] = useState([]);
  const [formDependency, setFormDependency] = useState({});
  const [modelDependency, setModelDependency] = useState({});
  const [matchType, setMatchType] = useState([]);
  const [tcCode, setTcCode] = useState();
  const dispatch = useDispatch();
  const { lastSearchTab } = useSelector((store) => store?.tableReducer);
  const rangeInput = {
    accessor: "",
    field_type: "IntegerField",
    isClearable: false,
    isDisabled: false,
    isMulti: false,
    isSearchable: true,
    label: "",
    required: false,
  };

  /**
   * @func
   * @desc Initiate Initialise all state
   */
  useEffect(() => {
    initializeSearch();
  }, []);

  /**
   * @func
   * @desc Clear recentnSearch changes on tab change
   */
  useEffect(() => {
    clearSearchData();
    const payload = getFormattedPayload();
    payload.tab_code = isAdvancedSearch ? "Advanced Search" : "Search";
    dispatch(setColumnSearched(null));
    !payload?.tc_code
      ? initializeSearch(recentSearchConfig)
      : initializeSearch(payload, true);
  }, [isAdvancedSearch]);

  useEffect(() => {
    if (!formDependency || isEmpty(formDependency)) {
      setFlag_edit(false);
    } else {
      setFlag_edit(true);
    }
  }, [formDependency]);

  /**
   * @func
   * @desc Initialise and declare values to for initial state reference
   */
  const initializeSearch = (
    recentChange = recentSearchConfig,
    saveConfig = false
  ) => {
    let model = {};
    gridApi.columnModel.columnDefs.every((col) => {
      if (col.tc_code) {
        setTcCode(col.tc_code);
        return false;
      } else {
        return true;
      }
    });
    if (
      !recentChange &&
      savedSearchConfig?.search_preference &&
      isAdvancedSearch === Boolean(savedSearchConfig.tab_code === "Advanced Search")
    ) {
      model = {
        ...prepareModelFromConfig(savedSearchConfig.search_preference, true),
      };
    } else if (
      recentChange &&
      isAdvancedSearch === Boolean(recentChange.tab_code === "Advanced Search")
    ) {
      model = prepareModelFromConfig(
        recentChange.search_preference,
        saveConfig
      );
    }
    // Update model with applied within last Search type (isAdvanced)
    model = {
      ...model,
      ...(!recentChange &&
        lastSearchTab != undefined &&
        lastSearchTab != null &&
        Boolean(lastSearchTab) === isAdvancedSearch
        ? { ...parseFilterModel(gridApi.getFilterModel()) }
        : {}),
    };
    if (searchedColumn && !model[searchedColumn]) {
      model[searchedColumn] = getFiltersFromColumn(searchedColumn);
    }
    prepareColumnList();
    if (clearAll.current) clearAll.current.onclick = clearSearchData;
    setMatchType([{ label: "All", value: "and" }]);
    setModelDependency(model);
  };

  const getFiltersFromColumn = (columnName) => {
    return columns
      .filter((item) => item?.accessor?.includes(columnName))
      .map((item) => {
        return {
          filterType: getFilterType(item),
          type:
            !isEmpty(collectiveTypes[item.type]?.filterOptions) &&
              Array.isArray(collectiveTypes[item.type]?.filterOptions) &&
              collectiveTypes[item.type]?.filterOptions[0]?.value
              ? collectiveTypes[item.type]["filterOptions"][0].value
              : "",
        };
      })[0];
  };

  /**
   * @func
   * @desc Format model config as per advanced model configuration
   * @param {Object} config
   * @returns {Object}
   */
  const parseFilterModel = (config) => {
    const parsedConfig = [];
    Object.keys(config).forEach((item) => {
      if (config[item].filterType === "date") {
        parsedConfig[item] = {
          filterType: config[item].filterType,
          type: config[item].type,
          filter: moment(config[item].dateFrom).format("YYYY-MM-DD"),
          ...(config[item].type === "inRange" && {
            filterTo: moment(config[item].dateTo).format("YYYY-MM-DD"),
          }),
        };
      } else parsedConfig[item] = config[item];
    });
    return parsedConfig;
  };

  /**
   * @func
   * @desc Prepare formData on every modelDependency change
   */
  useEffect(() => {
    prepareFormObject();
  }, [modelDependency]);

  /**
   * @func
   * @desc Clear state on click of Clear filter
   */
  const clearSearchData = () => {
    setFormData([]);
    setFormDependency({});
    setModelDependency({});
  };

  /**
   * @func
   * @desc Prepare Model Object from given configuration
   * @param {Object} savedConfig
   * @returns {Object} newModel
   */
  const prepareModelFromConfig = (config = {}, savedConfig = false) => {
    const model = {};
    config.range?.forEach((item) => {
      const isDateType = item.type === "date";
      model[item.column] = {
        filterType: isDateType ? "date" : "number",
        type: item.search_type,
      };
      if (!savedConfig) {
        if (item.search_type === "inRange")
          model[item.column].filterTo = item.max_val;
        model[item.column].filter =
          item.search_type != "lessThanOrEqual" ? item.min_val : item.max_val;
      }
    });

    config.search?.forEach((item) => {
      model[item.column] = {
        filterType: "text",
        type: item.search_type,
      };

      if (!savedConfig) {
        model[item.column].filter = item.pattern;
      }
    });

    return model;
  };

  /**
   * @func
   * @desc Format accessor string to readable label
   * @param {String} accessor - Column accessor (e.g., "sales_units_season")
   * @returns {String} Formatted label (e.g., "Sales Units Season")
   */
  const formatAccessorToLabel = (accessor) => {
    return accessor
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  /**
   * @func
   * @desc Prepare list for all the searchable columns
   */
  const prepareColumnList = () => {
    const isAssortSmart = window.location.href.toLowerCase().includes('assort-smart');
    const searchableColumns = columns.map((item) => {
      const filterType = getFilterType(item);
      return {
        label: item.searchableLabel || item.label,
        value: item.accessor,
        type: filterType,
      };
    });
    if (!isAssortSmart) {
      setColumnsList(searchableColumns)
    } else {
      // Count duplicate labels
      const labelCounts = searchableColumns.reduce((acc, col) => {
        acc[col.label] = (acc[col.label] || 0) + 1;
        return acc;
      }, {});
      
      // Add context to duplicate labels using formatted accessor
      const updatedColumns = searchableColumns.map((col) => {
        if (labelCounts[col.label] > 1 && col.value) {
          return {
            ...col,
            label: formatAccessorToLabel(col.value),
          };
        }
        return col;
      });
      setColumnsList(updatedColumns);
    } 
  };

  /**
   * @func
   * @desc Return search type for searchable columns
   * @param {Object} item
   * @returns {String}
   */
  const getFilterType = (item) => {
    // If a column type is number and has disabledRangeFilter then search type as string i.e SKU columns
    if (item.extra?.disableRangeFilter) {
      return "str";
    } else if (
      // If a column type is datetime or date or DateTimeField then use search type as date
      item.type === "datetime" ||
      item.type === "date" ||
      item.type === "DateTimeField"
    ) {
      return "date";
    }

    return item.type;
  };

  /**
   * @func
   * @desc contruct form object from modelDependency and columnsList
   * @returns
   */
  const prepareFormObject = () => {
    const modelKeys = Object.keys(modelDependency);
    if (!modelKeys.length) {
      if (!formData.length && columnsList.length) {
        addEmptyFormObject();
      }
      return;
    }
    let counter = 1;
    const dependency = {};
    const newFormData = [];
    columnsList.forEach((item, index) => {
      if (modelDependency[item.value]) {
        const isFormatted = columns.filter(
          (data) =>
            data.column_name === item.value &&
            data.formatter === "numbersWithComma"
        ).length;
        const newRow = getEmptyRow(counter++, columnsList);
        const colType = item.type === "link" && isFormatted ? "int" : item.type;
        newRow.formData[isAdvancedSearch ? 2 : 1].field_type =
          collectiveTypes[colType]?.fieldType;
        dependency[newRow.accessor] = item.value;
        dependency[`${newRow.accessor}-filterVal`] =
          modelDependency[item.value].filter;
        if (isAdvancedSearch) {
          newRow.formData[1].options = textFilterCollectiveTypes.includes(
            colType
          )
            ? reduceTextFilterOptions(collectiveTypes[colType].filterOptions)
            : collectiveTypes[colType]?.filterOptions;
          dependency[`${newRow.accessor}-filterType`] =
            modelDependency[item.value].type;
          if (modelDependency[item.value].type === "inRange") {
            newRow.formData = [...newRow.formData, { ...rangeInput }];
            newRow.formData[3].accessor = newRow.accessor + "-filterValTo";
            if (colType === "date") {
              newRow.formData[3].field_type =
                collectiveTypes[colType]?.fieldType;
            }
            dependency[`${newRow.accessor}-filterValTo`] =
              modelDependency[item.value].filterTo;
          }
        }
        newFormData.push(newRow);
      }
    });
    setFormData(newFormData);
    setFormDependency(dependency);
  };

  /**
   * @func
   * @desc Prepare the template using the givem parameters
   * @param {Number} rowIndex
   * @param {Object} columnOptions
   * @returns {Object}
   */
  const getEmptyRow = (rowIndex, columnOptions) => {
    const filterTemplate = {
      accessor: `column-name-${rowIndex}-filterType`,
      field_type: "list",
      isClearable: false,
      isDisabled: false,
      isMulti: false,
      isSearchable: true,
      label: "",
      options: [],
      required: false,
    };
    const template = {
      accessor: `column-name-${rowIndex}`,
      formData: [
        {
          accessor: `column-name-${rowIndex}`,
          field_type: "list",
          isClearable: false,
          isDisabled: false,
          isMulti: false,
          isSearchable: true,
          label: "",
          options: columnOptions,
          required: false,
        },
        {
          accessor: `column-name-${rowIndex}-filterVal`,
          field_type: "TextField",
          isClearable: false,
          isDisabled: false,
          isMulti: false,
          isSearchable: true,
          label: "",
          options: [],
          required: false,
        },
      ],
    };

    if (isAdvancedSearch) {
      template.formData.splice(1, 0, filterTemplate);
    }

    return template;
  };

  /**
   * @func
   * @desc Create a new form row and add it to the existing formData
   */
  const addEmptyFormObject = () => {
    const emptyIndex =
      Number(formData[formData.length - 1]?.accessor.split("-")[2] || 0) + 1;
    const newRow = getEmptyRow(emptyIndex, columnsList);
    setFormData([...formData, newRow]);
  };

  /**
   * @function
   * @desc Validate the number fields for correct from and to range.
   * @returns {Boolean}
   */
  const isInvalidNumericalRange = () => {
    const newFormObject = cloneDeep(formData);
    let isInvalid = false;
    let message = "Please enter to and from values.";
    !isEmpty(formDependency) &&
      newFormObject.forEach((formItem) => {
        const attributeToValidate = formDependency[formItem.accessor];
        const columnToInspect = columnsList.filter(
          (listItem) => listItem.value === attributeToValidate
        );
        const isFormatted =
          columnToInspect.length &&
          columns.filter(
            (item) =>
              item.column_name === columnToInspect[0].value &&
              item.formatter === "numbersWithComma"
          ).length;
        const isNumber =
          collectiveTypes[columnToInspect[0].type]?.paramType === "number" ||
          (collectiveTypes[columnToInspect[0].type]?.paramType === "link" &&
            isFormatted);
        if (
          isNumber &&
          formDependency[`${formItem.accessor}-filterType`] === "inRange"
        ) {
          if (
            !(
              Number(formDependency[`${formItem.accessor}-filterVal`]) >
              Number(formDependency[`${formItem.accessor}-filterValTo`])
            ) &&
            !formDependency[`${formItem.accessor}-filterVal`] &&
            !formDependency[`${formItem.accessor}-filterValTo`]
          ) {
            return !isInvalid;
          }
          // Allowing 0 as a valid numerical input
          formItem.formData[2].error =
            !formDependency[`${formItem.accessor}-filterVal`]?.length &&
            !Number(formDependency[`${formItem.accessor}-filterVal`]);

          formItem.formData[3].error =
            !formDependency[`${formItem.accessor}-filterValTo`]?.length &&
            !Number(formDependency[`${formItem.accessor}-filterValTo`]);
          isInvalid = formItem.formData[2].error || formItem.formData[3].error;
          if (
            Number(formDependency[`${formItem.accessor}-filterVal`]) >
            Number(formDependency[`${formItem.accessor}-filterValTo`])
          ) {
            isInvalid = formItem.formData[2].error = true;
            message = "Please enter to and from values for range correctly";
          }
          return !isInvalid;
        }
      });
    if (isInvalid) {
      displaySnackMessages(message, "warning");
      setFormData(newFormObject);
    }
    return isInvalid;
  };

  /**
   * @func
   * @desc Collect user entered filter data and set the filterModel with the same
   */
  const handleApplySearch = (formDependency) => {
    if (isInvalidNumericalRange()) {
      return;
    }
    const newModel = getModelFromForm(formDependency);
    if (Object.keys(newModel).length) {
      gridApi.setFilterModel(newModel);
    } else {
      gridApi.setFilterModel(null);
    }
    dispatch(setLastSearchType(isAdvancedSearch ? 1 : 0));
    updateSearchTemplate();
     props.api.showSearch = false;
     setShowSearchDialog(false);
  };

  /**
   * @func
   * @desc Prepares Model Object from formDependency
   * @returns {Object} newModel
   */
  const getModelFromForm = (formDependency) => {
    const newModel = {};
    if (!isNull(formDependency) && !isUndefined(formDependency)) {
    Object.keys(formDependency).forEach((column_name) => {
      const column = columnsList.filter(
        (item) => item.value === formDependency[column_name]
      );
      if (
        column_name.includes("-filterType") ||
        column_name.includes("-filterVal") ||
        column_name.includes("-filterValTo")
      ) {
        return;
      }
      const isFormatted = columns.filter(
        (item) =>
          item.column_name === formDependency[column_name] &&
          item.formatter === "numbersWithComma"
      ).length;
      const isDateType = collectiveTypes[column[0].type]?.paramType === "date";
      newModel[formDependency[column_name]] = {
        filterType: isDateType
          ? "date"
          : collectiveTypes[
            column[0].type === "link" && isFormatted ? "int" : column[0].type
          ]?.paramType,
        type: formDependency[`${column_name}-filterType`]
          ? formDependency[`${column_name}-filterType`]
          : "contains",
        ...(isDateType && formDependency[`${column_name}-filterVal`]
          ? {
            dateFrom: moment(
              formDependency[`${column_name}-filterVal`]
            ).format("YYYY-MM-DD"),
          }
          : { filter: formDependency[`${column_name}-filterVal`] }),
      };
      if (formDependency[`${column_name}-filterType`] === "inRange") {
        newModel[formDependency[column_name]].filter =
          formDependency[`${column_name}-filterVal`];
        if (isDateType && formDependency[`${column_name}-filterValTo`]) {
          newModel[formDependency[column_name]].dateTo = moment(
            formDependency[`${column_name}-filterValTo`]
          ).format("YYYY-MM-DD");
        } else {
          newModel[formDependency[column_name]].filterTo =
            formDependency[`${column_name}-filterValTo`];
        }
      }
    });
    return newModel;
    }
  };

  /**
   * @func
   * @desc Update form dependencies and form elements after every change
   * @param {Object} change
   * @returns
   */
  const handleChange = (change) => {
    try {
      const attributeAccessor = Object.keys(change).filter((accessor) => {
        return change[accessor] != formDependency[accessor];
      });
      if (!attributeAccessor.length) {
        return;
      } else if (!isChangeValid(change, attributeAccessor[0])) {
        displaySnackMessages("Please select an unselected column", "warning");
        const oldDependency = cloneDeep(formDependency);
        setFormDependency(oldDependency);
        return;
      }
      const updatedDependency = cloneDeep(change);
      const newFormObject = cloneDeep(formData);
      newFormObject.forEach((item) => {
        const type = isAdvancedSearch ? `${item.accessor}-filterType` : "";
        const val = `${item.accessor}-filterVal`;
        const valTo = `${item.accessor}-filterValTo`;
        const colChanged = columnsList.filter(
          (listItem) => listItem.value === updatedDependency[item.accessor]
        );
        if (!colChanged.length) {
          return;
        }
        const isFormattedLink = columns.filter(
          (data) =>
            data.column_name === item.accessor &&
            data.formatter === "numbersWithComma"
        );
        const colChangedType =
          colChanged[0].type === "link" && isFormattedLink
            ? "int"
            : colChanged[0].type;
        switch (attributeAccessor[0]) {
          case item.accessor:
            if (isAdvancedSearch) {
              delete updatedDependency[type];
              item.formData[1].options = textFilterCollectiveTypes.includes(
                colChangedType
              )
                ? reduceTextFilterOptions(
                  collectiveTypes[colChangedType].filterOptions
                )
                : collectiveTypes[colChangedType].filterOptions;
              delete updatedDependency[valTo];
            }
            delete updatedDependency[val];
            if (colChangedType === "date") {
              item.formData[isAdvancedSearch ? 2 : 1].minDate = START_DATE;
              item.formData[isAdvancedSearch ? 2 : 1].maxDate = END_DATE;
            }
            item.formData[3] && item.formData.pop();
            item.formData[isAdvancedSearch ? 2 : 1].field_type =
              collectiveTypes[colChangedType].fieldType;
            break;
          case `${item.accessor}-filterType`:
            if (updatedDependency[type] === "inRange") {
              item.formData.push(rangeInput);
              item.formData[3].accessor = valTo;
              if (colChangedType === "date") {
                item.formData[3].field_type =
                  collectiveTypes[colChangedType].fieldType;
                item.formData[3].minDate = START_DATE;
                item.formData[3].maxDate = END_DATE;
              }
            } else if (item.formData[3]) {
              item.formData.pop();
            }
            break;
          case `${item.accessor}-filterVal`:
          case `${item.accessor}-filterValTo`:
            if (
              updatedDependency[type] === "inRange" &&
              updatedDependency[attributeAccessor[0]] &&
              colChangedType === "date" &&
              updatedDependency[val] &&
              updatedDependency[valTo] &&
              moment(updatedDependency[val]).isAfter(
                moment(updatedDependency[valTo])
              )
            ) {
              delete updatedDependency[attributeAccessor[0]];
              displaySnackMessages(
                "Please enter to and from values for range correctly",
                "warning"
              );
              return;
            }
        }
      });
      setFormData(newFormObject);
      setFormDependency(updatedDependency);
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
    }
  };

  /**
   * @func
   * @desc Validate new changes against old to know if any column values were repetative
   * @param {Object} dependency
   * @param {String} changedAccessor
   * @returns {Boolean}
   */
  const isChangeValid = (dependency, changedAccessor) => {
    if (
      ["-filterType", "-filterVal"].some((el) => changedAccessor.includes(el))
    ) {
      return true;
    }
    const count = Object.keys(dependency).filter(
      (key) => dependency[changedAccessor] === dependency[key]
    );
    return count.length > 1 ? false : true;
  };

  /**
   * @func
   * @desc Delete the formRow and formDependency with the same accessor
   * @param {String} accessor
   */
  const deleteFormObject = (accessor) => {
    let newFormData = cloneDeep(formData);
    let newDependencyArray = cloneDeep(formDependency);
    newFormData = newFormData.filter((item) => {
      if (item.accessor === accessor || accessor.includes(item.accessor)) {
        delete newDependencyArray[item.accessor];
        if (isAdvancedSearch) {
          delete newDependencyArray[`${item.accessor}-filterType`];
          if (newDependencyArray[`${item.accessor}-filterType`] === "inRange") {
            delete newDependencyArray[`${item.accessor}-filterValTo`];
          }
        }
        delete newDependencyArray[`${item.accessor}-filterVal`];
      } else {
        return item;
      }
    });
    setFormData(newFormData);
    setFormDependency(newDependencyArray);
  };

  /**
   * @param {String} message
   * @param {String} variance
   */
  const displaySnackMessages = (message, variance) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  /**
   * @func
   * @desc Handle Save Search configuration
   */
  const handleSaveSearch = async () => {
    try {
      const payload = getFormattedPayload();
      await setSaveSearchConfig(payload);
      dispatch(setTableSearchConfig(payload));
      dispatch(
        setTableRecentChanges(gridApi.gridOptionsWrapper.domDataKey, payload)
      );
      displaySnackMessages("Search saved successfully", "success");
    } catch (error) {
      displaySnackMessages("Please insert all fields", "error");
    }
  };

  /**
   * @func
   * @desc Get formatted Payload based on latest sceen changes
   * @returns {Object} Payload to save
   */
  const getFormattedPayload = () => {
    let rangeConfig = [];
    let searchConfig = [];
    const newModel = getModelFromForm(formDependency);
    if (!isEmpty(newModel)) {
      Object.keys(newModel).forEach((filterKey) => {
        //If the filterColumnType is number, we parse the filterBody into range field
        if (
          newModel[filterKey].filterType === "number" ||
          newModel[filterKey].filterType === "date"
        ) {
          rangeConfig.push(parseRangeBody(filterKey, newModel, true));
        } else {
          //Else we parse the filterBody into search field
          let patternText = newModel[filterKey].filter;
          if (newModel[filterKey].filterType === "set") {
            patternText = newModel[filterKey].values;
          }
          searchConfig.push({
            column: filterKey,
            pattern: patternText ? patternText : "",
            search_type: newModel[filterKey].type,
          });
        }
      });
    }
    const payload = {
      tc_code: tcCode,
      tab_code: isAdvancedSearch ? "Advanced Search" : "Search",
      search_preference: {
        search: searchConfig,
        range: rangeConfig,
      },
    };

    return payload;
  };

  /**
   * @func
   * @desc Update any changes made to search and close search dialogue.
   */
  const updateSearchTemplate = () => {
    setShowSearchDialog(false);
    const payload = getFormattedPayload();
    dispatch(
      setTableRecentChanges(gridApi.gridOptionsWrapper.domDataKey, payload)
    );
    dispatch(setColumnSearched(null));
  };

  /**
   * @func
   * @desc Clear all values from given search template and save to recent
   */
  const clearSearchValues = () => {
    const payload = getFormattedPayload();
    const model = prepareModelFromConfig(payload.search_preference, true);
    setFormData([]);
    setModelDependency(model);
  };
  /**
   * 
   * @returns The property name whose value matches the columnName
   */
  const getPropertyNameMatchingColToDelete = () => {
  let matchingPropertyName = null;
  formData.forEach((formItem) => {
    formItem.formData.forEach((field) => {
      if (
        field.accessor &&
        formDependency[field.accessor] === props.colToDelete
      ) {
        matchingPropertyName = field.accessor;
      }
    });
  });

  return matchingPropertyName;
};
    useEffect(() => {
      if (props.colToDelete && formData) {
        const propertyName = getPropertyNameMatchingColToDelete(); // Column name to remove from search
        const formDataCopy = cloneDeep(formData);
        const formDependencyCopy = cloneDeep(formDependency);
        const modelDependencyCopy = cloneDeep(modelDependency);
        
        // If columnName exists then udpate the required states
        if (propertyName) {
          const updatedFormDataCopy = formDataCopy.filter(
            (item) => item.accessor !== propertyName
          );
          delete formDependencyCopy[propertyName];
          delete formDependencyCopy[`${propertyName}-filterVal`];
          delete modelDependencyCopy[props?.colToDelete];
          props.api.colToDelete = null;
          setFormData(updatedFormDataCopy);
          setFormDependency(formDependencyCopy)
          setModelDependency(modelDependencyCopy)
        }
      }
    }, [props.colToDelete, formData]);

  /**
   * @func
   * @desc Render the rows and the form elements using the formData
   * @returns {Object}
   */
  const renderForm = () => {
    return (
      <>
        {formData.map((item, index) => (
          <div className={`${globalClasses.layoutAlignSpaceBetween}`}>
              <Form
                layout={"vertical"}
                updateDefaultValue={false}
                maxFieldsInRow={item.formData.length}
                handleChange={handleChange}
                fields={item.formData}
                defaultValues={formDependency}
                withPortal
                suppressSymbolKeyPress
                suppressCustomYears
              ></Form>
            <Button
                id="deleteForm"
              variant="tertiary"
                onClick={() => deleteFormObject(item.accessor)}
                disabled={formData.length === 1}
              icon={<DeleteOutlineOutlinedIcon />}
            ></Button>
          </div>
        ))}
      </>
    );
  };
  useEffect(() => {
    setBottomButtons(
      <>
        <Button
          id="applySearch"
          variant="contained"
          onClick={() => handleApplySearch(formDependency)}
          color="primary"
        >
          Apply
        </Button>
      </>
    );
  }, [formDependency]);
  return (
    <>
      {!isEmpty(columns) && (
        <div
          className={`${classes.dialogContentWrapper} ${globalClasses.layoutAlignSpaceBetween} ${globalClasses.flexColumn} ${globalClasses.verticalAlignStart}`}
        >
          {isAdvancedSearch && (
            <div data-test-id="dialog-content-top-header">
              <Typography
                className={classes.dialogContentHeaderText}
                variant="text"
              >
                Match all of the following rules.
              </Typography>
            </div>
          )}
          <div
            data-test-id="dialog-content-search-section"
            className={`${globalClasses.fullWidth} ${globalClasses.flexColumn} ${globalClasses.flexRow} ${globalClasses.gap}`}
          >
            {renderForm()}
          </div>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.marginTop}`}
      >
            {/* <Button
          id="cancelSearch"
          variant="secondary"
          onClick={updateSearchTemplate}
          icon={<CloseIcon />}
        /> */}
        <Button
          id="cancelSearch"
              onClick={clearSearchValues}
              variant="secondary"
        >
          Clear Values
        </Button>
        {props.showSaveSearchButton && (
          <Button
            id="saveSearch"
                variant="tertiary"
            onClick={handleSaveSearch}
          >
            Save search
          </Button>
        )}
            {formData.length < columnsList.length && (
        <Button
                id="searchModal"
                variant="tertiary"
                onClick={addEmptyFormObject}
                icon={<AddIcon />}
                className={globalClasses.marginTop}
        >
                Add attribute
        </Button>
            )}
      </div>
        </div>
      )}
      {isEmpty(columns) && (
        <div className={classes.noDataContainer}>
          <p>No Data available. Searchable columns not found.</p>
        </div>
      )}
    </>
  );
};

export default AgGridSearch;

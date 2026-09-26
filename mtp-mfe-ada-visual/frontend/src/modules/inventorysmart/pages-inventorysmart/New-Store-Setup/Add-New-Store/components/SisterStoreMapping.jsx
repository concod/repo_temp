import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";

import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import Form from "core/Utils/form";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Prompt, Switch } from "impact-ui";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import { getfilterAttributeList } from "core/commonComponents/coreComponentScreen/utils";

import {
  ERROR_MESSAGE,
  GO_BACK_MESSAGE,
  MAPPED_STORE_PERIOD_DATE_PICKER,
  MAPPED_STORE_PERIOD_DROP_DOWN_OPTIONS,
  STORE_GROUP_MAPPING,
  NO_STORE_GROUP_VALIDATION_MSG,
} from "../../../../constants-inventorysmart/stringConstants";
import {
  saveStepOneFinalValues,
  setNewStoreDetailsForBackFlow,
} from "../../../../services-inventorysmart/New-Store/new-store-details";
import {
  clearSisterStoreDetailsScreenLoader,
  getSisterStoreAndDCDetails,
  getStoreGroup,
  setSisterStoreDetailsScreenLoader,
} from "../../../../services-inventorysmart/New-Store/sister-store-mapping";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  scrollIntoView,
} from "../../../inventorysmart-utility";

const useStyles = makeStyles(() => ({
  alignButtons: {
    display: "flex",
    justifyContent: "flex-end",
  },
  timePeriodFormStyle: {
    padding: "1rem",
    display: "flex",
    alignItems: "center",
  },
  timePeriodFormContainer: {
    width: "20%",
    marginRight: "1rem",
  },
}));

const SisterStoreMappingComponent = (props) => {
  const [sisterStoreMappedColumnConfig, setSisterStoreMappedColumnConfig] =
    useState([]);
  const [sisterStoreMappedData, setSisterStoreMappedData] = useState([]);
  const [newSisterStoreRow, setNewSisterStore] = useState([]);
  const [counter, setCounter] = useState(0);
  const [selectedSisterStoreRows, setSelectedSisterStoreRows] = useState([]);
  const [showDeleteConfirmPopup, setShowDeleteConfirmPopup] = useState(false);
  const [sisterStoresColumnConfig, setSisterStoresColumnConfig] = useState([]);
  const [sisterStoresData, setSisterStoresData] = useState([]);
  const [dcStoresColumnConfig, setDcStoresColumnConfig] = useState([]);
  const [dcStoresData, setDcStoresData] = useState([]);
  const [enableSisterStoreView, setEnableSisterStoreView] = useState(false);
  const [timePeriodToggle, setTimePeriodToggle] = useState(true);
  const [sisterStoreTimePeriod, setSisterStoreTimePeriod] = useState({});
  const [sisterStoreDatePicker, setSisterStoreDatePicker] = useState({});

  const [sisterStoreFilterConfig, setSisterStoreFilterConfig] = useState([]);
  const [sisterStoreFilterOptions, setSisterStoreFilterOptions] = useState([]);
  const [showGoBackDialog, setShowGoBackDialog] = useState(false);
  const [storeGroupConfiguration, setStoreGroupConfiguration] = useState([]);
  const [storeGroupMapping, setStoreGroupMapping] = useState({
    store_groups: [],
    store_group_mapping_date: "",
  });
  const [storeGroupDisableState, setStoreGroupDisableState] = useState(true);
  const [resetClicked, setResetClicked] = useState(false);

  const agGridInstance = useRef(null);
  const sisterStoreFilterConfigRef = useRef(null);
  const storeDCRef = useRef();

  const globalClasses = globalStyles();
  const classes = useStyles();

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      props.setSisterStoreDetailsScreenLoader(true);
      try {
        let sisterStoreTableConfig = await getColumnsAg(
          "table_name=new_store_select_sister"
        )();
        sisterStoreTableConfig = sisterStoreTableConfig.map((item) => {
          if (item.column_name === "store_code") {
            item.disabled = setCellsToBeDisabled;
          }
          return item;
        });
        // Dynamically setting table row keys as the hierarchy displayed varies from client to client
        let sisterStoreMappedColumns = sisterStoreTableConfig.map((col) => {
          return {
            [col.column_name]: "",
            [col.extra.options_column]: [],
          };
        });
        sisterStoreMappedColumns = Object.assign(
          {},
          ...sisterStoreMappedColumns
        );
        let initialSisterStoreMappedColumns = [
          {
            ...sisterStoreMappedColumns,
            key: 0,
          },
        ];
        let newSisterStoreMappedColumns = [
          {
            ...sisterStoreMappedColumns,
            key: 1,
          },
        ];
        setSisterStoreMappedData(initialSisterStoreMappedColumns);
        setNewSisterStore(newSisterStoreMappedColumns);
        setSisterStoreMappedColumnConfig(sisterStoreTableConfig);
        let response = await fetchFilterConfig("New Store Sister Store");
        setSisterStoreFilterConfig(response);
        sisterStoreFilterConfigRef.current = response;
        STORE_GROUP_MAPPING[0].options = [];
        setStoreGroupConfiguration(STORE_GROUP_MAPPING);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setSisterStoreDetailsScreenLoader(false);
      }
    };
    getInitialFilterConfiguration();
  }, []);

  const setCellsToBeDisabled = (row, _item) => {
    // disable store_code column if hierarchies are empty
    let toDisable = false;
    let keysToCheckValidationOn = Object.keys(row).filter(
      (val) => val !== "key" && !val.includes("options") && val !== "store_code"
    );
    if (keysToCheckValidationOn.some((key) => isEmpty(row[key]))) {
      toDisable = true;
    } else toDisable = false;
    return toDisable;
  };

  useEffect(() => {
    const getInitialFilterConfigurationValues = async () => {
      if (!isEmpty(sisterStoreFilterConfig)) {
        props.setSisterStoreDetailsScreenLoader(true);
        let requiredFilterObjParams = {
          allFilters: cloneDeep(sisterStoreFilterConfig),
          rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
          screenName: props.screenName,
          tenantFilterUamConfig: props.tenantFilterUamConfig,
          enableCrossFiltersConditionally: true,
        };
        const response = await fetchFilterOptions(requiredFilterObjParams);
        // save this response in a state and use it to add a new row when the table is empty after deleting all records
        setSisterStoreFilterOptions(response);
        let columnDropDownValues = {};
        response &&
          response.forEach((obj) => {
            callDropDownUpdateFunc(columnDropDownValues, obj);
          });
        let cloneSisterStoreMappedData = cloneDeep(sisterStoreMappedData);
        cloneSisterStoreMappedData = cloneSisterStoreMappedData.map((item) => {
          return {
            ...item,
            ...columnDropDownValues,
          };
        });
        setSisterStoreMappedData(cloneSisterStoreMappedData);

        let cloneNewSisterStoreRow = cloneDeep(newSisterStoreRow);
        cloneNewSisterStoreRow = cloneNewSisterStoreRow.map((item) => {
          return {
            ...item,
            ...columnDropDownValues,
          };
        });
        setNewSisterStore(cloneNewSisterStoreRow);
        props.setSisterStoreDetailsScreenLoader(false);
        agGridInstance.current?.api?.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
    };
    getInitialFilterConfigurationValues();
  }, [sisterStoreFilterConfig, props.finalStoreDetailsStateValues]);

  useEffect(() => {
    MAPPED_STORE_PERIOD_DATE_PICKER[0].minDate =
      props.finalStoreDetailsStateValues.other_attributes.store_opening_date;
  }, [timePeriodToggle]);

  useEffect(() => {
    if (!isEmpty(props.finalStoreDetailsStateValues)) {
      setStoreGroupMapping({
        ...storeGroupMapping,
        store_group_mapping_date:
          props.finalStoreDetailsStateValues.other_attributes
            .store_opening_date,
      });
      STORE_GROUP_MAPPING[1].isDisabled = true;
    }
  }, [props.finalStoreDetailsStateValues]);

  useEffect(() => {
    // Wait for all initial calls to be done and then pre populate the fields
    if (
      sisterStoreMappedData?.length &&
      isEmpty(sisterStoreMappedData[0]?.store_code) &&
      sisterStoreFilterConfig?.length &&
      !resetClicked
    ) {
      // to pre populate step 2, when user clicks on go back button in step 3
      if (
        props.screenNameNavigatedFrom &&
        props.screenNameNavigatedFrom === "demand-constraints" &&
        !isEmpty(props.saveNewStoreDetailsForBackFlow)
      ) {
        prepopulateStepOneValues(props.saveNewStoreDetailsForBackFlow, "back");
      }
      // edit flow
      if (
        isEmpty(props.screenNameNavigatedFrom) &&
        !isEmpty(props.editNewStoreData)
      ) {
        prepopulateStepOneValues(props.editNewStoreData, "edit");
      }
    }
  }, [
    props.screenNameNavigatedFrom,
    props.saveNewStoreDetailsForBackFlow,
    sisterStoreMappedData,
    sisterStoreFilterConfig,
    props.editNewStoreData,
  ]);

  const prepopulateStepOneValues = (objectToPopulate, flowType) => {
    // Pre populate all the state values present
    let storeAttrsTimePeriod = objectToPopulate.other_attributes;
    setTimePeriodToggle(false);
    setSisterStoreDatePicker({
      sisterStoreDatePicker: storeAttrsTimePeriod.sister_store_mapping_date,
    });
    let tableRowAttrs = objectToPopulate.table_row_attributes;
    let selectedStoreDeptMapping = [];
    tableRowAttrs?.forEach((obj, i) => {
      let updatedRowData = {};
      obj.forEach((item) => {
        updatedRowData[item.attribute_name] = mapOptionsValue(item.values);
      });
      updatedRowData = {
        ...sisterStoreMappedData[0],
        ...updatedRowData,
        key: i,
      };
      selectedStoreDeptMapping.push(updatedRowData);
    });
    // works but gets called twice check later to optimise
    setSisterStoreMappedData(selectedStoreDeptMapping);
    setCounter(tableRowAttrs.length - 1);
    // explicitly call cross filter API to fetch and update drop down options
    fetchCrossFilterOptions(selectedStoreDeptMapping, flowType);
    // call this function as we have to fetch store groups based on hierarchies pre selected in edit cond
    fetchStoreGroups(selectedStoreDeptMapping, storeAttrsTimePeriod);
  };

  const addNewRow = () => {
    // throw a warning message if the latest row in table has empty values
    let latestRecordEntry =
      sisterStoreMappedData[sisterStoreMappedData.length - 1];
    // Filtering out keys that have selected value from the table
    let fieldKeys = Object.keys(latestRecordEntry).filter(
      (val) => val !== "key" && !val.includes("options")
    );
    if (fieldKeys.some((key) => isEmpty(latestRecordEntry[key]))) {
      displaySnackMessages("Select the hierarchy and sister store", "warning");
    } else {
      let newCounter = counter + 1;
      setCounter(newCounter);

      let cloneNewSisterStoreRow = cloneDeep(newSisterStoreRow);
      cloneNewSisterStoreRow[0].key = newCounter;

      // add new row to an existing row
      let copyOfExistingMappedData = [...sisterStoreMappedData];
      let newData = [...copyOfExistingMappedData, ...cloneNewSisterStoreRow];
      setSisterStoreMappedData(newData);
      setStoreGroupDisableState(true);
    }
    enableSisterStoreView && setEnableSisterStoreView(false);
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedSisterStoreRows(selections);
  };

  const deleteSelectedSisterRows = () => {
    if (!selectedSisterStoreRows.length) {
      displaySnackMessages("Select at least one row", "warning");
    } else setShowDeleteConfirmPopup(true);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const confirmDeleteRows = () => {
    let rowDataAfterDeleting = sisterStoreMappedData.filter(
      (item) => !selectedSisterStoreRows.some((obj) => obj.key === item.key)
    );
    if (rowDataAfterDeleting.length === 0) {
      let initialRow = setInitialEmptyTableRow();
      setSisterStoreMappedData(initialRow);
      setStoreGroupDisableState(true);
      agGridInstance.current.api.forEachNode((node) => node.setSelected(false));
      setCellsToBeDisabled(initialRow);
      setResetClicked(true);
      if (enableSisterStoreView || storeGroupMapping?.store_groups?.length) {
        clearSisterStoreMappings();
      }
    } else setSisterStoreMappedData(rowDataAfterDeleting);
  };

  const saveSisterStoreMappings = async () => {
    enableSisterStoreView && setEnableSisterStoreView(false);
    let emptyRowValues = false;
    sisterStoreMappedData.forEach((item) => {
      if (Object.values(item).some((val) => val === "")) emptyRowValues = true;
      else emptyRowValues = false;
    });
    if (emptyRowValues) {
      displaySnackMessages(
        "Please select all hierarchies in the table",
        "warning"
      );
    } else if (
      timePeriodToggle &&
      isEmpty(sisterStoreTimePeriod?.sisterStoreTimePeriod)
    ) {
      displaySnackMessages("Select sister store mapping date", "warning");
    } else if (
      !timePeriodToggle &&
      isEmpty(sisterStoreDatePicker?.sisterStoreDatePicker)
    ) {
      displaySnackMessages("Select sister store mapping date", "warning");
    } else if (
      isEmpty(storeGroupMapping.store_groups) ||
      isEmpty(storeGroupMapping.store_group_mapping_date)
    ) {
      displaySnackMessages(
        "Please fill store group mapping details",
        "warning"
      );
    } else {
      const fetchFutureDates = () => {
        // fetch future dates based on the number of months selected from the drop down
        let month = sisterStoreTimePeriod?.sisterStoreTimePeriod?.split(" ")[0];
        let currentData = new Date();
        currentData.setMonth(currentData.getMonth() + parseInt(month));
        return JSON.stringify(currentData).slice(1, 11);
      };

      let sisterStoreTomePeriodValue = !timePeriodToggle
        ? moment(sisterStoreDatePicker?.sisterStoreDatePicker).format(
            "YYYY-MM-DD"
          )
        : fetchFutureDates();

      try {
        props.setSisterStoreDetailsScreenLoader(true);
        let reqBody = {
          attribute_name: props.sisterStoreHierarchyKey,
          table_row_attributes: mapTableRowAttributesAsFilters(
            sisterStoreMappedData
          ),
          other_attributes: {
            ...props.finalStoreDetailsStateValues.other_attributes,
            sister_store_mapping_date: sisterStoreTomePeriodValue,
            store_groups: storeGroupMapping.store_groups,
            store_group_mapping_date: moment(
              storeGroupMapping.store_group_mapping_date
            ).format("YYYY-MM-DD"),
          },
          dc_row_attributes:
            props.finalStoreDetailsStateValues.dc_row_attributes,
          store_attributes: props.finalStoreDetailsStateValues.store_attributes,
        };
        let savedPayloadForNextSteps = {
          ...props.finalStoreDetailsStateValues,
          attribute_name: props.sisterStoreHierarchyKey,
          table_row_attributes: mapTableRowAttributesAsFilters(
            sisterStoreMappedData
          ),
          other_attributes: {
            ...props.finalStoreDetailsStateValues.other_attributes,
            sister_store_mapping_date: sisterStoreTomePeriodValue,
            store_groups: storeGroupMapping.store_groups,
            store_group_mapping_date: moment(
              storeGroupMapping.store_group_mapping_date
            ).format("YYYY-MM-DD"),
          },
        };

        let copySaveNewStoreDetailsForBackFlow = {
          ...props.saveNewStoreDetailsForBackFlow,
          ...savedPayloadForNextSteps,
        };
        props.saveStepOneFinalValues(savedPayloadForNextSteps);
        props.setNewStoreDetailsForBackFlow(copySaveNewStoreDetailsForBackFlow);
        let response = await props.getSisterStoreAndDCDetails(reqBody);
        let storeDetailColumnConfig = await getColumnsAg(
          "table_name=new_store_sister_store"
        )();
        setSisterStoresColumnConfig(storeDetailColumnConfig);
        let dcDetailColumnConfig = await getColumnsAg(
          "table_name=new_store_dc"
        )();
        setDcStoresColumnConfig(dcDetailColumnConfig);
        if (response.data?.data) {
          setSisterStoresData(response.data.data?.sister_store);
          setDcStoresData(response.data.data?.dc_data);
          scrollIntoView(storeDCRef);
        }
        setEnableSisterStoreView(true);
        props.setSisterStoreDetailsScreenLoader(false);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setSisterStoreDetailsScreenLoader(false);
      }
    }
  };

  const mapOptionsValue = (arr) => {
    return arr?.map((item) => {
      return {
        label: item,
        value: item,
        id: item,
      };
    });
  };

  const mapTableRowAttributesAsFilters = (rows) => {
    let payloadFormatArr = [];
    rows.forEach((row) => {
      let tableRowKeys = Object.keys(row).filter(
        (val) => val !== "key" && !val.includes("options")
      );
      let newArr = [];
      tableRowKeys.forEach((item) => {
        newArr.push({
          attribute_name: item,
          operator: "in",
          values: row[item]?.map((item) => item.value),
          filter_type: "cascaded",
          dimension: item === "store_code" ? "store" : "product",
        });
      });
      payloadFormatArr.push(newArr);
    });
    return payloadFormatArr;
  };

  const setInitialEmptyTableRow = () => {
    let columnDropDownValues = { key: 0 };
    sisterStoreFilterOptions &&
      sisterStoreFilterOptions.forEach((obj) => {
        let colField = obj.column_name;
        callDropDownUpdateFunc(columnDropDownValues, obj);
        columnDropDownValues[colField] = "";
      });
    return [columnDropDownValues];
  };

  const callDropDownUpdateFunc = (columnDropDownValues, obj) => {
    let optionsKey = `${obj.column_name}_options`;
    // For signet - restrict SUB SKU DIVISION drop down options to only one value i.e the channel name from the previous screen
    if (obj.column_name === "product_channel_name") {
      columnDropDownValues[optionsKey] = obj.initialData?.length
        ? obj.initialData.filter(
            (val) =>
              val.value ===
              props.finalStoreDetailsStateValues?.form_attributes?.channel
          )
        : [];
    } else columnDropDownValues[optionsKey] = obj.initialData || [];
    return columnDropDownValues;
  };

  const clearSisterStoreMappings = () => {
    let initialRow = setInitialEmptyTableRow();
    setSisterStoreMappedData(initialRow);
    setEnableSisterStoreView(false);
    setSisterStoreTimePeriod([]);
    setSisterStoreDatePicker([]);
    setTimePeriodToggle(true);
    setStoreGroupMapping({ ...storeGroupMapping, store_groups: [] });
    setStoreGroupDisableState(true);
    STORE_GROUP_MAPPING[0].options = [];
    setStoreGroupConfiguration(STORE_GROUP_MAPPING);
    setResetClicked(true);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  /*
    This function accepts any number of arrays as input (using the spread operator ...arrays) and recursively generates all combinations using the _ separator. 
    The output will be an array containing all possible combinations from the input arrays
  */
  const generateCombinations = (...arrays) => {
    const combinations = [];

    function generate(currentArrayIndex, currentCombination) {
      if (currentArrayIndex === arrays.length) {
        combinations.push(currentCombination.join("_"));
        return;
      }

      const currentArray = arrays[currentArrayIndex];
      for (const elem of currentArray) {
        generate(currentArrayIndex + 1, [...currentCombination, elem]);
      }
    }
    generate(0, []);
    return combinations;
  };

  /*
     This function is used to check if a duplicate value exists for the same kind of hierarchy combinations selected and prevent the user from selecting any such value,
     so that two diff sister store's cannot be assigned to same combination.
     Note - The hierarchy - l0, l1, l2 values is dynamic from client to client.
  */
  const onChangeSisterStoreValidation = (cellNode, colId, _p_colType, e) => {
    let arr = [];
    agGridInstance.current.api.forEachNode((item) => arr.push(item.data));
    /*
       We skip 0th row index as we don't hv to apply a check on the first row data in the table initially
       arr.length condition is used to check the validation for older rows(previously filled rows) if the number of rows in the table is more than one
    */
    if (cellNode.rowIndex !== 0 || arr?.length > 1) {
      /*
        If the selected col is sisterStoreHierarchyKey from the row data fetch the sisterStoreHierarchyKey key and extract the selected value.
        For the current row index that we select the values for, tally it against the previous rows with the sisterStoreHierarchyKey key.
        If you find a match(sisterStoreHierarchyKey with same name selected in the current row) throw a warning to the user.
      */
      if (colId === props.sisterStoreHierarchyKey) {
        let fieldKeys = Object.keys(cellNode?.data).filter(
          (val) =>
            val !== "key" && !val.includes("options") && val !== "store_code"
        );
        // Fetch all the dynamic hierarchy col values selected by the user
        let val = arr.map((obj) => {
          return fieldKeys.map((key) => obj[key]).filter((item) => item !== "");
        });
        /* 
            This variable is used to hold hierarchy based combination values as strings in an array of previously filled rows (Not the current node you r editing).
            Eg => if this table has two cols l0_name and l1_name with the following values l0_name = ["A", "B"], l1_name = ["C", "D"]
            Then selectedDepts will be an array of strings such as -> ["A_C", "A_D", "B_C", "B_D"] 
         */
        let selectedDepts = [];
        val.forEach((arr1, i) => {
          /*
            Avoid pushing the rowData of the current row index, as it is multiselect it throws a warning msg everyTime the user tries to select multiple values of props.sisterStoreHierarchyKey field
            Check for duplicate values by comparing only with the previously filled rows
          */
          if (i !== cellNode.rowIndex) {
            let eachRow = [];
            let combinations;
            arr1.forEach((subArr1) => {
              let selectedDropDownValue = subArr1.map((data) => data.value);
              eachRow.push(selectedDropDownValue);
              combinations = generateCombinations(...eachRow);
            });
            selectedDepts.push(...combinations);
          }
        });

        let currentDataNodeKeyForValidation = fieldKeys.filter(
          (key) => key !== props.sisterStoreHierarchyKey
        );

        let currentDataNode = currentDataNodeKeyForValidation
          .map((key) => cellNode.data[key])
          .filter((item) => item !== "");

        /*
          The Variable currentDepts is used to hold a value of a current rowNode that you are editing in a similar format as selectedDepts
        */
        let currentDepts = [];
        let eachRow = [];
        let combinations;
        // Fetching props.sisterStoreHierarchyKey value from the parameter "e" as rowData as this time does not have the updated props.sisterStoreHierarchyKey in the instance, appending it at the last
        let hierarchyKeyVal = e.map((item) => item.value);
        currentDataNode.forEach((arr1) => {
          let selectedDropDownValue = arr1.map((data) => data.value);
          eachRow.push(selectedDropDownValue);
        });

        eachRow.push(hierarchyKeyVal);
        combinations = generateCombinations(...eachRow);
        currentDepts.push(...combinations);

        // Check if any of the user selected combinations from the currentDepts exists in the selectedDepts
        if (selectedDepts.some((item) => currentDepts.includes(item))) {
          displaySnackMessages(
            "The hierarchy value you are trying to select is already selected in previous row",
            "warning"
          );
        } else return true;
      } else if (colId === "store_code") {
        // Same as above - throw a warning msg incase a similar sister store is selected in consecutive rows
        let val = arr
          .map((obj) => obj.store_code)
          .filter((item) => item !== "");
        let selectedStores = val.map((store) => store[0]?.value);
        // Adding validation here to not to allow the selection of same hierarchy as per previous rows
        if (selectedStores.includes(e.value)) {
          displaySnackMessages(
            "This sister store is already mapped to another department, please select a different sister store",
            "warning"
          );
        } else return true;
      } else return true;
    } else return true;
  };

  const handleChangeSisterStoreTimePeriod = (updatedFormData) => {
    setSisterStoreTimePeriod(updatedFormData);
  };

  const handleChangeSisterStoreDatePicker = (updatedFormData) => {
    setSisterStoreDatePicker(updatedFormData);
  };

  const setFiltersPayloadBasedOnHierarchy = (data, grid) => {
    let prodDimensionHierarchies = grid.gridOptions?.columnDefs.filter(
      (item) =>
        item?.column_name !== "store_code" && item?.field !== "Selection"
    );
    prodDimensionHierarchies = prodDimensionHierarchies
      .map((obj) => {
        return {
          filter_id: obj.column_name,
          attribute_name: obj.column_name,
          operator: "in",
          dimension: "product",
          values: data[obj.column_name]
            ? data[obj.column_name].map((item) => item.value)
            : [],
          filter_type: "cascaded",
        };
      })
      .filter((res) => res.values.length);
    return [
      ...prodDimensionHierarchies,
      {
        filter_id: "channel",
        attribute_name: "channel",
        operator: "in",
        dimension: "store",
        values: [props.finalStoreDetailsStateValues.form_attributes?.channel],
        filter_type: "cascaded",
      },
    ];
  };

  const fetchCrossFilterOptions = (rows, flowType) => {
    rows.forEach(async (data) => {
      let filterKeys = Object.keys(data).filter(
        (val) => val !== "key" && !val.includes("options")
      );
      callCrossFilterAPIOptions(
        data,
        agGridInstance.current?.api?.gridOptionsWrapper,
        filterKeys,
        flowType
      );
    });
  };

  const onBlur = async (_e, data, column, isChanged, value, _initialValue) => {
    const { gridOptionsWrapper } = column;

    // To disable fetch store groups button unless and until all values in a row are filled
    let fieldKeys = Object.keys(data).filter(
      (val) => val !== "key" && !val.includes("options")
    );
    if (fieldKeys.some((key) => isEmpty(data[key]))) {
      setStoreGroupDisableState(true);
    } else setStoreGroupDisableState(false);

    if (isChanged && column.colId !== "store_code") {
      let filterKeys = gridOptionsWrapper.gridOptions?.columnDefs.filter(
        (key) => key?.field !== "Selection"
      );
      callCrossFilterAPIOptions(data, gridOptionsWrapper, filterKeys);
    }
    // reset selected sister store option n disable the fields
    if (isChanged && !value.length) {
      data.store_code = "";
      agGridInstance.current?.api?.refreshCells({
        force: true,
        suppressFlash: false,
        columns: ["store_code"],
      });
      setCellsToBeDisabled(data, column);
    }
  };

  const callCrossFilterAPIOptions = async (
    data,
    gridOptionsWrapper,
    filterKeys,
    flowType
  ) => {
    try {
      props.setSisterStoreDetailsScreenLoader(true);
      const attributesList = getfilterAttributeList(
        sisterStoreFilterConfigRef.current
      );
      let body = {
        attributes: attributesList,
        filter_type: "cascaded",
        filters: setFiltersPayloadBasedOnHierarchy(data, gridOptionsWrapper),
        application_code: 1,
      };
      if (props.tenantFilterUamConfig) {
        body.is_urm_filter = true;
        body.screen_name = props.screenName;
      }
      let response = await getCombinedCrossDimensionFiltersData(body)();
      filterKeys.forEach(async (obj) => {
        let colName =
          flowType === "back" || flowType === "edit" ? obj : obj.column_name;
        let dropDownList = `${colName}_options`;
        let mappingList = response.data.data[colName];
        if (colName === "store_code") {
          let nonEcomStores = mappingList.filter((item) => {
            return item[0]?.toLowerCase() !== "e";
          });
          data[dropDownList] = await nonEcomStores?.map((opt) => {
            return {
              value: opt,
              label: opt,
              id: opt,
            };
          });
        } else {
          data[dropDownList] = await mappingList?.map((opt) => {
            return {
              value: opt,
              label: opt,
              id: opt,
            };
          });
        }
        // Take an intersection of the values selected by the user and the response from the API for that particular cross filer and populate the place holders
        if (data[colName].length) {
          let commonSelectedVal = data[colName].filter((obj1) =>
            data[dropDownList]?.some((obj2) => obj2["value"] === obj1["value"])
          );
          data[colName] = commonSelectedVal;
        }
        agGridInstance.current?.api?.refreshCells({
          force: true,
          suppressFlash: false,
          columns: [colName],
        });
      });
      await props.setSisterStoreDetailsScreenLoader(false);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setSisterStoreDetailsScreenLoader(false);
    }
  };

  // to debug and check this why it is needed in vb n not in other clients (Solution working now for all clients)
  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue } = params;
    let cloneRefInstance = cloneDeep(sisterStoreMappedData);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.key === data.key
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      setSisterStoreMappedData(cloneRefInstance);
    }
  };

  const handleChangeStoreGroupMapping = (updatedFormData, fieldType) => {
    setStoreGroupMapping(updatedFormData);
  };

  const fetchStoreGroups = async (data, timePeriod) => {
    try {
      let emptyRowValues = false;
      let rows = data ? data : sisterStoreMappedData;
      rows.forEach((item) => {
        if (Object.values(item).some((val) => val === ""))
          emptyRowValues = true;
        else emptyRowValues = false;
      });
      if (emptyRowValues) {
        displaySnackMessages("Row cannot have empty values", "error");
      } else {
        props.setSisterStoreDetailsScreenLoader(true);
        let body = {
          attribute_name: props.sisterStoreHierarchyKey,
          table_row_attributes: mapTableRowAttributesAsFilters(rows),
          other_attributes: {
            ...props.finalStoreDetailsStateValues.other_attributes,
          },
          dc_row_attributes:
            props.finalStoreDetailsStateValues.dc_row_attributes,
          application_code: 1,
        };
        let response = await props.getStoreGroup(body);
        if (!response.data?.data?.length) {
          displaySnackMessages(NO_STORE_GROUP_VALIDATION_MSG, "error");
          setStoreGroupMapping({
            ...storeGroupMapping,
            store_groups: [],
          });
        } else {
          STORE_GROUP_MAPPING[0].options = configureStoreGroupOptions(
            response.data?.data
          );
          setStoreGroupConfiguration(STORE_GROUP_MAPPING);
          let storeGroupsSelected = response.data?.data.map(
            (item) => item.sg_code
          );
          if (!isEmpty(timePeriod)) {
            // convert the store_group to Number on edit as it is saved as string
            setStoreGroupMapping({
              store_groups: timePeriod?.store_groups.map((item) =>
                Number(item)
              ),
              store_group_mapping_date: timePeriod?.store_group_mapping_date,
            });
          } else
            setStoreGroupMapping({
              ...storeGroupMapping,
              store_groups: storeGroupsSelected,
            });
        }
        props.setSisterStoreDetailsScreenLoader(false);
      }
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setSisterStoreDetailsScreenLoader(false);
    }
  };

  const configureStoreGroupOptions = (data) => {
    return data.map((item) => {
      return {
        value: item.sg_code,
        label: item.name,
        id: item.sg_code,
      };
    });
  };

  const goToStepThree = () => {
    setResetClicked(false);
    props.goToDemandConstraints();
  };

  return (
    <Loader loader={props.sisterStoreDetailsScreenLoader}>
      <div className={globalClasses.marginAround}>
        <div className={classes.alignButtons}>
          <Button
            title="Add New Store"
            color="primary"
            variant="contained"
            id="new-store-button"
            onClick={() => addNewRow()}
          >
            <AddIcon />
          </Button>
          <Button
            className={globalClasses.marginLeft1rem}
            title="Delete"
            color="primary"
            variant="contained"
            id="new-store-button"
            onClick={() => deleteSelectedSisterRows()}
          >
            <DeleteIcon />
          </Button>
        </div>
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            columns={sisterStoreMappedColumnConfig}
            rowdata={sisterStoreMappedData}
            uniqueRowId={"key"}
            rowSelection={"multiple"}
            selectAllHeaderComponent
            hideHeaderCheckboxComponent
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={loadTableInstance}
            callBackOnChangeCustomFunction={onChangeSisterStoreValidation}
            onBlur={onBlur}
            onCellValueChanged={onCellValueChanged}
          />
        </div>
        <div className={classes.alignButtons}>
          <Button
            color="primary"
            variant="outlined"
            id="new-store-button"
            disabled={storeGroupDisableState}
            onClick={() => fetchStoreGroups()}
          >
            Fetch Store Group
          </Button>
        </div>

        <div className={classes.timePeriodFormStyle}>
          <div className={classes.timePeriodFormContainer}>
            {timePeriodToggle ? (
              <Form
                layout={"vertical"}
                maxFieldsInRow={1}
                handleChange={handleChangeSisterStoreTimePeriod}
                fields={MAPPED_STORE_PERIOD_DROP_DOWN_OPTIONS}
                updateDefaultValue={false}
                defaultValues={sisterStoreTimePeriod}
                labelWidthSpan={2}
                fieldTypeWidthSpan={2}
              ></Form>
            ) : (
              <Form
                layout={"vertical"}
                maxFieldsInRow={1}
                handleChange={handleChangeSisterStoreDatePicker}
                fields={MAPPED_STORE_PERIOD_DATE_PICKER}
                updateDefaultValue={false}
                defaultValues={sisterStoreDatePicker}
                labelWidthSpan={2}
                fieldTypeWidthSpan={2}
              ></Form>
            )}
          </div>
          <Switch
            defaultChecked={timePeriodToggle}
            id="storetoDcfcToggleBtn"
            onChange={(event) => {
              setTimePeriodToggle(event.target.checked);
            }}
            rightLabel="Dynamic"
            leftLabel="Static"
          />
        </div>

        <div className={globalClasses.marginVertical2rem}>
          <Typography variant="h4" className={globalClasses.paddingHorizontal}>
            Store Group Mapping
          </Typography>
          <div className={globalClasses.marginAround}>
            <Form
              layout={"vertical"}
              maxFieldsInRow={5}
              handleChange={handleChangeStoreGroupMapping}
              fields={storeGroupConfiguration}
              updateDefaultValue={false}
              defaultValues={storeGroupMapping}
              labelWidthSpan={2}
              fieldTypeWidthSpan={6}
            ></Form>
          </div>
        </div>

        <div className={classes.alignButtons}>
          <Button
            color="primary"
            variant="outlined"
            id="new-store-button"
            onClick={() => clearSisterStoreMappings()}
          >
            Reset
          </Button>
          <Button
            className={globalClasses.marginLeft1rem}
            color="primary"
            variant="contained"
            id="new-store-button"
            onClick={() => saveSisterStoreMappings()}
          >
            Next
          </Button>
        </div>

        {enableSisterStoreView && (
          <div ref={storeDCRef}>
            <Typography
              variant="h4"
              className={globalClasses.paddingHorizontal}
            >
              Sister Stores
            </Typography>
            <div className={globalClasses.marginVertical1rem}>
              <AgGridComponent
                columns={sisterStoresColumnConfig}
                rowdata={sisterStoresData}
                sizeColumnsToFitFlag
              />
            </div>

            <Typography
              variant="h4"
              className={globalClasses.paddingHorizontal}
            >
              DC Stores
            </Typography>
            <div className={globalClasses.marginVertical1rem}>
              <AgGridComponent
                columns={dcStoresColumnConfig}
                rowdata={dcStoresData}
                sizeColumnsToFitFlag
              />
            </div>
          </div>
        )}

        <div className={globalClasses.centerAlign}>
          <Button
            color="primary"
            variant="outlined"
            id="new-store-button"
            onClick={() => setShowGoBackDialog(true)}
          >
            Back
          </Button>
          <Button
            className={globalClasses.marginLeft1rem}
            color="primary"
            variant="contained"
            id="new-store-button"
            onClick={() => goToStepThree()}
            disabled={!enableSisterStoreView}
          >
            Import Demand Constraints
          </Button>
        </div>
        {showDeleteConfirmPopup && (
          <>
            <Prompt
              isOpen={showDeleteConfirmPopup}
              title="Delete Selected Rows"
              subHeading="Are you sure you want to delete the selected rows?"
              infoList={[]}
              primaryButtonProps={{
                children: common.__ConfirmBtnText,
                onClick: () => {
                  confirmDeleteRows();
                  setShowDeleteConfirmPopup(false);
                },
              }}
              tertiaryButtonProps={{
                children: common.__RejectBtnText,
                onClick: () => setShowDeleteConfirmPopup(false),
              }}
              variant="error"
            />
          </>
        )}
      </div>
      <Prompt
        isOpen={showGoBackDialog}
        title="Go back"
        subHeading={GO_BACK_MESSAGE}
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            props.goBackToStep1();
            setShowGoBackDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setShowGoBackDialog(false),
        }}
        variant="error"
      />
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, tenantUserRoleMgmtReducer } = store;
  return {
    sisterStoreDetailsScreenLoader:
      inventorysmartReducer.inventorySmartSisterStoreMappingService
        .sisterStoreDetailsScreenLoader,
    finalStoreDetailsStateValues:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .finalStoreDetailsStateValues,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    saveNewStoreDetailsForBackFlow:
      inventorysmartReducer.inventorySmartNewStoreDetailsService
        .saveNewStoreDetailsForBackFlow,
    editNewStoreData:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        .editNewStoreData,
    sisterStoreHierarchyKey:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_new_store_setup?.drillDown
        ?.sister_store_mapping_hierarchy,
    tenantFilterUamConfig:
      tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setSisterStoreDetailsScreenLoader: (body) =>
      dispatch(setSisterStoreDetailsScreenLoader(body)),
    clearSisterStoreDetailsScreenLoader: (body) =>
      dispatch(clearSisterStoreDetailsScreenLoader(body)),
    getSisterStoreAndDCDetails: (body) =>
      dispatch(getSisterStoreAndDCDetails(body)),
    saveStepOneFinalValues: (body) => dispatch(saveStepOneFinalValues(body)),
    setNewStoreDetailsForBackFlow: (body) =>
      dispatch(setNewStoreDetailsForBackFlow(body)),
    getStoreGroup: (body) => dispatch(getStoreGroup(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SisterStoreMappingComponent);

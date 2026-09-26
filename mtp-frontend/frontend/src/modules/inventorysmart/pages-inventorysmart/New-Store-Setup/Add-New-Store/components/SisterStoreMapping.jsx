import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";

import AddIcon from "@mui/icons-material/Add";
import {Delete, EditNote, DeleteOutline,} from "@mui/icons-material";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Modal, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty, isNumber } from "lodash";
import moment from "moment";
import colours from "core/Styles/colours";

import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import Form from "core/Utils/form";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Prompt, Switch } from "impact-ui";
import { BULK_EDIT_MAPPING_TILL_DATE, common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useNavigate } from "react-router-dom-v5-compat";

import { getfilterAttributeList } from "core/commonComponents/coreComponentScreen/utils";

import {
  ERROR_MESSAGE,
  GO_BACK_MESSAGE,
  MAPPED_STORE_PERIOD_DATE_PICKER,
  MAPPED_STORE_PERIOD_DROP_DOWN_OPTIONS,
  STORE_GROUP_MAPPING,
  NO_STORE_GROUP_VALIDATION_MSG,
  SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG,
  SISTER_STORE_COLUMN_VALIDATION_MSG,
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
  sisterStoreTableValidation,
  newStoreStepTwoFinalize,
} from "../../../../services-inventorysmart/New-Store/sister-store-mapping";

import {
  fetchFilterConfig,
  fetchFilterOptions,
  scrollIntoView,
} from "../../../inventorysmart-utility";
import {
  ADD_NEW_STORE,
  CONFIGURATION,
} from "../../../../constants-inventorysmart/routesConstants";

// const useStyles = makeStyles(() => ({
//   alignButtons: {
//     display: "flex",
//     justifyContent: "flex-end",
//   },
//   timePeriodFormStyle: {
//     padding: "1rem",
//     display: "flex",
//     alignItems: "center",
//   },
//   timePeriodFormContainer: {
//     width: "20%",
//     marginRight: "1rem",
//   },
// }));

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
  const [hierarchyValidationLoader, setHierarchyValidationLoader] =
    useState(false);
  const [isDataChangedRecently, setIsDataChangedRecently] = useState(false);
  const [sisterStoreTableEmptyRowIndex, setSisterStoreTableEmptyRowIndex] =
    useState([]);
  const [crossFilterLoader, setCrossFilterLoader] = useState(false);
  const [bulkEditMappingTillDatePopUp, setBulkEditMappingTillDatePopUp] = useState(false);
  const [bulkEditMappingTillDate, setBulkEditMappingTillDate] = useState("");
  const [bulkEditFields, setBulkEditFields] = useState([]);
  const [bulkEditValue, setBulkEditValue] = useState();

  const agGridInstance = useRef(null);
  const sisterStoreFilterConfigRef = useRef(null);
  const storeDCRef = useRef();
  const columnsToIgnoreRef = useRef([]);

  const globalClasses = globalStyles();
  const classes = useStyles();
  const navigate = useNavigate();

  const {
    ignoreColumns = [],
    passChannelInPayload,
    validateL0,
  } = props.newStoreSetup?.create?.step2 || {};

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      props.setSisterStoreDetailsScreenLoader(true);
      try {
        let sisterStoreTableConfig = await getColumnsAg(
          "table_name=new_store_select_sister"
        )();
        sisterStoreTableConfig = sisterStoreTableConfig.map((item) => {
          if (item.column_name === props.storeCodeKeyName) {
            item.disabled = setCellsToBeDisabled;
          }
          if (item.type === "datetime") {
            if(props.newStoreSetup?.create?.step2?.hideImportDemand){
              let storeOpeningDate = moment(props.finalStoreDetailsStateValues?.other_attributes?.store_opening_date);
              let requiredDate = storeOpeningDate?.add(6,'week')?.add(1,'days');
              item.minDate = requiredDate;
              item.defaultValue = requiredDate;
              item.maxDate = moment(props.finalStoreDetailsStateValues?.other_attributes?.store_opening_date)?.add(1,"year");
            }
            else{
              item.maxDate = props.finalStoreDetailsStateValues.other_attributes.store_opening_date;
            item.disabled = disableReservationDateCells;}
          }
          return item;
        });
        let filterKeys = [];
        sisterStoreTableConfig.forEach((col) => {
          if (col?.extra?.ignoreFormatting) filterKeys.push(col.column_name);
        });
        columnsToIgnoreRef.current = filterKeys;
        // Dynamically setting table row keys as the hierarchy displayed varies from client to client
        let sisterStoreMappedColumns = sisterStoreTableConfig.map((col) => {
          if (col.type === "datetime") {
            if (props.newStoreSetup?.create?.step2?.hideImportDemand) {
              return {
                [col.column_name]: moment(props.finalStoreDetailsStateValues?.other_attributes?.store_opening_date)?.add(6, 'week')?.add(1,'days')?.format('YYYY-MM-DD') ,

              };
            }
            else {
            return {
              [col.column_name]:
                props.finalStoreDetailsStateValues.other_attributes
                  .reservation_start_date,
            };
            }
          }
          if(col.column_name =="multiplier"){
            return {
              [col.column_name]: 1.0,
            }
          }
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
    props.storeCodeKeyName && getInitialFilterConfiguration();
  }, [props.storeCodeKeyName]);

  useEffect(() => {
    let l_bulkEditFields = [{ ...BULK_EDIT_MAPPING_TILL_DATE, minDate: moment(props.finalStoreDetailsStateValues?.other_attributes?.store_opening_date)?.add(6, 'week')?.add(1,'days')?.format('YYYY-MM-DD'), maxDate: moment(props.finalStoreDetailsStateValues?.other_attributes?.store_opening_date)?.add(1, "year")?.format('YYYY-MM-DD') }];
    setBulkEditFields(l_bulkEditFields);
    setBulkEditValue({mapping_till_date: moment(props.finalStoreDetailsStateValues?.other_attributes?.store_opening_date)?.add(6, 'week')?.add(1,'days')?.format('YYYY-MM-DD') });
  },[]);

  // In edit flow disable reservation date in a row if the reservation date is less than current date(vb specific)
  const disableReservationDateCells = (row) => {
    var currentDate = new Date().toISOString().split("T")[0];
    return row?.reservation_date < currentDate;
  };
  const setCellsToBeDisabled = (row, _item) => {
    // disable store_code (props.storeCodeKeyName) column if hierarchies are empty
    let colKeysToIgnore = [
      "key",
      ...columnsToIgnoreRef.current,
      props.storeCodeKeyName,
      ...ignoreColumns,
    ];
    let toDisable = false;
    if(validateL0){
      if(isEmpty(row["l0_name"])){
        toDisable = true;
      }else toDisable = false
    }
    else{
    let keysToCheckValidationOn = Object.keys(row).filter(
      (val) => !val.includes("options") && !colKeysToIgnore.includes(val)
    );
    if (keysToCheckValidationOn.some((key) => isEmpty(row[key]))) {
      toDisable = true;
    } else toDisable = false;
  }
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
  }, [sisterStoreFilterConfig]);

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
      isEmpty(sisterStoreMappedData[0]?.[props.storeCodeKeyName]) &&
      sisterStoreFilterConfig?.length &&
      !resetClicked &&
      // these two conditions are added to prevent the cross filter and store group API being called twice and rerendering
      sisterStoreFilterOptions?.length &&
      isEmpty(storeGroupMapping?.store_groups)
    ) {
      // to pre populate step 2, when user clicks on go back button in step 3
      if (
        props.screenNameNavigatedFrom &&
        props.screenNameNavigatedFrom === "demand-constraints" &&
        !isEmpty(props.saveNewStoreDetailsForBackFlow) &&
        !isDataChangedRecently
      ) {
        prepopulateStepOneValues(props.saveNewStoreDetailsForBackFlow, "back");
      }
      // edit flow
      if (
        isEmpty(props.screenNameNavigatedFrom) &&
        props.editNewStoreData &&
        !isEmpty(props.finalStoreDetailsStateValues) &&
        !isDataChangedRecently
      ) {
        prepopulateStepOneValues(props.finalStoreDetailsStateValues, "edit");
      }
    }
  }, [
    props.screenNameNavigatedFrom,
    props.saveNewStoreDetailsForBackFlow,
    sisterStoreMappedData,
    sisterStoreFilterConfig,
    props.finalStoreDetailsStateValues,
    props.editNewStoreData,
    sisterStoreFilterOptions,
    storeGroupMapping,
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
    let newColumnsToIgnore = [...columnsToIgnoreRef.current,...ignoreColumns];
    tableRowAttrs?.forEach((obj, i) => {
      let updatedRowData = {};
      obj.forEach((item) => {
        if (newColumnsToIgnore.includes(item.attribute_name)) {
          // to pre populate date field in vb (modify the condition in future if more number of such cols are added)
          updatedRowData[item.attribute_name] = item.values[0];
          flowType === "edit" && disableReservationDateCells(updatedRowData);
        } else
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
    if (fieldKeys.some((key) => {
      if(typeof latestRecordEntry[key] === "number"){
        return latestRecordEntry[key]<0.25;
      }
      isEmpty(latestRecordEntry[key])} )) {
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
      setCounter(0);
      setCellsToBeDisabled(initialRow);
      setResetClicked(true);
      if (enableSisterStoreView || storeGroupMapping?.store_groups?.length) {
        clearSisterStoreMappings();
      }
    } else {
      let updateSisterStoreKeyOnDelete = rowDataAfterDeleting.map((item, i) => {
        return {
          ...item,
          key: i,
        };
      });
      setCounter(updateSisterStoreKeyOnDelete.length - 1);
      setSisterStoreMappedData(updateSisterStoreKeyOnDelete);
    }
    agGridInstance.current.api.forEachNode((node) => node.setSelected(false));
  };

  const saveSisterStoreMappings = async () => {
    enableSisterStoreView && setEnableSisterStoreView(false);
    let emptyRowValues = [];
    sisterStoreMappedData.forEach((item) => {
      if (Object.values(item).some((val) => val?.length === 0))
        emptyRowValues.push(true);
    });
    if (!validateL0 && emptyRowValues.length) {
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
      props.setSisterStoreDetailsScreenLoader(true);
      const fetchFutureDates = () => {
        // fetch future dates based on the number of months selected from the drop down
        let month = sisterStoreTimePeriod?.sisterStoreTimePeriod?.split(" ")[0];
        let currentData = new Date(
          props.finalStoreDetailsStateValues.other_attributes.store_opening_date
        );
        currentData.setMonth(currentData.getMonth() + parseInt(month));
        return JSON.stringify(currentData).slice(1, 11);
      };

      let sisterStoreTomePeriodValue = !timePeriodToggle
        ? moment(sisterStoreDatePicker?.sisterStoreDatePicker).format(
            "YYYY-MM-DD"
          )
        : fetchFutureDates();

      try {
        let tableRows = mapTableRowAttributesAsFilters(sisterStoreMappedData);
        let otherAttrs = calculateMaxReservationDate(tableRows);
        let reqBody = {
          attribute_name: props.sisterStoreHierarchyKey,
          table_row_attributes: tableRows,
          other_attributes: {
            ...otherAttrs,
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
          table_row_attributes: tableRows,
          other_attributes: {
            ...otherAttrs,
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

  /**
   *
   * @param {Object} rows  - Table row data
   * @param {Boolean} ignoreSisterStore - Boolean value to filter out keys of row data
   * @returns a nested array where each table column (product and store dimension) is formatted to filter payload structure
   */
  const mapTableRowAttributesAsFilters = (rows, ignoreSisterStore) => {
    let payloadFormatArr = [];
    rows.forEach((row) => {
      let tableRowKeys = Object.keys(row).filter(
        (val) => val !== "key" && !val.includes("options") && val !== "isRowColor"
      );
      if (ignoreSisterStore) {
        tableRowKeys = tableRowKeys.filter(
          (key) => key !== props.storeCodeKeyName
        );
      }
      let newArr = [];
      let newColumnsToIgnore = [...columnsToIgnoreRef.current,...ignoreColumns];
      tableRowKeys.forEach((item) => {
        if (newColumnsToIgnore.includes(item)) {
          newArr.push({
            attribute_name: item,
            operator: "in",
            values: [row[item]],
            filter_type: "non-cascaded",
            dimension: "custom",
          });
        } else {
          newArr.push({
            attribute_name: item,
            operator: "in",
            values: row[item] ? row[item]?.map((item) => item.value) : [],
            filter_type: "cascaded",
            dimension: item === props.storeCodeKeyName ? "store" : "product",
          });
        }
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
    columnDropDownValues[optionsKey] = obj.initialData || [];
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
    setCounter(0);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
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
    if (arr?.length > 1 && colId === props.storeCodeKeyName) {
      // Same as above - throw a warning msg incase a similar sister store is selected in consecutive rows
      let val = arr
        .map((obj) => obj[props.storeCodeKeyName])
        .filter((item) => item !== "");
      let selectedStores = val.map((store) => store[0]?.value);
      // Adding validation here to not to allow the selection of same hierarchy as per previous rows
      if (selectedStores.includes(e.value)) {
        // incase a value is selected and if we select another value which is a duplicate store code reset the cell to empty
        cellNode.data[props.storeCodeKeyName] = "";
        agGridInstance.current.api.refreshCells({
          columns: [props.storeCodeKeyName],
        });
        displaySnackMessages(SISTER_STORE_COLUMN_VALIDATION_MSG, "warning");
        return false;
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
        item?.column_name !== props.storeCodeKeyName &&
        item?.field !== "Selection" &&
        item?.type !== "datetime" && 
        item.type !== "float"
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
    //  for signet do not pass store channel values
    if (props?.noStoreChannelInCrossFilter) {
      return prodDimensionHierarchies;
    } else
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
      let colKeysToIgnore = ["key", ...columnsToIgnoreRef.current, ...ignoreColumns];
      let filterKeys = Object.keys(data).filter(
        (val) => !colKeysToIgnore.includes(val) && !val.includes("options")
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
    let arr = [];
    agGridInstance.current?.api?.forEachNode((item) => arr.push(item.data));

    // To disable fetch store groups button unless and until all values in a row are filled
    let colKeysToIgnore = ["key", ...columnsToIgnoreRef.current,...ignoreColumns];
    let fieldKeys = Object.keys(data).filter(
      (val) => !colKeysToIgnore.includes(val) && !val.includes("options")
    );
    if(!validateL0){
      if ( fieldKeys.some((key) => isEmpty(data[key]))) {
      setStoreGroupDisableState(true);
    } else setStoreGroupDisableState(false);
    }else{
      setStoreGroupDisableState(true);
    }
    let filterKeys = gridOptionsWrapper.gridOptions?.columnDefs.filter(
      (key) => key?.field !== "Selection" && key?.type !== "datetime" && key?.type !== "float"
    );

    if(props.newStoreSetup?.create?.step2?.hideImportDemand){
      if(column.colId=="multiplier"){
        if(value<0.25 || value >5){
          displaySnackMessages("Multiplier should be between 0.25 and 5", "error");
          setStoreGroupDisableState(true);
          return
        }
        if(value%0.25 !==0){
          displaySnackMessages("Multiplier should be in multiples of 0.25", "error");
          setStoreGroupDisableState(true);
          return
        }
      }
    }
    if (
      isChanged &&
      column.colId !== props.storeCodeKeyName &&
        column.type !== "datetime" &&
        column?.colDef?.type !== "float"
    ) {
      // Adding await so the table row data(arr) gets updated for checking product hierarchy value duplication on changing cross filters
      await callCrossFilterAPIOptions(data, gridOptionsWrapper, filterKeys);
    }
    // Optimization API to display a warning message incase of repetitions of values
    fieldKeys = fieldKeys.filter((key) => key !== props.storeCodeKeyName);
    let emptyCond = fieldKeys.some((key) => isEmpty(data[key]));
    /* 
        Calling the API to check for duplicates when 
        - the number of rows present in the table is more than one AND
        - when all cols (fieldKeys) of the current row are filled with values AND
        - when the current col is not sister store
     */
    if (
      arr?.length > 1 &&
      !emptyCond &&
      isChanged &&
      column.colId !== props.storeCodeKeyName
    ) {
      try {
        setHierarchyValidationLoader(true);
        let body = {
          attribute_name: props.sisterStoreHierarchyKey,
          table_row_attributes: mapTableRowAttributesAsFilters(arr, true),
          application_code: 1,
          changed_rows: [data.key],
        };
        let apiResponse = await props.sisterStoreTableValidation(body);
        if (apiResponse.data?.message === "True") {
          data[column.colId] = "";
          agGridInstance.current.api.refreshCells({
            columns: [column.colId],
          });
          displaySnackMessages(
            SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG,
            "warning"
          );
          // To disable sister store cell and fetch back all options of the column for which an API is called
          callCrossFilterAPIOptions(data, gridOptionsWrapper, filterKeys);
        }
        setHierarchyValidationLoader(false);
      } catch (e) {
        setHierarchyValidationLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    }

    // reset selected sister store option n disable the fields
    if (isChanged && !value.length && column.type !== "datetime" && column?.colDef?.type !=="float") {
      data[props.storeCodeKeyName] = "";
      agGridInstance.current?.api?.refreshCells({
        force: true,
        suppressFlash: false,
        columns: [props.storeCodeKeyName],
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
      setCrossFilterLoader(true);
      const attributesList = getfilterAttributeList(
        sisterStoreFilterConfigRef.current
      );
      let body = {
        attributes: attributesList,
        filter_type: "cascaded",
        filters: setFiltersPayloadBasedOnHierarchy(data, gridOptionsWrapper),
        application_code: 1,
      };
      let response = await getCombinedCrossDimensionFiltersData(body)();
      filterKeys.forEach(async (obj) => {
        let colName =
          flowType === "back" || flowType === "edit" ? obj : obj.column_name;
        let dropDownList = `${colName}_options`;
        let mappingList = response.data.data[colName];
        if (colName === props.storeCodeKeyName) {
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
      setCrossFilterLoader(false);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      setCrossFilterLoader(false);
    }
  };

  // to debug and check this why it is needed in vb n not in other clients (Solution working now for all clients)
  const onCellValueChanged = (params) => {
    const { column, node, data, newValue, api } = params;
    if (column.colDef.type === "datetime") {
      data[column.colId] = !newValue
        ? ""
        : moment(newValue).format("YYYY-MM-DD"); // add null cond check here
    }
    let cloneRefInstance = cloneDeep(sisterStoreMappedData);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.key === data.key
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      setSisterStoreMappedData(cloneRefInstance);
      setIsDataChangedRecently(true);
    }
  };

  const handleChangeStoreGroupMapping = (updatedFormData, fieldType) => {
    setStoreGroupMapping(updatedFormData);
  };

  const calculateMaxReservationDate = (tableRows) => {
    // set max of reservation dates from table_row_attributes
    let maxDateValue = [];
    tableRows?.forEach((item) => {
      item?.forEach((subItem) => {
        if (subItem?.dimension === "custom") {
          maxDateValue.push(subItem.values[0]);
        }
      });
    });
    return {
      ...props.finalStoreDetailsStateValues?.other_attributes,
      reservation_start_date: maxDateValue.length
        ? maxDateValue.reduce(function (a, b) {
            return a > b ? a : b;
          })
        : props.finalStoreDetailsStateValues?.other_attributes
            ?.reservation_start_date,
    };
  };

  const fetchStoreGroups = async (data, timePeriod) => {
    try {
      let emptyRowIndex = [];
      let rows = data ? data : sisterStoreMappedData;
      rows.forEach((item, i) => {
        if (Object.values(item).some((val) => val === ""))
          emptyRowIndex.push(i + 1);
      });
      if (!validateL0 && emptyRowIndex.length) {
        setSisterStoreTableEmptyRowIndex(emptyRowIndex);
        displaySnackMessages("Row cannot have empty values", "warning");
      } else {
        setSisterStoreTableEmptyRowIndex([]);
        props.setSisterStoreDetailsScreenLoader(true);
        let tableRows = mapTableRowAttributesAsFilters(rows);
        // FOR RL - passing only those filters for which values have been selected to fetch store groups
        let nonEmptyValueRows = tableRows.map((row)=>{
          return row.filter((item) => item.values.length)
        })
        let otherAttrs = calculateMaxReservationDate(tableRows);
        let body = {
          attribute_name: props.sisterStoreHierarchyKey,
          table_row_attributes: passChannelInPayload ? nonEmptyValueRows : tableRows,
          other_attributes: {
            ...otherAttrs,
          },
          dc_row_attributes:
            props.finalStoreDetailsStateValues.dc_row_attributes,
          application_code: 1,
          ...(passChannelInPayload && {channel: props.finalStoreDetailsStateValues.form_attributes?.channel}),
        };
        let response = await props.getStoreGroup(body);
        if (passChannelInPayload? !response.data?.data?.default_store_groups?.length : !response.data?.data?.length) {
          displaySnackMessages(NO_STORE_GROUP_VALIDATION_MSG, "error");
          setStoreGroupMapping({
            ...storeGroupMapping,
            store_groups: [],
          });
        } else {
          STORE_GROUP_MAPPING[0].options = configureStoreGroupOptions(
            passChannelInPayload ? response.data?.data?.all_store_groups : response.data?.data
          );
          setStoreGroupConfiguration(STORE_GROUP_MAPPING);
          let storeGroupsSelected = [];
          if(passChannelInPayload){
            storeGroupsSelected = response.data?.data?.default_store_groups?.map(
            (item) => item.sg_code
          );
          }
          else{storeGroupsSelected= response.data?.data.map(
            (item) => item.sg_code
          );
        }
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

  const stepTwoFinalize = async () => {

    if (
      isEmpty(storeGroupMapping.store_groups) ||
      isEmpty(storeGroupMapping.store_group_mapping_date)
    ) {
      displaySnackMessages(
        "Please fill store group mapping details",
        "warning"
      );
    } else {
      try {
        let tableRows = mapTableRowAttributesAsFilters(sisterStoreMappedData);
        let reqBody = {
          table_row_attributes: tableRows,
          ...props.finalStoreDetailsStateValues,
          other_attributes: {
            instore_date: props.finalStoreDetailsStateValues.other_attributes.instore_date,
            allocation_start_date: props.finalStoreDetailsStateValues.other_attributes.allocation_start_date,
            store_groups: storeGroupMapping.store_groups,
            store_group_mapping_date: moment(
              storeGroupMapping.store_group_mapping_date
            ).format("YYYY-MM-DD"),
          },
          store_code:
            props.finalStoreDetailsStateValues.form_attributes.store_code,
          retail_facility_code:
            props.finalStoreDetailsStateValues.form_attributes
              ?.retail_facility_code,
          attribute_name: props.sisterStoreHierarchyKey,
        };
        let response = await props.newStoreStepTwoFinalize(reqBody);
        if (response?.data?.status) {
          // navigate to configuration screen
          props.displaySnackMessages(response?.data?.message, "info", () => {
            navigate(CONFIGURATION, {
              state: ADD_NEW_STORE,
            });
          });
        }
      }

      catch (err) {
        displaySnackMessages("Something went", "error");
      }
    }

  }

  const handleChangeMappingTillDatePicker = (updatedFormData) => {
    setBulkEditMappingTillDate(moment(updatedFormData?.mapping_till_date));
    setBulkEditValue({
      mapping_till_date: moment(updatedFormData?.mapping_till_date)?.format('YYYY-MM-DD'),
    });

  };

  const applyEditOnSelectedRows = () => {
    let selectedRows = agGridInstance.current.api.getSelectedRows();
    let l_bulkEditMappingTillDate = bulkEditMappingTillDate? moment(bulkEditMappingTillDate)?.format('YYYY-MM-DD') : moment(props.finalStoreDetailsStateValues?.other_attributes?.store_opening_date)?.add(6, 'week')?.add(1,'days')?.format('YYYY-MM-DD') ;
    const allRows = [];

    // Get all row data
    agGridInstance.current.api.forEachNode((node) => {
      allRows.push(node.data);
    });

    // Filter out the selected rows to get the unselected rows
    const unselectedRows = allRows.filter(row => !selectedRows.includes(row));

    let updatedRows = selectedRows.map((row) => {
      return {
        ...row,
        mapping_till_date: l_bulkEditMappingTillDate
      }
    });

    let newRows = [...updatedRows, ...unselectedRows];
    setBulkEditMappingTillDate("");
    setSisterStoreMappedData(newRows);
    setBulkEditMappingTillDatePopUp(false);
    setBulkEditValue({mapping_till_date: moment(props.finalStoreDetailsStateValues?.other_attributes?.store_opening_date)?.add(6, 'week')?.add(1,'days')?.format('YYYY-MM-DD')});
  };

const checkfetchStoreGroups = () => {

  if (sisterStoreMappedData.length > 0) {
      let tableRows = mapTableRowAttributesAsFilters(sisterStoreMappedData);

      const colKeysToIgnore = [
          "key",
          ...columnsToIgnoreRef.current,
          props.storeCodeKeyName,
          ...ignoreColumns,
      ];

      // Convert each row to a unique object of its values for comparison
      const rowFilters = tableRows.map(row => {
          const combinedValues = {};
          row.forEach(ele => {
              if (!colKeysToIgnore.includes(ele.attribute_name) && ele.values.length > 0) {
                  combinedValues[ele.attribute_name] = ele.values;
              }
          });
          return combinedValues;
      });

      let duplicateIndices = [];
      let isDuplicateFound = false;

      // Check for duplicate or subset filter matches, excluding empty rows
      for (let i = 0; i < rowFilters.length - 1; i++) {
          if (!duplicateIndices.includes(i) && Object.keys(rowFilters[i]).length > 0) {
              for (let j = i + 1; j < rowFilters.length; j++) {
                  if (!duplicateIndices.includes(j) && Object.keys(rowFilters[j]).length > 0) {
                      const rowI = rowFilters[i];
                      const rowJ = rowFilters[j];

                      // Check if rowI is a subset of rowJ or vice versa
                      const isSubsetIinJ = Object.keys(rowI).every(key =>
                          rowJ[key] && rowI[key].every(val => rowJ[key].includes(val))
                      );
                      const isSubsetJinI = Object.keys(rowJ).every(key =>
                          rowI[key] && rowJ[key].every(val => rowI[key].includes(val))
                      );

                      if (isSubsetIinJ || isSubsetJinI) {
                          duplicateIndices.push(i, j);
                          isDuplicateFound = true;
                      }
                  }
              }
          }
      }

      // Update the row colors based on duplicates
      if (isDuplicateFound) {
          displaySnackMessages("Hierarchy already exists", "error");

          const updatedData = sisterStoreMappedData.map((row, index) => {
              row.isRowColor = duplicateIndices.includes(index);
              return row;
          });
          setSisterStoreMappedData(updatedData);
          agGridInstance.current.api.redrawRows();
      } else {
          const resetData = sisterStoreMappedData.map(row => {
              row.isRowColor = false;
              return row;
          });
          setSisterStoreMappedData(resetData);
          agGridInstance.current.api.redrawRows();

          const mandatoryCheck = sisterStoreMappedData.some(item =>
              ["l0_name", props.storeCodeKeyName].some(key => isEmpty(item[key]))
          );

          if (mandatoryCheck) {
              displaySnackMessages("Enter all mandatory fields", "error");
              setStoreGroupDisableState(true);
          } else {
              setStoreGroupDisableState(false);
          }
      }
      tableRows.forEach((row)=>{
        row.forEach((item)=>{
          if(item.attribute_name=="multiplier"){
            if(item.values[0]<0.25 || item.values[0] >5){
              displaySnackMessages("Multiplier should be between 0.25 and 5", "error");
              setStoreGroupDisableState(true);
              return
            }
            if(item.values[0]%0.25 !==0){
              displaySnackMessages("Multiplier should be in multiples of 0.25", "error");
              setStoreGroupDisableState(true);
              return
            }
          }
        })
      })
  }
};


  const openPopUpModal = () => {
    return (
      <Dialog
        open={bulkEditMappingTillDatePopUp}
        onClose={() => setBulkEditMappingTillDatePopUp(false)}
        maxWidth="sm"
      // fullWidth={true}
      >
        <DialogTitle>Bulk Edit</DialogTitle>
        <DialogContent>
          <Form
            layout={"vertical"}
            maxFieldsInRow={1}
            handleChange={handleChangeMappingTillDatePicker}
            fields={bulkEditFields}
            updateDefaultValue={false}
            labelWidthSpan={2}
            fieldTypeWidthSpan={2}
            defaultValues={bulkEditValue}>
          </Form>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setBulkEditMappingTillDatePopUp(false)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => applyEditOnSelectedRows()}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Loader
      loader={
        props.sisterStoreDetailsScreenLoader ||
        hierarchyValidationLoader ||
        crossFilterLoader
      }
    >
      <div className={globalClasses.marginAround}>
        <div
          className={`${globalClasses.layoutAlignSpaceBetween} ${globalClasses.marginVertical1rem}`}>
          <div>
            <Typography variant="h4">Select Sister Store</Typography>
          </div>
          <div className={`${globalClasses.flexRow} ${classes.gapIS}`}>
            {
              props.newStoreSetup?.newStoreUi ?
                <>
                  {selectedSisterStoreRows.length == 0 ?
                    <Button
                      title="Add New Store"
                      color="primary"
                      variant="contained"
                      id="sister-store-add-row-button"
                      onClick={() => addNewRow()}
                    >
                      Add Sister Store
                    </Button> :
                    <>
                      {
                        selectedSisterStoreRows.length > 0 &&
                        <>
                          < Button className={`${globalClasses.buttonNew}`}
                            onClick={() => deleteSelectedSisterRows()}>
                            <DeleteOutline className={`${globalClasses.iconNew}`} />
                          </Button>
                          {selectedSisterStoreRows.length > 1 && < Button className={`${globalClasses.buttonNew}`}
                            onClick={()=>{setBulkEditMappingTillDatePopUp(true)}}>
                            <EditNote className={`${globalClasses.iconNew}`} />
                          </Button>}
                        </>
                      }
                    </>
                  }
                </> :
                <>
          <Button
            title="Add New Store"
            color="primary"
            variant="contained"
            id="sister-store-add-row-button"
            onClick={() => addNewRow()}
          >
            <AddIcon />
          </Button>

          <Button
            className={globalClasses.marginLeft1rem}
            title="Delete"
            color="primary"
            variant="contained"
            id="sister-store-delete-row-button"
            onClick={() => deleteSelectedSisterRows()}
          >
                    <Delete />
          </Button>
                </>

            }

          </div>
        </div>
        <div className={globalClasses.marginVertical1rem}>
          <AgGridComponent
            columns={sisterStoreMappedColumnConfig}
            rowdata={sisterStoreMappedData}
            uniqueRowId={"key"}
            rowSelection={"multiple"}
            selectAllHeaderComponent
            hideHeaderCheckboxComponent={!props.newStoreSetup?.view?.singleSelect}
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={loadTableInstance}
            callBackOnChangeCustomFunction={onChangeSisterStoreValidation}
            onBlur={onBlur}
            onCellValueChanged={onCellValueChanged}
            getRowStyle={(params) => {
              if(params?.data?.isRowColor){
                return {
                  background : "rgb(255,255,0.5)",
                }
              }
            }}
          />
        </div>
        {sisterStoreTableEmptyRowIndex.length > 0 && (
          <Typography variant="h5" color={colours.frolyLight}>
            Note:- The following row numbers have empty values :
            {sisterStoreTableEmptyRowIndex
              .map((item) => ` Row ${item}`)
              .toString()}
          </Typography>
        )}

        {!props.newStoreSetup?.newStoreUi && 
        <div className={classes.alignButtons}>
          <Button
            color="primary"
            variant="outlined"
            id="sister-store-fetch-store-groups-button"
            disabled={storeGroupDisableState}
            onClick={() => fetchStoreGroups()}
          >
            Fetch Store Group
          </Button>
        </div>}

        {validateL0 && <div className={classes.alignButtons}>
          <Button
            color="primary"
            variant="outlined"
            id="sister-store-fetch-store-groups-button"
            // disabled={storeGroupDisableState}
            onClick={() => checkfetchStoreGroups()}
          >
            Check Hierarchy and Mapping
          </Button>
        </div>
        }


        {!props.newStoreSetup?.create?.step2?.hideTimePeriod && 
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
            checked={timePeriodToggle}
            id="storetoDcfcToggleBtn"
            onChange={(event) => {
              setTimePeriodToggle(event.target.checked);
            }}
            rightLabel="Dynamic"
            leftLabel="Static"
          />
        </div>}

        <div className={globalClasses.marginVertical2rem}>
          <div className={`${globalClasses.flexRow}`}>
          <Typography variant="h4" className={globalClasses.paddingHorizontal}>
            Store Group Mapping
          </Typography>
            {props.newStoreSetup?.newStoreUi &&
              <div >
                <Button
                  color="primary"
                  variant="outlined"
                  id="sister-store-fetch-store-groups-button"
                  disabled={storeGroupDisableState}
                  onClick={() => fetchStoreGroups()}
                >
                  Fetch Store Group
                </Button>
              </div>}
          </div>
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
          {!props.newStoreSetup?.newStoreUi &&
          <Button
            color="primary"
            variant="outlined"
            id="sister-store-reset-button"
            onClick={() => clearSisterStoreMappings()}
          >
            Reset
            </Button>}

          {!props.newStoreSetup?.create?.step2?.hideTimePeriod &&
          <Button
            className={globalClasses.marginLeft1rem}
            color="primary"
            variant="contained"
            id="sister-store-next-button"
            onClick={() => saveSisterStoreMappings()}
          >
            Next
            </Button>}
        </div>

        {!props.newStoreSetup?.create?.step2?.hideSisterDcStore && enableSisterStoreView && (
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
                sizeColumnsToFitFlag // fit all columns in view
                skipAutoSizeColumn // avoid auto sizing based on data length
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

        <div className={`${globalClasses.centerAlign} ${globalClasses.gap}`}>
          <Button
            color="primary"
            variant="outlined"
            id="sister-store-back-button"
            onClick={() => setShowGoBackDialog(true)}
          >
            Back
          </Button>

          {props.newStoreSetup?.newStoreUi &&
          <Button
              color="primary"
              variant="outlined"
              id="sister-store-reset-button"
              onClick={() => clearSisterStoreMappings()}
            >
              Reset
            </Button>}

          {props.newStoreSetup?.create?.step2?.hideImportDemand ?
            <Button
              variant="contained"
              onClick={stepTwoFinalize}
            >
              Approve and add new Store
            </Button> :
            <Button
            color="primary"
            variant="contained"
            id="sister-store-next-step-button"
            onClick={() => goToStepThree()}
            disabled={!enableSisterStoreView}
          >
            Import Demand Constraints
            </Button>}

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

      {bulkEditMappingTillDatePopUp && openPopUpModal()}
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
    newStoreSetup:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_new_store_setup
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
    sisterStoreTableValidation: (body) =>
      dispatch(sisterStoreTableValidation(body)),
    newStoreStepTwoFinalize:(body)=> dispatch(newStoreStepTwoFinalize(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SisterStoreMappingComponent);

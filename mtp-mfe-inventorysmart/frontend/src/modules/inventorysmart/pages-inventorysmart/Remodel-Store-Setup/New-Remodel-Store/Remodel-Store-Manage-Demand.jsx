import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { Button, useTranslation } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { useNavigate } from "react-router-dom-v5-compat";
import { cloneDeep, isEmpty } from "lodash";
import { getfilterAttributeList } from "core/commonComponents/coreComponentScreen/utils";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import {
  configureAttributeOptions,
  fetchFilterConfig,
  fetchFilterOptions,
} from "../../inventorysmart-utility";
import {
  SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG,
  REMODEL_TEMP_STORE_DATE_PICKER,
  REMODEL_STORE_DATE_PICKER,
  LEGACY_STORE_TIME_PERIOD_OPTIONS_FOR_REMODEL_STORE,
  TEMP_STORE_TABLE_ROW_ATTRIBUTES_EMPTY_VALIDATION,
  REMODEL_STORE_TABLE_ROW_ATTRIBUTES_EMPTY_VALIDATION,
  REMODEL_STORE_TIME_PERIOD_VALIDATION,
  REMODEL_STORE_DATE_PICKER_VALIDATION,
} from "../../../constants-inventorysmart/stringConstants";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { setKeyValueInCache } from "../../../services-inventorysmart/active-module-common-service";
import {
  remodelStoreSisterStoreTableValidation,
  setRemodelStoreManageDemandLoader,
  saveNewRemodelStoreDetails,
  updateRemodelStoreDetails,
} from "../../../services-inventorysmart/Remodel-Store/remodel-store-manage-demand";
import ManageDemandWrapperComponent from "./Manage-Demand";
import Loader from "core/Utils/Loader/loader";
import {
  NEW_REMODEL_STORE,
  CONFIGURATION,
} from "../../../constants-inventorysmart/routesConstants";
import { clearRemodelStoreAttributesDetails } from "../../../services-inventorysmart/Remodel-Store/remodel-store-attributes";
import { clearRemodelStoreDashboard } from "../../../services-inventorysmart/Remodel-Store/remodel-store-dashboard";
import {
  formatDate,
  callDropDownUpdateFunc,
  onChangeSisterStoreValidation,
  mapOptionsValue,
} from "./remodel-store-utils";
import { makeStyles } from "@mui/styles";
import { useStyles as useSharedStyles } from "../../../styles/inventorySmartUseStyles";
import { Divider } from "@mui/material";

const useStyles = makeStyles((theme) => ({
  divBackgroundColor: {
    backgroundColor: theme.palette.background.default,
    borderRadius: "8px",
  },
  marginBottomDiv: {
    marginBottom: "calc(80px + 3rem)",
  },
  divider: {
    margin: "1rem",
  },
  stickyFooter: {
    position: "fixed",
    bottom: "0",
    backgroundColor: "white",
    left: "60px" /* Align with the sidebar width */,
    width: "calc(100% - 60px)",
    padding: "1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxSizing: "border-box",
    borderTop: "1px solid #E0E0E0",
    zIndex: 1,
  },
}));

const RemodelStoreManageDemandComponent = (props) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const customClasses = useSharedStyles();

  const [
    tempStoreHierarchyMappingColumn,
    setTempStoreHierarchyMappingColumn,
  ] = useState([]);
  const [
    tempStoreHierarchyMappingData,
    setTempStoreHierarchyMappingData,
  ] = useState([]);
  const [
    selectedTempStoreHierarchies,
    setSelectedTempStoreHierarchies,
  ] = useState([]);
  const [tempStoreCrossFilterLoader, setTempStoreCrossFilterLoader] = useState(
    false
  );
  const [
    tempStoreHierarchyValidationLoader,
    setTempStoreHierarchyValidationLoader,
  ] = useState(false);
  const [newTempStoreRow, setNewTempStoreRow] = useState([]);
  const [sisterStoreFilterConfig, setSisterStoreFilterConfig] = useState([]);
  const [sisterStoreFilterOptions, setSisterStoreFilterOptions] = useState([]);
  const [counter, setCounter] = useState(0);
  const [showTempDeleteConfirmPopup, setShowTempDeleteConfirmPopup] = useState(
    false
  );

  const [
    remodelStoreHierarchyMappingColumn,
    setRemodelStoreHierarchyMappingColumn,
  ] = useState([]);
  const [
    remodelStoreHierarchyMappingData,
    setRemodelStoreHierarchyMappingData,
  ] = useState([]);
  const [
    selectedRemodelStoreHierarchies,
    setSelectedRemodelStoreHierarchies,
  ] = useState([]);
  const [newRemodelStoreRow, setNewRemodelStoreRow] = useState([]);
  const [remodelCounter, setRemodelCounter] = useState(0);
  const [
    showRemodelDeleteConfirmPopup,
    setShowRemodelDeleteConfirmPopup,
  ] = useState(false);
  const [
    remodelStoreTimePeriodToggle,
    setRemodelStoreTimePeriodToggle,
  ] = useState(true);
  const [remodelStoreTimePeriod, setRemodelStoreTimePeriod] = useState({});
  const [remodelStoreDatePicker, setRemodelStoreDatePicker] = useState({});
  const [remodelStoreFilterConfig, setRemodelStoreFilterConfig] = useState([]);
  const [remodelStoreFilterOptions, setRemodelStoreFilterOptions] = useState(
    []
  );

  const agGridInstance = useRef(null);
  const columnsToIgnoreRef = useRef([]);
  const nonMandatoryHierarchyColumns = useRef([]);

  const sisterStoreFilterConfigRef = useRef(null);
  const agGridRemodelTableInstance = useRef(null);
  const remodelStoreFilterConfigRef = useRef(null);

  const globalClasses = globalStyles();
  const navigate = useNavigate();

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      props.setRemodelStoreManageDemandLoader(true);
      try {
        let sisterStoreTableConfig = [];
        sisterStoreTableConfig = await getColumnsAg(
          "table_name=new_remodel_store_select_sister"
        )();
        let filterKeys = [];
        sisterStoreTableConfig.forEach((col) => {
          if (col?.extra?.ignoreFormatting) filterKeys.push(col.column_name);
          if (!col?.is_required && col?.type === "dynamic-list")
            nonMandatoryHierarchyColumns.current.push(col.column_name);
        });
        columnsToIgnoreRef.current = filterKeys;
        // Dynamically setting table row keys as the hierarchy displayed varies from client to client
        let sisterStoreMappedColumns = sisterStoreTableConfig.map((col) => {
          if (col.column_name === "multiplier") {
            return { [col.column_name]: 1 };
          } else
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
        // set states for temp store table
        setTempStoreHierarchyMappingData(initialSisterStoreMappedColumns);
        setNewTempStoreRow(newSisterStoreMappedColumns);
        setTempStoreHierarchyMappingColumn(sisterStoreTableConfig);

        // set states for remodel store table
        setRemodelStoreHierarchyMappingColumn(sisterStoreTableConfig);
        setRemodelStoreHierarchyMappingData(initialSisterStoreMappedColumns);
        setNewRemodelStoreRow(newSisterStoreMappedColumns);

        let response = await fetchFilterConfig(
          "Inventorysmart Configurations Remodel Store"
        );
        setSisterStoreFilterConfig(response);
        sisterStoreFilterConfigRef.current = response;

        // set states for remodel store table
        setRemodelStoreFilterConfig(response);
        remodelStoreFilterConfigRef.current = response;
      } catch (e) {
        props.handleErrorMessage(e);
        props.setRemodelStoreManageDemandLoader(false);
      }
    };
    getInitialFilterConfiguration();
  }, []);

  const filterConfigOptionsHelperFunction = async (
    filterConfiguration,
    isTemp,
    tableInstance
  ) => {
    if (!isEmpty(filterConfiguration)) {
      props.setRemodelStoreManageDemandLoader(true);
      let requiredFilterObjParams = {
        allFilters: cloneDeep(filterConfiguration),
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
        enableCrossFiltersConditionally: true,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      // save this response in a state and use it to add a new row when the table is empty after deleting all records
      isTemp
        ? setSisterStoreFilterOptions(response)
        : setRemodelStoreFilterOptions(response);

      let columnDropDownValues = {};
      response &&
        response.forEach((obj) => {
          callDropDownUpdateFunc(columnDropDownValues, obj);
        });

      let cloneSisterStoreMappedData = isTemp
        ? cloneDeep(tempStoreHierarchyMappingData)
        : cloneDeep(remodelStoreHierarchyMappingData);
      cloneSisterStoreMappedData = cloneSisterStoreMappedData.map((item) => {
        return {
          ...item,
          ...columnDropDownValues,
        };
      });
      isTemp
        ? setTempStoreHierarchyMappingData(cloneSisterStoreMappedData)
        : setRemodelStoreHierarchyMappingData(cloneSisterStoreMappedData);

      let cloneNewSisterStoreRow = isTemp
        ? cloneDeep(newTempStoreRow)
        : cloneDeep(newRemodelStoreRow);
      cloneNewSisterStoreRow = cloneNewSisterStoreRow.map((item) => {
        return {
          ...item,
          ...columnDropDownValues,
        };
      });
      isTemp
        ? setNewTempStoreRow(cloneNewSisterStoreRow)
        : setNewRemodelStoreRow(cloneNewSisterStoreRow);

      props.setRemodelStoreManageDemandLoader(false);

      tableInstance.current?.api?.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  };

  useEffect(() => {
    filterConfigOptionsHelperFunction(
      sisterStoreFilterConfig,
      true,
      agGridInstance
    );
  }, [sisterStoreFilterConfig]);

  useEffect(() => {
    filterConfigOptionsHelperFunction(
      sisterStoreFilterConfig,
      false,
      agGridRemodelTableInstance
    );
  }, [remodelStoreFilterConfig]);

  useEffect(() => {
    REMODEL_TEMP_STORE_DATE_PICKER[0].minDate =
      props.saveRemodelStoreDetailsForBackFlow?.remodel_store_details?.remodel_open_date;
    REMODEL_STORE_DATE_PICKER[0].minDate =
      props.saveRemodelStoreDetailsForBackFlow?.remodel_store_details?.remodel_open_date;
  }, [props.saveRemodelStoreDetailsForBackFlow]);

  useEffect(() => {
    if (
      sisterStoreFilterConfig.length &&
      remodelStoreFilterConfig.length &&
      sisterStoreFilterOptions.length &&
      remodelStoreFilterOptions.length &&
      !isEmpty(props.remodelStoreDetailsForEditFlow)
    ) {
      prepopulateValues(props.remodelStoreDetailsForEditFlow);
    }
  }, [
    sisterStoreFilterConfig,
    remodelStoreFilterConfig,
    sisterStoreFilterOptions,
    remodelStoreFilterOptions,
    props.remodelStoreDetailsForEditFlow, // prepopulate values in edit flow
  ]);

  /**
   * Updates the attributes of table rows and sets the updated data and counter.
   *
   * @param {Array} tableRowAttrs - Array of table row attributes to be updated.
   * @param {Function} setData - Function to set the updated data.
   * @param {Function} setCounter - Function to set the counter.
   * @param {Array} existingData - Array of existing data to be merged with updated row data.
   */
  const updateTableRowAttributes = (
    tableRowAttrs,
    setData,
    setCounter,
    existingData
  ) => {
    let updatedData = [];
    tableRowAttrs?.forEach((obj, i) => {
      let updatedRowData = {};
      obj?.forEach((item) => {
        if (columnsToIgnoreRef.current.includes(item.attribute_name)) {
          // prepopulate fields apart from drop down options
          updatedRowData[item.attribute_name] = item.values[0];
        } else
          updatedRowData[item.attribute_name] = mapOptionsValue(item.values);
      });
      updatedRowData = {
        ...existingData[0],
        ...updatedRowData,
        key: i,
      };
      updatedData.push(updatedRowData);
    });
    setData(updatedData);
    setCounter(tableRowAttrs.length - 1);
    return updatedData;
  };

  const prepopulateValues = (data) => {
    // Pre populate all the state values present
    setRemodelStoreTimePeriodToggle(false);
    setRemodelStoreDatePicker({
      remodelStoreDatePicker: data.remodel_store_mapping_time_period,
    });

    let tempStoreDataValues = updateTableRowAttributes(
      data.table_row_attributes_temp,
      setTempStoreHierarchyMappingData,
      setCounter,
      tempStoreHierarchyMappingData
    );

    let remodelStoreDataValues = updateTableRowAttributes(
      data.table_row_attributes_remodel,
      setRemodelStoreHierarchyMappingData,
      setRemodelCounter,
      remodelStoreHierarchyMappingData
    );
    // explicitly call cross filter API to fetch and update drop down options for temp and remodel table respectively
    fetchCrossFilterOptions(tempStoreDataValues, agGridInstance, true, "edit");
    fetchCrossFilterOptions(
      remodelStoreDataValues,
      agGridRemodelTableInstance,
      false,
      "edit"
    );
  };

  const fetchCrossFilterOptions = (rows, tableInstance, isTemp, flowType) => {
    rows.forEach(async (data) => {
      let colKeysToIgnore = ["key", ...columnsToIgnoreRef.current];
      let filterKeys = Object.keys(data).filter(
        (val) => !colKeysToIgnore.includes(val) && !val.includes("options")
      );
      callCrossFilterAPIOptions(
        data,
        tableInstance.current?.api?.gridOptionsWrapper,
        filterKeys,
        tableInstance,
        isTemp,
        flowType
      );
    });
  };

  const goBackToPreviousStep = () => {
    props.goBackToStoreDetails();
  };

  const onSelectionChanged = (event, isTemp) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    isTemp
      ? setSelectedTempStoreHierarchies(selections)
      : setSelectedRemodelStoreHierarchies(selections);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const loadRemodelTableInstance = (params) => {
    agGridRemodelTableInstance.current = params;
  };

  const onCellValueChanged = (params, isTemp, tableInstance) => {
    const { column, node, data, newValue, api } = params;
    if (column.colId === "multiplier") {
      if (newValue >= 0 && newValue <= 100) {
        data[column.colId] = newValue;
      } else {
        props.displaySnackMessages(
          "The value of the multiplier should be between 0 and 100",
          "warning"
        );
        data[column.colId] = 1;
      }
      tableInstance.current?.api?.refreshCells({
        columns: [column.colId],
      });
    }
    let cloneRefInstance = isTemp
      ? cloneDeep(tempStoreHierarchyMappingData)
      : cloneDeep(remodelStoreHierarchyMappingData);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.key === data.key
    );
    if (existingIndex !== -1) {
      // Replace the existing object with the new object
      cloneRefInstance[existingIndex] = data;
      isTemp
        ? setTempStoreHierarchyMappingData(cloneRefInstance)
        : setRemodelStoreHierarchyMappingData(cloneRefInstance);
    }
  };

  /**
   *
   * @param {Object} rows  - Table row data
   * @param {Boolean} ignoreSisterStore - Boolean value to filter out keys of row data
   * @returns a nested array where each table column (product and store dimension) is formatted to filter payload structure
   */
  const mapTableRowAttributesAsFilters = (rows, ignoreSisterStore) => {
    // The `store_code` (props.storeCodeKeyName) is not shown in the UI within the table but its value is set for each row and saved when inserting remodel store details
    rows.forEach((item) => {
      if (!item.hasOwnProperty(props.storeCodeKeyName)) {
        item[props.storeCodeKeyName] = mapOptionsValue([
          props.saveRemodelStoreDetailsForBackFlow.legacy_store_details
            ?.store_code,
        ]);
      }
    });
    let payloadFormatArr = [];
    rows.forEach((row) => {
      let tableRowKeys = Object.keys(row).filter(
        (val) => val !== "key" && !val.includes("options")
      );
      if (ignoreSisterStore) {
        tableRowKeys = tableRowKeys.filter(
          (key) => key !== props.storeCodeKeyName
        );
      }
      let newArr = [];
      tableRowKeys.forEach((item) => {
        // to check if we are passing the multiplier
        if (columnsToIgnoreRef.current.includes(item)) {
          newArr.push({
            attribute_name: item,
            operator: "in",
            values: [row[item]],
            filter_type: "non-cascaded",
            dimension: "custom",
          });
        } else if (item === props.storeCodeKeyName) {
          newArr.push({
            attribute_name: item,
            operator: "in",
            values: row[item] ? row[item]?.map((item) => item.value) : [],
            filter_type: "cascaded",
            dimension: "store",
          });
        } else {
          newArr.push({
            attribute_name: item,
            operator: "in",
            values: row[item] ? row[item]?.map((item) => item.value) : [],
            filter_type: "cascaded",
            dimension: "product",
          });
        }
      });
      payloadFormatArr.push(newArr);
    });
    return payloadFormatArr;
  };

  const setFiltersPayloadBasedOnHierarchy = (data, grid) => {
    let prodDimensionHierarchies = grid.gridOptions?.columnDefs.filter(
      (item) =>
        item?.column_name !== "multiplier" && item?.field !== "Selection"
    );
    prodDimensionHierarchies = prodDimensionHierarchies
      .map((obj) => {
        return {
          filter_id: obj.column_name,
          attribute_name: obj.column_name,
          operator: "in",
          dimension: obj?.dimension,
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
        values: [
          props.saveRemodelStoreDetailsForBackFlow.temp_store_details?.channel,
        ],
        filter_type: "cascaded",
      },
    ];
  };

  const callCrossFilterAPIOptions = async (
    data,
    gridOptionsWrapper,
    filterKeys,
    tableInstance,
    isTemp,
    flowType
  ) => {
    try {
      setTempStoreCrossFilterLoader(true);
      const attributesList = isTemp
        ? getfilterAttributeList(sisterStoreFilterConfigRef.current)
        : getfilterAttributeList(remodelStoreFilterConfigRef.current);
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
        let colName = flowType === "edit" ? obj : obj.column_name;
        let dropDownList = `${colName}_options`;
        let mappingList = response.data.data[colName];
        data[dropDownList] = await configureAttributeOptions(mappingList);
        // Take an intersection of the values selected by the user and the response from the API for that particular cross filer and populate the place holders
        if (data[colName].length) {
          let commonSelectedVal = data[colName].filter((obj1) =>
            data[dropDownList]?.some((obj2) => obj2["value"] === obj1["value"])
          );
          data[colName] = commonSelectedVal;
        }
        tableInstance.current?.api?.refreshCells({
          force: true,
          suppressFlash: false,
          columns: [colName],
        });
      });
      setTempStoreCrossFilterLoader(false);
    } catch (e) {
      props.handleErrorMessage(e);
      setTempStoreCrossFilterLoader(false);
    }
  };

  const performOnBlurActions = async (
    data,
    column,
    isChanged,
    value,
    gridOptionsWrapper,
    tableInstance,
    isTemp
  ) => {
    let arr = [];
    tableInstance.current?.api?.forEachNode((item) => arr.push(item.data));

    // To disable fetch store groups button unless and until all values in a row are filled
    let colKeysToIgnore = [
      "key",
      ...columnsToIgnoreRef.current,
      ...nonMandatoryHierarchyColumns.current,
    ];
    let fieldKeys = Object.keys(data).filter(
      (val) => !colKeysToIgnore.includes(val) && !val.includes("options")
    );

    let filterKeys = gridOptionsWrapper.gridOptions?.columnDefs.filter(
      (key) => key?.field !== "Selection" && key?.column_name !== "multiplier"
    );
    if (isChanged && column.colId !== "multiplier") {
      // Adding await so the table row data(arr) gets updated for checking product hierarchy value duplication on changing cross filters
      await callCrossFilterAPIOptions(
        data,
        gridOptionsWrapper,
        filterKeys,
        tableInstance,
        isTemp
      );
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
      column.colId !== "multiplier"
    ) {
      try {
        setTempStoreHierarchyValidationLoader(true);
        let body = {
          attribute_name: props.sisterStoreHierarchyKey,
          table_row_attributes: mapTableRowAttributesAsFilters(arr, true),
          application_code: 1,
          changed_rows: [data.key],
        };
        let apiResponse = await props.remodelStoreSisterStoreTableValidation(
          body
        );
        if (
          apiResponse.data?.message &&
          apiResponse.data.message.toLowerCase() === "true"
        ) {
          data[column.colId] = "";
          tableInstance.current?.api?.refreshCells({
            columns: [column.colId],
          });
          props.displaySnackMessages(
            SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG,
            "warning"
          );
          callCrossFilterAPIOptions(
            data,
            gridOptionsWrapper,
            filterKeys,
            tableInstance,
            isTemp
          );
        }
        setTempStoreHierarchyValidationLoader(false);
      } catch (e) {
        setTempStoreHierarchyValidationLoader(false);
        props.handleErrorMessage(e);
      }
    }
  };

  const onBlur = (_e, data, column, isChanged, value, _initialValue) => {
    const { gridOptionsWrapper } = column;
    performOnBlurActions(
      data,
      column,
      isChanged,
      value,
      gridOptionsWrapper,
      agGridInstance,
      true
    );
  };

  const onBlurRemodelStore = (
    _e,
    data,
    column,
    isChanged,
    value,
    _initialValue
  ) => {
    const { gridOptionsWrapper } = column;
    performOnBlurActions(
      data,
      column,
      isChanged,
      value,
      gridOptionsWrapper,
      agGridRemodelTableInstance,
      false
    );
  };

  const addNewRow = (isTemp) => {
    let latestRecordEntry = isTemp
      ? tempStoreHierarchyMappingData[tempStoreHierarchyMappingData.length - 1]
      : remodelStoreHierarchyMappingData[
          remodelStoreHierarchyMappingData.length - 1
        ];
    let filterDataCond = ["key", "multiplier"];
    if (nonMandatoryHierarchyColumns.current.length > 0) {
      filterDataCond = [
        ...filterDataCond,
        ...nonMandatoryHierarchyColumns.current,
      ];
    }
    let fieldKeys = Object.keys(latestRecordEntry).filter(
      (val) => !filterDataCond.includes(val) && !val.includes("options")
    );
    if (fieldKeys.some((key) => isEmpty(latestRecordEntry[key]))) {
      props.displaySnackMessages(
        t("inventorysmart.selectRequiredHierarchy"),
        "warning"
      );
    } else if (latestRecordEntry["multiplier"] === "") {
      props.displaySnackMessages(
        t("inventorysmart.enterValueForMultiplier"),
        "warning"
      );
    } else {
      let newCounter = isTemp ? counter + 1 : remodelCounter + 1;
      isTemp ? setCounter(newCounter) : setRemodelCounter(newCounter);

      let cloneNewRow = isTemp
        ? cloneDeep(newTempStoreRow)
        : cloneDeep(newRemodelStoreRow);
      cloneNewRow[0].key = newCounter;

      let copyOfExistingMappedData = isTemp
        ? [...tempStoreHierarchyMappingData]
        : [...remodelStoreHierarchyMappingData];
      let newData = [...copyOfExistingMappedData, ...cloneNewRow];
      isTemp
        ? setTempStoreHierarchyMappingData(newData)
        : setRemodelStoreHierarchyMappingData(newData);
    }
  };

  /**
   * Determines the filter dropdown options based on the `isTemp` flag. To set the default initial row values.
   *
   * If `isTemp` is true, `filterDropDownOptions` will be set to `sisterStoreFilterOptions`.
   * Otherwise, it will be set to `remodelStoreFilterOptions`.
   *
   * Initially, `columnDropDownValues` are set with fixed values: { key: 0, multiplier: 1 }. 1st row of the table will have these values.
   * These fixed values are unlike other column values that are rendered from `sisterStoreFilterOptions`.
   *
   * @param {boolean} isTemp - Flag to determine which filter options to use.
   * @returns {Array} The appropriate filter dropdown options based on the `isTemp` flag.
   */
  const setInitialEmptyTableRow = (isTemp) => {
    let columnDropDownValues = { key: 0, multiplier: 1 };
    let filterDropDownOptions = isTemp
      ? sisterStoreFilterOptions
      : remodelStoreFilterOptions;
    filterDropDownOptions &&
      filterDropDownOptions.forEach((obj) => {
        let colField = obj.column_name;
        callDropDownUpdateFunc(columnDropDownValues, obj);
        columnDropDownValues[colField] = "";
      });
    return [columnDropDownValues];
  };

  const confirmDeleteRows = (isTemp) => {
    let rowDataAfterDeleting = isTemp
      ? tempStoreHierarchyMappingData.filter(
          (item) =>
            !selectedTempStoreHierarchies.some((obj) => obj.key === item.key)
        )
      : remodelStoreHierarchyMappingData.filter(
          (item) =>
            !selectedRemodelStoreHierarchies.some((obj) => obj.key === item.key)
        );

    if (rowDataAfterDeleting.length === 0) {
      let initialRow = setInitialEmptyTableRow(isTemp);
      if (isTemp) {
        setTempStoreHierarchyMappingData(initialRow);
        setCounter(0);
      } else {
        setRemodelStoreHierarchyMappingData(initialRow);
        setRemodelCounter(0);
      }
    } else {
      let updateSisterStoreKeyOnDelete = rowDataAfterDeleting.map((item, i) => {
        return {
          ...item,
          key: i,
        };
      });
      if (isTemp) {
        setCounter(updateSisterStoreKeyOnDelete.length - 1);
        setTempStoreHierarchyMappingData(updateSisterStoreKeyOnDelete);
      } else {
        setRemodelCounter(updateSisterStoreKeyOnDelete.length - 1);
        setRemodelStoreHierarchyMappingData(updateSisterStoreKeyOnDelete);
      }
    }
    if (isTemp) {
      agGridInstance.current.api.forEachNode((node) => node.setSelected(false));
      setShowTempDeleteConfirmPopup(false);
    } else {
      agGridRemodelTableInstance.current.api.forEachNode((node) =>
        node.setSelected(false)
      );
      setShowRemodelDeleteConfirmPopup(false);
    }
  };

  const clearSisterStoreMappings = (isTemp) => {
    let initialRow = setInitialEmptyTableRow(isTemp);
    if (isTemp) {
      setTempStoreHierarchyMappingData(initialRow);
      setCounter(0);
    } else {
      setRemodelStoreHierarchyMappingData(initialRow);
      setRemodelStoreTimePeriod([]);
      setRemodelStoreDatePicker([]);
      setRemodelStoreTimePeriodToggle(true);
      setRemodelCounter(0);
    }
  };

  const handleChangeRemodelStoreTimePeriod = (updatedFormData) => {
    setRemodelStoreTimePeriod(updatedFormData);
  };

  const handleChangeRemodelStoreDatePicker = (updatedFormData) => {
    setRemodelStoreDatePicker(updatedFormData);
  };

  /**
   * Filters out keys from item that are present in nonMandatoryHierarchyColumns.current.
   *
   * @param {Object} item - The original object with all column names.
   * @param {Array} nonMandatoryHierarchyColumns - An array of strings representing keys to be excluded from item.
   * @return {Object} The filtered object with only the keys not present in nonMandatoryHierarchyColumns.current.
   */
  const checkForMandatoryKeysWithValues = (item) => {
    const filteredObj = Object.keys(item).reduce((acc, key) => {
      if (!nonMandatoryHierarchyColumns.current.includes(key)) {
        acc[key] = item[key];
      }
      return acc;
    }, {});
    return filteredObj;
  };

  const emptyRowTableAttributes = (sisterStoreMappedData) => {
    let emptyRows = [];
    if (nonMandatoryHierarchyColumns.current?.length > 0) {
      sisterStoreMappedData.forEach((item, i) => {
        let eachRow = checkForMandatoryKeysWithValues(item);
        if (Object.values(eachRow).some((val) => val?.length === 0))
          emptyRows.push(true);
      });
    } else {
      sisterStoreMappedData.forEach((item) => {
        if (Object.values(item).some((val) => val?.length === 0))
          emptyRows.push(true);
      });
    }
    return emptyRows;
  };

  const fetchFutureDates = (selectedValue) => {
    const remodelOpenDate =
      props.saveRemodelStoreDetailsForBackFlow?.remodel_store_details
        ?.remodel_open_date;
    if (!remodelOpenDate) return null;
    const date = new Date(remodelOpenDate);
    if (selectedValue === "30 days") {
      date.setMonth(date.getMonth() + 1);
    } else if (selectedValue === "60 days") {
      date.setMonth(date.getMonth() + 2);
    } else {
      date.setMonth(date.getMonth() + 3);
    }
    return date.toISOString().split("T")[0];
  };

  const removeCommonKeys = (obj) => {
    // common keys to be removed from the object
    const keysToRemove = [
      "channel",
      "s3_name",
      "location_hierarchy_region_code",
      "s2_name",
    ];
    return Object.keys(obj).reduce((acc, key) => {
      if (!keysToRemove.includes(key)) {
        acc[key] = obj[key];
      }
      return acc;
    }, {});
  };

  const saveNewRemodelStore = async () => {
    try {
      let emptyRowTempTableValues = [],
        emptyRowRemodelTableValues = [];
      emptyRowTempTableValues = emptyRowTableAttributes(
        tempStoreHierarchyMappingData
      );
      emptyRowRemodelTableValues = emptyRowTableAttributes(
        remodelStoreHierarchyMappingData
      );
      if (emptyRowTempTableValues.length) {
        props.displaySnackMessages(
          TEMP_STORE_TABLE_ROW_ATTRIBUTES_EMPTY_VALIDATION,
          "warning"
        );
      } else if (emptyRowRemodelTableValues.length) {
        props.displaySnackMessages(
          REMODEL_STORE_TABLE_ROW_ATTRIBUTES_EMPTY_VALIDATION,
          "warning"
        );
      } 
      else if (
        remodelStoreTimePeriodToggle &&
        isEmpty(remodelStoreTimePeriod?.remodelStoreTimePeriod)
      ) {
        props.displaySnackMessages(
          REMODEL_STORE_TIME_PERIOD_VALIDATION,
          "warning"
        );
      } else if (
        !remodelStoreTimePeriodToggle &&
        isEmpty(remodelStoreDatePicker?.remodelStoreDatePicker)
      ) {
        props.displaySnackMessages(
          REMODEL_STORE_DATE_PICKER_VALIDATION,
          "warning"
        );
      } else {
        props.setRemodelStoreManageDemandLoader(true);
        let remodelStoreTimePeriodValue = !remodelStoreTimePeriodToggle
          ? formatDate(remodelStoreDatePicker?.remodelStoreDatePicker)
          : fetchFutureDates(remodelStoreTimePeriod?.remodelStoreTimePeriod);
        const legacyStoreDetails = removeCommonKeys(
          props.saveRemodelStoreDetailsForBackFlow?.legacy_store_details
        );
        const tempStoreDetails = removeCommonKeys(
          props.saveRemodelStoreDetailsForBackFlow?.temp_store_details
        );
        const remodelStoreDetails = removeCommonKeys(
          props.saveRemodelStoreDetailsForBackFlow?.remodel_store_details
        );
        let reqBody = {
          table_row_attributes_temp: mapTableRowAttributesAsFilters(
            tempStoreHierarchyMappingData,
            false
          ),
          table_row_attributes_remodel: mapTableRowAttributesAsFilters(
            remodelStoreHierarchyMappingData,
            false
          ),
          remodel_store_mapping_time_period: remodelStoreTimePeriodValue,
          other_attributes: {
            legacy_store_form_config: legacyStoreDetails,
            temp_store_form_config: tempStoreDetails,
            remodel_store_form_config: remodelStoreDetails,
            other_form_config: {
              channel:
                props.saveRemodelStoreDetailsForBackFlow?.legacy_store_details
                  ?.channel,
              s3_name:
                props.saveRemodelStoreDetailsForBackFlow?.legacy_store_details
                  ?.s3_name,
              location_hierarchy_region_code:
                props.saveRemodelStoreDetailsForBackFlow?.legacy_store_details
                  ?.location_hierarchy_region_code,
              s2_name:
                props.saveRemodelStoreDetailsForBackFlow?.legacy_store_details
                  ?.s2_name,
            },
          },
          store_code:
            props.saveRemodelStoreDetailsForBackFlow.remodel_store_details
              ?.remodel_store_code,
        };
        let response = isEmpty(props.remodelStoreDetailsForEditFlow)
          ? await props.saveNewRemodelStoreDetails(reqBody)
          : await props.updateRemodelStoreDetails(reqBody);
        if (response.data?.status || response.data?.show_message) {
          // navigate to configuration screen
          props.displaySnackMessages(response.data?.message, "info", () => {
            navigate(CONFIGURATION, {
              state: NEW_REMODEL_STORE,
            });
          });
          props.clearRemodelStoreDashboard();
          props.clearRemodelStoreAttributesDetails();
        }
        props.setRemodelStoreManageDemandLoader(false);
      }
    } catch (e) {
      props.handleErrorMessage(e);
      props.setRemodelStoreManageDemandLoader(false);
    }
  };

  const setRemodelStoreToggleSwitch = (event) => {
    const isToggled = event.target.value === "static";
    setRemodelStoreTimePeriodToggle(!isToggled);
    setRemodelStoreTimePeriod({ remodelStoreTimePeriod: "" });
    setRemodelStoreDatePicker({ remodelStoreDatePicker: "" });
  };

  return (
    <>
      <Loader
        loader={
          props.remodelStoreManageDemandLoader ||
          tempStoreCrossFilterLoader ||
          tempStoreHierarchyValidationLoader
        }
      >
        <div
          className={`${classes.divBackgroundColor} ${globalClasses.tableWrapper}`}
        >
          <ManageDemandWrapperComponent
            title={t("inventorysmart.tempStoreDemandMultiplier")}
            addNewRow={() => addNewRow(true)}
            selectedItems={selectedTempStoreHierarchies}
            showDeleteConfirmPopup={() => setShowTempDeleteConfirmPopup(true)}
            columns={tempStoreHierarchyMappingColumn}
            rows={tempStoreHierarchyMappingData}
            onSelectionChanged={(e) => onSelectionChanged(e, true)}
            loadTableInstance={loadTableInstance}
            onChangeSisterStoreValidation={onChangeSisterStoreValidation}
            onBlur={onBlur}
            onCellValueChanged={(p) =>
              onCellValueChanged(p, true, agGridInstance)
            }
            clearMappings={() => clearSisterStoreMappings(true)}
            showConfirmPopup={showTempDeleteConfirmPopup}
            onDelete={() => confirmDeleteRows(true)}
            onClose={() => setShowTempDeleteConfirmPopup(false)}
          />
          <Divider className={classes.divider} />
          <div className={classes.marginBottomDiv}>
            <ManageDemandWrapperComponent
              title={t("inventorysmart.remodelStoreDemandMultiplier")}
              addNewRow={() => addNewRow(false)}
              selectedItems={selectedRemodelStoreHierarchies}
              showDeleteConfirmPopup={() =>
                setShowRemodelDeleteConfirmPopup(true)
              }
              columns={remodelStoreHierarchyMappingColumn}
              rows={remodelStoreHierarchyMappingData}
              onSelectionChanged={(e) => onSelectionChanged(e, false)}
              loadTableInstance={loadRemodelTableInstance}
              onChangeSisterStoreValidation={onChangeSisterStoreValidation}
              onBlur={onBlurRemodelStore}
              onCellValueChanged={(p) =>
                onCellValueChanged(p, false, agGridRemodelTableInstance)
              }
              clearMappings={() => clearSisterStoreMappings(false)}
              toggleValue={remodelStoreTimePeriodToggle}
              handleChangeTimePeriod={handleChangeRemodelStoreTimePeriod}
              timePeriodFields={
                LEGACY_STORE_TIME_PERIOD_OPTIONS_FOR_REMODEL_STORE
              }
              timePeriodValues={remodelStoreTimePeriod}
              handleChangeDatePicker={handleChangeRemodelStoreDatePicker}
              datePickerFields={REMODEL_STORE_DATE_PICKER}
              datePickerValues={remodelStoreDatePicker}
              setToggleState={(event) => setRemodelStoreToggleSwitch(event)}
              showConfirmPopup={showRemodelDeleteConfirmPopup}
              onDelete={() => confirmDeleteRows(false)}
              onClose={() => setShowRemodelDeleteConfirmPopup(false)}
              showTimePeriodField={true}
            />
          </div>
        </div>
      </Loader>
      <div className={`${classes.stickyFooter}`}>
        <Button
          variant="tertiary"
          id="store-details-back-button"
          onClick={goBackToPreviousStep}
          size="large"
        >
          {"< Back to Store Attributes"}
        </Button>
        <Button
          variant="primary"
          id="sister-store-next-step-button"
          onClick={saveNewRemodelStore}
          size="large"
        >
          Finalize
        </Button>
      </div>
    </>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer, tenantUserRoleMgmtReducer } = store;
  return {
    cache: inventorysmartReducer?.activeModulesCacheService?.cache,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    tenantFilterUamConfig:
      tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    saveRemodelStoreDetailsForBackFlow:
      inventorysmartReducer.remodelStoreAttributesService
        .saveRemodelStoreDetailsForBackFlow,
    remodelStoreManageDemandLoader:
      inventorysmartReducer.remodelStoreManageDemandService
        .remodelStoreManageDemandLoader,
    remodelStoreDetailsForEditFlow:
      inventorysmartReducer.inventorySmartRemodelStoreDashboardService
        .remodelStoreDetailsForEditFlow,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    setKeyValueInCache: (keyValuePair) =>
      dispatch(setKeyValueInCache(keyValuePair)),
    remodelStoreSisterStoreTableValidation: (postbody) =>
      dispatch(remodelStoreSisterStoreTableValidation(postbody)),
    setRemodelStoreManageDemandLoader: (value) =>
      dispatch(setRemodelStoreManageDemandLoader(value)),
    clearRemodelStoreAttributesDetails: () =>
      dispatch(clearRemodelStoreAttributesDetails()),
    saveNewRemodelStoreDetails: (postbody) =>
      dispatch(saveNewRemodelStoreDetails(postbody)),
    updateRemodelStoreDetails: (postbody) =>
      dispatch(updateRemodelStoreDetails(postbody)),
    clearRemodelStoreDashboard: () => dispatch(clearRemodelStoreDashboard()),
  };
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RemodelStoreManageDemandComponent);

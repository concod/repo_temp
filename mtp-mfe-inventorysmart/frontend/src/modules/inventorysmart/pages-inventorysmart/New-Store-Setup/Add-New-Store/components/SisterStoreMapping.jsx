import React from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import AddIcon from "@mui/icons-material/Add";
import { Typography } from "@mui/material";
import { Button, Prompt, RadioButtonGroup, Badge } from "impact-ui-v3";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import colours from "core/Styles/colours";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import Form from "core/Utils/form";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  getfilterAttributeList,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";

import {
  GO_BACK_MESSAGE,
  MAPPED_STORE_PERIOD_DATE_PICKER,
  MAPPED_STORE_PERIOD_DROP_DOWN_OPTIONS,
  STORE_GROUP_MAPPING,
  NO_STORE_GROUP_VALIDATION_MSG,
  SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG,
} from "../../../../constants-inventorysmart/stringConstants";

import {
  ADD_NEW_STORE,
  CONFIGURATION,
} from "../../../../constants-inventorysmart/routesConstants";
import {
  saveStepOneFinalValues,
  setNewStoreDetailsForBackFlow,
  clearNewStoreDetails,
} from "../../../../services-inventorysmart/New-Store/new-store-details";
import { clearEditNewStoreData } from "../../../../services-inventorysmart/New-Store/new-store-dashboard";
import {
  clearSisterStoreDetailsScreenLoader,
  saveNewStoreDetails,
  getStoreGroup,
  setSisterStoreDetailsScreenLoader,
  sisterStoreTableValidation,
  updateNewStoreDetails,
} from "../../../../services-inventorysmart/New-Store/sister-store-mapping";

import {
  configureAttributeOptions,
  fetchFilterConfig,
  fetchFilterOptions,
} from "../../../inventorysmart-utility";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { Divider } from "@mui/material";
import AIIcon from "assets/AI.png";

const useStyles = makeStyles(() => ({
  alignFlex: {
    display: "flex",
    alignItems: "center",
  },
  timePeriodFormStyle: {
    marginTop: "1rem",
    display: "flex",
    alignItems: "center",
  },
  wrapper: {
    background: "white",
    borderRadius: "8px",
    paddingBottom: "calc(64px + 2rem)",
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
  },
  lightGrey: {
    color: colours.lightGrey,
  },
}));

const SisterStoreMappingComponent = (props) => {
  const [
    sisterStoreMappedColumnConfig,
    setSisterStoreMappedColumnConfig,
  ] = useState([]);
  const [sisterStoreMappedData, setSisterStoreMappedData] = useState([]);
  const [isDataChangedRecently, setIsDataChangedRecently] = useState(false);
  const [newSisterStoreRow, setNewSisterStore] = useState([]);
  const [counter, setCounter] = useState(0);
  const [selectedSisterStoreRows, setSelectedSisterStoreRows] = useState([]);
  const [showDeleteConfirmPopup, setShowDeleteConfirmPopup] = useState(false);
  const [timePeriodToggle, setTimePeriodToggle] = useState("dynamic");
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
  const [hierarchyValidationLoader, setHierarchyValidationLoader] = useState(
    false
  );
  const [
    sisterStoreTableEmptyRowIndex,
    setSisterStoreTableEmptyRowIndex,
  ] = useState([]);
  const [crossFilterLoader, setCrossFilterLoader] = useState(false);
  const [timePeriodDropDownOptions, setTimePeriodDropDownOptions] = useState(
    []
  );
  const [resetClicked, setResetClicked] = useState(false);
  const [iaRecommendedStoreData, setIARecommendedStoreData] = useState([]);

  const agGridInstance = useRef(null);
  const sisterStoreFilterConfigRef = useRef(null);
  const columnsToIgnoreRef = useRef([]);
  const nonMandatoryHierarchyColumns = useRef([]);
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const classes = useStyles();

  // Custom useEffect to call getCombinedCrossDimensionFiltersData with a static payload and log response.data
  useEffect(() => {
    const fetchCrossDimensionData = async () => {
      const payload = {
        attributes: [
          {
            attribute_name: "like_store_id",
            dimension: "store",
            filter_type: "cascaded",
          },
        ],
        filter_type: "cascaded",
        filters: [
          {
            filter_id: "channel",
            attribute_name: "channel",
            operator: "in",
            dimension: "store",
            values: [
              replaceSpecialCharToCharCode(
                props.finalStoreDetailsStateValues.form_attributes?.channel
              ),
            ],
            filter_type: "cascaded",
          },
          {
            attribute_name: "store_code",
            operator: "in",
            values: [
              props.finalStoreDetailsStateValues.form_attributes?.store_code,
            ],
            filter_type: "cascaded",
            dimension: "store",
            filter_id: "store_code",
          },
        ],
        application_code: 1,
        is_urm_filter: true,
        screen_name: "Inventorysmart Configurations New Store",
      };
      try {
        const response = await getCombinedCrossDimensionFiltersData(payload)();
        const likeStoreIds = response.data.data?.["like_store_id"] || [];
        setIARecommendedStoreData(likeStoreIds);
      } catch (error) {
        props.handleErrorMessage(error);
      }
    };
    if (props.appendStatusToPayload) fetchCrossDimensionData();
  }, [props.appendStatusToPayload]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      props.setSisterStoreDetailsScreenLoader(true);
      try {
        let sisterStoreTableConfig = [];
        sisterStoreTableConfig = await getColumnsAg(
          "table_name=new_store_select_sister"
        )();
        sisterStoreTableConfig = sisterStoreTableConfig.map((item) => {
          if (item.column_name === props.storeCodeKeyName) {
            item.disabled = setCellsToBeDisabled;
          }
          if (item.type === "datetime") {
            item.maxDate =
              props.finalStoreDetailsStateValues.other_attributes.store_opening_date;
            item.disabled = disableReservationDateCells;
          }
          item.flex = 1;
          item.suppressSizeToFit = false;
          item.extra = {
            ...item.extra,
            ignoreSuppressSizeToFit: true
          };
          return item;
        });
        let filterKeys = [];
        sisterStoreTableConfig.forEach((col) => {
          if (col?.extra?.ignoreFormatting) filterKeys.push(col.column_name);
          if (
            !col?.is_required &&
            col?.type === "dynamic-list" &&
            col?.column_name !== props.storeCodeKeyName &&
            col?.column_name !== "like_store_id"
          )
            nonMandatoryHierarchyColumns.current.push(col.column_name);
        });
        columnsToIgnoreRef.current = filterKeys;
        // Dynamically setting table row keys as the hierarchy displayed varies from client to client
        let sisterStoreMappedColumns = sisterStoreTableConfig.map((col) => {
          if (col.type === "datetime") {
            return {
              [col.column_name]:
                props.finalStoreDetailsStateValues.other_attributes
                  .reservation_start_date,
            };
          } else if (col.column_name === "multiplier") {
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
        setSisterStoreMappedData(initialSisterStoreMappedColumns);
        setNewSisterStore(newSisterStoreMappedColumns);
        setSisterStoreMappedColumnConfig(sisterStoreTableConfig);
        let response = await fetchFilterConfig("New Store Sister Store");
        setSisterStoreFilterConfig(response);
        sisterStoreFilterConfigRef.current = response;
        STORE_GROUP_MAPPING[0].options = [];
        setStoreGroupConfiguration(STORE_GROUP_MAPPING);
      } catch (e) {
        props.handleErrorMessage(e);
        props.setSisterStoreDetailsScreenLoader(false);
      }
    };
    props.storeCodeKeyName && getInitialFilterConfiguration();
  }, [props.storeCodeKeyName]);

  useEffect(() => {
    let dynamicDropDownConfig = [...MAPPED_STORE_PERIOD_DROP_DOWN_OPTIONS];
    if (props.sisterStoreDynamicTimePeriod?.length) {
      dynamicDropDownConfig[0].options = props.sisterStoreDynamicTimePeriod.map(
        (item) => {
          return mapDataToLabel(item);
        }
      );
    }
    setTimePeriodDropDownOptions(dynamicDropDownConfig);
  }, [props.sisterStoreDynamicTimePeriod]);

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
      ...nonMandatoryHierarchyColumns.current,
    ];
    let toDisable = false;
    let keysToCheckValidationOn = Object.keys(row).filter(
      (val) => !val.includes("options") && !colKeysToIgnore.includes(val)
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
          appliedFilters: [],
          current: [],
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
    if (
      !isEmpty(props.finalStoreDetailsStateValues) &&
      !props.enableStoreGroupMapping
    ) {
      setStoreGroupMapping({
        ...storeGroupMapping,
        store_group_mapping_date:
          props.finalStoreDetailsStateValues.other_attributes
            .store_opening_date, // this will not be prepopulated for levis
      });
      STORE_GROUP_MAPPING[1].isDisabled = true; // this will not be disabled for levis
    }
  }, [props.finalStoreDetailsStateValues, props.enableStoreGroupMapping]);

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
      // edit flow
      if (
        (isEmpty(props.screenNameNavigatedFrom) || props.screenNameNavigatedFrom==="sister-store-mapping")&&
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
    setTimePeriodToggle("static");
    setSisterStoreDatePicker({
      sisterStoreDatePicker: storeAttrsTimePeriod?.sister_store_mapping_date,
    });
    let tableRowAttrs = objectToPopulate.table_row_attributes;
    let selectedStoreDeptMapping = [];

    // Get column names from sisterStoreMappedColumnConfig
    const configColumnNames = sisterStoreMappedColumnConfig.map(
      (column) => column.column_name
    );
    // in levis case, tableRowAttrs[0] is null when admin saves data in step 1 only
    if (tableRowAttrs.length && tableRowAttrs[0] !== null) {
      tableRowAttrs?.forEach((obj, i) => {
        let updatedRowData = {};
        obj.forEach((item) => {
          if (columnsToIgnoreRef.current.includes(item.attribute_name)) {
            // to pre populate date field in vb (modify the condition in future if more number of such cols are added)
            updatedRowData[item.attribute_name] = item.values[0];
            flowType === "edit" && disableReservationDateCells(updatedRowData);
          } else
            updatedRowData[item.attribute_name] = mapOptionsValue(item.values);

        });

        let baseRowData = sisterStoreMappedData[0];

        updatedRowData = {
          ...baseRowData,
          ...updatedRowData,
          key: i,
        };
        selectedStoreDeptMapping.push(updatedRowData);
      });

      // works but gets called twice check later to optimise
      // works but gets called twice check later to optimise
      if (configColumnNames.includes("like_store_id")) {
        selectedStoreDeptMapping.forEach((item) => {
          if (item.store_code) {
            item.like_store_id = item.store_code;
          }
        });
      }
      setSisterStoreMappedData(selectedStoreDeptMapping);
      setCounter(tableRowAttrs.length - 1);
      // call this function as we have to fetch store groups based on hierarchies pre selected in edit cond
      !props.hideStoreGroupDetails &&
        fetchStoreGroups(selectedStoreDeptMapping, storeAttrsTimePeriod);
      // explicitly call cross filter API to fetch and update drop down options
      fetchCrossFilterOptions(selectedStoreDeptMapping, flowType);
    }
  };

  const addNewRow = () => {
    // throw a warning message if the latest row in table has empty values
    let latestRecordEntry =
      sisterStoreMappedData[sisterStoreMappedData.length - 1];
    // Filtering out keys that have selected value from the table
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
        "Select the required hierarchy and sister store",
        "warning"
      );
    } else if (latestRecordEntry["multiplier"] === "") {
      props.displaySnackMessages("Enter a value for the multiplier", "warning");
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
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    setSelectedSisterStoreRows(selections);
  };

  const deleteSelectedSisterRows = () => {
    if (!selectedSisterStoreRows.length) {
      props.displaySnackMessages("Select at least one row", "warning");
    } else setShowDeleteConfirmPopup(true);
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
      if (storeGroupMapping?.store_groups?.length) {
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
        } else if (item === "like_store_id") {
          newArr.push({
            attribute_name: "store_code",
            operator: "in",
            values: row[item] ? row[item]?.map((item) => item.value) : [],
            filter_type: "cascaded",
            dimension:
              item === props.storeCodeKeyName ||
              item === "country" ||
              item === "like_store_id"
                ? "store"
                : "product",
          });
        } else {
          newArr.push({
            attribute_name: item,
            operator: "in",
            values: row[item] ? row[item]?.map((item) => item.value) : [],
            filter_type: "cascaded",
            dimension:
              item === props.storeCodeKeyName || item === "country"
                ? "store"
                : "product",
          });
        }
      });
      payloadFormatArr.push(newArr);
    });
    return payloadFormatArr;
  };

  const setInitialEmptyTableRow = () => {
    let columnDropDownValues = { key: 0, multiplier: 1 };
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
    // Restrict cross country selection to only one value i.e the country name from the previous screen
    // Note the column name to restrict varies from client to client (in case of carters it is country)
    if (
      !isEmpty(props.sisterStoreRestrictColumnMapping) &&
      obj.column_name === props.sisterStoreRestrictColumnMapping?.column_name
    ) {
      columnDropDownValues[optionsKey] = obj.initialData?.length
        ? obj.initialData.filter(
            (val) =>
              val.value ===
              props.finalStoreDetailsStateValues?.form_attributes?.[
                props.sisterStoreRestrictColumnMapping?.form_value
              ]
          )
        : [];
    } else columnDropDownValues[optionsKey] = obj.initialData || [];
    return columnDropDownValues;
  };

  const clearSisterStoreMappings = () => {
    let initialRow = setInitialEmptyTableRow();
    setSisterStoreMappedData(initialRow);
    setSisterStoreTimePeriod([]);
    setSisterStoreDatePicker([]);
    setTimePeriodToggle("dynamic");
    setStoreGroupMapping({ ...storeGroupMapping, store_groups: [] });
    setStoreGroupDisableState(true);
    STORE_GROUP_MAPPING[0].options = [];
    setStoreGroupConfiguration(STORE_GROUP_MAPPING);
    setCounter(0);
    setResetClicked(true);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  //  return true to enable drop down selection
  const onChangeSisterStoreValidation = () => {
    return true;
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
        item?.column_name !== "multiplier" &&
        item?.field !== "Selection" &&
        item?.type !== "datetime"
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
    const filtersPayload = [
      ...prodDimensionHierarchies,
      {
        filter_id: "channel",
        attribute_name: "channel",
        operator: "in",
        dimension: "store",
        values: [
          replaceSpecialCharToCharCode(
            props.finalStoreDetailsStateValues.form_attributes?.channel
          ),
        ],
        filter_type: "cascaded",
      },
    ];
    const shouldExcludeNewStores = props?.removeNewStoreFlagFromSisterStore ?? false;
    if (shouldExcludeNewStores) {
      const newStoreFlagFilter = {
        filter_id: "new_store_flag",
        attribute_name: "new_store_flag",
        operator: "in",
        dimension: "store",
        values: ["false"],
        filter_type: "cascaded",
      };
      filtersPayload.push(newStoreFlagFilter);
    }

    return filtersPayload;
  };
  const fetchCrossFilterOptions = (rows, flowType) => {
    rows.forEach(async (data) => {
      let colKeysToIgnore = ["key", ...columnsToIgnoreRef.current];
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

  const customFunction = async (data, column) => {
    try {
      const { gridOptionsWrapper } = column;
      let filterKeys = gridOptionsWrapper.gridOptions?.columnDefs.filter(
        (key) =>
          key?.field !== "Selection" &&
          key?.type !== "datetime" &&
          key?.column_name !== "multiplier"
      );
      await callCrossFilterAPIOptions(data, gridOptionsWrapper, filterKeys);
    } catch (e) {
      console.log("error in custom function", e);
    }
  };

  const onBlur = async (_e, data, column, isChanged, value, _initialValue) => {
    const { gridOptionsWrapper } = column;
    let arr = [];
    agGridInstance.current?.api?.forEachNode((item) => arr.push(item.data));

    // To disable fetch store groups button unless and until all values in a row are filled
    let colKeysToIgnore = [
      "key",
      ...columnsToIgnoreRef.current,
      ...nonMandatoryHierarchyColumns.current,
    ];
    let fieldKeys = Object.keys(data).filter(
      (val) => !colKeysToIgnore.includes(val) && !val.includes("options")
    );
    if (fieldKeys.some((key) => isEmpty(data[key]))) {
      setStoreGroupDisableState(true);
    } else setStoreGroupDisableState(false);

    let filterKeys = gridOptionsWrapper.gridOptions?.columnDefs.filter(
      (key) =>
        key?.field !== "Selection" &&
        key?.type !== "datetime" &&
        key?.column_name !== "multiplier"
    );
    if (
      isChanged &&
      column.colId !== props.storeCodeKeyName &&
      column.colDef?.type !== "datetime" &&
      column.colId !== "multiplier"
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
      column.colId !== props.storeCodeKeyName &&
      column.colId !== "multiplier"
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
        if (
          apiResponse.data?.message &&
          apiResponse.data.message.toLowerCase() === "true"
        ) {
          data[column.colId] = "";
          agGridInstance.current.api.refreshCells({
            columns: [column.colId],
          });
          props.displaySnackMessages(
            SISTER_STORE_PRODUCT_HIERARCHY_VALIDATION_MSG,
            "warning"
          );
          callCrossFilterAPIOptions(data, gridOptionsWrapper, filterKeys);
        }
        setHierarchyValidationLoader(false);
      } catch (e) {
        setHierarchyValidationLoader(false);
        props.handleErrorMessage(e);
      }
    }
    // reset selected sister store option n disable the fields
    // for multiplier column the value type is string and for other hierarchies it is object hence the below condition
    let checkForValueCond =
      typeof value === "object" ? !value.length : value !== "";
    if (
      isChanged &&
      checkForValueCond &&
      column.colDef?.type !== "datetime" &&
      column.colId !== "multiplier"
    ) {
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
        if (colName === props.storeCodeKeyName) {
          let filteredStoreList = mappingList.filter((item) => {
            return item[0]?.toLowerCase() !== "e";
          });
          data[dropDownList] = await filteredStoreList?.map((opt) => {
            return {
              value: opt,
              label: opt,
              id: opt,
            };
          });
        }
        // condition to show only selected country value from step 1
        else if (
          colName === props.sisterStoreRestrictColumnMapping?.column_name
        ) {
          const selectedCountry =
            props.finalStoreDetailsStateValues?.form_attributes?.[
              props.sisterStoreRestrictColumnMapping?.form_value
            ];
          data[dropDownList] = await configureAttributeOptions([
            selectedCountry,
          ]);
        } else {
          data[dropDownList] = await configureAttributeOptions(mappingList);
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
      props.handleErrorMessage(e);
      setCrossFilterLoader(false);
    }
  };

  const onCellValueChanged = (params) => {
    const { column, node, data, newValue, api } = params;
    if (column.colId === "multiplier") {
      if (newValue >= 0 && newValue <= 1000) {
        data[column.colId] = newValue; // to modify this later
      } else {
        props.displaySnackMessages(
          "The value of the multiplier should be between 0 and 1000",
          "warning"
        );
        data[column.colId] = 1;
      }
      agGridInstance.current.api.refreshCells({
        columns: [column.colId],
      });
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

  const fetchStoreGroups = async (data, timePeriod) => {
    try {
      let emptyRowIndex = [];
      let rows = data ? data : sisterStoreMappedData;
      if (nonMandatoryHierarchyColumns.current?.length > 0) {
        rows.forEach((item, i) => {
          let eachRow = checkForMandatoryKeysWithValues(item);
          if (Object.values(eachRow).some((val) => val === ""))
            emptyRowIndex.push(i + 1);
        });
      } else {
        rows.forEach((item, i) => {
          if (Object.values(item).some((val) => val === ""))
            emptyRowIndex.push(i + 1);
        });
      }
      if (emptyRowIndex.length) {
        setSisterStoreTableEmptyRowIndex(emptyRowIndex);
        props.displaySnackMessages("Row cannot have empty values", "warning");
      } else {
        setSisterStoreTableEmptyRowIndex([]);
        props.setSisterStoreDetailsScreenLoader(true);
        let tableRows = mapTableRowAttributesAsFilters(rows);
        let body = {
          attribute_name: props.sisterStoreHierarchyKey,
          table_row_attributes: tableRows,
          other_attributes:
            props.finalStoreDetailsStateValues?.other_attributes,
          application_code: 1,
        };
        let response = await props.getStoreGroup(body);
        if (!response.data?.data?.length) {
          props.displaySnackMessages(NO_STORE_GROUP_VALIDATION_MSG, "warning");
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
      props.handleErrorMessage(e);
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

  const saveNewStore = async (status_code) => {
    try {
      let emptyRowValues = [];
      if (nonMandatoryHierarchyColumns.current?.length > 0) {
        sisterStoreMappedData.forEach((item, i) => {
          let eachRow = checkForMandatoryKeysWithValues(item);
          if (Object.values(eachRow).some((val) => val?.length === 0))
            emptyRowValues.push(true);
        });
      } else {
        sisterStoreMappedData.forEach((item) => {
          if (Object.values(item).some((val) => val?.length === 0))
            emptyRowValues.push(true);
        });
      }
      if (emptyRowValues.length) {
        props.displaySnackMessages(
          "Please select all hierarchies in the table",
          "warning"
        );
      } else if (
        timePeriodToggle === "dynamic" &&
        isEmpty(sisterStoreTimePeriod?.sisterStoreTimePeriod)
      ) {
        props.displaySnackMessages(
          "Select sister store mapping date",
          "warning"
        );
      } else if (
        timePeriodToggle === "static" &&
        isEmpty(sisterStoreDatePicker?.sisterStoreDatePicker)
      ) {
        props.displaySnackMessages(
          "Select sister store mapping date",
          "warning"
        );
      } else if (
        !props.hideStoreGroupDetails &&
        (isEmpty(storeGroupMapping.store_groups) ||
          isEmpty(storeGroupMapping.store_group_mapping_date))
      ) {
        props.displaySnackMessages(
          "Please fill store group mapping details",
          "warning"
        );
      } else {
        props.setSisterStoreDetailsScreenLoader(true);
        const fetchFutureDates = () => {
          // fetch future dates based on the number of months selected from the drop down
          let month = sisterStoreTimePeriod?.sisterStoreTimePeriod?.split(
            " "
          )[0];
          let currentData = new Date(
            props.finalStoreDetailsStateValues.other_attributes.store_opening_date
          );
          currentData.setMonth(currentData.getMonth() + parseInt(month));
          return JSON.stringify(currentData).slice(1, 11);
        };

        let sisterStoreTomePeriodValue =
          timePeriodToggle === "static"
            ? moment(sisterStoreDatePicker?.sisterStoreDatePicker).format(
                "YYYY-MM-DD"
              )
            : fetchFutureDates();

        let tableRows = mapTableRowAttributesAsFilters(sisterStoreMappedData);
        let reqBody = {
          table_row_attributes: tableRows,
          other_attributes: {
            ...props.finalStoreDetailsStateValues?.other_attributes,
            sister_store_mapping_date: sisterStoreTomePeriodValue,
            store_groups: storeGroupMapping.store_groups,
            store_group_mapping_date: props.hideStoreGroupDetails
              ? ""
              : moment(storeGroupMapping.store_group_mapping_date).format(
                  "YYYY-MM-DD" // to check about this format that is hardcoded
                ),
          },
          store_code:
            props.finalStoreDetailsStateValues.form_attributes?.store_code,
        };
        // levis use case - append status to payload
        if (props.appendStatusToPayload) {
          reqBody.other_attributes.status = status_code;
        }
        let response = !props.editNewStoreData
          ? await props.saveNewStoreDetails(reqBody)
          : await props.updateNewStoreDetails(reqBody);
        if (response.data?.status || response.data?.show_message) {
          // navigate to configuration screen
          props.displaySnackMessages(response.data?.message, "info", () => {
            navigate(CONFIGURATION, {
              state: ADD_NEW_STORE,
            });
          });
          props.clearEditNewStoreData();
          props.clearNewStoreDetails();
        }
        props.setSisterStoreDetailsScreenLoader(false);
      }
    } catch (e) {
      props.handleErrorMessage(e);
      props.setSisterStoreDetailsScreenLoader(false);
    }
  };

  const renderActionButtons = () => {
    let options = [
      <Button
        title="Add New Store"
        size="large"
        type="default"
        variant="tertiary"
        id="sister-store-add-row-button"
        onClick={() => addNewRow()}
      >
        <AddIcon />
      </Button>,
      <DeleteActionButton
        key="sister-store-delete"
        id="sister-store-delete-row-button"
        onClick={() => deleteSelectedSisterRows()}
      />,
      <Button
        size="large"
        type="default"
        variant="tertiary"
        id="sister-store-reset-button"
        onClick={() => clearSisterStoreMappings()}
      >
        Reset
      </Button>,
    ];
    if (!props.hideStoreGroupDetails) {
      options.unshift(
        <Button
          size="large"
          type="default"
          variant="primary"
          id="sister-store-fetch-store-groups-button"
          disabled={storeGroupDisableState}
          onClick={() => fetchStoreGroups()}
        >
          Fetch Store Group
        </Button>
      );
    }
    return options;
  };

  const fetchTableHeader = () => {
    const edit_store_id = props.finalStoreDetailsStateValues.form_attributes?.store_code;
    const editFlowStoreSelected = `New Store Selected: ${edit_store_id}`;
    if (props.appendStatusToPayload && iaRecommendedStoreData.length > 0) {
      return (
        <div>
          <span>Details {`${edit_store_id ? " - " + editFlowStoreSelected : ""}`}</span>
        </div>
      );
    }
   
    return `Details ${edit_store_id ? " - " + editFlowStoreSelected : ""}` ;
  };

  return (
    <Loader
      loader={
        props.sisterStoreDetailsScreenLoader ||
        hierarchyValidationLoader ||
        crossFilterLoader
      }
    >
      <div className={`${classes.wrapper} ${globalClasses.evenPaddingAround}`}>
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
          customFunction={customFunction}
          tableHeader={fetchTableHeader()}
          topRightOptions={renderActionButtons()}
          sizeColumnsToFitFlag={true}
        />
        {sisterStoreTableEmptyRowIndex.length > 0 && (
          <Typography variant="h5" color={colours.frolyLight}>
            Note:- The following row numbers have empty values :
            {sisterStoreTableEmptyRowIndex
              .map((item) => ` Row ${item}`)
              .toString()}
          </Typography>
        )}
        <Divider className={globalClasses.marginVertical2rem} />
        <div className={classes.alignFlex}>
          <b>
            {" "}
            Select time period{" "}
            <span
              className={`${globalClasses.marginHorizontal} ${classes.lightGrey}`}
            >
              |
            </span>{" "}
          </b>
          <RadioButtonGroup
            name="ia-test-radio-group"
            onChange={(event) => {
              setTimePeriodToggle(event.target.value);
            }}
            options={[
              {
                label: "Static",
                value: "static",
              },
              {
                label: "Dynamic",
                value: "dynamic",
              },
            ]}
            orientation="row"
            selectedOption={timePeriodToggle}
          />
        </div>
        <div className={classes.timePeriodFormStyle}>
          {timePeriodToggle === "dynamic" ? (
            <Form
              layout={"vertical"}
              maxFieldsInRow={1}
              handleChange={handleChangeSisterStoreTimePeriod}
              fields={timePeriodDropDownOptions}
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
        {!props.hideStoreGroupDetails && (
          <div>
            <Divider className={globalClasses.marginVertical2rem} />
            <b>Store Group Mapping</b>
            <div className={globalClasses.marginTop}>
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
        )}
      </div>
      <div className={classes.stickyFooter}>
        <Button
          size="large"
          type="default"
          variant="secondary"
          id="sister-store-back-button"
          onClick={() => setShowGoBackDialog(true)}
        >
          {"< Back to Store Details"}
        </Button>
        {props.showAdminAccess ? (
          <Button
            size="large"
            type="default"
            variant="primary"
            id="sister-store-next-step-button"
            onClick={() => saveNewStore(3)}
          >
            Super User Approval
          </Button>
        ) : !isEmpty(props.userApprovalFlow) ? (
          <Button
            size="large"
            type="default"
            variant="primary"
            id="sister-store-next-step-button"
            onClick={() => saveNewStore(2)}
          >
            {props.userApprovalFlow}
          </Button>
        ) : (
          <Button
            size="large"
            type="default"
            variant="primary"
            id="sister-store-next-step-button"
            onClick={() => saveNewStore()}
          >
            Save
          </Button>
        )}
      </div>
      {showDeleteConfirmPopup && (
        <>
          <Prompt
            isOpen={showDeleteConfirmPopup}
            title={"Delete Selected Rows"}
            onPrimaryButtonClick={() => {
              confirmDeleteRows();
              setShowDeleteConfirmPopup(false);
            }}
            onSecondaryButtonClick={() => setShowDeleteConfirmPopup(false)}
            variant="warning"
            primaryButtonLabel="Yes"
            secondaryButtonLabel="No"
          >
            Are you sure you want to delete the selected rows?
          </Prompt>
        </>
      )}
      <Prompt
        isOpen={showGoBackDialog}
        title={"Go back"}
        onPrimaryButtonClick={() => {
          props.goBackToStep1();
          setShowGoBackDialog(false);
        }}
        onSecondaryButtonClick={() => setShowGoBackDialog(false)}
        variant="warning"
        primaryButtonLabel="Yes"
        secondaryButtonLabel="No"
      >
        {GO_BACK_MESSAGE}
      </Prompt>
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
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.sisterStoreMappingHierarchy,
    tenantFilterUamConfig:
      tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    sisterStoreRestrictColumnMapping:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.sisterStoreRestrictColumnMapping,
    cache: inventorysmartReducer?.activeModulesCacheService?.cache,
    hideStoreGroupDetails:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.hideStoreGroupDetails,
    sisterStoreDynamicTimePeriod:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.sisterStoreDynamicTimePeriod,
    showAdminAccess:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.showAdminAccess,
    userApprovalFlow:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.userApprovalFlow,
    enableStoreGroupMapping:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.enableStoreGroupMapping,
    appendStatusToPayload:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.appendStatusToPayload,
    removeNewStoreFlagFromSisterStore:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.removeNewStoreFlagFromSisterStore,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setSisterStoreDetailsScreenLoader: (body) =>
      dispatch(setSisterStoreDetailsScreenLoader(body)),
    clearSisterStoreDetailsScreenLoader: (body) =>
      dispatch(clearSisterStoreDetailsScreenLoader(body)),
    saveStepOneFinalValues: (body) => dispatch(saveStepOneFinalValues(body)),
    setNewStoreDetailsForBackFlow: (body) =>
      dispatch(setNewStoreDetailsForBackFlow(body)),
    getStoreGroup: (body) => dispatch(getStoreGroup(body)),
    sisterStoreTableValidation: (body) =>
      dispatch(sisterStoreTableValidation(body)),
    clearEditNewStoreData: (body) => dispatch(clearEditNewStoreData(body)),
    clearNewStoreDetails: (body) => dispatch(clearNewStoreDetails(body)),
    saveNewStoreDetails: (body) => dispatch(saveNewStoreDetails(body)),
    updateNewStoreDetails: (body) => dispatch(updateNewStoreDetails(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SisterStoreMappingComponent);

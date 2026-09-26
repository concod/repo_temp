import React, { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import { Typography, Box } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  resetConstraintsState,
  setConstraintsArticles,
  setConstraintsOmsLoader,
  setConstraintsOmsFilterDependency,
  getConstraintOmsFilterConfigurationVendorStore,
  setConstraintsOmsFilterElements,
  setSelectedOmsFilters,
  resetSelectedOmsFilters,
  getConstraintsSafetyStockVendorStoreTableConfig,
  setConstraintsSafetyStockTableConfigLoader,
  setConstraintsSafetyStockTableDataLoader,
  getConstraintsSafetyStockTableDataVendorStore,
  getConstraintsSafetyStockDataVendorStore,
  setConstraintsSetAllSuccess,
  getConstraintsSafetyStockTableDownloadData,
} from "modules/oms/services-oms/Constraints/constraints-services";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  filtersPayload,
  fetchFilterOptions,
  scrollIntoView,
} from "modules/oms/utils-oms/oms-utility";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  defaultTableData,
  ERROR_MESSAGE,
  UPDATED_MESSAGE,
  NO_DATA_FOUND,
  FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS,
  NO_EDIT_TO_SAVE,
  INVALID_VALUE_MESSAGE,
  OMS_CONSTRAINTS_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import SafetyStockSetAllPopUp from "../safetyStockSetAllPopUp";
import SafetyStockGraphViewVendorStore from "./SafetyStockGraphViewVendorStore";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { getValidCheckConfiguration } from "../../utils";
import { Button } from "impact-ui-v3";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import { OMS_WOS_VALIDATION_ERROR } from "modules/oms/constants-oms/stringConstants";
import { OMS_CONSTRAINTS_SCREENNAME } from "modules/oms/constants-oms/stringConstants";

const SafetyStockForVendorStore = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [filters, setFilters] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [filterPayload, setFilterPayload] = useState([]);
  const [isFiltersValid, updateIsFiltersValid] = useState(false);
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);

  // Safety Stock Table State
  const [safetyStockTableColumns, setSafetyStockTableColumns] = useState([]);
  const [safetyStockTableRowCount, setSafetyStockTableRowCount] = useState(0);
  const [render, setRender] = useState(false);
  const [safetyStockPayload, setSafetyStockPayload] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [selectedSetAllRows, setSelectedSetAllRows] = useState([]);
  const [ishide, setIsHide] = useState(true);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const allocationRef = useRef();
  const safetyStockTableGridInstance = useRef(null);
  const [showSafetyStockGraph, setShowSafetyStockGraph] = useState(false);
  const [safetyStockGraphPayload, setsafetyStockGraphPayload] = useState();
  const [totalCount, setTotalCount] = useState(0);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});
  const downloadLink = useRef(null);
  var safetyStockEditPayload = useRef([]);
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(true);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const [isUserHasDownloadAccess, setIsUserHasDownloadAccess] = useState(true);
  const [openPackConfig, setOpenPackConfig] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState("");

  // user access for safety stock vendor store
  const constraintsAccess = props.userAccess?.find(
    (item) =>
      item.module === "constraints_safety_stock" &&
      item.screen === OMS_CONSTRAINTS_SCREENNAME_KEY
  );
  const canEdit = constraintsAccess?.isEditButton || false;
  const canSetAll = constraintsAccess?.isSetAllButton || false;
  const canDownload = constraintsAccess?.isDownloadButton || true;

  const type = new URLSearchParams(window.location.search).get("type");

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependencyVendorStore")) ||
    [];

  // Safety Stock Table Configuration
  const SAFETY_STOCK_ROW_ID = props?.screenConfig?.unique_key || "id";
  const SAFETY_STOCK_PRIMARY_KEY = props?.screenConfig?.primary_key || "id";
  const SAFETY_STOCK_EDIT_API_KEYS =
    props?.screenConfig?.edit_api_keys_store || [];
  const EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING =
    props?.screenConfig?.safety_stock_methods;
  const COLUMNS_TO_BE_DISABLED_BASED_ON_SAFETY_STOCK_METHOD =
    props?.screenConfig?.safety_stock_methods?.map((col) => col.field) || [];
  const DISABLE_CELL_MAPPING_CONFIG = props?.screenConfig?.disable_cell_mapping;
  const isDisableCellMappingValid =
    DISABLE_CELL_MAPPING_CONFIG &&
    Object.keys(DISABLE_CELL_MAPPING_CONFIG).length > 0;
  const DISABLE_CELL_MAPPING = isDisableCellMappingValid
    ? [DISABLE_CELL_MAPPING_CONFIG]
    : [];
  const COLUMNS_TO_BE_DISABLED_BASED_ON_CELL_VALUE =
    DISABLE_CELL_MAPPING?.map((col) => col.column_name) || [];
  const SETALL_MAPPING = props?.screenConfig?.setall_mapping || {};
  const SETALL_FORMDATA_FIELDS =
    props?.screenConfig?.setall_formdata_fields || [];
  const SERVICE_LEVEL_MAX_VALUE = 99;
  const SERVICE_LEVEL_MIN_VALUE = 50;

  const onFilterDashboard = async (filterElements, filterDependency) => {
    const payload = filtersPayload(filterElements, filterDependency, true);
    payload.reqBody = payload.reqBody.filter(
      (item) =>
        ["sale_type", "store_capacity"].indexOf(item.attribute_name) === -1
    );
    updateIsFiltersValid(payload.isValid);
    props.setSelectedOmsFilters(payload.reqBody);
  };

  const checkForEditability = (columns) => {
    // If userAccess exists, use canEdit flag; otherwise fall back to orderingAccessControl
    const shouldDisableEdit = !isEmpty(props?.userAccess)
      ? !canEdit
      : !props?.orderingAccessControl?.isEditButton?.isVisible;

    if (shouldDisableEdit) {
      columns.map((col) => {
        if (col.type !== "link") {
          col.is_editable = false;
        }
        if (col.column_name === "service_level_pct") {
          col.width = 200;
        }
      });
    }
    return columns;
  };

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      // Use new userAccess flags
      setIsUserHasEditAccess(canEdit);
      setIsUserHasSetAllAccess(canSetAll);
      setIsUserHasDownloadAccess(canDownload);
      setIsUserHasViewOnlyAccess(false);
    } else if (props?.orderingAccessControl) {
      // Fall back to old access control
      setIsUserHasViewOnlyAccess(
        !props?.orderingAccessControl?.isEditButton?.isVisible
      );
      setIsUserHasEditAccess(true);
      setIsUserHasSetAllAccess(true);
      setIsUserHasDownloadAccess(true);
    }
  }, [
    props?.userAccess,
    props?.orderingAccessControl,
    canEdit,
    canSetAll,
    canDownload,
  ]);

  useEffect(() => {
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.filterDashboardConfigurationVendorStore?.appliedFilterData
            ?.dependencyData;

    props.setConstraintsOmsFilterDependency(selectedFiltersDependency);
    localStorage.removeItem("selectedFiltersDependencyVendorStore");
    localStorage.removeItem("selectedArticlesVendorStore");
    localStorage.removeItem("storeCodesVendorStore");

    const fetchData = async () => {
      props.setConstraintsOmsLoader(true);
      try {
        const response = await props.getConstraintOmsFilterConfigurationVendorStore();
        let data = response.data.data;
        setFilters(data);
        props.setConstraintsOmsLoader(false);
      } catch (error) {
        props.setConstraintsOmsLoader(false);
      }
    };

    fetchData();

    return () => {
      props.resetConstraintsState([]);
    };
  }, []);

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  // Safety Stock Table Column Config
  useEffect(() => {
    const fetchColumnConfig = async () => {
      setIsHide(true);
      props.setConstraintsSafetyStockTableConfigLoader(true);
      let columns = await props.getConstraintsSafetyStockVendorStoreTableConfig(
        {}
      );
      let col = columns?.data?.data?.map((item) => {
        if (item.column_name === "pack_config") {
          item.onClick = (tableInfo) => {
            setSelectedStyle(tableInfo?.cellData?.data?.article || {});
            setOpenPackConfig(true);
          };
        } else {
          item.onClick = (tableInfo) => {
            onClickColumn(tableInfo?.cellData?.data || {});
          };
        }
        return item;
      });

      let updatedCols = checkForEditability(columns?.data?.data);
      let formattedColumns = agGridColumnFormatter(
        updatedCols,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );
      let l_columnsWithDisablekey = formattedColumns.map((obj) => {
        if (
          COLUMNS_TO_BE_DISABLED_BASED_ON_SAFETY_STOCK_METHOD.includes(
            obj.column_name
          ) ||
          COLUMNS_TO_BE_DISABLED_BASED_ON_CELL_VALUE.includes(obj.column_name)
        ) {
          obj.disabled = setCellsToBeDisabled;
        }
        return obj;
      });
      props.setConstraintsSafetyStockTableConfigLoader(false);
      setSafetyStockTableColumns(l_columnsWithDisablekey);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      safetyStockEditPayload.current = [];
      setRender(true);
      scrollIntoView(allocationRef);
    };
    if (
      props.selectedOmsFilters &&
      props.selectedOmsFilters.length > 0 &&
      !render
    ) {
      fetchColumnConfig();
    }
  }, [props.selectedOmsFilters, render]);

  const onClickColumn = async (data) => {
    setsafetyStockGraphPayload(data);
    setShowSafetyStockGraph(true);
  };

  useEffect(() => {
    if (!isEmpty(props.selectedOmsFilters)) {
      setRender(false);
      setCheckAllSetAllRequest([]);
      setButtonEnabled(false);
    }
  }, [props.selectedOmsFilters]);

  useEffect(() => {
    return () => {
      props.setFilterConfiguration({
        ConstraintsOrderManagementFilterConfigurationVendorStore: undefined,
      });
      props.resetSelectedOmsFilters();
    };
  }, []);

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setConstraintsOmsLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(props.constraintsOmsFilterDependency)
        : selected;

      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: OMS_CONSTRAINTS_SCREENNAME,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      if (isEmpty(props.filterDashboardConfigurationVendorStore)) {
        const filterConfigData = [
          {
            filterDashboardData: response,
            isCrossDimensionFilter: true,
            screen_name: OMS_CONSTRAINTS_SCREENNAME,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "ConstraintsOrderManagementFilterConfigurationVendorStore",
          filterConfigData,
          "Constraints Oms Screen Vendor Store",
          selectedFilters
        );
        if (isRedirectedFromDifferentPage) {
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Constraints Oms Screen Vendor Store",
            selectedFilters
          );
          filterConfig[
            "ConstraintsOrderManagementFilterConfigurationVendorStore"
          ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;
          setFilterDependency(formattedSelectedFilters);
        }
        props.setFilterConfiguration(filterConfig);
      }
      let filterElements = cloneDeep(response);
      props.setConstraintsOmsFilterElements(filterElements);
    } catch (error) {
      props.addSnack({
        message: "Error while fetching options for Vendor Store",
        options: {
          variant: "error",
        },
      });
    } finally {
      props.setConstraintsOmsLoader(false);
    }
  };

  // Safety Stock Table Data Methods
  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsSafetyStockTableDataLoader(true);
      const selection = {
        data: getValidCheckConfiguration(
          safetyStockTableGridInstance?.current?.api?.checkConfiguration
        ),
        unique_columns: ["id"],
      };

      const defaultSort = props?.vendorToStoreScreenConfig?.default_sort;
      const sortToBeSent =
        manualbody?.sort?.length > 0
          ? manualbody.sort
          : Array.isArray(defaultSort) && defaultSort?.length > 0
          ? defaultSort
          : [];

      let body = {
        filters: [...props.selectedOmsFilters],
        meta: manualbody
          ? {
              ...manualbody,
              sort: sortToBeSent,
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              search: [],
              sort: sortToBeSent,
              range: [],
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        selection,
      };
      setManualBodyData(body?.meta);
      let response = await props.getConstraintsSafetyStockTableDataVendorStore(
        body
      );

      if (response.data.status) {
        response.data.data.forEach((item) => {
          if (item.pack_config) {
            item.pack_config = "View Pack Config";
          } else {
            item.pack_config = "";
          }
        });
        setTotalCount(response.data.total);
        let formatedData = agGridRowFormatter(
          response.data.data,
          getValidCheckConfiguration(params?.api?.checkConfiguration),
          "id"
        );
        setSafetyStockTableRowCount(formatedData.length);

        formatedData.forEach((val) => {
          val.order_quantity_copy = val.order_quantity;
          val.service_level_percentage = val.service_level_pct;
        });

        if (!isEmpty(props?.userAccess) && !canEdit) {
          formatedData.forEach((val) => {
            val.service_level_pct = val.service_level_pct / 100;
          });
        } else if (!props?.orderingAccessControl?.isEditButton?.isVisible) {
          formatedData.forEach((val) => {
            val.service_level_pct = val.service_level_pct / 100;
          });
        }

        props.setConstraintsSafetyStockTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setConstraintsSafetyStockTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setConstraintsSafetyStockTableDataLoader(false);
      return defaultTableData;
    }
  };

  const createPayloadItem = (tableRowData, columnName) => {
    let payloadObject = {};
    payloadObject[SAFETY_STOCK_ROW_ID] = tableRowData?.[SAFETY_STOCK_ROW_ID];
    payloadObject[columnName] = tableRowData?.[columnName];
    SAFETY_STOCK_EDIT_API_KEYS?.forEach((key) => {
      if (tableRowData?.[key]) {
        payloadObject[key] = tableRowData[key];
      }
    });
    let mandatoryColumn = EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING.find(
      (col) => col.value === tableRowData?.[columnName]
    );
    if (mandatoryColumn) {
      payloadObject[mandatoryColumn.field] =
        tableRowData[mandatoryColumn.field];
    }
    return payloadObject;
  };

  const validateUserInputServiceLevel = (data) => {
    let validatedServiceLevel = data.service_level_pct;
    if (validatedServiceLevel < SERVICE_LEVEL_MIN_VALUE) {
      validatedServiceLevel = SERVICE_LEVEL_MIN_VALUE;
    }
    if (validatedServiceLevel > SERVICE_LEVEL_MAX_VALUE) {
      validatedServiceLevel = SERVICE_LEVEL_MAX_VALUE;
    }
    return parseInt(validatedServiceLevel);
  };

  const onCellValueChanged = (params) => {
    const { data, column } = params;
    setIsHide(false);
    safetyStockTableGridInstance.current.api.refreshCells({
      force: true,
      suppressFlash: false,
      columns: [...COLUMNS_TO_BE_DISABLED_BASED_ON_SAFETY_STOCK_METHOD],
    });
  };

  const onBlur = (_e, data, column, isChanged) => {
    setIsHide(false);

    if (column.colId === "safety_stock_method") {
      safetyStockEditPayload.current.push(
        createPayloadItem(data, column.colId)
      );
      setSafetyStockPayload(safetyStockEditPayload.current);
    } else if (column.colId === "service_level_pct") {
      let isEditedBefore = false;
      safetyStockEditPayload.current.filter((code) => {
        if (code[SAFETY_STOCK_ROW_ID] === data[SAFETY_STOCK_ROW_ID]) {
          let validatedServiceLevel = validateUserInputServiceLevel(data);
          if (validatedServiceLevel) {
            safetyStockTableGridInstance.current.api.forEachNode((node) => {
              if (
                node.data[SAFETY_STOCK_ROW_ID] === data?.[SAFETY_STOCK_ROW_ID]
              ) {
                if (node.data.service_level_pct !== validatedServiceLevel) {
                  node.data.service_level_pct = validatedServiceLevel;
                }
              }
              safetyStockTableGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: [column.colId],
              });
            });
          }

          code.service_level_pct = data.service_level_pct;
          isEditedBefore = true;
        }
      });
      if (!isEditedBefore) {
        let validatedServiceLevel = validateUserInputServiceLevel(data);

        if (validatedServiceLevel) {
          safetyStockTableGridInstance.current.api.forEachNode((node) => {
            if (
              node.data[SAFETY_STOCK_ROW_ID] === data?.[SAFETY_STOCK_ROW_ID]
            ) {
              node.data.service_level_pct = validatedServiceLevel;
            }
            safetyStockTableGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: [column.colId],
            });
          });
        }
        if (isChanged) {
          safetyStockEditPayload.current.push(
            createPayloadItem(data, column.colId)
          );
        }
      }
    } else {
      let isInputValueValid = true;
      let validatedInputValue = data?.[column.colId];
      if (
        Object.keys(SETALL_MAPPING).includes("safety_stock_twos") &&
        Object.keys(SETALL_MAPPING).includes("demand_twos") &&
        (column.colId === "safety_stock_twos" || column.colId === "demand_twos")
      ) {
        if (data?.demand_twos <= data?.safety_stock_twos) {
          isInputValueValid = false;
          safetyStockTableGridInstance.current.api.forEachNode((node) => {
            if (
              node.data[SAFETY_STOCK_ROW_ID] === data?.[SAFETY_STOCK_ROW_ID]
            ) {
              if (column.colId === "demand_twos") {
                node.data.demand_twos = data?.safety_stock_twos + 1;
                validatedInputValue = data?.safety_stock_twos + 1;
              } else {
                node.data.safety_stock_twos = data?.demand_twos - 1;
                validatedInputValue = data?.demand_twos - 1;
              }
            }
          });
          displaySnackMessages(OMS_WOS_VALIDATION_ERROR, "info");
          safetyStockTableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            columns: [column.colId],
          });
        }
      }
      let isEditedBefore = false;
      safetyStockEditPayload.current.filter((node) => {
        if (node[SAFETY_STOCK_ROW_ID] === data[SAFETY_STOCK_ROW_ID]) {
          node[column.colId] = validatedInputValue;
          isEditedBefore = true;
        }
      });
      if (!isEditedBefore && (isChanged || column.colDef.type === "list")) {
        safetyStockEditPayload.current.push(
          createPayloadItem(data, column.colId)
        );
      }
    }

    setSafetyStockPayload(safetyStockEditPayload.current);
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const setCellsToBeDisabled = (row, item) => {
    try {
      const disableMapping = DISABLE_CELL_MAPPING.find(
        (mapping) => mapping.column_name === item.accessor
      );
      if (disableMapping && row[disableMapping.value]) {
        return true;
      }

      if (
        COLUMNS_TO_BE_DISABLED_BASED_ON_SAFETY_STOCK_METHOD.includes(
          item.accessor
        )
      ) {
        let selectedSafetyStock = Array.isArray(row.safety_stock_method)
          ? row.safety_stock_method[0].value
          : row.safety_stock_method;
        let fieldMappingForSelectedMethod = EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING.filter(
          (col) => col.value === selectedSafetyStock
        );
        let fieldMappingForCurrentItem = EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING.find(
          (col) => col.field === item.accessor
        );
        if (
          fieldMappingForCurrentItem.value === selectedSafetyStock &&
          fieldMappingForSelectedMethod.some(
            (mapping) => mapping.field === item.accessor
          )
        ) {
          return false;
        } else {
          return true;
        }
      }
    } catch (error) {
      console.log("Error in setCellsToBeDisabled", error);
    }
  };

  const loadTableInstance = (params) => {
    safetyStockTableGridInstance.current = params;
  };

  const editSaveData = async () => {
    try {
      if (safetyStockPayload.length !== 0) {
        let isValidationMessageDisplayed = false;
        let isValuesInvalid = false;
        safetyStockPayload.map((tableRow) => {
          SETALL_FORMDATA_FIELDS.map((inputField) => {
            if (tableRow.hasOwnProperty(inputField?.accessor)) {
              if (
                inputField?.min_value &&
                tableRow[inputField?.accessor] < inputField?.min_value
              ) {
                isValuesInvalid = true;
                if (inputField?.validation_message) {
                  displaySnackMessages(
                    inputField?.validation_message || INVALID_VALUE_MESSAGE,
                    "info"
                  );
                  isValidationMessageDisplayed = true;
                }
              }
              if (
                inputField?.max_value &&
                tableRow[inputField?.accessor] > inputField?.max_value
              ) {
                isValuesInvalid = true;
                if (inputField?.validation_message) {
                  displaySnackMessages(
                    inputField?.validation_message || INVALID_VALUE_MESSAGE,
                    "info"
                  );
                  isValidationMessageDisplayed = true;
                }
              }
              if (
                inputField?.no_negative_values &&
                tableRow[inputField?.accessor] < 0
              ) {
                isValuesInvalid = true;
                if (inputField?.validation_message) {
                  displaySnackMessages(
                    inputField?.validation_message || INVALID_VALUE_MESSAGE,
                    "info"
                  );
                  isValidationMessageDisplayed = true;
                }
              }
              if (inputField?.field_type === "IntegerField") {
                if (checkInValidNumber(tableRow[inputField?.accessor])) {
                  isValuesInvalid = true;
                  if (inputField?.validation_message) {
                    displaySnackMessages(
                      inputField?.validation_message || INVALID_VALUE_MESSAGE,
                      "info"
                    );
                    isValidationMessageDisplayed = true;
                  }
                }
              }
            }
          });
        });
        if (isValuesInvalid && !isValidationMessageDisplayed) {
          displaySnackMessages(INVALID_VALUE_MESSAGE, "info");
          return;
        }

        let body = {
          orders: safetyStockPayload,
          keys: SAFETY_STOCK_EDIT_API_KEYS,
        };
        let response = await props.getConstraintsSafetyStockDataVendorStore(
          body
        );
        if (response.data.status) {
          setSafetyStockPayload([]);
          safetyStockEditPayload.current = [];
          displaySnackMessages(UPDATED_MESSAGE, "success");
          props.setConstraintsSetAllSuccess(true);
          safetyStockTableGridInstance?.current?.api?.deselectAll(true);
          safetyStockTableGridInstance?.current?.api?.setCheckConfiguration([]);
          setIsHide(true);
          setRender(false);
        }
      } else {
        displaySnackMessages(NO_EDIT_TO_SAVE, "info");
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      safetyStockTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      setIsHide(true);
    }
  };

  const checkInValidNumber = (value) => {
    return (
      isNaN(value) ||
      value === "" ||
      isNaN(parseInt(value)) ||
      value === null ||
      value === undefined
    );
  };

  const openSetAllPopUp = () => {
    setOpenPopUp(true);
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    safetyStockTableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSetAllRows(selectedRows);
    let l_selections = event.api.getSelectedRows().length;
    let l_buttonEnabled =
      safetyStockTableGridInstance.current.api.buttonEnabled;
    if (l_selections) {
      !l_buttonEnabled && setButtonEnabled(true);
    } else {
      l_buttonEnabled && setButtonEnabled(false);
    }
  };

  const updateSetAllData = async (payload, setAllData) => {
    const selection = {
      data: getValidCheckConfiguration(
        safetyStockTableGridInstance?.current?.api?.checkConfiguration
      ),
      unique_columns: ["id"],
    };
    let body = {
      orders: payload,
      keys: SAFETY_STOCK_EDIT_API_KEYS,
      filters: [...props.selectedOmsFilters],
      meta: {
        sort: [],
        range: [],
      },
      selection,
      set_all: setAllData,
      isSelectAllRecords:
        safetyStockTableGridInstance?.current?.api?.isSelectAllRecords,
    };
    try {
      let response = await props.getConstraintsSafetyStockDataVendorStore(body);
      if (response.data.status) {
        setSafetyStockPayload([]);
        setSelectedSetAllRows([]);
        safetyStockEditPayload.current = [];
        displaySnackMessages(UPDATED_MESSAGE, "success");
        safetyStockTableGridInstance?.current?.api?.deselectAll(true);
        safetyStockTableGridInstance?.current?.api?.setCheckConfiguration([]);
        setButtonEnabled(false);
        safetyStockTableGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
        setRender(false);
        return true;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return true;
    }
  };

  useEffect(() => {
    if (safetyStockTableGridInstance?.current) {
      safetyStockTableGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
      safetyStockTableGridInstance.current.api.buttonEnabled = buttonEnabled;
    }
  }, [checkAllSetAllRequest, buttonEnabled]);

  const downloadCsv = async () => {
    try {
      if (totalCount > 0) {
        const filterArray = (props.selectedOmsFilters ?? []).filter(
          (filter) => filter?.values?.length > 0
        );
        let body = {
          filters: filterArray,
          meta: {
            ...manualBodyData,
            limit: { limit: totalCount, page: 1 },
          },
        };
        displaySnackMessages(FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS, "info");
        let response = await props.getConstraintsSafetyStockTableDownloadData(
          body
        );
        if (response.data.status) {
          // Download logic can be implemented here
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      } else {
        displaySnackMessages(NO_DATA_FOUND, "info");
      }
    } catch (error) {
      console.log("Error in downloadCSV", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const getTopRightOptions = () => {
    let options = [];

    // Determine if Set All should be disabled
    const isSetAllDisabled = !isEmpty(props?.userAccess)
      ? !isUserHasSetAllAccess || !buttonEnabled
      : isUserHasViewOnlyAccess || !buttonEnabled;

    // Determine if Update should be disabled
    const isUpdateDisabled = !isEmpty(props?.userAccess)
      ? !isUserHasEditAccess || ishide
      : isUserHasViewOnlyAccess || ishide;

    if (selectedSetAllRows?.length > 0) {
      options.push(
        <div key="setall">
          <Button
            variant="tertiary"
            color="primary"
            id="productSetAllBtn"
            className={classes.button}
            onClick={openSetAllPopUp}
            disabled={isSetAllDisabled}
          >
            Set All
          </Button>
        </div>
      );
    }

    options.push(
      <div key="update">
        <Button
          variant="secondary"
          color="primary"
          className={classes.button}
          onClick={editSaveData}
          disabled={isUpdateDisabled}
        >
          Update
        </Button>
      </div>
    );

    return options;
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDashboard(filterData, dependencyData);
  };

  return (
    <CoreComponentScreen
      showPageRoute={false}
      showPageHeader={false}
      showFilterDashboard={true}
      filterConfigKey={
        "ConstraintsOrderManagementFilterConfigurationVendorStore"
      }
      onApplyFilter={onFilterDashboardClick}
      contained={false}
      filterDependency={filterDependency?.length ? filterDependency : null}
    >
      <Box className={globalClasses.marginVertical1rem}>
        <Loader
          loader={
            props.constraintsSafetyStockTableDataLoader ||
            props.constraintsSafetyStockTableConfigLoader
          }
          minHeight={"260px"}
        >
          {render && (
            <div ref={allocationRef}>
              <AgGridComponent
                columns={safetyStockTableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                selectAllHeaderComponent={true}
                hideSelectAllRecords={false}
                onBlur={onBlur}
                loadTableInstance={loadTableInstance}
                rowSelection="multiple"
                rowModelType="serverSide"
                serverSideStoreType="partial"
                onRowSelected
                totalCount={safetyStockTableRowCount}
                cacheBlockSize={10}
                uniqueRowId={"id"}
                pagination={true}
                onSelectionChanged={onSelectionChanged}
                tableHeader={`Details`}
                topRightOptions={getTopRightOptions()}
                onCellValueChanged={onCellValueChanged}
                showDownloadButton={
                  !isEmpty(props?.userAccess) ? isUserHasDownloadAccess : true
                }
                onDownloadButtonClick={downloadCsv}
              />
            </div>
          )}
        </Loader>
        {openPopUp && (
          <SafetyStockSetAllPopUp
            setShowSetAllModal={setOpenPopUp}
            rowsData={selectedSetAllRows}
            setAll={updateSetAllData}
            setCheckAllSetAllRequest={setCheckAllSetAllRequest}
            agGridInstance={safetyStockTableGridInstance?.current}
            displaySnackMessages={displaySnackMessages}
            safetyStockRowId={SAFETY_STOCK_ROW_ID}
            SAFETY_STOCK_EDIT_API_KEYS={SAFETY_STOCK_EDIT_API_KEYS}
            SETALL_MAPPING={SETALL_MAPPING}
            SETALL_FORMDATA_FIELDS={SETALL_FORMDATA_FIELDS}
            EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING={
              EDITABLE_COLUMNS_TO_SAFETY_STOCK_METHOD_MAPPING
            }
          />
        )}
        {showSafetyStockGraph && (
          <SafetyStockGraphViewVendorStore
            setShowSetAllModal={setShowSafetyStockGraph}
            safetyStockGraphPayload={safetyStockGraphPayload}
            uniqueKeys={props?.constraintsConfig?.safety_stock_graph_keys_store}
          />
        )}
        {openPackConfig && (
          <PackConfigBottomSheet
            openPackConfigDetailSheet={openPackConfig}
            setOpenPackConfigDetailSheet={setOpenPackConfig}
            l1DisplayName={"Master SKU"}
            activeChildHierarchyKey={selectedStyle}
            screenName="replishment_status"
          />
        )}
      </Box>
    </CoreComponentScreen>
  );
};

const mapStateToProps = (store) => {
  return {
    constraintsLoader:
      store.omsReducer.orderingConstraintsService.constraintsLoader,
    selectedConstraintArticles:
      store.omsReducer.orderingConstraintsService.selectedConstraintArticles,

    constraintsOmsFilterDependency:
      store.omsReducer.orderingConstraintsService
        .constraintsOmsFilterDependency,
    filterDashboardConfigurationVendorStore:
      store.filterReducer.filterDashboardConfiguration[
        "ConstraintsOrderManagementFilterConfigurationVendorStore"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,

    constraintsConfig:
      store.omsReducer.orderingConstraintsService.omsConstraintsScreenConfig
        ?.safety_stock,

    constraintsSafetyStockTableDataLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsSafetyStockTableDataLoader,
    constraintsSafetyStockTableConfigLoader:
      store.omsReducer.orderingConstraintsService
        .constraintsSafetyStockTableConfigLoader,
    selectedOmsFilters:
      store.omsReducer.orderingConstraintsService.selectedOmsFilters,

    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService?.orderingVendorToStoreConfig
        ?.constraints?.safety_stock,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig?.constraints
        ?.safety_stock,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_store,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  getConstraintOmsFilterConfigurationVendorStore: (payload) =>
    dispatch(getConstraintOmsFilterConfigurationVendorStore(payload)),
  setConstraintsOmsLoader: (payload) =>
    dispatch(setConstraintsOmsLoader(payload)),
  setConstraintsOmsFilterDependency: (payload) =>
    dispatch(setConstraintsOmsFilterDependency(payload)),
  setConstraintsArticles: (payload) =>
    dispatch(setConstraintsArticles(payload)),

  resetConstraintsState: (payload) => dispatch(resetConstraintsState(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  setConstraintsOmsFilterElements: (payload) =>
    dispatch(setConstraintsOmsFilterElements(payload)),
  setSelectedOmsFilters: (payload) => dispatch(setSelectedOmsFilters(payload)),
  resetSelectedOmsFilters: () => dispatch(resetSelectedOmsFilters()),
  getConstraintsSafetyStockVendorStoreTableConfig: (payload) =>
    dispatch(getConstraintsSafetyStockVendorStoreTableConfig(payload)),
  setConstraintsSafetyStockTableConfigLoader: (payload) =>
    dispatch(setConstraintsSafetyStockTableConfigLoader(payload)),
  setConstraintsSafetyStockTableDataLoader: (payload) =>
    dispatch(setConstraintsSafetyStockTableDataLoader(payload)),
  getConstraintsSafetyStockTableDataVendorStore: (payload) =>
    dispatch(getConstraintsSafetyStockTableDataVendorStore(payload)),
  getConstraintsSafetyStockDataVendorStore: (payload) =>
    dispatch(getConstraintsSafetyStockDataVendorStore(payload)),
  setConstraintsSetAllSuccess: (payload) =>
    dispatch(setConstraintsSetAllSuccess(payload)),
  getConstraintsSafetyStockTableDownloadData: (payload) =>
    dispatch(getConstraintsSafetyStockTableDownloadData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SafetyStockForVendorStore);

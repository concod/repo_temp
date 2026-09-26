import React, { useEffect, useRef, useState, useMemo } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import TableSkeletonOverlay from "modules/oms/pages-oms/common/TableSkeletonOverlay";
import { Button, Alert } from "impact-ui-v3";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { useStyles as useOrderingStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { cloneDeep, isEmpty } from "lodash";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import SafetyStockGraphView from "modules/oms/pages-oms/common/SafetyStockGraphView";
import SafetyStockSparklineCell, {
  SafetyStockGraphPopover,
} from "modules/oms/pages-oms/common/SafetyStockSparklineCell";
import SafetyStockSetAllPopUp from "./safetyStockSetAllPopUp";
import { scrollIntoView } from "modules/oms/utils-oms/oms-utility";
import {
  defaultTableData,
  ERROR_MESSAGE,
  UPDATED_MESSAGE,
  NO_DATA_FOUND,
  tableConfigurationMetaData,
  FILE_DOWNLOADING_MESSAGE,
  FILE_DOWNLOADING_MESSAGE_OMS_CONSTRAINTS,
  NO_EDIT_TO_SAVE,
  INVALID_VALUE_MESSAGE,
  OMS_CONSTRAINTS_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  getConstraintsSafetyStockTableConfig,
  setConstraintsSafetyStockTableConfigLoader,
  setConstraintsSafetyStockTableDataLoader,
  getConstraintsSafetyStockTableData,
  getConstraintsSafetyStockData,
  setConstraintsSetAllSuccess,
  getConstraintsSafetyStockTableDownloadData,
} from "modules/oms/services-oms/Constraints/constraints-services";
import { OMS_WOS_VALIDATION_ERROR } from "modules/oms/constants-oms/stringConstants";
import { getValidCheckConfiguration } from "../utils";
import {
  getViewportPageSize,
  getGridHeightForRowCount,
  GRID_HEIGHT_CAP,
} from "modules/oms/utils-oms/agGridPageSize";
import "../../common/agGridHugCard.css";

const SafetyStockTable = (props) => {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const orderingClasses = useOrderingStyles();

  const pageSize = useMemo(getViewportPageSize, []);

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
  const [sparklinePopupState, setSparklinePopupState] = useState(null);
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
  const [alertMessage, setAlertMessage] = useState(null);
  const [alertVariant, setAlertVariant] = useState("info");
  const [listTableColumns, setListTableColumns] = useState([]);

  // user access for safety stock
  const constraintsAccess = props.userAccess?.find(
    (item) =>
      item.module === "constraints_safety_stock" &&
      item.screen === OMS_CONSTRAINTS_SCREENNAME_KEY
  );
  const canEdit = constraintsAccess?.isEditButton || false;
  const canSetAll = constraintsAccess?.isSetAllButton || false;
  const canDownload = constraintsAccess?.isDownloadButton || true;

  const SAFETY_STOCK_ROW_ID = props?.screenConfig?.unique_key || "id";
  const SAFETY_STOCK_PRIMARY_KEY = props?.screenConfig?.primary_key || "id";

  const SAFETY_STOCK_EDIT_API_KEYS = props?.screenConfig?.edit_api_keys || [];

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

  const SERVICE_LEVEL_MAX_VALUE =
    props?.screenConfig?.service_level_max_value || 99;
  const SERVICE_LEVEL_MIN_VALUE =
    props?.screenConfig?.service_level_min_value || 50;

  const IS_WOS_VALIDATION_REQUIRED_WHEN_DISABLED =
    props?.screenConfig?.is_wos_validation_required_when_disabled;

  const safetyStockGraphKeysRef = useRef();
  safetyStockGraphKeysRef.current =
    props?.constraintsConfig?.safety_stock_graph_keys;
  const safetyStockPlotBandsRef = useRef();
  safetyStockPlotBandsRef.current =
    props?.screenConfig?.safety_stock_plot_bands;

  const isSafetyStockGraphColumn = (col) => {
    const label = (col?.label || "").toLowerCase();
    const name = (col?.column_name || "").toLowerCase();
    return (
      (label.includes("safety stock") && label.includes("service level")) ||
      (name.includes("safety_stock") && name.includes("service_level"))
    );
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
        if (col.type === "percentage") {
          col.type = "int";
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
    const fetchColumnConfig = async () => {
      setIsHide(true);
      props.setConstraintsSafetyStockTableConfigLoader(true);
      let columns = await props.getConstraintsSafetyStockTableConfig({});

      //Fetch List Columns
      const dropdownColumns = columns?.data?.data
        ?.filter((item) => item.extra && Array.isArray(item.extra.options))
        .reduce((acc, item) => {
          acc[item.column_name] = item.extra.options;
          return acc;
        }, {});

      let cols = columns?.data?.data?.map((item) => {
        if (item.column_name === "pack_config") {
          item.onClick = (tableInfo) => {
            setSelectedStyle(tableInfo?.cellData?.data?.article || {});
            setOpenPackConfig(true);
          };
        } else {
          item.onClick = (tableInfo) => {
            onClickColumn(tableInfo?.cellData?.data || {});
          };
          item.extra = { ...item.extra, isHyphenDisplayedForEmpty: true };
          if(item.sub_headers && item.sub_headers.length > 0) {
            item.sub_headers.forEach((child) => {
              child.extra = { ...child.extra, isHyphenDisplayedForEmpty: true };
            });
          }
        }
      
        
        if (item.column_name === 'ss_vs_sl_graph') {
          item.is_editable = false;
          item.cellRenderer = (params) => (
            <SafetyStockSparklineCell
              rowData={params?.data}
              uniqueKeys={safetyStockGraphKeysRef.current}
              onOpenPopup={setSparklinePopupState}
              />
          )
        }
        return item;
      });

      let updatedCols = checkForEditability(cols);
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
      setListTableColumns(dropdownColumns);
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

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setConstraintsSafetyStockTableDataLoader(true);
      const selection = {
        data: getValidCheckConfiguration(
          safetyStockTableGridInstance?.current?.api?.checkConfiguration
        ),
        unique_columns: ["id"],
      };

      let body = {
        filters: [...props.selectedOmsFilters],
        meta: manualbody
          ? {
              ...manualbody,
              sort: [
                manualbody?.sort.length > 0
                  ? manualbody.sort[0]
                  : { column: SAFETY_STOCK_PRIMARY_KEY, order: "asc" },
              ],
              limit: { limit: pageSize, page: pageIndex + 1 },
            }
          : {
              search: [],
              sort: [],
              range: [],
              limit: { limit: pageSize, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
        selection,
      };
      setManualBodyData(body?.meta);
      let response = await props.getConstraintsSafetyStockTableData(body);

      if (response.data.status) {
        let mappedData = cloneDeep(response.data.data);
        mappedData.forEach((item) => {
          if (!isUserHasEditAccess) {
            for (const columnName in listTableColumns) {
              if (item.hasOwnProperty(columnName)) {
                let mappedOptions = listTableColumns[columnName].filter(
                  (option) => "value" in option
                );
                if (!mappedOptions?.length) {
                  mappedOptions = listTableColumns[columnName];
                }
                if (mappedOptions?.length) {
                  const matchedOption = mappedOptions.find(
                    (option) => option.value === item[columnName]
                  );
                  if (matchedOption)
                    item[columnName] = matchedOption?.label ?? item[columnName];
                }
              }
            }
          }
          if (item.pack_config) {
            item.pack_config = "View Pack Config";
          } else {
            item.pack_config = "-";
          }

        });

        setTotalCount(response.data.total);
        let formatedData = agGridRowFormatter(
          mappedData,
          getValidCheckConfiguration(params?.api?.checkConfiguration),
          "id"
        );
        setSafetyStockTableRowCount(formatedData.length);

        formatedData.forEach((val) => {
          val.order_quantity_copy = val.order_quantity;
          val.service_level_percentage = val.service_level_pct;
        });

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
        if (
          !data?.is_wos_demand_disabled &&
          !IS_WOS_VALIDATION_REQUIRED_WHEN_DISABLED
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
    setTimeout(() => {
      props.addSnack({
        message: message,
        options: {
          variant: variance,
          autoHideDuration: 8000, // 8 seconds
          key: `safety-stock-${Date.now()}`, // Unique key to prevent duplicates
        },
      });
    }, 100);
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

  // Calling API for Edits on Table
  const editSaveData = async () => {
    try {
      if (safetyStockPayload.length !== 0) {
        //Validation Check
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
                  setAlertMessage(
                    inputField?.validation_message || INVALID_VALUE_MESSAGE
                  );
                  setAlertVariant("info");
                  isValidationMessageDisplayed = true;
                  setTimeout(() => {
                    setAlertMessage(null);
                  }, 5000);
                }
              }
              if (
                inputField?.max_value &&
                tableRow[inputField?.accessor] > inputField?.max_value
              ) {
                isValuesInvalid = true;
                if (inputField?.validation_message) {
                  setAlertMessage(
                    inputField?.validation_message || INVALID_VALUE_MESSAGE
                  );
                  setAlertVariant("info");
                  isValidationMessageDisplayed = true;
                  setTimeout(() => {
                    setAlertMessage(null);
                  }, 5000);
                }
              }
              if (
                inputField?.no_negative_values &&
                tableRow[inputField?.accessor] < 0
              ) {
                isValuesInvalid = true;
                if (inputField?.validation_message) {
                  setAlertMessage(
                    inputField?.validation_message || INVALID_VALUE_MESSAGE
                  );
                  setAlertVariant("info");
                  isValidationMessageDisplayed = true;
                  setTimeout(() => {
                    setAlertMessage(null);
                  }, 5000);
                }
              }
              if (inputField?.field_type === "IntegerField") {
                if (checkInValidNumber(tableRow[inputField?.accessor])) {
                  isValuesInvalid = true;
                  if (inputField?.validation_message) {
                    setAlertMessage(
                      inputField?.validation_message || INVALID_VALUE_MESSAGE
                    );
                    setAlertVariant("info");
                    isValidationMessageDisplayed = true;
                    setTimeout(() => {
                      setAlertMessage(null);
                    }, 5000);
                  }
                }
              }
            }
          });
        });
        if (isValuesInvalid && !isValidationMessageDisplayed) {
          setAlertMessage(INVALID_VALUE_MESSAGE);
          setAlertVariant("info");
          setTimeout(() => {
            setAlertMessage(null);
          }, 5000);
          return;
        }

        let body = {
          orders: safetyStockPayload,
          keys: SAFETY_STOCK_EDIT_API_KEYS,
        };
        let response = await props.getConstraintsSafetyStockData(body);
        if (response.data.status) {
          setSafetyStockPayload([]);
          safetyStockEditPayload.current = [];
          setAlertMessage(response.data?.message || UPDATED_MESSAGE);
          setAlertVariant("success");
          props.setConstraintsSetAllSuccess(true);
          safetyStockTableGridInstance?.current?.api?.deselectAll(true);
          safetyStockTableGridInstance?.current?.api?.setCheckConfiguration([]);
          setIsHide(true);
          setRender(false);
          setTimeout(() => {
            setAlertMessage(null);
          }, 5000);
        } else {
          setAlertMessage(response.data?.message || ERROR_MESSAGE);
          setAlertVariant("error");
          setTimeout(() => {
            setAlertMessage(null);
          }, 5000);
        }
      } else {
        setAlertMessage(NO_EDIT_TO_SAVE);
        setAlertVariant("info");
        setTimeout(() => {
          setAlertMessage(null);
        }, 5000);
      }
    } catch (err) {
      setAlertMessage(ERROR_MESSAGE);
      setAlertVariant("error");
      safetyStockTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      setIsHide(true);
      setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
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

  // Calling API for Set All Functionality
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
      let response = await props.getConstraintsSafetyStockData(body);
      if (response.data.status) {
        setSafetyStockPayload([]);
        setSelectedSetAllRows([]);
        safetyStockEditPayload.current = [];
        setAlertMessage(response.data?.message || UPDATED_MESSAGE);
        setAlertVariant("success");
        props.setConstraintsSetAllSuccess(true);
        safetyStockTableGridInstance?.current?.api?.deselectAll(true);
        safetyStockTableGridInstance?.current?.api?.setCheckConfiguration([]);
        setButtonEnabled(false);
        setIsHide(true);
        safetyStockTableGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
        setRender(false);
        setTimeout(() => {
          setAlertMessage(null);
        }, 5000);
        return true;
      } else {
        setAlertMessage(response.data?.message || ERROR_MESSAGE);
        setAlertVariant("error");
        setTimeout(() => {
          setAlertMessage(null);
        }, 5000);
        return false;
      }
    } catch {
      setAlertMessage(ERROR_MESSAGE);
      setAlertVariant("error");
      setTimeout(() => {
        setAlertMessage(null);
      }, 5000);
      return false;
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
          // let downloadData;
          // downloadData = agGridRowFormatter(response.data.data);
          // setCsvData(cloneDeep(downloadData), csvHeaders);
          // displaySnackMessages("Successfully Download", "success");
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

    if (selectedSetAllRows?.length > 1) {
      options.push(
        <div>
          <Button
            variant="primary"
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

    if (!isUpdateDisabled) {
      options.push(
        <>
          <div>
            <Button
              variant="primary"
              color="primary"
              className={classes.button}
              onClick={editSaveData}
              disabled={isUpdateDisabled}
            >
              Update
            </Button>
          </div>
        </>
      );
    }

    return options;
  };

  const getTopCenterOptions = () => {
    if (alertMessage) {
      return (
        <Alert
          severity={alertVariant}
          title={alertMessage}
          onClose={() => setAlertMessage(null)}
        ></Alert>
      );
    }
    return null;
  };

  return (
    <div className={globalClasses.marginVertical1rem}>
      <TableSkeletonOverlay
        loading={
          props.constraintsSafetyStockTableDataLoader ||
          props.constraintsSafetyStockTableConfigLoader
        }
        minHeight={GRID_HEIGHT_CAP}
        columns={safetyStockTableColumns.length || 7}
        columnDefs={safetyStockTableColumns}
        agGridInstance={safetyStockTableGridInstance}
        title="Details"
        showSelectAllColumn={true}
      >
        {render && (
          <div ref={allocationRef} className={orderingClasses.suppressLoadingRowHover}>
            <AgGridComponent
              height={getGridHeightForRowCount(totalCount, pageSize)}
              disableSkeletonLoader={false}
              customClass={`${orderingClasses.customDisabledInputCell} hug-card-bottom-padding`}
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
              totalCount={safetyStockTableRowCount} // to set the total count once received from BE
              cacheBlockSize={pageSize}
              paginationPageSize={pageSize}
              uniqueRowId={"id"}
              pagination={true}
              disablePaginationForSinglePage={true}
              onSelectionChanged={onSelectionChanged}
              tableHeader={`Details`}
              topRightOptions={getTopRightOptions()}
              topCenterOptions={getTopCenterOptions()}
              onCellValueChanged={onCellValueChanged}
              showDownloadButton={
                !isEmpty(props?.userAccess) ? isUserHasDownloadAccess : true
              }
              onDownloadButtonClick={downloadCsv}
            />
          </div>
        )}
      </TableSkeletonOverlay>
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
        <SafetyStockGraphView
          setShowSetAllModal={setShowSafetyStockGraph}
          safetyStockGraphPayload={safetyStockGraphPayload}
          uniqueKeys={props?.constraintsConfig?.safety_stock_graph_keys}
        />
      )}
      <SafetyStockGraphPopover
        popupState={sparklinePopupState}
        uniqueKeys={safetyStockGraphKeysRef.current}
        plotBands={safetyStockPlotBandsRef.current}
        onClose={() => setSparklinePopupState(null)}
      />
      {openPackConfig && (
        <PackConfigBottomSheet
          openPackConfigDetailSheet={openPackConfig}
          setOpenPackConfigDetailSheet={setOpenPackConfig}
          l1DisplayName={"Master SKU"}
          activeChildHierarchyKey={selectedStyle}
          screenName="replishment_status"
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
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

    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig?.constraints
        ?.safety_stock,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getConstraintsSafetyStockTableConfig: () =>
    dispatch(getConstraintsSafetyStockTableConfig()),
  getConstraintsSafetyStockTableData: (payload) =>
    dispatch(getConstraintsSafetyStockTableData(payload)),
  getConstraintsSafetyStockTableDownloadData: (payload) =>
    dispatch(getConstraintsSafetyStockTableDownloadData(payload)),
  setConstraintsSafetyStockTableConfigLoader: (payload) =>
    dispatch(setConstraintsSafetyStockTableConfigLoader(payload)),
  setConstraintsSafetyStockTableDataLoader: (payload) =>
    dispatch(setConstraintsSafetyStockTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  getConstraintsSafetyStockData: (payload) =>
    dispatch(getConstraintsSafetyStockData(payload)),
  setConstraintsSetAllSuccess: (payload) =>
    dispatch(setConstraintsSetAllSuccess(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SafetyStockTable);

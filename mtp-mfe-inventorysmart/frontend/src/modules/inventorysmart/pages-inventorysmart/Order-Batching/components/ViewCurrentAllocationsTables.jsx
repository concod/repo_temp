import React from "react";
import { addSnack } from "core/actions/snackbarActions";
import moment from "moment";
import { useEffect, useMemo, useRef, useState, useContext } from "react";
import { connect } from "react-redux";

import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";

import { Button, Prompt, Switch, useTranslation } from "impact-ui-v3";
import { cloneDeep, isEmpty, isObject } from "lodash";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  DIALOG_CANCEL_BTN_TEXT,
  DIALOG_FINALIZE_BTN_TEXT,
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  DIALOG_CONFIRM_BTN_TEXT,
  EDIT_DELIVERY_DATE_PROMPT_SUBHEADING,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  setInventorySmartFinalizeFilterDependency,
  setRedirectedFrom,
  setSelectedFilters,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  autoFinalizeOrderBatchingData,
  finalizeOrderBatchingData,
  getOrderBatchingTableConfiguration,
  getOrderBatchingTableData,
  setInventorysmartOrderBatchingTableConfigLoader,
  setInventorysmartOrderBatchingTableDataLoader,
  setInventorysmartReloadOrderBatchingData,
  setInventorysmartUpdateOrderBatchingLoader,
  setOrderBatchingTableConfig,
  setOrderBatchingTableData,
  updateOrderBatchingData,
  setIsFiltersValid,
  setEditModeEnabledOnDetails,
  getOrderBatchingSummary,
  setDisplaySummaryOnUpdate,
  resetAllTablesToDefault,
  saveOrderBatchingSession,
  setInventorysmartOrderBatchingMetricsLoader,
  fetchLockStatus,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import OrderBatchingSetAllModal from "./OrderBatchingSetAllModal";
import { generateXMLDataForDownload } from "../../Finalize-Allocation";
import {
  uploadInv,
  uploadPO,
} from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import {
  canTakeActionOnModules,
  filterByProperties,
  removeDuplicatesByProperty,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { useCallback } from "react";
import { isNonPrimitiveArray } from "../../Create-Allocation/helperFunctions";
import { useNavigate } from "react-router-dom-v5-compat";
import DownloadButton from "../../Common/components/Download";
import { getObjectsAfterCheckAll } from "../../StoreInventoryAlerts/components/AlertsActionPopup";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { getOutboundExport } from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { OrderBatchingContext } from "../index.js";
import NewOrderBatchingSummarySetAll from "./NewOrderBatchingSummarySetAll";
import { getProgressBarCellStyle } from "./orderBatchingHelperFunctions";
import NewOrderBatchingSummaryPopUp from "./NewOrderBatchingSummaryPopup";
import {
  fetchSetAllLimits,
  mapFiltersForAiSmartFilter,
} from "../../inventorysmart-utility";
import { setOrderBatchingFilterDetails, setSelectedFiltersInOrderBatching } from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import NewOrderBatchingEditedByPopup from "./NewOrderBatchingEditedByPopup";
import AiSmartFilterButton from "../../Decision-Dashboard/components/AiSmartFilterButton";
import AiSmartFilterChips from "../../Decision-Dashboard/components/AiSmartFilterChips";
import useAiSmartFilterChips from "../../Decision-Dashboard/components/useAiSmartFilterChips";
import { AI_SMART_FILTER_OB_STYLE_COLOR_STORE_LEVEL_DETAILS } from "../../Decision-Dashboard/components/aiSmartFilterDummyConstants";
import AvailableToAllocate from "./Available-To-Allocate";
import { checkATAExceedance, autoAdjustATA } from "modules/inventorysmart/services-inventorysmart/Order-Batching/ata-services";

const ViewCurrentAllocationsTables = (props) => {
  const {
    selectedOption,
    sessionId,
    createdAtDate,
    setSelectedOption,
    handlePostLockRelease,
    partialFinalize,
    ensureFreshCacheKey,
  } = useContext(OrderBatchingContext);
  // Create refs for selectedOption, sessionId, and createdAtDate
  const selectedOptionRef = useRef(selectedOption);
  const sessionIdRef = useRef(sessionId);
  const createdAtDateRef = useRef(createdAtDate);
  const isViewModeRef = useRef(props.isViewMode);

  const globalClasses = globalStyles();
  const classes = useStyles();
  const aiChips = useAiSmartFilterChips();
  const { t } = useTranslation();
  const articleTableGridInstance = useRef(null);
  const cache_keyRef = useRef(null);
  const filterDependency = useRef(null);
  const [orderBatchingTableColumns, setOrderBatchingTableColumns] = useState(
    []
  );
  const [showEditWarningPopup, setShowEditWarningPopup] = useState(false);
  const [editedByPopup, setEditedByPopup] = useState(false);
  const [lockAcquiredBy, setLockAcquiredBy] = useState("");
  const [blockEdit, setBlockEdit] = useState(true);
  const [updatedRowEdits, setUpdatedRowEdits] = useState([]);
  const upatedRowEditInstance = useRef([]);
  const [orderTypeOptions, setOrderTypeOptions] = useState([]);
  const [selectedArticles, setSelectedArticles] = useState([]);
  const [showFinalizePopup, setShowFinalizePopup] = useState(false);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [filterData, setFilterData] = useState({});
  const [initialTableData, setInitialTableData] = useState([]);
  const [formData, setFormData] = useState({});
  const [payloadBody, setPayloadBody] = useState({});
  const [concatAlertMessage, setConcatAlertMessage] = useState("");
  const [editValuesModalOpen, setEditValuesModalOpen] = useState(false);
  const [openDetailsSetAllModelOpen, setOpenDetailsSetAllModelOpen] = useState(
    false
  );
  const [negativeCapacityOnly, setNegativeCapacityOnly] = useState(false);
  const [setAllLimits, setSetAllLimits] = useState({});
  const [showInfoPrompt, setShowInfoPrompt] = useState(false);
  const [showSummaryPopUp, setShowSummaryPopUp] = useState(false);

  // ATA Exceedance Check states
  const [ataExceedanceCheckEnabled, setAtaExceedanceCheckEnabled] = useState(false);
  const [showATAComponent, setShowATAComponent] = useState(false);
  const [ataData, setAtaData] = useState(null);
  const [ataCheckLoading, setAtaCheckLoading] = useState(false);

  const orderBatchingDataRef = useRef([]);
  const capacityBreachOnlyRef = useRef({});
  const lastRequestBodyRef = useRef({});
  const filterDashboardConfigurationRef = useRef(null);
  const selectedFiltersFromReducerRef = useRef(null);
  const navigate = useNavigate();

  // Keep refs in sync with latest values
  useEffect(() => {
    selectedOptionRef.current = selectedOption;
  }, [selectedOption]);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);
  useEffect(() => {
    createdAtDateRef.current = createdAtDate;
  }, [createdAtDate]);
  useEffect(() => {
    capacityBreachOnlyRef.current = negativeCapacityOnly;
  }, [negativeCapacityOnly]);
  useEffect(() => {
    isViewModeRef.current = props.isViewMode;
  }, [props.isViewMode]);
  const hasEditAccess = () => {
    const canEdit = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_ORDER_BATCHING,
      "edit",
      props?.modulePermissions,
      props?.module
    );
    return canEdit;
  };
  const redirectToFinalizeScreen = (value) => {
    props.setSelectedFilters(props.selectedFilters);
    props.setRedirectedFrom("Order Batching");
    props.setInventorySmartFinalizeFilterDependency(
      props.inventorysmartOrderBatchingFilterDependency
    );
    props.setOrderBatchingFilterDetails({...props?.filterDashboardConfiguration.orderBatchingFilterConfiguration})
    props.setSelectedFiltersInOrderBatching({...props?.selectedFiltersFromReducer})
    setTimeout(() => {
      navigate(
        `${CREATE_ALLOCATION}?step=2&allocation_code=${value.allocation_code}`,
        { state: { isRedirectedFrom: "orderBatching" } }
      );
    }, 100);
  };
  const loadTableInstance = (params) => {
    articleTableGridInstance.current = params;
  };
  const actionMap = {
    allocation_name: redirectToFinalizeScreen,
  };

  const uploadMapping = {
    po: props.uploadPO,
    invn: props.uploadInv,
  };

  useEffect(() => {
    getTopRightOptions(editValuesModalOpen);
  }, [editValuesModalOpen]);

  const autoGroupColumnDef = useMemo(() => {
    return {
      headerValueGetter: (params) => `${params.colDef.headerName}`,
      minWidth: 220,
      cellRendererParams: {
        suppressCount: true,
      },
    };
  }, []);

  const updateEditedRowState = (data, changedColumnName = null) => {
    let cloneRefInstance = cloneDeep(upatedRowEditInstance.current);
    const existingIndex = cloneRefInstance.findIndex(
      (obj) => obj.unique_key === data.unique_key
    );
    
    if (existingIndex !== -1) {
      // update existing object and track changed columns
      cloneRefInstance[existingIndex] = { ...cloneRefInstance[existingIndex], ...data };
      if (changedColumnName) {
        if (!cloneRefInstance[existingIndex].changedColumns) {
          cloneRefInstance[existingIndex].changedColumns = [];
        }
        if (!cloneRefInstance[existingIndex].changedColumns.includes(changedColumnName)) {
          cloneRefInstance[existingIndex].changedColumns.push(changedColumnName);
        }
      }
      setUpdatedRowEdits(cloneRefInstance);
    } else {
      // create new object with changed columns tracking
      const newData = { ...data };
      if (changedColumnName) {
        newData.changedColumns = [changedColumnName];
      }
      setUpdatedRowEdits((prevState) => [...prevState, newData]);
    }
  };
  const applySetAll = async (data) => {
    try {
      data.delivery_dt = data.delivery_dt
        ? moment(data.delivery_dt).format("MM/DD/YYYY")
        : null;
      let payload = {};
      let l_userActions = getObjectsAfterCheckAll(
        articleTableGridInstance.current?.api?.checkConfiguration
      );
      payload.cache_key = cache_keyRef.current || props.cache_key;
      payload.row_update = [];
      payload.filters = [...filterDependency.current];
      payload.meta = payloadBody.meta;
      payload.is_set_all = true;
      payload["values"] = {
        ...data,
      };
      if (isEmpty(l_userActions)) {
        payload.included = articleTableGridInstance.current.api
          .getSelectedNodes()
          .map((row) => {
            return row.data;
          })
          .map((item) => item.unique_key);
        payload.excluded = [];
      } else {
        let l_userActionClubbed = l_userActions.reduce(
          (result, obj) => Object.assign(result, obj),
          {}
        );
        if (l_userActionClubbed?.unCheckedRows) {
          payload.excluded = l_userActionClubbed?.unCheckedRows.map((item) =>
            Number(item)
          );
          payload.included = [];
        } else {
          payload.excluded = [];
          payload.included = [];
        }
      }
      let response = await props.updateOrderBatchingData(payload);
      if (response.data.status) {
        setUpdatedRowEdits([]);
        displaySnackMessages(
          t("inventorysmart.obAllocationDataUpdated"),
          "success"
        );
        props.setInventorysmartReloadOrderBatchingData(true);
        setButtonEnabled(false);
        articleTableGridInstance.current.api.deselectAll(true);
        setTimeout(() => {
          props.setInventorysmartReloadOrderBatchingData(false);
        }, 1000);
        return true;
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return false;
    }
  };
  const onCellValueChanged = (params) => {
    const { data, colDef } = params;
    updateEditedRowState(data, colDef.field);
  };

  const onBlur = (e, data, column, isChanged, value, initialValue) => {
    if (
      (column.colId === "store_product_level_eaches" ||
        column.colId === "store_product_level_packs") &&
      isChanged
    ) {
      let currentValue = data[column.colId];
      if (props.orderBatchingConfig?.allow_allocation_increase) {
        const available = data[`${column.colId}_available`];
        const maxLimit =
          available === null || available === undefined
            ? null
            : (Number(data[`${column.colId}_original`]) || 0) +
              Number(available);
        if (maxLimit !== null && currentValue > maxLimit) {
          displaySnackMessages(
            t("inventorysmart.obInputCappedToMaxLimit"),
            "warning"
          );
          data[column.colId] = maxLimit;
        }
        updateEditedRowState(data, column.colId);
      } else {
        let oldValue = orderBatchingDataRef.current?.find(
          (item) => item.unique_key === data.unique_key
        )?.[column.colId];
        if (currentValue > oldValue) {
          displaySnackMessages(
            t("inventorysmart.obNewValueGreaterThanInitial"),
            "warning"
          );
          data[column.colId] = oldValue;
        } else {
          updateEditedRowState(data, column.colId);
        }
      }
      articleTableGridInstance.current?.api?.refreshCells({
        columns: [column.colId],
      });
    }
    else if (isChanged) {
      updateEditedRowState(data, column.colId);
      articleTableGridInstance.current?.api?.refreshCells({
        columns: [column.colId],
      });
    }
  };

  useEffect(() => {
    if (props.orderBatchingTableData?.length > 0) {
      orderBatchingDataRef.current = props.orderBatchingTableData;
    }
  }, [props.orderBatchingTableData]);

  useEffect(() => {
    if (!isEmpty(updatedRowEdits))
      upatedRowEditInstance.current = cloneDeep(updatedRowEdits);
    setConcatAlertMessage(
      updatedRowEdits.length
        ? "\n You Have some unsaved changes.Those will be discarded"
        : ""
    );
  }, [updatedRowEdits]);

  useEffect(() => {
    if (
      props?.orderBatchingConfig?.showPlanFilter
    ) {
      setConcatAlertMessage(
        "Only the plans selected in the filter will be eligible for finalization"
      );
    }
  }, [
    props?.orderBatchingConfig?.showPlanFilter,
  ]);

  // update cache key ref when selected tab option changes(levis)
  useEffect(() => {
    cache_keyRef.current = props.cache_key;
  }, [props.cache_key]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      cache_keyRef.current = props.cache_key;
      filterDependency.current = props.selectedFilters;
      articleTableGridInstance?.current?.api?.setFilterModel(null);
      articleTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
      articleTableGridInstance?.current?.api?.deselectAll(true);
      showEditValuesModal && disableDetailsTableEdit();
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    props.inventorysmartReloadOrderBatchingData &&
      articleTableGridInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
    articleTableGridInstance?.current?.api?.setFilterModel(null);
    articleTableGridInstance?.current?.api?.deselectAll(true);
  }, [props.inventorysmartReloadOrderBatchingData]);

  // Sync ata_exceedance_check_enabled from orderBatchingConfig
  useEffect(() => {
    if (props.orderBatchingConfig?.ata_exceedance_check_enabled !== undefined) {
      setAtaExceedanceCheckEnabled(
        props.orderBatchingConfig.ata_exceedance_check_enabled
      );
    }
  }, [props.orderBatchingConfig?.ata_exceedance_check_enabled]);

  useEffect(() => {
    if (props.editModeEnabledOnSummary) {
      showEditValuesModal(false);
    }
  }, [props.editModeEnabledOnSummary]);

  const uploadXML = async (p_output) => {
    try {
      let l_uploadableFiles =
        props?.finalizeAllocationConfig?.upload;
      let l_apis = [];
      let l_xmlData = generateXMLDataForDownload(p_output);
      for (let i of l_uploadableFiles) {
        l_apis.push(p_output[i] ? uploadMapping[i](l_xmlData[i]) : null);
      }
      Promise.all(l_apis)
        .then((values) => {
          displaySnackMessages(
            t("inventorysmart.obFilesUploadedSuccess"),
            "success"
          );
        })
        .catch((error) => {
          displaySnackMessages(t("inventorysmart.obFilesUploadError"), "error");
        });
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const updateOrderStatus = async (articles, status) => {
    try {
      props.setInventorysmartUpdateOrderBatchingLoader(true);

      let changedArticles = [...articles];
      const orderArticles = changedArticles?.map((item) => {
        let reqObj = {
          store: item.store,
          allocation_code: item.allocation_code,
          delivery_dt: item?.delivery_dt
            ? moment(item.delivery_dt).format("MM/DD/YYYY")
            : null,
          order_priority: item?.order_priority?.value
            ? item.order_priority.value
            : item.order_priority,
        };
        if (item.article) {
          reqObj.article = item.article;
        } else {
          reqObj.style = item.style;
        }
        return reqObj;
      });

      let allocationName = props.allocationName;

      if (props.isNameMandatory && !allocationName) {
        displaySnackMessages(
          t("inventorysmart.obEnterAllocationPlanName"),
          "error"
        );
        props.setInventorysmartUpdateOrderBatchingLoader(false);
        return;
      }

      let payload = {};
      if (status === 2) {
        payload.cache_key = cache_keyRef.current;
        payload.row_update = [...orderArticles];
        payload["values"] = {};
        payload.filters = [...filterDependency.current];
        payload.meta = payloadBody.meta;

        payload.is_set_all = false;
        payload.included = [];
        payload.excluded = [];
        let response = await props.updateOrderBatchingData(payload);
        if (response.data.status) {
          setUpdatedRowEdits([]);
          displaySnackMessages(
          t("inventorysmart.obAllocationDataUpdated"),
          "success"
        );
          props.setInventorysmartUpdateOrderBatchingLoader(false);
          props.setInventorysmartReloadOrderBatchingData(true);
          setButtonEnabled(false);
          setTimeout(() => {
            props.setInventorysmartReloadOrderBatchingData(false);
          }, 1000);
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
          props.setInventorysmartUpdateOrderBatchingLoader(false);
        }
      }
      if (status === 3) {
        let payload = {};
        payload.filters = [...filterDependency.current];
        payload.meta = payloadBody.meta;
        payload.cache_key = cache_keyRef.current;
        const finalizeResponse = await props.finalizeOrderBatchingData(payload);
        if (!finalizeResponse.data?.status) {
          const err_msg = finalizeResponse?.data?.message;
          displaySnackMessages(err_msg, "error");
          props.setInventorysmartUpdateOrderBatchingLoader(false);
        } else {
          if (!isEmpty(finalizeResponse?.data?.data?.output)) {
            uploadXML(finalizeResponse.data.data.output);
          }

          displaySnackMessages(
            t("inventorysmart.obAllocationFinalized"),
            "success"
          );
          setUpdatedRowEdits([]);
          props.setInventorysmartUpdateOrderBatchingLoader(false);
          setButtonEnabled(false);
          props.setIsFiltersValid(false);
        }
      }
    } catch (err) {
      let err_msg =
        err?.response?.status == 412
          ? t("inventorysmart.obPlanAlreadyFinalized")
          : ERROR_MESSAGE;
      displaySnackMessages(
        err_msg,
        err.response.status == 412 ? "info" : "error"
      );
      props.setInventorysmartUpdateOrderBatchingLoader(false);
    }
  };

  const handleSave = () => {
    updateOrderStatus(updatedRowEdits, 2);
  };


   const callRefreshLock = async () => {
      try {
        let response = await props.fetchLockStatus({
          filters: props.selectedFilters,
          operation_type_id: 1,
          status: 2
        });
        let responseData = response.data?.data;
        // check for lock_received key in the response, if lock_received is true stay in edit mode else switch to view mode
        if (responseData?.lock_received) {
          displaySnackMessages(responseData?.message, "success");
        }
        setLockAcquiredBy(responseData?.lock_acquired_by);
        return responseData?.lock_received;
      } catch (e) {
        handleErrorMessage(e);
      } 
  };

  /**
   * ATA Exceedance Check: called when "Save & finalize" is clicked
   * If ata_exceedance_check_enabled is true, call the check API.
   * If has_violations is true, show the ATA component instead of finalize popup.
   * If has_violations is false, proceed with the normal finalize flow.
   */
  const handleATAExceedanceCheck = async () => {
    if (!ataExceedanceCheckEnabled) {
      // ATA check not enabled - proceed with normal finalize flow
      setShowFinalizePopup(true);
      return;
    }

    try {
      setAtaCheckLoading(true);
      const postBody = {
        session_id: sessionId,
        cache_key: cache_keyRef.current || props.cache_key,
        created_at: createdAtDate || new Date().toISOString().split("T")[0],
        filters: filterDependency.current || [],
        meta: {},
      };
      const response = await props.checkATAExceedance(postBody);
      const responseData = response?.data?.data;

      if (responseData?.has_violations) {
        setAtaData(responseData);
        setShowATAComponent(true);
      } else {
        // No violations - proceed with normal finalize flow
        setShowFinalizePopup(true);
      }
    } catch (err) {
      // On error, fall back to normal finalize flow
      displaySnackMessages(
        "Error checking ATA exceedance. Proceeding with finalize.",
        "warning"
      );
      setShowFinalizePopup(true);
    } finally {
      setAtaCheckLoading(false);
    }
  };

  /**
   * Auto-adjust handler passed to AvailableToAllocate.
   * Calls the auto-adjust API and returns the response data on success.
   */
  const handleAutoAdjust = async (violationKeys, adjustAll = false) => {
    const postBody = {
      session_id: sessionId,
      cache_key: cache_keyRef.current || props.cache_key,
      created_at: createdAtDate || new Date().toISOString().split("T")[0],
      filters: filterDependency.current || [],
      meta: {},
      adjust_all: adjustAll,
      violation_keys: violationKeys,
      allocation_codes_filter: null,
    };
    const response = await props.autoAdjustATA(postBody);
    const responseData = response?.data?.data;
    if (responseData) {
      setAtaData(responseData);
      props.setInventorysmartReloadOrderBatchingData(true);
      setTimeout(() => {
        props.setInventorysmartReloadOrderBatchingData(false);
      }, 1000);
      return responseData;
    }
    return null;
  };

  /**
   * Finalize plans from ATA modal — extends save-summary with finalize_mode + overrides.
   * TODO: Re-enable real API call once BE save-summary supports finalize_mode.
   */
  const handleFinalizePlans = async (finalizeMode, overrideAllocationCodes) => {
    try {
      props.setInventorysmartOrderBatchingMetricsLoader(true);
      const body = {
        session_id: sessionId,
        ...(createdAtDate && { created_at: createdAtDate }),
        cache_key: cache_keyRef.current,
        filters: [...filterDependency.current],
        finalize: true,
        finalize_mode: finalizeMode,
        override_allocation_codes: overrideAllocationCodes || [],
        meta: payloadBody?.meta || {},
      };
      const response = await props.saveOrderBatchingSession(body);
      if (response.data?.data?.save_trigger) {
        displaySnackMessages("Plans finalized successfully", "success");
        setShowATAComponent(false);
        setAtaData(null);
        handlePostLockRelease();
      } else {
        displaySnackMessages("Nothing to finalize", "warning");
      }
    } catch (err) {
      displaySnackMessages("Error finalizing plans", "error");
    } finally {
      props.setInventorysmartOrderBatchingMetricsLoader(false);
    }
  };

  const handleFinalizingOrder = async () => {
    const checkLock = await callRefreshLock();
    if(!checkLock){
      setEditedByPopup(true);
    }else{
      updateOrderStatus(props.orderBatchingTableData, 3);
    }
  };

  useEffect(() => {
    // Update refs with latest filter values
    filterDashboardConfigurationRef.current = props?.filterDashboardConfiguration;
    selectedFiltersFromReducerRef.current = props?.selectedFiltersFromReducer;
  }, [props.selectedFiltersFromReducer, props.inventorysmartOrderBatchingFilterDependency, props.filterDashboardConfiguration])
  
  const onTableCellClick = (params) => {
    try {
      const plan_code = params?.cellData?.data?.allocation_code;
      props.setOrderBatchingFilterDetails({
        ...filterDashboardConfigurationRef.current?.orderBatchingFilterConfiguration,
      });
      props.setSelectedFiltersInOrderBatching({
        ...selectedFiltersFromReducerRef.current,
      });
      setTimeout(() => {
        navigate(
          `/inventory-smart/create-allocation?step=2&allocation_code=${plan_code}`,
          { state: { isRedirectedFrom: "orderBatching" } }
        );
      }, 100);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const formatOrderBatchingTableColumns = (columns) => {
    let options = [];
    columns = columns?.map((column) => {
      if (column.column_name === "delivery_dt") {
        column.extra = {
          disablePast: true,
        };
        column.original_is_editable = column.is_editable;
        if (props.renderToggleSummary) {
          column.is_editable = false;
        }
      }
      if (column.column_name === "order_priority") {
        column.extra.options = column?.extra?.options || [];
        options = [...column.extra.options];
      }

      return column;
    });

    columns.forEach((eachCol) => {
      if (eachCol.type === "link" && eachCol.is_editable) {
        if (isViewModeRef.current) {
          eachCol.type = "str";
          eachCol.is_editable = false;
        } else {
          eachCol.onClick = onTableCellClick;
        }
      }
      if (eachCol.column_name === "store_percentage_to_capacity") {
        eachCol.styleProgressBar = getProgressBarCellStyle;
      }
      
      if (eachCol.type === "breach_progress") {
        eachCol.cellRenderer = (cellProps) => (
          <CellRenderers cellData={cellProps} column={eachCol} />
        );
      }
    });
    let formattedColumns = agGridColumnFormatter(columns, null, actionMap);
    setOrderBatchingTableColumns(formattedColumns);
    setOrderTypeOptions(options);
  };
  const onCellFocused = (params) => {
    if (!blockEdit) return;
    if (params.column.colId === "delivery_dt" && params.column.is_editable) {
      setShowEditWarningPopup(true);
    }
  };
  const setFilterOptions = (p_tableData) => {
    let l_uniqueAllocationCodes = removeDuplicatesByProperty(
      p_tableData,
      "allocation_code"
    );
    let l_uniqueUserId = removeDuplicatesByProperty(p_tableData, "user_id");
    setFilterData({
      allocationCodes: l_uniqueAllocationCodes?.map((val) => {
        return {
          label: val?.allocation_name,
          value: val?.allocation_code,
          id: val?.allocation_code,
        };
      }),
      userId: l_uniqueUserId?.map((val) => {
        return {
          label: val?.user_id,
          value: val?.user_id,
          id: val?.user_id,
        };
      }),
    });
  };
  useEffect(() => {
    if (!isEmpty(props.orderBatchingTableData)) {
      setFilterOptions(props.orderBatchingTableData);
    }
  }, [props.orderBatchingTableData]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selections = event.api.getSelectedRows();
    if (selections?.length > 0) {
      let limits = fetchSetAllLimits(selections, {
        packsAvailableKey: "store_product_level_packs_available",
        eachesAvailableKey: "store_product_level_eaches_available",
        packsAllocatedKey: "store_product_level_packs",
        eachesAllocatedKey: "store_product_level_eaches",
        packsOriginalKey: "store_product_level_packs_original",
        eachesOriginalKey: "store_product_level_eaches_original",
        packsPctKey: "store_product_level_packs_max_increase_pct",
        eachesPctKey: "store_product_level_eaches_max_increase_pct",
      });
      setSetAllLimits(limits);
      setButtonEnabled(true);
    } else {
      setButtonEnabled(false);
    }

    setSelectedArticles([...selections]);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const FILTER_FOR_ALLOCATION_PLAN = useMemo(
    () => [
      {
        label: "User Name",
        accessor: "user_id",
        field_type: "dropdown",
        options: filterData?.userId,
        isMulti: true,
        isClearable: true,
        dropDownUp: true,
      },
      {
        label: "Allocation Plan Name",
        accessor: "allocation_plan_name",
        field_type: "dropdown",
        options: filterData?.allocationCodes,
        isMulti: true,
        isClearable: true,
        dropDownUp: true,
      },
    ],
    [filterData]
  );

  const handleChange = (p_data) => {
    let l_cascadedTableData = filterByProperties(initialTableData, {
      allocation_code: p_data?.allocation_plan_name,
      user_id: p_data?.user_id,
    });
    setFilterOptions(l_cascadedTableData);
    setFormData(p_data);
  };

  const processCellForClipboard = useCallback((params) => {
    let l_cellValue = params.value;
    if (Array.isArray(l_cellValue)) {
      return isNonPrimitiveArray(l_cellValue)
        ? l_cellValue.map((val) => val.label)?.join(" | ")
        : l_cellValue;
    } else if (isObject(l_cellValue)) {
      return l_cellValue.label;
    }
    return l_cellValue;
  }, []);

  const processHeaderForClipboard = useCallback((params) => {
    const l_colDef = params.column.getColDef();
    return l_colDef.headerName;
  }, []);

  const filterCapacityBreachOnly = (checked) => {
    setNegativeCapacityOnly(checked);
    articleTableGridInstance.current?.api?.refreshServerSideStore({
      purge: true,
    });
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setInventorysmartOrderBatchingTableDataLoader(true);
      props.setInventorysmartOrderBatchingTableConfigLoader(true);
      const activeCacheKey = ensureFreshCacheKey
        ? await ensureFreshCacheKey()
        : cache_keyRef.current;
      let body = {
        filters: filterDependency.current,
        meta: {
          ...manualbody,
          limit: {
            limit: 100,
            page: pageIndex + 1,
          },
        },
        cache_key: activeCacheKey,
        ...(props.renderToggleSummary && {
          ...(createdAtDateRef.current && { created_at: createdAtDateRef.current }),
          session_id: sessionIdRef.current,
          ...(selectedOptionRef.current === "edit" && {
            is_update_mode: true,
          }),
        }),
      };
      if (capacityBreachOnlyRef.current) {
        body.meta.range = [
          {
            column: "store_percentage_to_capacity",
            min_val: 100,
            max_val: 99999999,
            search_type: "greaterThanOrEqual",
          },
        ];
      }
      // Store the complete body for reuse in other functions
      lastRequestBodyRef.current = { ...body };
      params.api.clearFocusedCell();
      let response = await props.getOrderBatchingTableData(body);
      if (response.data.data != null) {
        formatOrderBatchingTableColumns(response?.data?.data?.table_config);
        setBlockEdit(true);
        response.data.data.orders = agGridRowFormatter(
          response.data.data.orders,
          params?.api?.checkConfiguration,
          `unique_key`
        );

        setPayloadBody(body);
        props.setOrderBatchingTableData(cloneDeep(response.data.data?.orders));
        // setInitialTableData(cloneDeep(response.data.data.orders));
        props.setInventorysmartOrderBatchingTableDataLoader(false);
        props.setInventorysmartOrderBatchingTableConfigLoader(false);
        return {
          data: [...response.data.data.orders],
          totalCount: response.data.total,
        };
      } else {
        props.setOrderBatchingTableData([]);
        props.setInventorysmartOrderBatchingTableDataLoader(false);
        props.setInventorysmartOrderBatchingTableConfigLoader(false);
        return {
          data: [],
        };
      }
    } catch (err) {
      props.setOrderBatchingTableData([]);
      props.setInventorysmartOrderBatchingTableDataLoader(false);
      props.setInventorysmartOrderBatchingTableConfigLoader(false);
      return {
        data: [],
      };
    }
  };
  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message)
      props?.displaySnackMessages(errObj?.message, "error");
    else props?.displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const handleOutboundExport = async () => {
    try {
      // Use the same body as the last manualCallBack request
      let body = { ...lastRequestBodyRef.current };
      let response = await props.getOrderBatchingOutboundExport(body);
      displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
    }
  };

  const getAvailableSetAllFields = () => {
    const fields = [];
    const checkColumn = (col) => {
      if (col.column_name === "store_product_level_packs") fields.push("packs");
      if (col.column_name === "store_product_level_eaches")
        fields.push("eaches");
    };
    orderBatchingTableColumns.forEach((column) => {
      if (column.sub_headers?.length > 0) {
        column.sub_headers.forEach(checkColumn);
      } else {
        checkColumn(column);
      }
    });
    return fields;
  };

  const applyEditableToColumn = (col, showEdits) => {
    if (
      col.column_name === "store_product_level_eaches" ||
      col.column_name === "store_product_level_packs" ||
      col.column_name === "order_priority" ||
      col.column_name === "delivery_dt"
    ) {
      col.is_editable = showEdits;
      if (showEdits) {
        col.cellRenderer = (params, extraProps) => {
          return (
            <CellRenderers
              cellData={params}
              column={col}
              extraProps={extraProps}
              actions={null}
            ></CellRenderers>
          );
        };
      } else {
        col.cellRenderer = null;
      }
    }
  };

  const showEditValuesModal = (showEdits) => {
    let newCol = orderBatchingTableColumns.map((column) => {
      if (column.sub_headers?.length > 0) {
        column.sub_headers.forEach((subHeader) => {
          applyEditableToColumn(subHeader, showEdits);
        });
      } else {
        applyEditableToColumn(column, showEdits);
      }

      if (column.column_name === "delivery_dt" && column.original_is_editable) {
        column.is_editable = showEdits;
        if (showEdits) {
          column.minWidth = 260
          column.cellRenderer = (params, extraProps) => {
            return (
              <CellRenderers
                cellData={params}
                column={column}
                extraProps={extraProps}
                actions={null}
              ></CellRenderers>
            );
          };
        } else {
          column.cellRenderer = null;
        }
      }
      return column;
    });
    setOrderBatchingTableColumns(newCol);
    articleTableGridInstance.current?.api?.refreshCells({
      force: true,
    });
    setEditValuesModalOpen(showEdits);
  };

  const enableDetailsTableEdit = () => {
    props.setEditModeEnabledOnDetails(true);
    showEditValuesModal(true);
  };

  const disableDetailsTableEdit = () => {
    props.setEditModeEnabledOnDetails(false);
    showEditValuesModal(false);
    setUpdatedRowEdits([]);
    articleTableGridInstance.current?.api?.refreshServerSideStore({
      purge: true,
    });
  };

  const getAllocationUpdates = (data, item) => {
    if (data && !isEmpty(data)) {
      return {
        store_product_level_eaches: data.type === "eaches" ? data.value : null,
        store_product_level_packs: data.type === "packs" ? data.value : null,
      };
    } else {
      return {
        store_product_level_eaches: item.store_product_level_eaches,
        store_product_level_packs: item.store_product_level_packs,
      };
    }
  };

  const getAdditionalUpdates = (item) => {
    const additionalUpdates = {};
    if (item.changedColumns) {
      item.changedColumns.forEach(columnName => {
        if (columnName !== "store_product_level_eaches" && columnName !== "store_product_level_packs") {
          additionalUpdates[columnName] = item[columnName];
        }
      });
    }
    return additionalUpdates;
  };

  const fetchUpdatePayload = () => {
    let rowDetails = [];
    // Helper to build allocation_updates for each row
    rowDetails = updatedRowEdits.map((item) => ({
      row: {
        store: item.store,
        l1_name: item.l1_name,
        l3_name: item.l3_name,
        dc_code: item.dc_code,
        allocation_code: item.allocation_code,
        article: item.article,
      },
      allocation_updates: getAllocationUpdates({}, item),
      additional_updates: getAdditionalUpdates(item),
    }));

    let body = {
      filters: props.selectedFilters,
      ...(createdAtDate && { created_at: createdAtDate }),
      session_id: sessionId,
      is_set_all: false,
      included: [],
      excluded: [],
      meta: {},
      row_updates: rowDetails,
      is_update_mode: true,
    };
    return body;
  };

  const applySetAllOnDetailsTable = (data) => {
    let payload = {};
    let l_userActions = getObjectsAfterCheckAll(
      articleTableGridInstance.current?.api?.checkConfiguration
    );
    payload.cache_key = cache_keyRef.current || props.cache_key;
    payload.row_updates = [];
    payload.filters = [...filterDependency.current];
    payload.meta = payloadBody.meta;
    payload.is_set_all = true;
    if (createdAtDate) {
      payload.created_at = createdAtDate;
    }
    payload.session_id = sessionId;
    payload.is_update_mode = true;
    payload.set_all_values = getAllocationUpdates(data, []);
    payload.is_percentage = data.isPercentage;
    if (isEmpty(l_userActions)) {
      payload.included = articleTableGridInstance.current.api
        .getSelectedNodes()
        .map((row) => {
          return row.data;
        })
        .map((item) => {
          return {
            store: item.store,
            l1_name: item.l1_name,
            l3_name: item.l3_name,
            dc_code: item.dc_code,
            allocation_code: item.allocation_code,
            article: item.article,
          };
        });
      payload.excluded = [];
    } else {
      let l_userActionClubbed = l_userActions.reduce(
        (result, obj) => Object.assign(result, obj),
        {}
      );
      if (l_userActionClubbed?.unCheckedRows) {
        payload.excluded = orderBatchingDataRef.current
          .filter((item) =>
            l_userActionClubbed?.unCheckedRows.includes(item.unique_key)
          )
          ?.map((item) => {
            return {
              store: item.store,
              l1_name: item.l1_name,
              l3_name: item.l3_name,
              allocation_code: item.allocation_code,
              article: item.article,
              dc_code: item.dc_code,
            };
          });
        payload.included = [];
      } else {
        payload.excluded = [];
        payload.included = [];
      }
    }
    callUpdateAPI(payload);
  };

  const saveDetailsTableRowEdits = () => {
    if (updatedRowEdits.length > 0) {
      let body = fetchUpdatePayload();
      callUpdateAPI(body);
    } else {
      displaySnackMessages(t("inventorysmart.obNoChangesToSave"), "error");
    }
  };

  const callUpdateAPI = async (body) => {
    try {
      props.setInventorysmartOrderBatchingTableDataLoader(true);
      const response = await props.getOrderBatchingSummary(body);
      if (response.data?.status) {
        displaySnackMessages(response.data?.message, "success");
        props.setInventorysmartReloadOrderBatchingData(true);
        articleTableGridInstance.current.api.deselectAll(true);
        setTimeout(() => {
          props.setInventorysmartReloadOrderBatchingData(false);
        }, 1000);
      } else {
        articleTableGridInstance.current.api.deselectAll(true);
        if (response.data?.show_message) {
          displaySnackMessages(response.data?.message, "error");
        }
      }
      disableDetailsTableEdit(); // reset the state
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setInventorysmartOrderBatchingTableDataLoader(false);
    }
  };

  const resetTableToOriginal = async () => {
    try {
      props.setInventorysmartOrderBatchingTableDataLoader(true);
      let body = {
        filters: props.selectedFilters,
        ...(createdAtDate && { created_at: createdAtDate }),
        session_id: sessionId,
      };
      let response = await props.resetAllTablesToDefault(body);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
      if (response.data?.status) {
        props.setInventorysmartReloadOrderBatchingData(true);
        setTimeout(() => {
          props.setInventorysmartReloadOrderBatchingData(false);
        }, 1000);
      }
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      props.setInventorysmartOrderBatchingTableDataLoader(false);
    }
  };

  const openSetAllModal = () => {
    // levis case
    if (props.renderToggleSummary) {
      if (updatedRowEdits.length > 0) {
        displaySnackMessages(
          t("inventorysmart.obSaveRowEditsBeforeSetAll"),
          "warning"
        );
      } else {
        setOpenDetailsSetAllModelOpen(true);
      }
    } else {
      setShowSetAllModal(true);
    }
  };

  const disableSetAllButton = () => {
    if (props.renderToggleSummary && selectedOption === "view") {
      return !updatedRowEdits.length;
    } else {
      return !hasEditAccess() || (!partialFinalize && !buttonEnabled);
    }
  };

  const applyAiSmartFilterToColumn = (columnName, values) => {
    if (!columnName) return;
    const api = articleTableGridInstance.current?.api;
    if (!api) return;

    if (Array.isArray(values) && values.length > 0) {
      api.setFilterModel({
        [columnName]: {
          filterType: "text",
          type: "contains",
          filter: values.join(","),
        },
      });
    } else {
      const currentModel = api.getFilterModel() || {};
      if (Object.prototype.hasOwnProperty.call(currentModel, columnName)) {
        const { [columnName]: _removed, ...rest } = currentModel;
        api.setFilterModel(rest);
      }
    }
  };

  const smartFilterButton = props.orderBatchingConfig?.enableSmartFilter ? (
    <AiSmartFilterButton
      key="ai-smart-filter-btn"
      columns={orderBatchingTableColumns}
      filters={mapFiltersForAiSmartFilter(props?.selectedFilters)}
      onFilterApplied={applyAiSmartFilterToColumn}
      onAppliedFilterChange={aiChips.onAppliedFilterChange}
      onAppliedFilterCleared={aiChips.onAppliedFilterCleared}
      screenName={AI_SMART_FILTER_OB_STYLE_COLOR_STORE_LEVEL_DETAILS.screenName}
      tableId={AI_SMART_FILTER_OB_STYLE_COLOR_STORE_LEVEL_DETAILS.tableId}
      hideSuggestions
    />
  ) : null;

  const smartFilterChips = smartFilterButton ? (
    <AiSmartFilterChips
      chips={aiChips.chips}
      onChipClick={(chip) =>
        aiChips.handleChipClick(chip, applyAiSmartFilterToColumn)
      }
      onChipRemove={(chip) =>
        aiChips.handleChipRemove(chip, applyAiSmartFilterToColumn)
      }
    />
  ) : null;

  const getTopRightOptions = (editButtonClicked) => {
    let options = [];
    const exportButton = <Button
      variant="primary"
      id="productSetAllBtn"
      onClick={() => handleOutboundExport()}
    >
      Export
    </Button>
    if (selectedOption === "view" && props.renderToggleSummary) {
      options = [];
      if (props.showCapacityToggle) {
        options.push(
          <Switch
            leftLabel=""
            onChange={(e) => {
              filterCapacityBreachOnly(e.target.checked);
            }}
            value={negativeCapacityOnly}
            rightLabel="Show negative capacity only"
          />,
          <div className="divider-line"></div>
        );
      }
      options.push(
        <DownloadButton
          url={"inventory-smart/order_batching/order-batching-download"}
          requestBody={payloadBody}
          columns={orderBatchingTableColumns}
        />
      );
      if (props?.showOutboundExport) {
        options.push(exportButton);
      }
      if (smartFilterButton) {
        options.push(smartFilterButton);
      }
      return options;
    }
    if (!props?.inventorysmartScreenConfig?.hideSetAll?.includes("OB")) {
      options.push(
        <Button
          variant="tertiary"
          disabled={disableSetAllButton()}
          onClick={() => openSetAllModal()}
        >
          Set All
        </Button>,
        <div className="divider-line"></div>
      );
    }
    if (props.renderToggleSummary) {
      if (props.showCapacityToggle) {
        options.push(
          <Switch
            leftLabel=""
            onChange={(e) => {
              filterCapacityBreachOnly(e.target.checked);
            }}
            value={negativeCapacityOnly}
            rightLabel="Show negative capacity only"
          />,
          <div className="divider-line"></div>
        );
      }
      if (editButtonClicked) {
        options.push(
          <Button
            size="large"
            type="default"
            variant="text"
            id="cancel-store-summary-button"
            onClick={() => disableDetailsTableEdit()}
          >
            Cancel
          </Button>,
          <Button
            size="large"
            type="default"
            variant="primary"
            id="update-store-summary-button"
            onClick={() => saveDetailsTableRowEdits()} // call API / summary update
          >
            Update
          </Button>
        );
      } else {
        options.push(
          <Button
            size="large"
            type="default"
            variant="secondary"
            id="edit-store-summary-button"
            disabled={props.editModeEnabledOnSummary}
            onClick={() => enableDetailsTableEdit()}
          >
            Edit Values
          </Button>
        );
      }
    }
    options.push(
      <DownloadButton
        url={"inventory-smart/order_batching/order-batching-download"}
        requestBody={payloadBody}
        columns={orderBatchingTableColumns}
      />
    );

    if (
      !props?.inventorysmartScreenConfig?.hideSetAll?.includes("OB") &&
      !props.renderToggleSummary
    ) {
      options.push(
        <Button
          variant="primary"
          id="productSetAllBtn"
          disabled={!hasEditAccess() || !updatedRowEdits?.length}
          onClick={() => handleSave()}
        >
          Save
        </Button>
      );
    }
    if (
      !props.renderToggleSummary &&
      props?.finalizeAllocationConfig?.showOutboundButton
    ) {
      options.push(
        exportButton
      );
    }
    if (smartFilterButton) {
      options.push(smartFilterButton);
    }
    return options;
  };

  const disableTableRowSelection = () => {
    if (partialFinalize || (props.renderToggleSummary && selectedOption === "view")) {
      return false;
    }
    return !props?.inventorysmartScreenConfig?.hideSetAll?.includes("OB");
  };

  const disableFinalizeButton = () => {
    if (props.renderToggleSummary && selectedOption === "view") {
      return true;
    } else {
      return !hasEditAccess() || props.orderBatchingTableData?.length === 0;
    }
  };

  const showSaveAllChangesPrompt = () => {
    setShowInfoPrompt(true);
  };

  const saveSession = async (finalizeBoolean) => {
    try {
      props.setInventorysmartOrderBatchingMetricsLoader(true);
      setShowInfoPrompt(false);
      let body = {
        session_id: sessionId,
        ...(createdAtDate && { created_at: createdAtDate }),
        cache_key: cache_keyRef.current,
        filters: [...filterDependency.current],
        finalize: finalizeBoolean,
        meta: payloadBody?.meta || {},
      };
      let response = await props.saveOrderBatchingSession(body);
      if (response.data?.data?.save_trigger) {
        if (finalizeBoolean) {
          handlePostLockRelease();
        } else {
          props.setDisplaySummaryOnUpdate(response.data?.data);
          setShowSummaryPopUp(true);
        }
      } else {
        props.setDisplaySummaryOnUpdate({});
        displaySnackMessages(t("inventorysmart.obNothingToSave"), "warning");
        if (finalizeBoolean) {
          handlePostLockRelease();
        }
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventorysmartOrderBatchingMetricsLoader(false);
    }
  };

  return (
    <>
      <Loader
        loader={
          props.inventorysmartOrderBatchingTableConfigLoader ||
          props.inventorysmartOrderBatchingTableDataLoader ||
          props.inventorysmartUpdateOrderBatchingLoader
        }
        minHeight={"120px"}
      >
        <div className={classes.paddingBottom2rem}>
          <AgGridComponent
          tableHeader="Current Allocations"
            topLeftOptions={smartFilterChips}
          topRightOptions={getTopRightOptions(editValuesModalOpen)}
          processCellForClipboard={processCellForClipboard}
          processHeaderForClipboard={processHeaderForClipboard}
          columns={orderBatchingTableColumns}
          rowModelType="serverSide"
          onRowSelected
          serverSideStoreType="partial"
          selectAllHeaderComponent={disableTableRowSelection()}
          manualCallBack={(body, pageIndex, params) =>
            manualCallBack(body, pageIndex, params)
          }
          paginationPageSize={100}
          cacheBlockSize={100}
          onSelectionChanged={onSelectionChanged}
          rowSelection="multiple"
          uniqueRowId={"unique_key"}
          loadTableInstance={loadTableInstance}
          pagination={true}
          onCellValueChanged={onCellValueChanged}
          onCellFocused={onCellFocused}
          onBlur={onBlur}
        />
        </div>
      </Loader>
      {selectedOption === "edit" && (
          <div
          className={`${globalClasses.bottomButtonsContainer} ${globalClasses.layoutAlignEnd} ${globalClasses.gap}`}
          >
            <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
              <Button
                variant="tertiary"
                id="reset-btn"
                disabled={selectedOption === "view"}
                onClick={() => resetTableToOriginal()}
              >
                Discard all changes
              </Button>
              <Button
                variant="contained"
                color="secondary"
                id="allocation-detail-btn"
                disabled={selectedOption === "view"}
                onClick={() => showSaveAllChangesPrompt()}
              >
                Save all changes
              </Button>
            </div>
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
              disabled={false}
              loading={ataCheckLoading}
              onClick={() => handleATAExceedanceCheck()}
            >
              Save & finalize for order generation
            </Button>
          </div>
      )}
      {!props.renderToggleSummary && (
        <div className={classes.bottomButtonsWrapper}>
          <div className={classes.bottomButtonsGreyBar}></div>
          <div
            className={`${classes.bottomButtonsContainer24px} ${globalClasses.layoutAlignEnd}`}
          >
            <Button
              variant="contained"
              color="primary"
              id="productSetAllBtn"
              disabled={disableFinalizeButton()}
              loading={ataCheckLoading}
              onClick={() => handleATAExceedanceCheck()}
            >
              Finalize For Order Generation
            </Button>
            <NewOrderBatchingEditedByPopup
              showEditedByPopup={editedByPopup}
              closeEditedByPopup={() => setEditedByPopup(false)}
              backToViewMode={() => {}}
              lockAcquiredBy={lockAcquiredBy}
              selectedFilters={props.selectedFilters}
              filterDashboardData={
                props?.filterDashboardConfiguration
                  ?.orderBatchingFilterConfiguration?.filterConfig?.[0]
                  ?.filterDashboardData || []
              }
            />
          </div>
        </div>
      )}
      <Prompt
        variant="warning"
        isOpen={showEditWarningPopup}
        title="Alert!"
        primaryButtonLabel={DIALOG_CONFIRM_BTN_TEXT}
        secondaryButtonLabel={DIALOG_CANCEL_BTN_TEXT}
        onPrimaryButtonClick={() => {
          setBlockEdit(false);
          setShowEditWarningPopup(false);
        }}
        onSecondaryButtonClick={() => setShowEditWarningPopup(false)}
        handleClose={() => setShowEditWarningPopup(false)}
      >
        {props.edit_delivery_date_prompt_msg ? props.edit_delivery_date_prompt_msg : EDIT_DELIVERY_DATE_PROMPT_SUBHEADING}
      </Prompt>
      <Prompt
        variant="info"
        isOpen={showFinalizePopup}
        title="Confirm Finalizing Allocations"
        primaryButtonLabel={DIALOG_FINALIZE_BTN_TEXT}
        secondaryButtonLabel={DIALOG_CANCEL_BTN_TEXT}
        onPrimaryButtonClick={() => {
          if (props.renderToggleSummary) {
            saveSession(true);
          } else {
            handleFinalizingOrder();
          }
          setShowFinalizePopup(false);
        }}
        onSecondaryButtonClick={() => setShowFinalizePopup(false)}
        handleClose={() => setShowFinalizePopup(false)}
      >
        {`Are you sure you want to finalize these allocations? ${concatAlertMessage}`}
      </Prompt>
      <Prompt
        isOpen={showInfoPrompt}
        title={"Action cannot be reversed"}
        children={
          <div
            className={`${globalClasses.flexRow} ${globalClasses.flexColumn}`}
          >
            <span>Revert is disabled for this action.</span>
            <span>A notification will be sent to the user.</span>
            <span>This change is permanent.</span>
          </div>
        }
        primaryButtonLabel="Proceed"
        onPrimaryButtonClick={() => {
          saveSession(false);
        }}
        secondaryButtonLabel="Cancel"
        onSecondaryButtonClick={() => {
          setShowInfoPrompt(false);
        }}
        variant="info"
      />
      {showSetAllModal && (
        <OrderBatchingSetAllModal
          showSetAllModal={showSetAllModal}
          orderTypeOptions={orderTypeOptions}
          setShowSetAllModal={setShowSetAllModal}
          agGridInstance={articleTableGridInstance.current}
          setUpdatedRowEdits={setUpdatedRowEdits}
          upatedRowEditInstance={upatedRowEditInstance}
          applySetAll={applySetAll}
          setAllFields={props.setAllFields}
          setAllFieldsLabels={props.setAllFieldsLabels}
        />
      )}
      <NewOrderBatchingSummarySetAll
        showSetAllModal={openDetailsSetAllModelOpen}
        closeSetAllModal={() => setOpenDetailsSetAllModelOpen(false)}
        onApplySetAll={(data) => applySetAllOnDetailsTable(data)}
        setAllLimits={setAllLimits}
        allowIncrease={props.orderBatchingConfig?.allow_allocation_increase}
        availableFields={getAvailableSetAllFields()}
      />
      {showSummaryPopUp && (
        <NewOrderBatchingSummaryPopUp
          showSummaryPopUp={showSummaryPopUp}
          setShowSummaryPopUp={setShowSummaryPopUp}
          popupType="save"
          setSelectedOption={setSelectedOption}
          handlePostLockRelease={handlePostLockRelease}
          displaySnackMessages={displaySnackMessages}
        />
      )}
      {showATAComponent && ataData && (
        <AvailableToAllocate
          open={showATAComponent}
          onClose={() => {
            setShowATAComponent(false);
            setAtaData(null);
          }}
          ataData={ataData}
          onAutoAdjust={handleAutoAdjust}
          onFinalizePlans={handleFinalizePlans}
          onReviewRecommendation={onTableCellClick}
          displaySnackMessages={displaySnackMessages}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .selectedFilters,
    cache_key:
      store.inventorysmartReducer.inventorySmartOrderBatchingService.cache_key,
    inventorysmartOrderBatchingTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingTableConfigLoader,
    inventorysmartOrderBatchingTableDataLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingTableDataLoader,
    inventorysmartUpdateOrderBatchingLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartUpdateOrderBatchingLoader,
    orderBatchingTableData:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .orderBatchingTableData,
    inventorysmartOrderBatchingFilterDependency:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingFilterDependency,
    allocationName:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .allocationName,
    inventorysmartReloadOrderBatchingData:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartReloadOrderBatchingData,
    isNameMandatory:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartCreateAllocationConfig
        ?.isNameMandatory,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    modulePermissions:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    edit_delivery_date_prompt_msg:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.edit_delivery_date_prompt_msg,
    orderBatchingConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .orderBatchingConfig,
    setAllFields:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.setAllFields,
    setAllFieldsLabels:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.setAllFieldsLabels,
    editModeEnabledOnSummary:
      store.inventorysmartReducer.inventorySmartOrderBatchingSummaryService
        .editModeEnabledOnSummary,
    showCapacityToggle:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.showCapacityToggle,
    showOutboundExport:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.orderBatchingConfig?.showOutboundExport,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration,
    selectedFiltersFromReducer: store.filterReducer.selectedFilters,
    inventorysmartReducer: store.inventorysmartReducer,
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  getOrderBatchingTableConfiguration: () =>
    dispatch(getOrderBatchingTableConfiguration()),
  getOrderBatchingTableData: (payload, fetchStyleStore) =>
    dispatch(getOrderBatchingTableData(payload, fetchStyleStore)),
  updateOrderBatchingData: (payload) =>
    dispatch(updateOrderBatchingData(payload)),
  finalizeOrderBatchingData: (payload) =>
    dispatch(finalizeOrderBatchingData(payload)),
  autoFinalizeOrderBatchingData: (payload) =>
    dispatch(autoFinalizeOrderBatchingData(payload)),
  setInventorysmartOrderBatchingTableConfigLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingTableConfigLoader(payload)),
  setInventorysmartOrderBatchingTableDataLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingTableDataLoader(payload)),
  setInventorysmartUpdateOrderBatchingLoader: (payload) =>
    dispatch(setInventorysmartUpdateOrderBatchingLoader(payload)),
  setOrderBatchingTableConfig: (payload) =>
    dispatch(setOrderBatchingTableConfig(payload)),
  setOrderBatchingTableData: (payload) =>
    dispatch(setOrderBatchingTableData(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setInventorySmartFinalizeFilterDependency: (payload) =>
    dispatch(setInventorySmartFinalizeFilterDependency(payload)),
  setInventorysmartReloadOrderBatchingData: (payload) =>
    dispatch(setInventorysmartReloadOrderBatchingData(payload)),
  setRedirectedFrom: (payload) => dispatch(setRedirectedFrom(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  uploadPO: (payload) => dispatch(uploadPO(payload)),
  uploadInv: (payload) => dispatch(uploadInv(payload)),
  getOrderBatchingOutboundExport: (payload) =>
    dispatch(getOutboundExport(payload)),
  setEditModeEnabledOnDetails: (payload) =>
    dispatch(setEditModeEnabledOnDetails(payload)),
  getOrderBatchingSummary: (payload) =>
    dispatch(getOrderBatchingSummary(payload)),
  setDisplaySummaryOnUpdate: (payload) =>
    dispatch(setDisplaySummaryOnUpdate(payload)),
  resetAllTablesToDefault: (payload) =>
    dispatch(resetAllTablesToDefault(payload)),
  saveOrderBatchingSession: (payload) =>
    dispatch(saveOrderBatchingSession(payload)),
  setInventorysmartOrderBatchingMetricsLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingMetricsLoader(payload)),
  setOrderBatchingFilterDetails: (payload) =>
    dispatch(setOrderBatchingFilterDetails(payload)),  
  setSelectedFiltersInOrderBatching: (payload) =>
    dispatch(setSelectedFiltersInOrderBatching(payload)),
  fetchLockStatus: (payload) => dispatch(fetchLockStatus(payload)),
  checkATAExceedance: (payload) => dispatch(checkATAExceedance(payload)),
  autoAdjustATA: (payload) => dispatch(autoAdjustATA(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ViewCurrentAllocationsTables);

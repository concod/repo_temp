import { cloneDeep, isEmpty } from "lodash";
import { Prompt } from "impact-ui-v3";
import { getErrorHighlightCellStyle } from "../utils";
import { ButtonGroup, Button, Select, Chips } from "impact-ui-v3";
import { successHandler } from "core/Utils/functions/helpers/errorhandler-helpers";
import React, { forwardRef, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useNavigate } from "react-router-dom-v5-compat";
import { FormControl } from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import {
  formatStringDate,
  replaceSpecialCharToCharCode,
} from "core/Utils/functions/utils";
import classNames from "classnames";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import moment from "moment";
import { addSnack } from "core/actions/snackbarActions";
import NormalCalendarFiscalMapping from "core/commonComponents/calendar/normalCalendarFiscalMapping";

import { KEYS_USED_OTHER_THAN_FISCAL_WEEK } from "modules/oms/constants-oms/adaConstants.js";
import { ORDER_MANAGEMENT_PRODUCT_DETAILS } from "modules/oms/constants-oms/routeConstants";
import {
  fetchEditHierarchyColumnData,
  fetchEditHierarchyData,
  setSelectedRowsL0Table,
  setDisplayDataToWeekLevel,
  setIsCalenderDateApplied,
  setKPIValue,
  setKpiValuesForLabel,
  setFiscalDates,
  setXaxisStaticDates,
  GetKpiValue,
  GetKpiValueReceiptTimeline,
  GetSetAllKpiValue,
  SetAllMatrixSummaryData,
  setMatrixSummarySetAllApiSuccess,
  setIsPackId,
  setPackValue,
  setIsButtonDisabled,
  setSequentialRefreshStep,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import {
  chartDataPayload,
  handleTotalRow,
  getEditHierarchyPayload,
  updateAllForecastMultiplier,
  handleAppendResponse,
  formattedAdjustedPayload,
  getAllRows,
} from "../utils-matrix-summary/utilityFunctions";
import { useHistoricData } from "./useHistoricData";
import EditHierarcy from ".";
import {
  getOmsCoreFiscalCalendar,
  getOmsReceiptCalendarData,
  getOmsDeepDiveFilters,
  setOrderManagementDeepDiveFilters,
  setOrderManagementDeepDiveFiltersPayload,
  setOrderManagementProductDetailsFilters,
  setSelectedRowsFromMatrixSummary,
  setOrderManagementDeepDiveFiltersData,
  fetchFiscalWeeks,
  getMaxEditableReceiptDate,
  setMaxEditableReceiptDate,
  setMaxEditableReceiptDateLoader,
  setHighLevelSummaryState,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import ApprovalFlowDialog from "../../Approval-Flow-Dialog/ApprovalFlowDialog";
import {
  ERROR_MESSAGE,
  OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS,
  TENANT_DATE_FORMAT,
  OMS_PRODUCT_DETAILS_REDIRECTION_PAYLOAD,
  OMS_ORDER_MANAGEMENT_SCREENNAME_KEY,
  OMS_EDIT_MODE_OPTIONS,
  OMS_DISTRIBUTION_METHOD_OPTIONS,
  OMS_OM_REDIRECT_DASHBOARD_DCS,
} from "modules/oms/constants-oms/stringConstants";
import { ORDER_MANAGEMENT_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import MatrixSummarySetAllModal from "../matrixSummarySetAllPopUp";
import { getFiscalWeekStart } from "../utils";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";

const OPTIONS_CONTAINER_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "1rem",
  marginBottom: "1rem",
  padding: "1rem 1rem",
  flexWrap: "wrap",
};

const WHITE_CONTAINER_STYLE = {
  backgroundColor: "#FFFFFF",
  borderRadius: "13px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  border: "1px solid #e0e0e0",
  marginBottom: "1rem",
  overflow: "hidden",
  width: "100%",
  boxSizing: "border-box",
};

const EditHierarcyWrapper = (props, ref) => {
  const {
    activeKey,
    setActiveChildHierarchyKey,
    setActiveChildHierarchyDescription,
    allowEdit,
    allowL0Edit,
    showIAData,
    id,
    setCounterOnEditHierarchyChange,
    lastEditedDrivers,
    isCalledFromMFPDashboard,
    selectedRowsFromMFP,
    activeChildHierarchyKey,
    isRedirectedFromDashboard,
    l0TableName,
  } = props;

  const dispatch = useDispatch();

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  let {
    lastEditedDriversRef,
    editHierarchyInstance,
    editHierarchyTotalRowInstance,
    forecastMultiplierInstance,
    editHierarchyChildInstance,
    editHierarchyGrandChildInstance,
    editHierarchyChildTotalRowInstance,
    initialEditChildRowData,
    allEditedGrandChildRowData,
    initialEditRowData,
    initialTotalRowData,
    editChildRowData,
    currentHierarchyKey,
    allEditedChildRowData,
    allEditedGrandChildRowMapping,
    l0TableDataPayloadRef,
  } = ref;

  const { historicColumnData, historicRowData, tableLoader } = useHistoricData(
    showIAData,
    isCalledFromMFPDashboard
  );

  const [loaderCount, setLoaderCount] = useState(0);
  const [isPredictedDataFetched, setIsPredictedDataFetched] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [columnDefs, setColumnDefs] = useState([]);
  const [editRowData, setEditRowData] = useState([]);
  const [totalRowData, setTotalRowData] = useState([]);
  const [isEditRowUpdated, setIsEditRowUpdated] = useState(false);
  let disabledTotalColumns = useRef([]);
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [selectedRows, setSelectedRows] = useState([]);
  const [isDisableButton, setIsDisableButton] = useState(true);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);

  const [isDataWeekLevel, setIsDataWeekLevel] = useState(null);
  const isDataWeekLevelInitialized = useRef(false);

  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [selectedDate, setSelectedDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [receiptCalendarDetails, setReceiptCalendarDetails] = useState([]);
  const [selectedRoqDate, setSelectedRoqDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });

  const [isSwitchDisable, setIsSwitchDisable] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState("min_order_quantity_style");
  const [kpiValues, setKpiValues] = useState({});
  const [SetAllkpiValues, setSetAllKpiValues] = useState({});
  const [
    openMatrixSummarySetAllPopUp,
    setOpenMatrixSummarySetAllPopUp,
  ] = useState(false);
  const [
    MatrixSummarySetAllApiSuccess,
    setMatrixSummarySetAllApiSucess,
  ] = useState(false);
  const [calenderChangedDependency, setCalenderChangedDependency] = useState(0);

  const [openNavigationPopUp, setOpenNavigationPopUp] = useState(false);
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  const [selectedKpiOptions, setSelectedKpiOptions] = useState({});

  const [selectedRoqDateTab, setSelectedRoqDateTab] = useState(
    "roq_placement_date"
  );

  const [maxEditableReceiptDate, setMaxEditableReceiptDateState] = useState(
    null
  );
  const [
    maxEditableReceiptDateLoader,
    setMaxEditableReceiptDateLoaderState,
  ] = useState(false);
  const [selectedEditMode, setSelectedEditMode] = useState(
    OMS_EDIT_MODE_OPTIONS[0]?.value || "topline_edit"
  );
  const [selectedDistributionMethod, setSelectedDistributionMethod] = useState(
    null
  );
  const [isDistributionMethodOpen, setIsDistributionMethodOpen] = useState(
    false
  );
  const [
    selectedDistributionMethodValue,
    setSelectedDistributionMethodValue,
  ] = useState(null);

  const selectedDateRef = useRef(selectedDate);
  const selectedRoqDateRef = useRef(selectedRoqDate);

  const matrixSummaryReducer = useSelector(
    (store) =>
      store?.omsReducer?.matrixSummaryReducer?.matrixSummaryDashboardReducer
  );
  const OmsReducer = useSelector(
    (store) => store?.omsReducer.orderManagementService
  );

  const filterReducer = useSelector(
    (store) =>
      store?.filterReducer?.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ]
  );
  const orderingAccessControl = useSelector(
    (store) => store?.omsReducer.orderingCommonService.orderingAccessControl
  );

  const orderingScreensConfig = useSelector(
    (store) => store?.omsReducer.orderingCommonService.orderingScreensConfig
  );

  const userAccess = useSelector(
    (store) =>
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc
  );

  // user access for matrix summary
  const matrixSummaryAccess = userAccess?.find(
    (item) =>
      item.module === "matrix_summary" &&
      item.screen === OMS_ORDER_MANAGEMENT_SCREENNAME_KEY
  );
  const canSetAll = matrixSummaryAccess?.isSetAllButton || false;
  const canEdit = matrixSummaryAccess?.isEditButton || false;

  useEffect(() => {
    if (!isEmpty(userAccess)) {
      setIsUserHasSetAllAccess(canSetAll);
    } else {
      setIsUserHasSetAllAccess(true);
    }
  }, [userAccess, canSetAll]);
  var isDataWeekLevelClientConfig =
    orderingScreensConfig?.oms_dashboard?.matrix_summary?.isDataWeekLabel;

  const SHOW_ROQ_DATE_OPTIONS =
    orderingScreensConfig?.oms_dashboard?.matrix_summary
      ?.show_roq_date_options || false;

  const ROQ_DATE_TAB_OPTIONS =
    orderingScreensConfig?.oms_dashboard?.matrix_summary?.roq_date_options ||
    OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS;

  const ENABLE_TOP_LEVEL_EDIT =
    orderingScreensConfig?.oms_dashboard?.matrix_summary?.enableTopLevelEdit ||
    false;

  const selectedHierarchyL0ForBudget =
    orderingScreensConfig?.oms_dashboard?.matrix_summary
      ?.selecteddHierarchyL0ForBudget || "article";

  const DISTRIBUTION_METHOD_OPTIONS =
    orderingScreensConfig?.oms_dashboard?.matrix_summary
      ?.distributionMethodOptions || OMS_DISTRIBUTION_METHOD_OPTIONS;

  var editDisableInEditHeirarchy =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value?.mfp
      ?.editDisableInEditHeirarchy;

  const isL0SiblingsUnLockedForEmptyForecast =
    matrixSummaryReducer?.clientConfig?.attribute_value?.empty_forecast_features
      ?.is_l0_siblings_unLocked || false;

  const showNullValuesforEmptyForecast = false;

  const isCellEdited = matrixSummaryReducer?.isCellEdited;

  const fiscalDates = matrixSummaryReducer?.fiscalDates;

  var fiscalWeekId = [];

  useEffect(() => {
    const selectedTabInHLS =
      OmsReducer?.highLevelSummaryState?.selectedRoqDateTab ||
      "roq_placement_date";
    setSelectedRoqDateTab(selectedTabInHLS);
    const editModeFromReducer =
      OmsReducer?.highLevelSummaryState?.selectedEditMode;
    if (editModeFromReducer) {
      setSelectedEditMode(editModeFromReducer);
    } else {
      const currentState = OmsReducer?.highLevelSummaryState || {};
      const defaultEditMode = OMS_EDIT_MODE_OPTIONS[0]?.value || "topline_edit";
      dispatch(
        setHighLevelSummaryState({
          ...currentState,
          selectedEditMode: defaultEditMode,
        })
      );
      setSelectedEditMode(defaultEditMode);
    }
  }, []);

  const editHierarchyActionMap = (key) => ({
    [key]: (el) => {
      // the total row is getting generated on the frontend, kept id i.e. row as total
      if (el.row === "total") return;
      setActiveChildHierarchyKey(el["aggr_column"]);

      setActiveChildHierarchyDescription(el["style_description"]);
      if (el["pack_identifier"] || el["pack_id"]) {
        dispatch(setIsPackId(true));
        dispatch(setPackValue(el.pack_identifier || el.pack_id));
      } else {
        dispatch(setIsPackId(false));
      }
      // Keeping id in ref as well, as Ag grid does not give access to any other state, after getting mounted
      currentHierarchyKey.current = el.row;
    },
  });

  useEffect(() => {
    const configAvailable =
      orderingScreensConfig?.oms_dashboard?.matrix_summary !== undefined;

    if (!isDataWeekLevelInitialized.current && configAvailable) {
      const newValue =
        orderingScreensConfig?.oms_dashboard?.matrix_summary
          ?.isDataWeekLabel !== undefined
          ? false
          : true;
      setIsDataWeekLevel(newValue);
      isDataWeekLevelInitialized.current = true;
    }
  }, [orderingScreensConfig?.oms_dashboard?.matrix_summary]);

  const updateResponse = async (
    isDataWeekLevel,
    isSwitchDisable,
    selectedKpi
  ) => {
    // Get the current date
    setLoaderCount((prevState) => prevState + 1);
    setMatrixSummarySetAllApiSucess(false);
    if (!isSwitchDisable) {
      const currentDate = new Date();
      // Calculate the date 8 weeks from now
      var datePlus8Weeks = getFiscalWeekStart(
        moment(currentDate),
        fiscalCalendarDetails
      );
      datePlus8Weeks = datePlus8Weeks.add(7, "weeks");
      if (!isDataWeekLevel) {
        datePlus8Weeks = datePlus8Weeks.add(24, "weeks");
      }

      // Format the dates for better readability
      const currentDateFormatted = moment(currentDate).format("YYYY-MM-DD");
      const datePlus8WeeksFormatted = datePlus8Weeks.format("YYYY-MM-DD");

      const response = await fetchFiscalWeeks(
        currentDateFormatted,
        datePlus8WeeksFormatted
      );

      const fiscalDatesInfo = response?.data?.data?.start_date;

      const currFiscalYear = String(fiscalDatesInfo.end_fw)?.slice(0, 4);

      var fiscalDates = {
        start_fw: fiscalDatesInfo.start_fw,
        end_fw: fiscalDatesInfo.end_fw,
        start_date: formatStringDate(fiscalDatesInfo?.start_date, true),
        end_date: formatStringDate(fiscalDatesInfo?.end_date, true),
      };

      dispatch(setFiscalDates(fiscalDates));
    } else {
      var fiscalDates = {
        start_fw: selectedDate?.fiscalInfoStartDate?.fiscal_year_week,
        end_fw: selectedDate?.fiscalInfoEndDate?.fiscal_year_week,
        // start_date: formatStringDate(fiscalDatesInfo?.start_date, true),
        // end_date: formatStringDate(fiscalDatesInfo?.end_date, true),
      };
    }

    const payload = chartDataPayload(
      matrixSummaryReducer,
      null,
      null,
      id === "IA",
      isDataWeekLevel,
      fiscalDates
    );

    const fetchColumnData = async () => {
      try {
        //setLoaderCount((prevState) => prevState + 1);
        const editHierarchyPayload = getEditHierarchyPayload(
          payload,
          editHierarchyActionMap,
          allowEdit,
          showIAData,
          matrixSummaryReducer
        );

        // Check access control: use new userAccess if available, otherwise fall back to old control
        const isUserHasEditAccess = !isEmpty(userAccess)
          ? canEdit
          : orderingAccessControl?.isEditButton?.isVisible;
        editHierarchyPayload.allowEdit = isUserHasEditAccess;
        editHierarchyPayload.selectedRoqDateTab = selectedRoqDateTab;

        const l0_data_type =
          matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
            ?.dashboard?.l0_data_type;
        const response = await fetchEditHierarchyColumnData(
          editHierarchyPayload,
          l0_data_type,
          matrixSummaryReducer,
          isL0SiblingsUnLockedForEmptyForecast,
          id,
          l0TableName,
          selectedKpi,
          kpiValues
        );

        setColumnDefs(response);

        const fiscalWeeks = response
          .map((item) => item.accessor) // Get the accessor values
          .filter((value) => !isNaN(value));

        fiscalWeekId = {
          fiscal_ids: [...fiscalWeeks],
        };

        dispatch(setDisplayDataToWeekLevel(isDataWeekLevel));
        dispatch(setXaxisStaticDates(fiscalWeekId));
        if (isSwitchDisable) {
          dispatch(
            setIsCalenderDateApplied(
              matrixSummaryReducer?.isCalenderDateApplied + 1
            )
          );
        } else {
          dispatch(setIsCalenderDateApplied(0));
        }
      } catch (error) {
        console.log("error", error);
      } finally {
        setLoaderCount((prevState) => prevState - 1);
      }
    };
    await fetchColumnData();

    const fetchRowData = async () => {
      try {
        setEditRowData([]);
        setLoaderCount((prevState) => prevState + 1);
        let [
          adjustedDiscountPayload,
          adjustedPricePointPayload,
        ] = formattedAdjustedPayload(
          [],
          lastEditedDrivers,
          matrixSummaryReducer
        );

        let updatedAdjustedDiscountPayload = cloneDeep(adjustedDiscountPayload);
        let updatedAdjustedPricePointPayload = cloneDeep(
          adjustedPricePointPayload
        );
        payload.adjusted = updatedAdjustedDiscountPayload;
        payload.adjusted_price_point = updatedAdjustedPricePointPayload;

        if (
          ENABLE_TOP_LEVEL_EDIT &&
          selectedRoqDateTab === "roq_receipt_date" &&
          selectedEditMode === "topline_edit"
        ) {
          payload.topLineEdit = true;

          if (selectedDistributionMethodValue) {
            payload.distribution_method = selectedDistributionMethodValue;
          }
        }

        const redirectedFilters = cloneDeep(
          JSON.parse(localStorage.getItem("selectedFiltersDependency"))
        );
        const styleFilter = cloneDeep(
          JSON.parse(localStorage.getItem("redirect_filter_level"))
        );

        // store L0 table data payload for top level edit mode (will be used in update API)
        if (
          ENABLE_TOP_LEVEL_EDIT &&
          selectedRoqDateTab === "roq_receipt_date" &&
          selectedEditMode === "topline_edit" &&
          l0TableDataPayloadRef
        ) {
          const body = { filters: { ...payload.filters } };
          delete body.filters.graph;
          if (body.filters.mfp) {
            body.filters.agg_level = "mfp";
          } else {
            body.filters.agg_level = "l0";
          }
          body.filters.agg_hierarchy = {};

          let filters = cloneDeep(
            localStorage.getItem("isRedirectedFromDashboardToOms")
              ? mergeOmsDcIntoFilters(
                  [...redirectedFilters, ...styleFilter],
                  OmsReducer.selectedDcs
                )
              : OmsReducer.selectedFilters
          );

          if (
            OmsReducer?.highLevelSummaryState?.show_sublevels_hierarchy_columns
          ) {
            filters = cloneDeep([
              ...OmsReducer?.highLevelSummaryState
                ?.applied_filters_for_sublevels_hierarchy,
            ]);
          }

          const hierarchyName =
            OmsReducer?.highLevelSummaryState?.level_of_hierarchy_id;
          const hierarchyValue =
            OmsReducer?.highLevelSummaryState?.level_of_hierarchy_value;

          if (hierarchyName && hierarchyValue) {
            const hierarchyFilterIndex = filters.findIndex(
              (data) => data?.attribute_name === hierarchyName
            );

            if (hierarchyFilterIndex >= 0) {
              filters[hierarchyFilterIndex].values = [
                replaceSpecialCharToCharCode(hierarchyValue),
              ];
            } else {
              filters.push({
                attribute_name: hierarchyName,
                dimension: "Product",
                filter_type: "cascaded",
                operator: "in",
                values: [replaceSpecialCharToCharCode(hierarchyValue)],
              });
            }
          }

          const l0TableDataPayload = {
            filters: filters,
            meta: {
              search: [],
              range: [],
              sort: [
                {
                  column: "l6_id",
                  order: "asc",
                },
              ],
            },
            aggregation_level: body.filters.aggregation_level,
            start_agg_id: body.filters.timeline.start_week_id,
            end_agg_id: body.filters.timeline.end_week_id,
            aggregation_type: "style",
            aggregation_value: "",
            kpi: selectedKpi,
            roq_date_option: selectedRoqDateTab,
            topLineEdit: true,
          };

          if (selectedDistributionMethodValue) {
            l0TableDataPayload.distribution_method = selectedDistributionMethodValue;
          }

          l0TableDataPayloadRef.current = l0TableDataPayload;
        }

        const data = await fetchEditHierarchyData(
          cloneDeep(payload),
          localStorage.getItem("isRedirectedFromDashboardToOms")
            ? mergeOmsDcIntoFilters(
                [...redirectedFilters, ...styleFilter],
                OmsReducer.selectedDcs
              )
            : OmsReducer.selectedFilters,
          selectedKpi,
          OmsReducer,
          selectedRoqDateTab
        );

        // transform data
        var transformedData = data?.map((item) => {
          // if(item.pack_id)
          // {
          //   dispatch(setIsPackId(true));
          // }
          // else{
          //   dispatch(setIsPackId(false));
          // }
          const { fiscal_week, aggr_column } = item;
          const transformedWeekData = {};

          for (const week in fiscal_week) {
            const orderQuantity = fiscal_week[week]?.order_quantity;
            var flag = fiscal_week[week]?.flag;
            const Kpi = fiscal_week[week]?.kpi;
            const originalOrderQuantity =
              fiscal_week[week]?.order_quantity_original;
            const orderQuantityEaches =
              fiscal_week[week]?.order_quantity_eaches;
            const distributionPct = fiscal_week[week]?.distribution_pct;
            const orderCost = fiscal_week[week]?.order_cost;

            const approveStatus = {
              isGreyOut: false,
              isYellowOut: false,
            };
            if (flag !== undefined) {
              if (flag === 0) {
                approveStatus.isGreyOut = false;
                approveStatus.isYellowOut = false;
              } else if (flag === 1) {
                approveStatus.isGreyOut = false;
                approveStatus.isYellowOut = true;
              } else {
                approveStatus.isGreyOut = true;
                approveStatus.isYellowOut = false;
              }
            }
            transformedWeekData[week] = {
              adjusted: Math.round(orderQuantity),
              IA: originalOrderQuantity,
              order_quantity_eaches: orderQuantityEaches,
              Kpi: Kpi,
              distribution_pct: distributionPct,
              ...(flag !== undefined && flag !== null ? { flag } : {}),
              ...approveStatus,
              order_cost: orderCost,
            };
          }

          return {
            row: aggr_column,
            aggr_column: aggr_column,
            ...item,
            ...transformedWeekData,
          };
        });

        let levelCount = 0;

        transformedData.forEach((elem) => {
          let predictedFiscalWeeks = fiscalWeekId?.fiscal_ids || [];
          for (let week of predictedFiscalWeeks) {
            if (!elem[week]) {
              // When creating missing weeks, preserve distribution_pct if it exists in original fiscal_week
              const distributionPct =
                elem.fiscal_week?.[week]?.distribution_pct;
              elem[week] = {
                IA: null,
                adjusted: null,
                order_cost: null,
                ...(distributionPct !== undefined && distributionPct !== null
                  ? { distribution_pct: distributionPct }
                  : {}),
              };
            } else {
              if (!levelCount) {
                levelCount = elem[week]["level_count"];
              }
            }
          }
        });

        const updatedEditHierarchy = getAllRows(editHierarchyInstance);

        const updatedResponse = handleAppendResponse(
          updatedEditHierarchy,
          transformedData
        );
        setEditRowData(updatedResponse);
        setIsPredictedDataFetched(true);
        initialEditRowData.current = cloneDeep(updatedResponse);
        setLoaderCount((prevState) => prevState - 1);
        editHierarchyInstance.current.api?.refreshCells({
          force: true,
          suppressFlash: false,
        });
        editHierarchyInstance?.current?.api?.deselectAll();
      } catch (error) {
        console.log("error12", error);
      }
    };
    await fetchRowData();
  };

  useEffect(() => {
    setTotalRowData([]);
    dispatch(setIsButtonDisabled(true));
    // close child table when ROQ date tab, edit mode, or distribution method changes
    if (activeChildHierarchyKey) {
      setActiveChildHierarchyKey(null);
      setActiveChildHierarchyDescription(null);
      currentHierarchyKey.current = null;
      // collapse any expanded rows in AG-Grid
      if (editHierarchyInstance?.current?.api) {
        editHierarchyInstance.current.api.forEachNode((node) => {
          if (node.expanded) {
            node.setExpanded(false);
          }
        });
      }
    }
    // if (!MatrixSummarySetAllApiSuccess) {
    //   return;
    // }
    if (isDataWeekLevel !== null) {
      updateResponse(isDataWeekLevel, isSwitchDisable, selectedKpi);
    }
  }, [
    isDataWeekLevel,
    calenderChangedDependency,
    selectedKpi,
    selectedRoqDateTab,
    selectedEditMode,
    selectedDistributionMethodValue,
  ]);

  // Refresh Matrix Summary when DC filter changes
  useEffect(() => {
    if (isDataWeekLevel !== null && props?.selectedFilters) {
      updateResponse(isDataWeekLevel, isSwitchDisable, selectedKpi);
    }
  }, [props?.selectedFilters]);

  useEffect(() => {
    setTotalRowData([]);
    setSelectedRows([]);
    // close child table when ROQ date tab, edit mode, or distribution method changes
    if (activeChildHierarchyKey) {
      setActiveChildHierarchyKey(null);
      setActiveChildHierarchyDescription(null);
      currentHierarchyKey.current = null;
      // collapse any expanded rows in AG-Grid
      if (editHierarchyInstance?.current?.api) {
        editHierarchyInstance.current.api.forEachNode((node) => {
          if (node.expanded) {
            node.setExpanded(false);
          }
        });
      }
    }
    if (!MatrixSummarySetAllApiSuccess) {
      return;
    }
    updateResponse(isDataWeekLevel, isSwitchDisable, selectedKpi);
  }, [
    MatrixSummarySetAllApiSuccess,
    selectedRoqDateTab,
    selectedEditMode,
    selectedDistributionMethodValue,
  ]);

  // Sequential refresh handling for L0 table
  useEffect(() => {
    const sequentialRefreshStep = matrixSummaryReducer?.sequentialRefreshStep;
    if (sequentialRefreshStep === 1) {
      // L0 table refresh
      const handleL0Refresh = async () => {
        setTotalRowData([]);
        await updateResponse(isDataWeekLevel, isSwitchDisable, selectedKpi);
        // After L0 completes, check if child table is open before triggering L1 refresh
        const isChildTableOpen = activeChildHierarchyKey !== null;
        if (isChildTableOpen) {
          dispatch(setSequentialRefreshStep(2)); // Trigger L1 refresh
        } else {
          dispatch(setSequentialRefreshStep(0)); // Skip L1, reset sequence
        }
      };
      handleL0Refresh();
    }
  }, [
    matrixSummaryReducer?.sequentialRefreshStep,
    selectedRoqDateTab,
    selectedEditMode,
    userAccess,
  ]);

  useEffect(() => {
    if (!columnDefs?.length || !editRowData?.length) return;
    setIsEditRowUpdated(false);

    const getTotalRowData = handleTotalRow(
      editRowData,
      columnDefs,
      null,
      null,
      isL0SiblingsUnLockedForEmptyForecast,
      showNullValuesforEmptyForecast,
      selectedKpi,
      ENABLE_TOP_LEVEL_EDIT,
      selectedRoqDateTab,
      selectedEditMode
    );
    setTotalRowData(getTotalRowData);

    initialTotalRowData.current = cloneDeep(getTotalRowData);

    let totalRowData = getTotalRowData?.[0];

    updateAllForecastMultiplier(totalRowData, id, dispatch);

    setIsEditRowUpdated(true);
  }, [columnDefs, editRowData]);

  useEffect(() => {
    //Loads Fiscal Calendar and Filter COnfig
    const fetchFilters = async () => {
      try {
        let startYear = moment().year();
        let endYear = moment().year() + 2;
        let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
        const getSetAllKpiData = await GetSetAllKpiValue();
        if (getSetAllKpiData.data.status) {
          setSetAllKpiValues(getSetAllKpiData?.data?.data[0]);
        }
      } catch (error) {
        console.log("error", error);
        //displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchReceiptCalendarData = async () => {
      try {
        let startYear = moment().year();
        let endYear = moment().year() + 2;
        let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const receiptCalendarData = await getOmsReceiptCalendarData(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: receiptCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setReceiptCalendarDetails(receiptCalendarData?.data?.data?.data);
      } catch (error) {
        console.log("Error in fetchReceiptCalendarData", error);
      }
    };

    if (
      selectedRoqDateTab === "roq_receipt_date" &&
      isEmpty(receiptCalendarDetails)
    ) {
      fetchReceiptCalendarData();
    }
  }, [selectedRoqDateTab, receiptCalendarDetails]);

  useEffect(() => {
    const fetchKPIValues = async () => {
      try {
        const getKpiDropDownValues = await GetKpiValue();
        const getKpiValueReceiptTimeline = await GetKpiValueReceiptTimeline();
        if (
          getKpiValueReceiptTimeline?.data?.status &&
          getKpiValueReceiptTimeline?.data?.data?.length > 0 &&
          selectedRoqDateTab === "roq_receipt_date"
        ) {
          const cleanedData = getKpiValueReceiptTimeline?.data?.data[0]?.attribute_value?.options?.map(
            ({ id, ...rest }) => rest
          );
          setKpiValues(cleanedData);
          dispatch(setKpiValuesForLabel(cleanedData));
          const matchingOption = cleanedData?.find(
            (opt) => opt.value === selectedKpi
          );
          setSelectedKpiOptions(matchingOption || cleanedData?.[0]);
        } else if (getKpiDropDownValues.data.status) {
          const cleanedData = getKpiDropDownValues?.data?.data[0]?.attribute_value?.options?.map(
            ({ id, ...rest }) => rest
          );
          setKpiValues(cleanedData);
          dispatch(setKpiValuesForLabel(cleanedData));
          const matchingOption = cleanedData?.find(
            (opt) => opt.value === selectedKpi
          );
          setSelectedKpiOptions(matchingOption || cleanedData?.[0]);
        }
      } catch (error) {
        console.log("error", error);
        //displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchKPIValues();
  }, [selectedRoqDateTab]);

  useEffect(() => {
    const fetchMaxEditableReceiptDate = async () => {
      try {
        if (selectedRoqDateTab === "roq_receipt_date") {
          setMaxEditableReceiptDateLoaderState(true);
          const response = await dispatch(getMaxEditableReceiptDate());
          if (
            response?.data?.status &&
            response?.data?.data?.max_editable_expected_receipt_date
          ) {
            setMaxEditableReceiptDateState(
              response.data.data.max_editable_expected_receipt_date
            );
          }
          setMaxEditableReceiptDateLoaderState(false);
        }
      } catch (error) {
        console.log("Error fetching max editable receipt date", error);
        setMaxEditableReceiptDateLoaderState(false);
      }
    };

    fetchMaxEditableReceiptDate();
  }, [selectedRoqDateTab]);

  useEffect(() => {
    if (
      DISTRIBUTION_METHOD_OPTIONS?.length > 0 &&
      !selectedDistributionMethod
    ) {
      const defaultOption = DISTRIBUTION_METHOD_OPTIONS[0];
      setSelectedDistributionMethod(defaultOption);
      setSelectedDistributionMethodValue(defaultOption?.value || null);
    }
  }, [DISTRIBUTION_METHOD_OPTIONS]);

  const displaySnackMessages = (message, variance, onClose) => {
    dispatch(
      addSnack({
        message: message,
        options: {
          variant: variance,
        },
      })
    );
  };

  const checkIfForecastIsEmpty = (key, data) => {
    return (
      !KEYS_USED_OTHER_THAN_FISCAL_WEEK.includes(key) &&
      (data[key]?.IA === null || data[key]?.IA === undefined)
    );
  };

  const findFiscalWeekKeys = (key) => {
    return !KEYS_USED_OTHER_THAN_FISCAL_WEEK.includes(key);
  };

  //Edge Case : When forecast is unavailable, Edit Hierarchy is set as Non Editable Cell
  useEffect(() => {
    if (columnDefs?.length && editRowData?.length) {
      try {
        var cols = cloneDeep(columnDefs);
        let columnsToDisable = [];
        let isUpdated = false;
        let columns = {};

        editRowData?.map((row) => {
          for (const key in row) {
            let columnId = `${key}.adjusted`;
            let index = cols.findIndex((col) => col.id === key);
            if (index >= 0) {
              isUpdated = true;

              if (cols[index].sub_headers?.length) {
                cols[index].sub_headers[0].cellStyle = function (params) {
                  if (params?.data[key]?.isGreyOut) {
                    return {
                      backgroundColor: "#C3C8D4",
                      colour: "#C3C8D4",
                    };
                  }
                  if (params?.data[key]?.isYellowOut) {
                    return {
                      backgroundColor: "#F6EBBF",
                      colour: "#F6EBBF",
                    };
                  }

                  // Red highlight if order qty is less than MOQ
                  const errorHighlightCellStyle = getErrorHighlightCellStyle(
                    selectedKpi,
                    params
                  );

                  if (errorHighlightCellStyle) {
                    return errorHighlightCellStyle;
                  }
                };
              }
            }
          }
        });

        let updatedColumns = agGridColumnFormatter(cols);
        const updatedData = updatedColumns.map((column, i) => ({
          ...column,
          cellRenderer: columnDefs[i].cellRenderer,
        }));
        if (isUpdated) {
          setColumnDefs(updatedData);
        }
      } catch (error) {
        console.log("Something went wrong!", error);
      }
    }
  }, [editRowData, isEditRowUpdated]);

  // Disable L0 table cells when in topline_edit mode (but keep TOTAL row editable)
  useEffect(() => {
    if (columnDefs?.length && editRowData?.length) {
      try {
        const shouldDisableL0Cells =
          ENABLE_TOP_LEVEL_EDIT &&
          selectedRoqDateTab === "roq_receipt_date" &&
          selectedEditMode === "topline_edit";

        var cols = cloneDeep(columnDefs);
        let isUpdated = false;

        editRowData?.map((row) => {
          for (const key in row) {
            let index = cols.findIndex((col) => col.id === key);
            if (index >= 0 && cols[index].sub_headers?.length) {
              const originalCellStyle = cols[index].sub_headers[0].cellStyle;

              if (shouldDisableL0Cells) {
                isUpdated = true;
                cols[index].sub_headers[0].cellStyle = function (params) {
                  let existingStyle = {};
                  if (typeof originalCellStyle === "function") {
                    const originalStyle = originalCellStyle(params);
                    if (originalStyle) {
                      existingStyle = originalStyle;
                    }
                  } else if (originalCellStyle) {
                    existingStyle = originalCellStyle;
                  }

                  if (
                    params?.data?.row !== "total" &&
                    params?.data?.aggr_column !== "total"
                  ) {
                    return {
                      ...existingStyle,
                      pointerEvents: "none",
                    };
                  }

                  return existingStyle;
                };
              }
            }
          }
        });

        if (isUpdated) {
          let updatedColumns = agGridColumnFormatter(cols);
          const updatedData = updatedColumns.map((column, i) => ({
            ...column,
            cellRenderer: columnDefs[i].cellRenderer,
          }));
          setColumnDefs(updatedData);
        }
      } catch (error) {
        console.log("Something went wrong while disabling L0 cells!", error);
      }
    }
  }, [
    editRowData,
    selectedEditMode,
    selectedRoqDateTab,
    ENABLE_TOP_LEVEL_EDIT,
  ]);

  //Navigate to Prodict Details Page
  useEffect(() => {
    const fetchDeepDiveFilters = async () => {
      try {
        let deepDiveFilters = await dispatch(getOmsDeepDiveFilters());
        let productDetailsFilters = [];
        if (deepDiveFilters?.data?.data?.length > 0) {
          productDetailsFilters.push(deepDiveFilters?.data?.data[0]);
        }
        dispatch(
          setOrderManagementProductDetailsFilters(productDetailsFilters)
        );
        if (deepDiveFilters?.data?.data?.length > 1) {
          dispatch(
            setOrderManagementDeepDiveFilters(
              deepDiveFilters?.data?.data?.slice(1)
            )
          );
        }
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    if (
      OmsReducer?.orderManagementProductDetailsFilters?.length === 0 ||
      OmsReducer?.orderManagementDeepDiveFilters?.length === 0 ||
      localStorage.getItem("isRedirectedFromDashboardToOms")
    ) {
      fetchDeepDiveFilters();
    }
  }, []);

  const preparePayloadForProductDetailsPage = () => {
    try {
      const selectedIdsFromMatrix = [];
      selectedRows.forEach((row) => selectedIdsFromMatrix.push(row?.row));

      let appliedOMSFilters = cloneDeep(
        filterReducer?.appliedFilterData?.dependencyData ||
          OmsReducer?.selectedFilters ||
          []
      );

      const selectedFilters = cloneDeep(OmsReducer?.selectedFilters ?? []);

      if (
        Array.isArray(selectedFilters) &&
        filterReducer?.appliedFilterData?.dependencyData
      ) {
        const appliedAttributeNames = new Set(
          appliedOMSFilters
            .map((filter) => filter?.attribute_name)
            .filter(Boolean)
        );

        const filtersToAdd = selectedFilters.filter((filter) => {
          const hasAttribute = Boolean(filter?.attribute_name);
          const hasValues =
            Array.isArray(filter?.values) && filter.values.length > 0;

          return (
            hasAttribute &&
            hasValues &&
            !appliedAttributeNames.has(filter.attribute_name)
          );
        });

        appliedOMSFilters = [...appliedOMSFilters, ...filtersToAdd];
      }

      let deepDiveFiltersConfig =
        OmsReducer?.orderManagementProductDetailsFilters || [];
      const filterSelectedIdsFromMatrix = deepDiveFiltersConfig?.[0] || {};

      //Handling Redirected Filters & Passing to Product Details Page
      if (localStorage.getItem("isRedirectedFromDashboardToOms")) {
        appliedOMSFilters = mergeOmsDcIntoFilters(
          cloneDeep(
            JSON.parse(localStorage.getItem("selectedFiltersDependency"))
          ),
          OmsReducer.selectedDcs
        );
        let DEEP_DIVE_REDIRECTION_PAYLOAD = cloneDeep(
          OMS_PRODUCT_DETAILS_REDIRECTION_PAYLOAD
        );
        DEEP_DIVE_REDIRECTION_PAYLOAD.selectedFilters = appliedOMSFilters;
        DEEP_DIVE_REDIRECTION_PAYLOAD.selectedRowIds = selectedIdsFromMatrix;
        DEEP_DIVE_REDIRECTION_PAYLOAD.isRedirectedFromISModules = false;
        localStorage.setItem(
          "omsRedirectionDetails",
          JSON.stringify(DEEP_DIVE_REDIRECTION_PAYLOAD)
        );

        const currentDcs = OmsReducer?.selectedDcs;
        if (Array.isArray(currentDcs) && currentDcs.length > 0) {
          const dcsToStore = currentDcs.map((dc) => ({
            label: dc.label ?? String(dc.value),
            value: dc.value,
          }));
          localStorage.setItem(
            OMS_OM_REDIRECT_DASHBOARD_DCS,
            JSON.stringify(dcsToStore)
          );
        } else {
          localStorage.removeItem(OMS_OM_REDIRECT_DASHBOARD_DCS);
        }
      }

      const selectedRowsFilter = {
        filter_type: filterSelectedIdsFromMatrix?.type,
        attribute_name: filterSelectedIdsFromMatrix?.column_name,
        operator: "in",
        dimension: filterSelectedIdsFromMatrix?.dimension,
        values: [...selectedIdsFromMatrix],
      };

      const payload = {
        filters: [...appliedOMSFilters, selectedRowsFilter],
      };
      dispatch(setOrderManagementDeepDiveFiltersData({})); // Clear old data
      dispatch(setSelectedRowsFromMatrixSummary(selectedRowsFilter));
      dispatch(setOrderManagementDeepDiveFiltersPayload(payload));
    } catch (error) {
      console.log(
        "Error while creating Payload for Product details page",
        error
      );
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const onProductDetailsClick = () => {
    try {
      if (!isCellEdited) {
        preparePayloadForProductDetailsPage();
        navigate(ORDER_MANAGEMENT_PRODUCT_DETAILS);
      } else {
        setOpenNavigationPopUp(true);
      }
    } catch (error) {
      console.log("error12", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const NavigationFromPopUp = () => {
    try {
      preparePayloadForProductDetailsPage();
      navigate(ORDER_MANAGEMENT_PRODUCT_DETAILS);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  // Clear calendar date range when switching to Month view
  const clearDates = () => {
    setSelectedDate(undefined);
    selectedDateRef.current = undefined;
    setSelectedRoqDate(undefined);
    selectedRoqDateRef.current = undefined;
  };

  const switchValue = (event) => {
    clearDates();
    if (event.target.value === "week") {
      setIsDataWeekLevel(true);
    } else {
      setIsDataWeekLevel(false);
      setIsSwitchDisable(false);
    }
  };

  const onApproveButtonClick = () => {
    setShowApprovalModal(true);
    currentHierarchyKey.current = null;
    setActiveChildHierarchyKey(null);
    setActiveChildHierarchyDescription(null);
  };

  const handleDateChange = (dates) => {
    console.log("handleDateChange", dates);
    setSelectedDate(dates);
    selectedDateRef.current = dates;
  };

  const handleRoqDateChange = (dates) => {
    console.log("handleRoqDateChange", dates);
    setSelectedRoqDate(dates);
    selectedRoqDateRef.current = dates;
  };

  const onFilterApply = () => {
    const currentDates = selectedDateRef.current;
    if (currentDates?.fiscalInfoEndDate !== null) {
      setSelectedDate(currentDates);
      setIsSwitchDisable(true);
      setCalenderChangedDependency(calenderChangedDependency + 1);
      var fiscalDates = {
        start_fw: currentDates?.fiscalInfoStartDate?.fiscal_year_week,
        end_fw: currentDates?.fiscalInfoEndDate?.fiscal_year_week,
        // start_date: formatStringDate(fiscalDatesInfo?.start_date, true),
        // end_date: formatStringDate(fiscalDatesInfo?.end_date, true),
      };
      console.log("fiscalDates", fiscalDates);
      dispatch(setFiscalDates(fiscalDates));
    } else {
      //dispatch(displaySnackMessages("Please select dates", "warning"));
      setIsSwitchDisable(false);
      setCalenderChangedDependency(0);
    }
  };

  const onRoqFilterApply = () => {
    const currentDates = selectedRoqDateRef.current;
    if (currentDates?.fiscalInfoEndDate !== null) {
      setSelectedRoqDate(currentDates);
      setIsSwitchDisable(true);
      setCalenderChangedDependency(calenderChangedDependency + 1);
      var fiscalDates = {
        start_fw: currentDates?.fiscalInfoStartDate?.fiscal_year_week,
        end_fw: currentDates?.fiscalInfoEndDate?.fiscal_year_week,
      };
      dispatch(setFiscalDates(fiscalDates));
    } else {
      setIsSwitchDisable(false);
      setCalenderChangedDependency(0);
    }
  };

  const handleSkuIdChange = (opt) => {
    console.log("event", opt);
    let newValue = opt.value;
    setSelectedKpi(newValue);
    dispatch(setKPIValue(newValue));
  };

  const handleDistributionMethodChange = (opt) => {
    setSelectedDistributionMethod(opt);
    setSelectedDistributionMethodValue(opt?.value || null);
  };

  const handleRoqDateTabChange = (event, newValue) => {
    setSelectedRoqDateTab(newValue);
    const currentState = OmsReducer?.highLevelSummaryState || {};
    dispatch(
      setHighLevelSummaryState({
        ...currentState,
        selectedRoqDateTab: newValue,
      })
    );
    dispatch(setIsButtonDisabled(true));
  };

  const openSetAllPopUp = () => {
    setOpenMatrixSummarySetAllPopUp(true);
  };

  const SetAllData = async (data) => {
    try {
      if (OmsReducer?.selectedDcs?.length > 0) {
        data.selected_linked_store_codes = OmsReducer?.selectedDcs?.map(
          (dc) => dc.value
        );
      }
      const responseData = await SetAllMatrixSummaryData(data);
      if (responseData.data.status) {
        setMatrixSummarySetAllApiSucess(true);
        dispatch(setMatrixSummarySetAllApiSuccess(true));
        successHandler(dispatch, "Saved successfully");
        return true;
      }
    } catch (err) {
      console.log("errSetAll", err);
    }
  };

  const isOutsideRange = (date) => {
    if (selectedRoqDateTab === "roq_placement_date") {
      //disable weeks after 26 weeks from current week
      let weekLimit = 26 * 7 - 1;
      let weekStartDay = moment().startOf("week");
      let weekEndDay = moment().endOf("week").day(weekLimit);
      return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
    } else if (selectedRoqDateTab === "roq_receipt_date") {
      //enable weeks from current week till the week having max date
      if (maxEditableReceiptDate) {
        let maxReceiptWeekEnd = moment(maxEditableReceiptDate).endOf("week");
        let currentWeekStart = moment().startOf("week");

        return !moment(date).isBetween(
          currentWeekStart,
          maxReceiptWeekEnd,
          undefined,
          "[]"
        );
      }
    }

    return false;
  };

  const getTopCenterOptions = () => {
    // Move Week/Month toggle to left when receipt timeline and top level edit are enabled
    if (
      ENABLE_TOP_LEVEL_EDIT &&
      selectedRoqDateTab === "roq_receipt_date" &&
      selectedRows.length === 0
    ) {
      return [];
    }
    return [
      <ButtonGroup
        onChange={switchValue}
        options={[
          {
            label: "Week",
            value: "week",
          },
          {
            label: "Month",
            value: "month",
          },
        ]}
        selectedOption={isDataWeekLevel ? "week" : "month"}
      />,
    ];
  };

  const isCalendarDisabled = () => {
    return !isDataWeekLevel;
  };

  const getOuterOptionsContainer = () => {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div className={globalClasses.flexRow} style={{ gap: "12px" }}>
          <ButtonGroup
            onChange={switchValue}
            options={[
              {
                label: "Week",
                value: "week",
              },
              {
                label: "Month",
                value: "month",
              },
            ]}
            selectedOption={isDataWeekLevel ? "week" : "month"}
          />
          {selectedRoqDateTab === "roq_receipt_date" ? (
            <div className={globalClasses.flexRow}>
              <NormalCalendarFiscalMapping
                fiscalCalendarData={receiptCalendarDetails}
                disablePastWeeks={true}
                disableOutSideFiscalRange={false}
                showDefaultLabel={false}
                selectedDate={selectedRoqDate}
                onDateChange={handleRoqDateChange}
                maxOneWeekSelection={true}
                maxEightWeekSelection={true}
                selectionRange={8}
                selectionMonthCount={8}
                disabled={false}
                displayRow={true}
                onPrimaryButtonClick={() => onRoqFilterApply()}
                isOutsideRange={isOutsideRange}
                resetOptions={true}
                useFiscalMonthEnd={true}
                useCurrentWeekStart={true}
                enableAutoSelectionForMonth={!isDataWeekLevel}
              />
            </div>
          ) : (
            <div className={globalClasses.flexRow}>
              <NormalCalendarFiscalMapping
                fiscalCalendarData={fiscalCalendarDetails}
                disablePastWeeks={true}
                disableOutSideFiscalRange={false}
                showDefaultLabel={false}
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                maxOneWeekSelection={true}
                maxEightWeekSelection={true}
                selectionRange={8}
                disabled={isCalendarDisabled()}
                displayRow={true}
                onPrimaryButtonClick={() => onFilterApply()}
                isOutsideRange={isOutsideRange}
                resetOptions={true}
              />
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
            gap: "12px",
          }}
        >
          {/* TopLine Edit & InLine Edit */}
          {ENABLE_TOP_LEVEL_EDIT &&
            selectedRoqDateTab === "roq_receipt_date" &&
            selectedRows.length === 0 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {OMS_EDIT_MODE_OPTIONS.map((option) => (
                  <Chips
                    key={option.value}
                    isActive={selectedEditMode === option.value}
                    label={option.label}
                    onClick={() => {
                      setSelectedEditMode(option.value);
                      const currentState =
                        OmsReducer?.highLevelSummaryState || {};
                      dispatch(
                        setHighLevelSummaryState({
                          ...currentState,
                          selectedEditMode: option.value,
                        })
                      );
                    }}
                    type="single"
                  />
                ))}
              </div>
            )}

          {/* Placement Timeline & Receipt Timeline */}
          {SHOW_ROQ_DATE_OPTIONS && selectedRows.length === 0 && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                margin: "0 0.5rem",
                alignItems: "center",
              }}
            >
              <p>Show</p>
              {ROQ_DATE_TAB_OPTIONS.map((option) => (
                <Chips
                  key={option.value}
                  isActive={selectedRoqDateTab === option.value}
                  label={option.label}
                  onClick={() => handleRoqDateTabChange(null, option.value)}
                  type="single"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const getTopRightOptions = () => {
    let options = [];
    options.push(
      <>
        {selectedRows.length > 0 && (
          <>
            <div>
              <Button
                variant="tertiary"
                color="primary"
                id="setAllButton"
                className={classes.button}
                disabled={
                  (ENABLE_TOP_LEVEL_EDIT &&
                    selectedRoqDateTab === "roq_receipt_date" &&
                    selectedEditMode === "topline_edit") ||
                  (!isEmpty(userAccess)
                    ? !isUserHasSetAllAccess || selectedRows.length === 0
                    : !orderingAccessControl?.isEditButton?.isVisible ||
                      selectedRows.length === 0)
                }
                onClick={openSetAllPopUp}
              >
                Set All
              </Button>
            </div>
            <div>
              <Button
                variant="tertiary"
                color="primary"
                id="viewStyleOrderAndDeepDive"
                className={classes.button}
                onClick={onProductDetailsClick}
                disabled={selectedRows?.length === 0}
              >
                Product Details
              </Button>
            </div>
            <div>
              <Button
                variant="primary"
                color="primary"
                id="approveButton"
                className={classes.button}
                onClick={onApproveButtonClick}
                disabled={selectedRows?.length === 0}
              >
                Approve Orders
              </Button>
            </div>
          </>
        )}
        {selectedRows.length === 0 && (
          <>
            {!isEmpty(selectedKpiOptions) && (
              <div style={{ display: "contents" }}>
                <FormControl
                  size="small"
                  sx={{ minWidth: 240 }}
                  className={classNames(
                    classes.flexRow,
                    globalClasses.verticalAlignCenter
                  )}
                >
                  <label style={{ marginRight: "6px" }}>KPI</label>
                  <Select
                    id="viewBySelection"
                    currentOptions={kpiValues}
                    setCurrentOptions={setKpiValues}
                    initialOptions={kpiValues}
                    selectedOptions={selectedKpiOptions}
                    handleChange={handleSkuIdChange}
                    setSelectedOptions={setSelectedKpiOptions}
                    isOpen={isOpenViewBy}
                    setIsOpen={setIsOpenViewBy}
                    // setCurrentOptions={() => {}}
                    // setIsSelectAll={() => {}}
                  />
                </FormControl>
              </div>
            )}

            {ENABLE_TOP_LEVEL_EDIT &&
              selectedRoqDateTab === "roq_receipt_date" &&
              selectedRows.length === 0 &&
              selectedEditMode === "topline_edit" && (
                <div style={{ display: "contents" }}>
                  <FormControl
                    size="small"
                    sx={{ minWidth: 240 }}
                    className={classNames(
                      classes.flexRow,
                      globalClasses.verticalAlignCenter
                    )}
                  >
                    <label style={{ marginRight: "6px" }}>
                      Distribution Method
                    </label>
                    <Select
                      id="distributionMethodSelection"
                      currentOptions={DISTRIBUTION_METHOD_OPTIONS}
                      setCurrentOptions={() => {}}
                      initialOptions={DISTRIBUTION_METHOD_OPTIONS}
                      selectedOptions={selectedDistributionMethod}
                      handleChange={handleDistributionMethodChange}
                      setSelectedOptions={setSelectedDistributionMethod}
                      isOpen={isDistributionMethodOpen}
                      setIsOpen={setIsDistributionMethodOpen}
                    />
                  </FormControl>
                </div>
              )}
          </>
        )}
      </>
    );
    return options;
  };

  return (
    <>
      <LoadingOverlay
        loader={
          loaderCount ||
          tableLoader ||
          !(totalRowData.length && editRowData.length !== 0)
        }
        isCustomLoader={true}
        wrapperPosition="static"
        minHeight="260px"
      >
        <EditHierarcy
          id={id}
          activeKey={activeKey}
          columnDefs={columnDefs}
          editRowData={editRowData}
          totalRowData={totalRowData}
          disabledTotalColumns={disabledTotalColumns}
          activeChildHierarchyKey={activeChildHierarchyKey}
          historicColumnData={
            isCalledFromMFPDashboard ? [] : historicColumnData
          }
          setIsEditRowUpdated={setIsEditRowUpdated}
          setSelectedRowsL0Table={setSelectedRows}
          isCalledFromMFPDashboard={isCalledFromMFPDashboard}
          setCounterOnEditHierarchyChange={setCounterOnEditHierarchyChange}
          getTopRightOptions={getTopRightOptions}
          getTopCenterOptions={getOuterOptionsContainer}
          selectedRoqDateTab={selectedRoqDateTab}
          selectedEditMode={selectedEditMode}
          enableTopLevelEdit={ENABLE_TOP_LEVEL_EDIT}
          selectedHierarchyL0ForBudget={selectedHierarchyL0ForBudget}
          ref={{
            lastEditedDriversRef,
            editHierarchyInstance,
            editHierarchyTotalRowInstance,
            forecastMultiplierInstance,
            editHierarchyChildInstance,
            editHierarchyGrandChildInstance,
            editHierarchyChildTotalRowInstance,
            initialEditChildRowData,
            allEditedGrandChildRowData,
            initialEditRowData,
            initialTotalRowData,
            editChildRowData,
            currentHierarchyKey,
            allEditedChildRowData,
            allEditedGrandChildRowMapping,
          }}
        />

        {showApprovalModal && (
          <ApprovalFlowDialog
            setShowApprovalModal={setShowApprovalModal}
            screenName={ORDER_MANAGEMENT_FILTER_CONFIG}
            fiscalCalendarDetails={fiscalCalendarDetails}
            selectedRows={selectedRows}
            targetTable={"matrix_summary"}
            reloadComponent={setMatrixSummarySetAllApiSucess}
          />
        )}

        {openMatrixSummarySetAllPopUp && (
          <MatrixSummarySetAllModal
            setShowSetAllModal={setOpenMatrixSummarySetAllPopUp}
            kpiValues={SetAllkpiValues}
            selectedRows={selectedRows}
            isDataWeekLevel={isDataWeekLevel}
            SetAllData={SetAllData}
            displaySnackMessages={displaySnackMessages}
            columnData={columnDefs}
          />
        )}

        <Prompt
          isOpen={openNavigationPopUp}
          variant="warning"
          title=" Are you sure you want to change screens?"
          primaryButtonLabel="Yes"
          secondaryButtonLabel="No"
          onPrimaryButtonClick={() => {
            NavigationFromPopUp();
            setOpenNavigationPopUp(false);
          }}
          onSecondaryButtonClick={() => {
            setOpenNavigationPopUp(false);
          }}
          handleClose={() => {
            setOpenNavigationPopUp(false);
          }}
        >
          Any unsaved changes will be lost.
        </Prompt>
      </LoadingOverlay>
    </>
  );
};

export default forwardRef(EditHierarcyWrapper);

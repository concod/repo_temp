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
import { formatStringDate } from "core/Utils/functions/utils";
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
  getOmsDeepDiveFilters,
  setOrderManagementDeepDiveFilters,
  setOrderManagementDeepDiveFiltersPayload,
  setOrderManagementProductDetailsFilters,
  setSelectedRowsFromMatrixSummary,
  fetchFiscalWeeks,
  getMaxEditableReceiptDate,
  setMaxEditableReceiptDate,
  setMaxEditableReceiptDateLoader,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import ApprovalFlowDialog from "../../Approval-Flow-Dialog/ApprovalFlowDialog";
import {
  ERROR_MESSAGE,
  OMS_HIGH_LEVEL_SUMMARY_ROQ_DATE_OPTIONS,
  TENANT_DATE_FORMAT,
  OMS_PRODUCT_DETAILS_REDIRECTION_PAYLOAD,
  OMS_ORDER_MANAGEMENT_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { ORDER_MANAGEMENT_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import MatrixSummarySetAllModal from "../matrixSummarySetAllPopUp";

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
  const [selectedRoqDateTab, setSelectedRoqDateTab] = useState(null);
  const [maxEditableReceiptDate, setMaxEditableReceiptDateState] = useState(
    null
  );
  const [
    maxEditableReceiptDateLoader,
    setMaxEditableReceiptDateLoaderState,
  ] = useState(false);

  const selectedDateRef = useRef(selectedDate);

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
      var datePlus8Weeks = new Date(currentDate);
      datePlus8Weeks.setDate(currentDate.getDate() + 8 * 7); // 8 weeks * 7 days
      if (!isDataWeekLevel) {
        datePlus8Weeks.setDate(currentDate.getDate() + 24 * 7);
      }

      // Format the dates for better readability
      const currentDateFormatted = currentDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD
      const datePlus8WeeksFormatted = datePlus8Weeks
        .toISOString()
        .split("T")[0]; // Format: YYYY-MM-DD

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
        const redirectedFilters = cloneDeep(
          JSON.parse(localStorage.getItem("selectedFiltersDependency"))
        );
        const styleFilter = cloneDeep(
          JSON.parse(localStorage.getItem("redirect_filter_level"))
        );

        const data = await fetchEditHierarchyData(
          cloneDeep(payload),
          localStorage.getItem("isRedirectedFromDashboardToOms")
            ? [...redirectedFilters, ...styleFilter]
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
              ...approveStatus,
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
              elem[week] = {
                IA: null,
                adjusted: null,
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
        editHierarchyInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
        editHierarchyInstance?.current?.api?.deselectAll();
        setSelectedRows([]);
      } catch (error) {
        console.log("error12", error);
      }
    };
    await fetchRowData();
  };

  // useEffect(() => {
  //   setTotalRowData([]);
  //   updateResponse(isDataWeekLevel, isSwitchDisable, selectedKpi);
  // }, []);

  useEffect(() => {
    setTotalRowData([]);
    dispatch(setIsButtonDisabled(false));
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
  ]);

  useEffect(() => {
    setTotalRowData([]);
    if (!MatrixSummarySetAllApiSuccess) {
      return;
    }
    updateResponse(isDataWeekLevel, isSwitchDisable, selectedKpi);
  }, [MatrixSummarySetAllApiSuccess, selectedRoqDateTab]);

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
      selectedKpi
    );
    console.log("totalRowData", getTotalRowData);
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
        const getKpiDropDownValues = await GetKpiValue();
        const getSetAllKpiData = await GetSetAllKpiValue();
        if (getKpiDropDownValues.data.status) {
          const cleanedData = getKpiDropDownValues?.data?.data[0]?.attribute_value?.options?.map(
            ({ id, ...rest }) => rest
          );
          setKpiValues(cleanedData);
          dispatch(setKpiValuesForLabel(cleanedData));
          setSelectedKpiOptions(cleanedData[0]);
        }
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
              var is_edited = true;
              if (cols[index].sub_headers?.length) {
                cols[index].sub_headers[0].cellStyle = function (params) {
                  if (params?.data[key]?.isGreyOut) {
                    return {
                      backgroundColor: "#C3C8D4",
                      colour: "#C3C8D4",
                    };
                  }
                  if (params?.data[key]?.isYellowOut) {
                    is_edited = false;
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
                // // Add tooltip for hover messages
                // cols[index].sub_headers[0].tooltipValueGetter = function (params) {
                //   if (params?.data[key]?.isGreyOut) {
                //     return "Approved ROQ cannot be edited";
                //   }
                //   if (params?.data[key]?.isYellowOut) {
                //     return "Unapproved ROQ DCs can be edited";
                //   }
                //   return null; // No tooltip for other cells
                // };
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
      let deepDiveFiltersConfig =
        OmsReducer?.orderManagementProductDetailsFilters || [];
      const filterSelectedIdsFromMatrix = deepDiveFiltersConfig?.[0] || {};

      //Handling Redirected Filters & Passing to Product Details Page
      if (localStorage.getItem("isRedirectedFromDashboardToOms")) {
        appliedOMSFilters = cloneDeep(
          JSON.parse(localStorage.getItem("selectedFiltersDependency"))
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

  const switchValue = (event) => {
    if (event.target.value === "week") {
      setIsDataWeekLevel(true);
    } else {
      setIsDataWeekLevel(false);
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

  const onFilterApply = () => {
    const currentDates = selectedDateRef.current;
    if (currentDates?.fiscalInfoEndDate !== null) {
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

  const handleSkuIdChange = (opt) => {
    console.log("event", opt);
    let newValue = opt.value;
    setSelectedKpi(newValue);
    dispatch(setKPIValue(newValue));
  };

  const handleRoqDateTabChange = (event, newValue) => {
    setSelectedRoqDateTab(newValue);
  };

  const openSetAllPopUp = () => {
    setOpenMatrixSummarySetAllPopUp(true);
  };

  const SetAllData = async (data) => {
    try {
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
          {selectedRows.length == 0 && (
            <div className={globalClasses.flexRow}>
              <NormalCalendarFiscalMapping
                fiscalCalendarData={fiscalCalendarDetails}
                disablePastWeeks={true}
                disableOutSideFiscalRange={false}
                showDefaultLabel={false}
                onDateChange={handleDateChange}
                maxOneWeekSelection={true}
                maxEightWeekSelection={true}
                selectionRange={8}
                disabled={!isDataWeekLevel}
                displayRow={true}
                onPrimaryButtonClick={() => onFilterApply()}
                isOutsideRange={isOutsideRange}
              />
            </div>
          )}
        </div>
        <div>
          {SHOW_ROQ_DATE_OPTIONS && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
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
                  !isEmpty(userAccess)
                    ? !isUserHasSetAllAccess || selectedRows.length == 0
                    : !orderingAccessControl?.isEditButton?.isVisible ||
                      selectedRows.length == 0
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
                disabled={selectedRows?.length == 0}
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
                disabled={selectedRows?.length == 0}
              >
                Approve Orders
              </Button>
            </div>
          </>
        )}
        {selectedRows.length == 0 && (
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
          </>
        )}
      </>
    );
    return options;
  };

  return (
    <>
      <LoadingOverlay
        loader={loaderCount || tableLoader}
        isCustomLoader={true}
        wrapperPosition="static"
        minHeight="260px"
      >
        {totalRowData.length > 0 && editRowData.length > 0 && (
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
            getTopCenterOptions={getTopCenterOptions}
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
        )}
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

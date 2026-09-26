import React, { useState, useEffect, useMemo, useRef } from "react";
import HeaderBreadCrumbs from "../../../../core/Utils/HeaderBreadCrumbs";
import LoadingOverlay from "core/Utils/Loader/loader";
import get from "lodash/get";
import { cloneDeep, omit } from "lodash";
import isBoolean from "lodash/isBoolean";
import { useHistory, withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { Button, CircularProgress, Paper } from "@mui/material";
import FilterForBudgetTable from "./filter-for-budget-table";
import { useBudgetStyles } from "./budget-table-style";
import { addSnack } from "../../../../core/actions/snackbarActions";
import { PLAN_CREATE_NEW_PLAN } from "../../constants-plansmart/routesConstants";
import {
  getColumnsToExport,
  getPlanSmartSeasonType,
  updateMetricConfig,
} from "../plansmart-utility";
import {
  setPlansmartBudgetTableLoader,
  setPlansmartBudgetFilterLoader,
  setPlansmartBudgetUpdateLoader,
  getPlanSmartPlanDetails,
  fetchPlanBudgetDetails,
  getPlanningTableColumns,
  getPlanHierarchies,
  getPlanFilterDropdownOptions,
  updateBudgetTableData,
  updateForecastedData,
  savePlanAPI,
  planSmartSavePlanLoaderSelector,
  setPlanSmartSavePlanLoader,
  getMetricsConfig,
  getPivotDataAPI,
  getPivotColDefAPI,
  updateBudgetTableDataMatchWith,
  savePivotView,
  planSmartSavePivotViewLoaderSelector,
  setPlanSmartUpdateBudgetTableMatchLoader,
  planSmartBudgetTableColDefLoaderSelector,
  setPlanSmartBudgetTableColDefLoader,
  getSkuColDef,
  fetchPlanBudgetSkuDetails,
  fetchFormulasForEditableMetrics,
  setEditableMetricsFormula,
  setPlanSmartMetricFormulaLoader,
  planSmartMetricFormulaLoaderSelector,
  updateConstraintFilter,
  fetchEopVal,
  planSmartLastOfEopValSelector,
  setPlanSmartEopVal,
} from "../../services-plansmart/BudgetPlanTable/budget-plan-table-service";
import {
  getComparePlanFilters,
  getPlansToCompare,
  setPlanSmartComparePlanFilterLoader,
  setPlanSmartGetPlansToCompareLoader,
} from "../../services-plansmart/ComparePlan/compare-plan-service";
import {
  checkFormatOfNumber,
  customHeader,
  fetchBudgetTableColumn,
  fetchBudgetTableData,
  fetchBudgetTableFn,
  fetchComparePlanFilterDef,
  fetchMetricConfig,
  fetchMetricsFormulaForEditableMetrics,
  getCsvParams,
  handleClearImportedPlan,
  handleImportPlan,
  handlePivotView,
  handleRemoveVersion,
  PivotViewBackButton,
  updateBudgetTable,
} from "./budget-table-functions";
import PlansmartBudgetTable from ".";
import ComparePlanModal from "./compare-plan-modal";
import {
  PRE_SEASON_STATUS_CODES,
  disablePlanningScreen,
  getMatchWithText,
  getPlanningScreenBreadCrumbsUrlAndStage,
  plan_stage,
  planningScreenDownloadOption,
  updatePlanAddAllWeeksKpis,
  webWorkerColOmitObjList,
} from "modules/plansmart/constants-plansmart/stringConstants";
import PivotVersionsModal from "./PivotVersionsModal";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import PlanBudgetFilter from "./plan-budget-filter-header-component";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import globalStyles from "core/Styles/globalStyles";
import FilterChips from "core/commonComponents/filters/filterChips";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import SkuLevelBudget from "./sku-level-budget";
import { Undo, Refresh, Redo } from "@mui/icons-material";
import PivotView from "./PivotView";
import { Box } from "@mui/system";
import { setPlanDetails as setPlanDetailsForCommentBar } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import PlanSmartDownloadModal from "../PlanSmartDownloadModal";
import PlanSmartUpdatePlanModal from "../PlanSmartUpdatePlanModal";
import {
  getHierarchyValuesForDownload,
  getSpecificDownloadOption,
} from "modules/plansmart/utils-plansmart";
import {
  planSmartDownloadLoaderSelector,
  planSmartDownloadPlan,
  planSmartScreenConfigLoaderSelector,
  planSmartScreenConfigSelector,
} from "modules/plansmart/services-plansmart/common/plansmart-common-service";
import MatchWith from "./MatchWith";
import {
  getColumnExtra,
  getFlattenColumn,
  isWeekNumber,
} from "modules/plansmart/utils-plansmart/ConstantFunctions";
import TargetOptimizationModal from "./TargetOptimization";
import { useStyles } from "../plansmart-styles";
import ArrowTooltips from "core/Utils/ArrowTooltips";
import { Modal } from "impact-ui";

let calculationWorker = undefined;

const PlansmartBudgetRootComponent = (props) => {
  const { fetchEopValReq, lastEopVal } = props;
  const comparePlanRef = useRef();
  const payloadUpdateBudgetTableRef = useRef({});
  const [planDetails, setPlanDetails] = useState(null);
  const [listOptions, setListOptions] = useState(null);
  const [completePlanBudgetData, setCompletePlanBudgetData] = useState([]);
  const [planBudgetData, setPlanBudgetData] = useState([]);
  const [planBudgetColumns, setPlanBudgetColumns] = useState([]);
  const [metricConfig, setMetricConfig] = useState(null);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [isActive, setActiveTab] = useState("");
  const [tabIndex, setTabIndex] = useState("");
  const [tabData, setTabData] = useState([]);
  const [filtersForRows, setFiltersForRows] = useState([]);
  const [weekLevelKeys, setWeekLevelKeys] = useState([]);
  const [targetsData, setTargetsData] = useState({});
  const [payloadUpdateBudgetTable, setPayloadUpdateBudgetTable] = useState({
    metrics: {},
  });
  const [payloadStack, setPayloadStack] = useState([]);
  const [comparePlanModal, setComparePlanModal] = useState(false);
  const [comparePlanFilter, setComparePlanFilter] = useState([]);
  const [comparePlanFilterData, setComparePlanFilterData] = useState({});
  const [currentPlan, setCurrentPlan] = useState({});
  const [selectedComparePlanRows, setSelectedComparePlanRows] = useState([]);
  const [comparePlanRes, setComparePlanRes] = useState([]);
  const [formTargetDatas, setTargetFormData] = useState([]);
  const [comparePlanTableData, setComparePlanTableData] = useState([]);
  const [disableAllOptions, setDisableAllOptions] = useState(false);
  const [pivotVersionsModal, setPivotVersionsModal] = useState(false);
  const [pivotViewMode, setPivotViewMode] = useState(false);
  const [planRefColMapping, setPlanRefColMapping] = useState([]);
  const [planRefColVal, setPlanRefColVal] = useState([]);
  const [prevSelectedPlans, setPrevSelectedPlans] = useState([]);
  const [budgetTableRef, setBudgetTableRef] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filterChips, setFilterChips] = useState({
    filterConfig: [],
  });
  const [viewMode, setViewMode] = useState(false);
  const [originalColRefMapping, setOriginalColRefMapping] = useState({});
  const [hiddenMetrics, setHiddenMetrics] = useState({});
  const [skuViewMode, setSkuViewMode] = useState(false);
  const [disableUpdateButton, setDisableUpdateButton] = useState(true);
  const [trackColHidden, setTrackColHidden] = useState([]);
  const [downloadModal, setDownloadModal] = useState(false);
  const [showUpdatePlanAlert, setShowUpdatePlanAlert] = useState({
    status: false,
    cb: () => {},
  });
  const [activeTabState, setActiveTabState] = useState({});
  const [isMonthView, setIsMonthView] = useState(false);

  //states for blocking transition with unsaved changes
  const [blocked, setBlocked] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  // States for Undo Redo
  const [currIdxForStack, setCurIdxStack] = useState(0);
  const [stackOfInstances, setStackOfInstances] = useState([]);
  const [matchWith, setMatchWith] = useState(false);
  const [eopValueConfirmModal, setEopValueConfirmModal] = useState(false);
  const [checkEopValChange, setCheckEopValChange] = useState(true);
  const history = useHistory();
  const agTableRef = useRef();
  //style for budget table
  const classes = useBudgetStyles();
  const globalClasses = globalStyles();
  const plansmartClasses = useBudgetStyles();
  const plansmartClasses1 = useStyles();
  const [
    showTargetOptimizationModal,
    setShowTargetOptimizationModal,
  ] = useState(false);

  const showEnablePivot = useMemo(
    () =>
      get(
        props.screenConfig,
        `planning_screen.${getPlanSmartSeasonType(
          planDetails?.status
        )}.enablePivot`,
        false
      ),
    [props.screenConfig, planDetails]
  );

  useEffect(() => {
    props.setPlanDetailsForCommentBar({ data: planDetails });
    if (planDetails)
      sessionStorage.setItem("planData", JSON.stringify({ data: planDetails }));
    return () => {
      props.setPlanDetailsForCommentBar({});
      sessionStorage.setItem("planData", {});
    };
  }, [planDetails]);

  useEffect(() => {
    if (
      !props.plansmartBudgetTableLoader &&
      checkEopValChange &&
      planBudgetData?.length > 0
    ) {
      props.setPlanSmartEopVal({});
      fetchEopValReq(
        {
          plan_code: planDetails?.plan_code,
          level: filtersForRows,
        },
        (response) => {
          if (Object.keys(response?.data?.last_eoh || {}).length > 0) {
            setEopValueConfirmModal(true);
            setCheckEopValChange(false);
          }
        }
      );
    }
  }, [props.plansmartBudgetTableLoader, checkEopValChange]);

  useEffect(() => {
    async function handleMetricsFormula() {
      const plancode = props.match.params.plancode;
      await fetchMetricsFormulaForEditableMetrics(props);
      let tempPlanDetails = await fetchBudgetTableFn(
        props,
        disablePlanningScreen,
        plancode,
        setDisableAllOptions,
        setPlanDetails,
        showSnackMessage
      );
      const planningScreenConfigObj = get(
        props.screenConfig,
        `planning_screen.${getPlanSmartSeasonType(tempPlanDetails?.status)}`,
        {}
      );
      if (tempPlanDetails?.Bucket) {
        fetchBudgetTableColumn({
          history,
          props,
          pivotViewMode,
          setPlanBudgetColumns,
          showSnackMessage,
          filtersForRows,
          setTabData,
          setActiveTab: handleActive,
          setTabIndex,
          setPlanBudgetData,
          editableMetricFormulas: props?.editableMetricFormulas,
          budgetTableRef,
          bucket_keys: tempPlanDetails?.Bucket_v1,
          planningScreenConfig: planningScreenConfigObj,
          headerClasses: plansmartClasses.weekHeader,
          tempPlanDetails,
          plansmartConfigs: props.plansmartConfigs,
          setIsMonthView,
        });
      }

      fetchComparePlanFilterDef(
        props,
        plancode,
        setComparePlanFilterData,
        setComparePlanFilter,
        props.tenantFilterUamConfig
      );
      if (props.match.params?.displayType === "view") {
        setViewMode(true);
      } else {
        setViewMode(false);
      }
      fetchMetricConfig(props, setMetricConfig);
    }

    handleMetricsFormula();
    if (typeof calculationWorker === "undefined") {
      calculationWorker = new Worker(
        new URL("./formula.worker.js", import.meta.url)
      );
    }

    const handleUnsavedTransition = history.block(({ pathname }) => {
      if (
        Object.keys(payloadUpdateBudgetTableRef?.current?.metrics || {})
          .length > 0
      ) {
        setCurrentPath(pathname);
        setBlocked(true);
        return false;
      }

      return true;
    });

    return () => {
      handleUnsavedTransition();
      calculationWorker.terminate();
      calculationWorker = undefined;
      props.setPlanSmartEopVal({});
    };
  }, []);

  useEffect(() => {
    if (
      Object.keys(filtersForRows).length &&
      props.match.params.plancode &&
      props.editableMetricFormulas &&
      planBudgetColumns?.length > 0
    ) {
      commonBudgetTableFetch();
    }
  }, [planBudgetColumns, props.editableMetricFormulas, filtersForRows]);

  useEffect(() => {
    async function handleUpdateBudgetTable() {
      if (Object.keys(filtersForRows).length && props.match.params.plancode) {
        if (Object.keys(payloadUpdateBudgetTable?.metrics).length > 0) {
          updateBudgetTable(
            payloadUpdateBudgetTable,
            setPayloadUpdateBudgetTable,
            props,
            showSnackMessage,
            filtersForRows,
            commonBudgetTableFetch,
            agTableRef,
            setCheckEopValChange
          );
        }
      }
    }

    handleUpdateBudgetTable();
  }, [filtersForRows]);

  useEffect(() => {
    async function handleMetricConfig() {
      if (metricConfig && currentConfig && !pivotViewMode) {
        setMetricConfig(updateMetricConfig(currentConfig, metricConfig));
      }
    }
    handleMetricConfig();
  }, [metricConfig, currentConfig]);

  useEffect(() => {
    if (
      payloadUpdateBudgetTable &&
      Object.keys(payloadUpdateBudgetTable?.metrics).length > 0
    )
      setDisableUpdateButton(false);
    else setDisableUpdateButton(true);
    payloadUpdateBudgetTableRef.current = payloadUpdateBudgetTable;
  }, [payloadUpdateBudgetTable]);

  useEffect(() => {
    if (pivotViewMode) {
      if (tabData.length > 0) {
        handleActive(tabData[0]?.column_name);
        setTabIndex(0);
      }
    } else {
      if (tabData.length > 0) {
        handleActive(tabData[0]?.column_name);
        setTabIndex(0);
      }
    }
  }, [pivotViewMode]);

  useEffect(() => {
    if (
      planBudgetData &&
      Object.keys(planBudgetData).length > 0 &&
      agTableRef?.current?.rowData
    ) {
      agTableRef?.current?.api?.showLoadingOverlay();
      agTableRef?.current?.api.stopEditing();
      agTableRef?.current?.api.applyTransaction({ update: planBudgetData });
      agTableRef?.current?.api?.hideOverlay();
      agTableRef?.current?.api.startEditing();
    }
  }, [planBudgetData]);

  const planningScreenConfig = get(
    props.screenConfig,
    `planning_screen.${getPlanSmartSeasonType(planDetails?.status)}`,
    {}
  );
  const bucketSelection = get(
    planningScreenConfig,
    "show_or_hide_metric.bucket_selection",
    false
  );

  const importPlanProps = useMemo(
    () => ({
      setOriginalColRefMapping,
      setSelectedComparePlanRows,
      originalColRefMapping,
      prevSelectedPlans,
      setPrevSelectedPlans,
      setComparePlanRes,
      comparePlanRes,
      setComparePlanModal,
      planDetails,
      budgetTableRef,
      hiddenMetrics,
      skuViewMode,
    }),
    [
      planDetails,
      originalColRefMapping,
      comparePlanRes,
      prevSelectedPlans,
      hiddenMetrics,
      skuViewMode,
    ]
  );

  const downloadHierarchyValue = useMemo(() => {
    if (tabData?.length > 0 && planDetails) {
      const list = tabData.map((hierarchy) => ({
        value: hierarchy.id,
        label: hierarchy.type + `(${planDetails[hierarchy.id].length})`,
      }));
      return list;
    }
    return [];
  }, [planDetails, tabData]);

  const handleTabSwitch = (targetId, value) => {
    setShowUpdatePlanAlert({ status: true, cb: () => {} });
    setActiveTabState({
      targetId,
      value,
    });
  };

  const handleActive = (value) => {
    setSkuViewMode(value === "sku");
    setActiveTab(value);
    setPlanBudgetData([]);
    setStackOfInstances([]);
    setCurIdxStack(0);
    setPayloadStack([]);
    setStackOfInstances([]);
  };

  const showSnackMessage = (text, variance) => {
    props.addSnack({
      message: text,
      options: {
        variant: variance,
      },
    });
  };

  const handleMatchWith = async (value) => {
    setPlanBudgetData(null);
    // temperory fix for payload refresh issue
    setPayloadUpdateBudgetTable({
      metrics: {},
    });
    props.setPlanSmartUpdateBudgetTableMatchLoader(true);
    setPlanRefColVal(value);
    const plancode = props.match.params.plancode;
    let payloadMatchWith = {
      plan_code: plancode,
      match_with_plan: value.comparePlan
        ? isNaN(Number(value.value))
          ? value.label
          : value.value
        : value.label,
    };

    if (value?.label) {
      await props.updateBudgetTableDataMatchWith(payloadMatchWith);
      commonBudgetTableFetch();
      props.setPlanSmartUpdateBudgetTableMatchLoader(false);
    }
  };

  const handleSavePivotView = (viewName, viewType) => {
    const requestBody = {
      levels: {
        ...filtersForRows,
      },
      template_name: viewName,
      template_type: viewType,
    };
    props.savePivotViewReq(props.match.params.plancode, requestBody);
  };

  const handleDownload = (selectedOption, options) => {
    const value = selectedOption.value;
    if (value === "entire_plan") {
      const { selectedHierarchyLevel } = options;
      const payload = {
        source: "client",
        plan_code: props.match.params.plancode,
        filters: getHierarchyValuesForDownload(
          selectedHierarchyLevel,
          planDetails
        ),
      };
      props.downloadPlanReq(payload, downloadPlanCallback);
    } else if (value === "this_page") {
      agTableRef.current.api.showLoadingOverlay();
      const columns = getColumnsToExport(agTableRef);
      agTableRef.current.api.exportDataAsCsv(
        getCsvParams(columns, props?.plansmartConfigs?.metrics_with_formatter)
      );
      setDownloadModal(false);
      agTableRef.current.api.hideOverlay();
    }
  };

  const downloadOptions = getSpecificDownloadOption(
    planningScreenDownloadOption
  );

  const commonBudgetTableFetch = async (pivotMode) => {
    // setPlanBudgetData(null);
    setPayloadUpdateBudgetTable({ metrics: {} });
    setStackOfInstances([]);
    setCurIdxStack(0);
    setPayloadStack([]);
    setStackOfInstances([]);
    fetchBudgetTableData({
      props,
      planCode: props.match.params.plancode,
      pivotViewMode: isBoolean(pivotMode) ? pivotMode : pivotViewMode,
      filtersForRows,
      setCurrentConfig,
      setPlanBudgetData,
      setCurrentPlan,
      setWeekLevelKeys,
      setTargetsData,
      selectedComparePlanRows,
      showSnackMessage,
      setCompletePlanBudgetData,
      setPlanRefColMapping,
      hiddenMetrics,
      agTableRef,
      budgetTableRef,
      ...importPlanProps,
    });
  };

  const [
    dashboardRedirectionUrl,
    currStage,
  ] = getPlanningScreenBreadCrumbsUrlAndStage(planDetails?.status);
  const pivotViewComponent =
    pivotViewMode &&
    PivotViewBackButton(
      planDetails,
      tabData,
      setActiveTab,
      setPivotViewMode,
      setPivotVersionsModal,
      handleSavePivotView,
      showSnackMessage,
      commonBudgetTableFetch
    );

  // Undo Redo is implemented maintaing an array of all the instances.
  // And a pointer called currIdxForStack which moves left and right
  // as we undo or redo.
  const handleUndo = () => {
    if (currIdxForStack > 0) {
      // These console would be removed once testing of Undo/Redo feature is done.
      setCurIdxStack(currIdxForStack - 1);
      setPlanBudgetData(stackOfInstances[currIdxForStack - 1]);
      setPayloadUpdateBudgetTable(
        currIdxForStack - 1 === 0
          ? { metrics: {} }
          : payloadStack[currIdxForStack - 1]
      );
    }
  };

  const handleRedo = () => {
    if (currIdxForStack < stackOfInstances.length - 1) {
      setCurIdxStack(currIdxForStack + 1);
      setPlanBudgetData(stackOfInstances[currIdxForStack + 1]);
      setPayloadUpdateBudgetTable(payloadStack[currIdxForStack + 1]);
    }
  };

  const handleBudgetTableUpdate = () => {
    if (Object.keys(activeTabState).length > 0) {
      handleActive(activeTabState?.targetId);
      setTabIndex(activeTabState?.value);
      setActiveTabState({});
    } else {
      updateBudgetTable(
        checkUpdatePlanPayload(payloadUpdateBudgetTable),
        setPayloadUpdateBudgetTable,
        props,
        showSnackMessage,
        filtersForRows,
        commonBudgetTableFetch,
        agTableRef,
        setCheckEopValChange
      );
      showUpdatePlanAlert.cb();
    }

    setShowUpdatePlanAlert({ status: false, cb: () => {} });
  };

  const handleUpdateAlertClose = (action) => {
    if (action === "close") {
      setShowUpdatePlanAlert({ status: false, cb: () => {} });
      setActiveTabState({});
    } else {
      if (Object.keys(activeTabState).length > 0) {
        setPayloadUpdateBudgetTable({
          metrics: {},
        });
        handleActive(activeTabState?.targetId);
        setTabIndex(activeTabState?.value);
        setActiveTabState({});
      }
      showUpdatePlanAlert.cb();
      setShowUpdatePlanAlert({ status: false, cb: () => {} });
    }
  };

  useEffect(() => {
    setCurIdxStack(stackOfInstances.length - 1);
    if (stackOfInstances.length !== 0) {
      let payloads = payloadStack;
      payloads.push(cloneDeep(payloadUpdateBudgetTable));
      setPayloadStack([...payloads]);
    }
  }, [stackOfInstances.length]);

  const downloadPlanCallback = () => {
    setDownloadModal(false);
  };

  const handelFirstRender = (params, budgetTableProps) => {
    budgetTableProps.setPlansmartBudgetTableLoader(false);
  };

  const handleMatchWithSave = (
    selectedVersion = {},
    selectedCategory = {},
    selectedKpi = {}
  ) => {
    if (selectedCategory.value === "all") {
      handleMatchWith(selectedVersion);
    } else {
      const valueList = [];
      const updatedRowNodes = [];
      const totalColumns = [];

      let rowData = agTableRef.current.api.getModel().gridOptionsWrapper
        .gridOptions.rowData;
      agTableRef.current.api.showLoadingOverlay();
      const agTableLoader = setTimeout(() => {
        agTableRef.current.api.hideOverlay();
      }, 10000);
      const allColumns = agTableRef.current.columnApi.columnModel.gridColumns
        ?.filter(
          (column) =>
            isWeekNumber(column.colId) ||
            column.colId?.toLowerCase().includes("total")
        )
        .map((col) => col.colDef);
      const kpiWpData = rowData.find(
        (key) =>
          key.metric === selectedKpi.value &&
          key.reference === "current" &&
          !key?.comparePlan
      );
      const kpiLyData = rowData.find(
        (key) =>
          key.metric === selectedKpi.value &&
          key.reference ===
            (selectedVersion.comparePlan
              ? selectedVersion.value === "forcasted"
                ? selectedVersion.value
                : isNaN(Number(selectedVersion.value))
                ? selectedVersion.value
                : "current"
              : selectedVersion.value) &&
          key?.comparePlan === selectedVersion.comparePlan
      );
      const wpNode = agTableRef.current.api.getRowNode(kpiWpData?.uniqueId);
      const lyNode = agTableRef.current.api.getRowNode(kpiLyData?.uniqueId);
      const allColDef = [];
      allColumns.map((columnDef) => {
        allColDef.push(omit(columnDef, webWorkerColOmitObjList));
      });
      allColumns.map((columnDef) => {
        if (
          !columnDef?.extra?.is_total &&
          columnDef.is_editable &&
          !wpNode.data?.cellLocked?.[columnDef?.accessor]
        ) {
          const wpValue = checkFormatOfNumber(
            agTableRef.current?.api.getValue(columnDef, wpNode)
          );
          const lyValue = checkFormatOfNumber(
            agTableRef.current?.api?.getValue(columnDef, lyNode)
          );
          wpNode.data[columnDef.accessor] = lyValue;
          valueList.push({
            data: wpNode.data,
            column: omit(columnDef, webWorkerColOmitObjList),
            columnExtra: columnDef.extra,
            leafColumns: allColDef,
            oldValue: wpValue,
            tempValue: lyValue,
            previousValue: wpValue,
          });
        } else {
          totalColumns.push(columnDef);
        }
      });
      calculationWorker.postMessage({
        plansmartConfigs: props.plansmartConfigs,
        editableMetricFormulas: props?.editableMetricFormulas,
        payloadForBudgetTableData: payloadUpdateBudgetTable,
        rowData: rowData,
        bucket_keys: planDetails?.Bucket_v1,
        isChanged: true,
        valuesList: valueList,
      });
      calculationWorker.onmessage = (e) => {
        const resultObj = e.data;
        let instances = stackOfInstances;
        if (
          Object.keys(resultObj.payloadForBudgetTableData?.metrics).length > 0
        ) {
          setPayloadUpdateBudgetTable(resultObj.payloadForBudgetTableData);
          instances?.push(cloneDeep(resultObj.rowData));
          resultObj.flashCellList.forEach((node) => {
            const agNode = agTableRef.current.api.getRowNode(node.uniqueId);
            updatedRowNodes.push(agNode);
          });
          // Adding the latest updated instance to our stack of instances.
          setStackOfInstances([...instances]);
          // Pointing to the last instance in stack, which is nothing but our current instance
          setCurIdxStack(stackOfInstances.length - 1);
          // agTableRef?.current?.api?.setRowData(resultObj.rowData);
          setPlanBudgetData(resultObj.rowData);
          clearTimeout(agTableLoader);
          agTableRef.current.api.hideOverlay();
          agTableRef.current.api.flashCells({
            columns: resultObj.updatedColumn.concat(totalColumns),
            rowNodes: updatedRowNodes,
          });
          agTableRef.current.api.refreshCells({
            force: true,
          });
        } else {
          agTableRef.current.api.hideOverlay();
        }
      };
    }
  };

  const handleCancelEopValueChange = () => {
    setEopValueConfirmModal(false);
  };

  const applyEopValue = () => {
    const bucketsKey = planDetails?.Bucket_v1;
    const tableRows = get(agTableRef, "current.props.rowData", []);
    const eopBopMapping = {
      eop_units: "bop_units",
      eop_cost: "bop_cost",
      eop_auc: "eop_auc",
    };
    let seasonType =
      PRE_SEASON_STATUS_CODES.indexOf(plan_stage?.[planDetails?.status_txt]) >
      -1
        ? "pre_season"
        : "in_season";
    const updateValues = [];
    const allWeekColumns = (
      agTableRef.current?.columnApi?.getAllColumns() || []
    ).filter((col) => isWeekNumber(col?.colId));
    const firstColumn = allWeekColumns?.[0] || {};
    const leafColumns = getFlattenColumn(firstColumn).map((columnObj) =>
      omit(columnObj, webWorkerColOmitObjList)
    );
    agTableRef.current.api.showLoadingOverlay();
    const agTableLoader = setTimeout(() => {
      agTableRef.current.api.hideOverlay();
    }, 10000);
    if (firstColumn?.colDef.is_editable) {
      Object.keys(lastEopVal?.last_eoh || {}).forEach((kpiWithBucketKey) => {
        if (!kpiWithBucketKey.startsWith("total_")) {
          const [kpiWithoutBucketKey, bucketKey] = (function () {
            for (let i = 0; i < bucketsKey.length; i++) {
              const bucket = bucketsKey[i];
              if (kpiWithBucketKey.startsWith(bucket)) {
                return [kpiWithBucketKey.replace(`${bucket}_`, ""), bucket];
              }
            }
            return [null, null];
          })();
          const isEditable = get(
            props?.plansmartConfigs,
            `metrics_with_formatter.${eopBopMapping[kpiWithoutBucketKey]}.is_default_editable.${seasonType}.current`,
            false
          );
          if (
            kpiWithoutBucketKey &&
            eopBopMapping[kpiWithoutBucketKey] &&
            isEditable
          ) {
            const kpiCurrentKpiData = tableRows.find(
              (rowObj) =>
                rowObj.reference === "current" &&
                !rowObj.comparePlan &&
                rowObj.metric ===
                  `${bucketKey}_${eopBopMapping[kpiWithoutBucketKey]}`
            );
            const kpiCurrentNode = agTableRef.current.api.getRowNode(
              kpiCurrentKpiData?.uniqueId
            );
            const oldValue = agTableRef.current.api?.getValue(
              firstColumn,
              kpiCurrentNode
            );
            if (Number(oldValue) !== Number(kpiCurrentNode)) {
              kpiCurrentNode.setDataValue(
                firstColumn.colId,
                lastEopVal?.last_eoh[kpiWithBucketKey]
              );

              updateValues.push({
                data: kpiCurrentNode.data,
                column: omit(firstColumn.colDef, webWorkerColOmitObjList),
                columnExtra: getColumnExtra(firstColumn),
                leafColumns: leafColumns,
                oldValue: oldValue,
                tempValue: lastEopVal?.last_eoh[kpiWithBucketKey],
                previousValue: oldValue,
              });
            }
          }
        }
      });

      if (updateValues.length > 0) {
        calculationWorker.postMessage({
          plansmartConfigs: props.plansmartConfigs,
          editableMetricFormulas: props.editableMetricFormulas,
          payloadForBudgetTableData: payloadUpdateBudgetTableRef.current,
          rowData: agTableRef?.current?.props?.rowData,
          bucket_keys: planDetails?.Bucket_v1,
          isChanged: true,
          valuesList: updateValues,
        });
        calculationWorker.onmessage = (e) => {
          const resultObj = e.data;
          if (
            Object.keys(resultObj.payloadForBudgetTableData?.metrics).length > 0
          ) {
            setPayloadUpdateBudgetTable(resultObj.payloadForBudgetTableData);
            let instances = stackOfInstances;
            instances?.push(cloneDeep(resultObj.rowData));
            // Adding the latest updated instance to our stack of instances.
            setStackOfInstances([...instances]);
            // Pointing to the last instance in stack, which is nothing but our current instance
            setCurIdxStack(stackOfInstances.length - 1);
            // agTableRef?.current?.api?.setRowData(resultObj.rowData);
            setPlanBudgetData(resultObj.rowData);
            const totalColumns = [];
            leafColumns.forEach((columnObj) => {
              if (columnObj.extra.is_total) {
                totalColumns.push(columnObj.accessor);
              }
            });
            clearTimeout(agTableLoader);
            agTableRef.current.api.hideOverlay();
            agTableRef.current.api.refreshCells({
              force: true,
            });
          } else {
            agTableRef.current.api.hideOverlay();
          }
        };
      } else {
        agTableRef.current.api.hideOverlay();
      }
    }
    setEopValueConfirmModal(false);
  };

  const checkUpdatePlanPayload = (payload) => {
    const updatedPayload = {
      ...payload,
    };

    const allWeekColumns = (
      agTableRef.current?.columnApi?.getAllColumns() || []
    ).filter((col) => isWeekNumber(col?.colId));
    const tableRows = get(agTableRef, "current.props.rowData", []);
    const doUpdateAllWeek = function (bucketKey) {
      for (let inx = 0; inx < updatePlanAddAllWeeksKpis.length; inx++) {
        if (
          `${bucketKey}_${updatePlanAddAllWeeksKpis[inx]}` in
          (updatedPayload.metrics || {})
        ) {
          return true;
        }
      }

      return false;
    };

    allWeekColumns.forEach((col) => {
      for (
        let bucketInx = 0;
        bucketInx < (planDetails.Bucket_v1 || []).length;
        bucketInx++
      ) {
        const bucketKey = (planDetails.Bucket_v1 || [])[bucketInx];
        if (!bucketKey.includes("total") && doUpdateAllWeek(bucketKey)) {
          for (
            let addKpiInx = 0;
            addKpiInx < updatePlanAddAllWeeksKpis.length;
            addKpiInx++
          ) {
            const addKpiKey = updatePlanAddAllWeeksKpis[addKpiInx];
            const kpiData = tableRows.find(
              (rowObj) =>
                rowObj.reference === "current" &&
                rowObj.metric === `${bucketKey}_${addKpiKey}`
            );
            if (kpiData) {
              const kpiCurrentNode = agTableRef.current.api.getRowNode(
                kpiData?.uniqueId
              );
              const value = agTableRef.current.api?.getValue(
                col?.colId,
                kpiCurrentNode
              );
              if (!(kpiCurrentNode.data.metric in updatedPayload.metrics)) {
                Object.assign(updatedPayload.metrics, {
                  [kpiCurrentNode.data.metric]: {},
                });
              }
              updatedPayload.metrics[kpiCurrentNode.data.metric][col.colId] = [
                get(
                  currentConfig,
                  `${kpiCurrentNode.data.originalCategory}.${kpiCurrentNode.data.metric}.${kpiCurrentNode.data.reference}.${col.colId}`,
                  0
                ),
                value,
              ];
            }
          }
        }
      }
    });
    return updatedPayload;
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Dashboard",
            id: 1,
            action: () => {
              currIdxForStack > 0
                ? setShowUpdatePlanAlert({
                    status: true,
                    cb: () => history.push(dashboardRedirectionUrl),
                  })
                : history.push(dashboardRedirectionUrl);
            },
          },
          {
            label: currStage,
            id: 2,
            action: () => {
              history.push(PLAN_CREATE_NEW_PLAN);
            },
          },
        ]}
      />
      <div className={plansmartClasses.budgetTableContainerRoot}>
        <PlanBudgetFilter
          budgetTableRef={budgetTableRef}
          skuViewMode={skuViewMode}
          planDetails={planDetails}
          setPlanDetails={setPlanDetails}
          setComparePlanModal={setComparePlanModal}
          planBudgetData={planBudgetData}
          pivotViewComponent={pivotViewComponent}
          showSnackMessage={showSnackMessage}
          showEnablePivot={showEnablePivot}
          updateBudgetTable={() => {
            updateBudgetTable(
              payloadUpdateBudgetTable,
              setPayloadUpdateBudgetTable,
              props,
              showSnackMessage,
              filtersForRows,
              commonBudgetTableFetch,
              agTableRef,
              setCheckEopValChange
            );
          }}
          comparePlanList={comparePlanRes}
          handleClearImportedPlan={() =>
            handleClearImportedPlan(
              props.defaultMetrics,
              props.defaultBucket,
              setSelectedComparePlanRows,
              setComparePlanRes,
              prevSelectedPlans,
              setPrevSelectedPlans,
              budgetTableRef,
              setPlanBudgetData,
              // planBudgetData,
              originalColRefMapping,
              hiddenMetrics,
              setHiddenMetrics,
              setPlanRefColMapping,
              agTableRef
            )
          }
          disableAllOptions={disableAllOptions}
          handlePivotView={(value) =>
            handlePivotView(value, tabData, handleActive, setPivotViewMode)
          }
          pivotViewMode={pivotViewMode}
          matchWithList={planRefColMapping}
          handleMatchWith={handleMatchWith}
          matchWithVal={planRefColVal}
          viewMode={viewMode}
          setShowFilter={setShowFilter}
          setDownloadModal={setDownloadModal}
          openMatchWith={() => setMatchWith(true)}
          setShowTargetOptimizationModal={setShowTargetOptimizationModal}
        />
        {!pivotViewMode && (
          <>
            <div className={classes.tableSelectionWrapper}>
              {customHeader(
                handleActive,
                setTabIndex,
                tabData,
                tabIndex,
                classes,
                planDetails,
                props.screenConfig,
                currIdxForStack,
                handleTabSwitch
              )}
              <div className={plansmartClasses.alignToRow}>
                <div className={plansmartClasses.alignToEnd}>
                  {!viewMode && (
                    <>
                      <ArrowTooltips title="Filter" placement="top">
                        <Button
                          className={plansmartClasses1.plansmartIconButton}
                          variant="contained"
                          color="primary"
                          id="plansmartUpdatePlanBtn"
                          onClick={() => setShowFilter(true)}
                        >
                          <FilterAltOutlinedIcon />
                        </Button>
                      </ArrowTooltips>
                      {/* Will enable the visibility once functioanlity is implemented */}
                      {planBudgetData?.length > 0 &&
                        !skuViewMode &&
                        !pivotViewMode && (
                          <ArrowTooltips title="Undo" placement="top">
                            <Button
                              onClick={handleUndo}
                              variant="contained"
                              color="primary"
                              title={"Undo"}
                              disabled={currIdxForStack === 0}
                              className={`${plansmartClasses1.plansmartIconButton}`}
                            >
                              <Undo />
                            </Button>
                          </ArrowTooltips>
                        )}
                      {planBudgetData?.length > 0 && !pivotViewMode && (
                        <ArrowTooltips title="Reset" placement="top">
                          <Button
                            variant="contained"
                            color="primary"
                            title={"Reset"}
                            onClick={() => commonBudgetTableFetch()}
                            className={`${plansmartClasses1.plansmartIconButton}`}
                          >
                            <Refresh />
                          </Button>
                        </ArrowTooltips>
                      )}

                      {planBudgetData?.length > 0 &&
                        !skuViewMode &&
                        !pivotViewMode && (
                          <Button
                            variant="contained"
                            color="primary"
                            id="plansmartUpdatePlanBtn"
                            sx={{ height: 37 }}
                            disabled={
                              disableAllOptions ||
                              props.planSmartBudgetUpdateLoader ||
                              Object.keys(
                                payloadUpdateBudgetTable?.metrics || {}
                              )?.length === 0
                            }
                            onClick={() =>
                              setShowUpdatePlanAlert({
                                status: currIdxForStack > 0,
                                cb: () => {},
                              })
                            }
                            endIcon={
                              props.planSmartBudgetUpdateLoader ? (
                                <CircularProgress size="1rem" />
                              ) : null
                            }
                          >
                            Update Plan
                          </Button>
                        )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {!pivotViewMode && filterChips?.filterConfig?.length > 0 && (
          <FilterChips showFilterListPopOver {...filterChips} />
        )}
        <LoadingOverlay
          loader={
            props.plansmartBudgetTableLoader ||
            props.planSmartBudgetUpdateLoader ||
            props.planSmartBudgetTableMatchLoader ||
            props.planSmartBudgetTableColDefLoader ||
            props.planSmartMetricFormulaLoader ||
            props.screenConfigLoader
          }
        >
          <>
            <div className={classes.paddingTabContent}>
              {pivotViewMode && (
                <PivotView
                  tabData={tabData}
                  productHierarchyFilters={filtersForRows}
                  planCode={props.match.params.plancode}
                />
              )}
              {planBudgetData?.length === 0 &&
                !skuViewMode &&
                !pivotViewMode && (
                  <Box textAlign="center">no data available</Box>
                )}
              {planBudgetData?.length > 0 &&
              planDetails &&
              !skuViewMode &&
              weekLevelKeys &&
              !pivotViewMode &&
              Object.keys(weekLevelKeys).length > 0 &&
              Object.keys(props?.editableMetricFormulas).length > 0 ? (
                <PlansmartBudgetTable
                  onFirstDataRender={handelFirstRender}
                  bucket_keys={planDetails?.Bucket_v1}
                  calculationWorker={calculationWorker}
                  isMonthView={isMonthView}
                  weekLevelKeys={weekLevelKeys}
                  planDetails={planDetails}
                  planBudgetData={planBudgetData}
                  setPlanBudgetData={setPlanBudgetData}
                  planBudgetColumns={planBudgetColumns}
                  setBudgetTableRef={setBudgetTableRef}
                  prevSelectedPlans={prevSelectedPlans}
                  comparePlanTableData={comparePlanTableData}
                  showSnackMessage={showSnackMessage}
                  setHiddenMetrics={setHiddenMetrics}
                  hiddenMetrics={hiddenMetrics}
                  skuViewMode={skuViewMode}
                  pivotViewMode={pivotViewMode}
                  editableMetricFormulas={props?.editableMetricFormulas}
                  payloadUpdateBudgetTable={payloadUpdateBudgetTable}
                  payloadUpdateBudgetTableRef={payloadUpdateBudgetTableRef}
                  setPayloadUpdateBudgetTable={setPayloadUpdateBudgetTable}
                  tabData={tabData}
                  filtersForRows={filtersForRows}
                  planCode={props.match.params.plancode}
                  handleRemoveVersion={(removedPlanDetail) =>
                    handleRemoveVersion({
                      defaultMetrics: props.defaultMetrics,
                      defaultBucket: props.defaultBucket,
                      removedPlanDetail,
                      budgetTableRef,
                      comparePlanRes,
                      prevSelectedPlans,
                      originalColRefMapping,
                      setComparePlanRes,
                      setPlanBudgetData,
                      setPrevSelectedPlans,
                      comparePlanRef,
                      selectedComparePlanRows,
                      comparePlanTableData,
                      hiddenMetrics,
                      setHiddenMetrics,
                      setPlanRefColMapping,
                      planRefColVal,
                      setPlanRefColVal,
                      agTableRef,
                    })
                  }
                  setPlansmartBudgetTableLoader={
                    props.setPlansmartBudgetTableLoader
                  }
                  trackColHidden={trackColHidden}
                  setTrackColHidden={setTrackColHidden}
                  setStackOfInstances={setStackOfInstances}
                  stackOfInstances={stackOfInstances}
                  currIdxForStack={currIdxForStack}
                  setCurIdxStack={setCurIdxStack}
                  bucketSelection={bucketSelection}
                  agTableRef={agTableRef}
                />
              ) : (
                planBudgetData &&
                !pivotViewMode &&
                skuViewMode && (
                  <SkuLevelBudget
                    filtersForRows={filtersForRows}
                    weekLevelKeys={weekLevelKeys}
                  />
                )
              )}
            </div>
          </>
        </LoadingOverlay>
        <ComparePlanModal
          comparePlanRef={comparePlanRef}
          agTableRef={agTableRef}
          budgetTableRef={budgetTableRef}
          filter={comparePlanFilter}
          open={comparePlanModal}
          handleCancel={setComparePlanModal}
          planCode={props.match.params.plancode}
          filterData={comparePlanFilterData}
          setFilterData={setComparePlanFilterData}
          onSubmit={(selectedPlans, prevSelectedPlans) =>
            handleImportPlan({
              selectedPlans,
              props,
              filtersForRows,
              setSelectedComparePlanRows,
              selectedComparePlanRows,
              setComparePlanRes,
              comparePlanRes,
              setComparePlanModal,
              showSnackMessage,
              prevSelectedPlans,
              setPrevSelectedPlans,
              planDetails,
              budgetTableRef,
              originalColRefMapping,
              setPlanBudgetData,
              hiddenMetrics,
              setPlanRefColMapping,
              fromAddVersionModal: true,
              agTableRef,
            })
          }
          selectedRows={selectedComparePlanRows}
          setSelectedRows={setSelectedComparePlanRows}
          tableData={comparePlanTableData}
          planDetails={planDetails}
          setTableData={setComparePlanTableData}
          showSnackMessage={showSnackMessage}
          prevSelectedPlans={prevSelectedPlans}
          setPrevSelectedPlans={setPrevSelectedPlans}
          tabData={tabData}
        />
        <PivotVersionsModal
          open={pivotVersionsModal}
          onClose={() => setPivotVersionsModal(false)}
        />
        <FilterModal
          open={showFilter}
          isModalFixedTop={true}
          closeOnOverlayClick={() => setShowFilter(false)}
        >
          <CustomAccordion label="Filter" defaultExpanded={true}>
            <LoadingOverlay loader={props.inventorysmartFilterLoader}>
              <Paper elevation={3} className={globalClasses.paperWrapper}>
                <FilterForBudgetTable
                  agTableRef={agTableRef}
                  planBudgetData={planBudgetData}
                  planCode={props.match.params.plancode}
                  planDetails={planDetails}
                  updateForecastedData={props.updateForecastedData}
                  selectedLevel={isActive}
                  addSnack={props.addSnack}
                  setFiltersForBudgetTable={setFiltersForRows}
                  filtersForRows={filtersForRows}
                  tabData={tabData}
                  setTabData={setTabData}
                  targetsData={targetsData}
                  setPlansmartBudgetTableLoader={
                    props.setPlansmartBudgetTableLoader
                  }
                  updateConstraintFilterReq={props.updateConstraintFilterReq}
                  disableAllOptions={disableAllOptions}
                  setTargetFormValues={(data) => setTargetFormData(data)}
                  pivotViewMode={pivotViewMode}
                  setFilterChips={setFilterChips}
                  setOriginalColRefMapping={setOriginalColRefMapping}
                  viewMode={viewMode}
                  setShowFilter={setShowFilter}
                  updatedIndexStack={currIdxForStack}
                />
              </Paper>
            </LoadingOverlay>
          </CustomAccordion>
        </FilterModal>
        <TargetOptimizationModal
          agTableRef={agTableRef}
          planBudgetData={planBudgetData}
          planCode={props.match.params.plancode}
          planDetails={planDetails}
          updateForecastedData={props.updateForecastedData}
          selectedLevel={isActive}
          addSnack={props.addSnack}
          setFiltersForBudgetTable={setFiltersForRows}
          filtersForRows={filtersForRows}
          tabData={tabData}
          setTabData={setTabData}
          targetsData={targetsData}
          setPlansmartBudgetTableLoader={props.setPlansmartBudgetTableLoader}
          updateConstraintFilterReq={props.updateConstraintFilterReq}
          disableAllOptions={disableAllOptions}
          setTargetFormValues={(data) => setTargetFormData(data)}
          pivotViewMode={pivotViewMode}
          setFilterChips={setFilterChips}
          setOriginalColRefMapping={setOriginalColRefMapping}
          viewMode={viewMode}
          showTargetOptimizationModal={showTargetOptimizationModal}
          setShowTargetOptimizationModal={setShowTargetOptimizationModal}
        />
        {downloadModal && (
          <PlanSmartDownloadModal
            open={downloadModal}
            onClose={() => setDownloadModal(false)}
            onDownload={handleDownload}
            downloadLoader={props.downloadLoader}
            hierarchyList={downloadHierarchyValue}
            downloadOptions={downloadOptions}
          />
        )}
        {showUpdatePlanAlert.status && (
          <PlanSmartUpdatePlanModal
            showUpdatePlanAlert={showUpdatePlanAlert.status}
            onSubmit={handleBudgetTableUpdate}
            onClose={handleUpdateAlertClose}
          />
        )}
        {blocked && (
          <PlanSmartUpdatePlanModal
            showUpdatePlanAlert={blocked}
            onSubmit={() => {
              handleBudgetTableUpdate();
              setBlocked(false);
              history.block(() => {});
              history.push(currentPath);
            }}
            onClose={(action) => {
              if (action === "close") {
                setBlocked(false);
              } else {
                setBlocked(false);
                history.block(() => {});
                history.push(currentPath);
              }
            }}
          />
        )}
        <MatchWith
          isOpen={matchWith}
          headerText={getMatchWithText(planDetails?.status)}
          onClose={() => setMatchWith(false)}
          planRefColMapping={planRefColMapping}
          planRefColVal={planRefColVal}
          onSave={handleMatchWithSave}
          planDetails={planDetails}
        />
        {/* <Modal
          isOpen={eopValueConfirmModal}
          heading="Confirmation"
          primaryButtonProps={{ children: "Apply", onClick: applyEopValue }}
          tertiaryButtonProps={{
            children: "Cancel",
            onClick: handleCancelEopValueChange,
          }}
          onClose={handleCancelEopValueChange}
        >
          EOH got changed, would you like to replace?
        </Modal> */}
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    editableMetricFormulas: get(
      store,
      "plansmartReducer.planBudgetTableReducer.editableMetricFormulas",
      false
    ),
    plansmartBudgetTableLoader: get(
      store,
      "plansmartReducer.planBudgetTableReducer.plansmartBudgetTableLoader",
      false
    ),
    planSmartBudgetUpdateLoader: get(
      store,
      "plansmartReducer.planBudgetTableReducer.planSmartBudgetUpdateLoader",
      false
    ),
    planSmartBudgetTableMatchLoader: get(
      store,
      "plansmartReducer.planBudgetTableReducer.planSmartUpdateBudgetTableMatchLoader",
      false
    ),
    planSmartBudgetFilterLoader: get(
      store,
      "plansmartReducer.planBudgetTableReducer.planSmartBudgetFilterLoader",
      false
    ),
    savePlanLoader: planSmartSavePlanLoaderSelector(store),
    savePivotLoader: planSmartSavePivotViewLoaderSelector(store),
    planSmartBudgetTableColDefLoader: planSmartBudgetTableColDefLoaderSelector(
      store
    ),
    planSmartMetricFormulaLoader: planSmartMetricFormulaLoaderSelector(store),
    downloadLoader: planSmartDownloadLoaderSelector(store),
    screenConfigLoader: planSmartScreenConfigLoaderSelector(store),
    screenConfig: planSmartScreenConfigSelector(store),
    plansmartConfigs: get(
      store,
      "plansmartReducer.planBudgetTableReducer.plansmartConfigs",
      {}
    ),
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    defaultMetrics:
      store.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        .defaultMetrics,
    defaultBucket:
      store.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        ?.defaultBucket,
    weekAggregationFormula:
      store.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        .weekAggregationFormula,

    totalBucketAggregrationFormulas:
      store.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        .totalBucketAggregrationFormulas,
    firstLastBucketTotalColumn:
      store.plansmartReducer.planBudgetTableReducer.plansmartConfigs
        .firstLastBucketTotalColumn,
    lastEopVal: planSmartLastOfEopValSelector(store),
  };
};

const mapDispatchToProps = (dispatch) => ({
  setPlansmartBudgetTableLoader: (payload) =>
    dispatch(setPlansmartBudgetTableLoader(payload)),
  setPlansmartBudgetFilterLoader: (payload) =>
    dispatch(setPlansmartBudgetFilterLoader(payload)),
  setPlansmartBudgetUpdateLoader: (payload) =>
    dispatch(setPlansmartBudgetUpdateLoader(payload)),
  getPlanSmartPlanDetails: (payload) =>
    dispatch(getPlanSmartPlanDetails(payload)),
  fetchPlanBudgetDetails: (payload) =>
    dispatch(fetchPlanBudgetDetails(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getPlanningTableColumns: (payload, action) =>
    dispatch(getPlanningTableColumns(payload, action)),
  getPlanHierarchies: (payload) => dispatch(getPlanHierarchies(payload)),
  getMetricsConfig: (payload) => dispatch(getMetricsConfig(payload)),
  getPlanFilterDropdownOptions: (id, payload) =>
    dispatch(getPlanFilterDropdownOptions(id, payload)),
  updateBudgetTableData: (payload) => dispatch(updateBudgetTableData(payload)),
  updateForecastedData: (id, payload) =>
    dispatch(updateForecastedData(id, payload)),
  getComparePlanFilters: (payload) => dispatch(getComparePlanFilters(payload)),
  setPlanSmartComparePlanFilterLoader: (payload) =>
    dispatch(setPlanSmartComparePlanFilterLoader(payload)),
  getPlansToCompare: (payload) => dispatch(getPlansToCompare(payload)),
  setPlanSmartGetPlansToCompareLoader: (payload) =>
    dispatch(setPlanSmartGetPlansToCompareLoader(payload)),
  savePlanRequest: (planCode, status) =>
    dispatch(savePlanAPI(planCode, status)),
  setSavePlanLoader: (payload) => dispatch(setPlanSmartSavePlanLoader(payload)),
  fetchPivotViewData: (payload) => dispatch(getPivotDataAPI(payload)),
  getPivotColDef: (payload) => dispatch(getPivotColDefAPI(payload)),
  updateBudgetTableDataMatchWith: (payload) =>
    dispatch(updateBudgetTableDataMatchWith(payload)),
  savePivotViewReq: (planCode, payload) =>
    dispatch(savePivotView(planCode, payload)),
  setPlanSmartUpdateBudgetTableMatchLoader: (payload) =>
    dispatch(setPlanSmartUpdateBudgetTableMatchLoader(payload)),
  setPlanSmartBudgetTableColDefLoader: (payload) =>
    dispatch(setPlanSmartBudgetTableColDefLoader(payload)),
  getPlanningTableSkuColumns: (payload, action) =>
    dispatch(getSkuColDef(payload, action)),
  fetchPlanBudgetSkuDetails: (payload) =>
    dispatch(fetchPlanBudgetSkuDetails(payload)),
  fetchEditableMetricsFormula: () =>
    dispatch(fetchFormulasForEditableMetrics()),
  setMetricsFormula: (payload) => dispatch(setEditableMetricsFormula(payload)),
  setPlanSmartMetricFormulaLoader: (payload) =>
    dispatch(setPlanSmartMetricFormulaLoader(payload)),
  updateConstraintFilterReq: (planCode, reqPayload) =>
    dispatch(updateConstraintFilter(planCode, reqPayload)),
  setPlanDetailsForCommentBar: (payload) =>
    dispatch(setPlanDetailsForCommentBar(payload)),
  downloadPlanReq: (payload, callback) =>
    dispatch(planSmartDownloadPlan(payload, callback)),
  fetchEopValReq: (body, successCallback) =>
    dispatch(fetchEopVal(body, successCallback)),
  setPlanSmartEopVal: (payload) => dispatch(setPlanSmartEopVal(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(PlansmartBudgetRootComponent));

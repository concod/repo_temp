import React, { useState, useEffect, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useNavigate } from "react-router-dom-v5-compat";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { Grid, Typography } from "@mui/material";
import { Button, Tabs } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Box } from "@mui/system";
import Charts from "core/Utils/charts";
import moment from "moment/moment";
import StyledChip from "core/Utils/chip/StyledChip";
import { cloneDeep, isEmpty } from "lodash";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import { makeStyles } from "@mui/styles";
import { NormalCalendarFiscalMapping } from "core/commonComponents/calendar";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

import {
  getScenarioViewTableConfigurationStore,
  getSafetyStockGraphVendorStore,
  setDeepDiveTableConfigLoader,
  setDeepDiveTableLoader,
  getOmsSkuSummaryCreateScenarioApplyTableConfigurationStore,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import {
  getOmsCoreFiscalCalendar,
  setRedirectFromDeepDive,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  ERROR_MESSAGE,
  OMS_ORDER_TYPE_CHIP_KEY,
  OMS_ORDER_STATUS_CHIP_KEY,
  ORDER_STATUS_GROUPING_BGCOLOR_MAPPER,
  ORDER_TYPE_GROUPING_BGCOLOR_MAPPER,
  CREATE_SCENARIO_ELT_TABLE_COLUMNS,
  CREATE_SCENARIO_TABLE_COLUMNS,
  OMS_CREATE_SCENARIO_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { ORDER_MANAGEMENT_ORDER_DETAILS } from "modules/oms/constants-oms/routeConstants";
import OriginalDeepDiveStoreTableView from "./OriginalDeepDiveStoreTableView";
import ScenarioStoreTableView from "./ScenarioStoreTableView";
import ChartFilters from "../../../Order-Deep-Dive/ChartFilters";
import { TENANT_DATE_FORMAT } from "modules/oms/constants-oms/stringConstants";
import { getTabProps } from "../../../components/Product-Details-Screen/Style-Order-Summary/utils";
import CreateScenarioStoreAggregatedChips from "./CreateScenarioStoreAggregatedChips";
import { displayCreateScenarioFootNote } from "../../../components/Product-Details-Screen/Style-Order-Summary/utils";
import { setOmsCreateNewOrderApproveRequestDataStore } from "modules/oms/services-oms/Create-New-Order/create-new-order-service";

const FAILED_TEXT = "Unsuccessfull at creating scenarios for ";
const FAILED_ALL_TEXT = "Unsuccessfull at creating scenarios for all Stores";
const SUCCESS_TEXT = "Scenario created for ";
const SUCCESS_ALL_TEXT = "Scenario created successfully.";
const SUCCESS_APPLY_TEXT = "Scenario Applied Successfully.";

const useStyles = makeStyles((theme) => ({
  chartContainer: {
    background: "#FFFFFF",
    padding: "1rem",
    borderRadius: "8px",
    marginTop: "1rem",
  },
  leftContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  graphTitle: {
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "24px",
  },
  chartXAxisLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "1rem",
  },
}));

const OrderScenarioStoreApplyTable = function (props) {
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [selectedStore, setSelectedStore] = useState([]);
  const [storeTableData, setStoreTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const tableGridInstance = useRef(null);
  const [tabValue, setTabValue] = useState("original");
  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);
  const [scenarioViewTableColumns, setScenarioViewTableColumns] = useState([]);
  const [seriesGraphData, setSeriesGraphData] = useState([]);
  const [fiscalYearWeek, setFiscalYearWeek] = useState([]);
  const [deepDiveChartData, setDeepDiveChartData] = useState({});
  const [isSwitchedChecked, setIsSwitchedChecked] = useState(false);
  const [currentSelectOptions, setCurrentSelectOptions] = useState({});
  const [selectedOptions, setSelectedOptions] = useState({});
  const [deepDiveFiltersData, setDeepDiveFiltersData] = useState({});
  const [selectedDate, setSelectedDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [weekRange, setWeekRange] = useState({});
  const [resetFilters, setResetFilters] = useState(false);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [deepDiveFiltersPayload, setDeepDiveFiltersPayload] = useState({});
  const [filteredStoreData, setFilteredStoreData] = useState([]);

  const [isCreateScenarioButton, setIsCreateScenarioButton] = useState({});
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [tabsList, setTabsList] = useState([]);
  const [weekRangeDate, setWeekRangeDate] = useState({});

  // Access control states for create scenario
  const [isUserHasApplyAccess, setIsUserHasApplyAccess] = useState(true);
  const [
    isUserHasOriginalDownloadAccess,
    setIsUserHasOriginalDownloadAccess,
  ] = useState(true);
  const [
    isUserHasScenarioDownloadAccess,
    setIsUserHasScenarioDownloadAccess,
  ] = useState(true);

  const SHOW_WEEK_RANGE =
    props?.screenConfig?.oms_dashboard?.deep_dive?.show_date_range || false;

  const ORDER_PLACEMENT_WEEKS_LIMIT =
    props?.screenConfig?.oms_dashboard?.deep_dive
      ?.order_placement_weeks_limit || 26;

  const CHARTS_X_AXIS_KEY =
    props?.screenConfig?.create_scenario?.charts_x_axis_key || "week";

  const CHART_FILTERS = props?.screenConfig?.create_scenario
    ?.deep_dive_filters || [
    {
      label: "size",
      column_name: "size",
    },
    { label: "Store", column_name: "store_name" },
    {
      label: "Region",
      column_name: "region_name",
    },
    { label: "Sales Organisation", column_name: "sales_org_name" },
  ];

  const createScenarioTabData = [
    {
      label: "Original",
      value: "original",
    },
    {
      label: "Scenario",
      value: "scenario",
    },
  ];

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const CHARTS_CONFIG =
    props?.screenConfig?.create_scenario?.create_scenario_charts_config || [];

  // const graphColours = [
  //   theme.palette.graphColours[18],
  //   theme.palette.graphColours[25],
  //   theme.palette.graphColours[30],
  //   theme.palette.graphColours[30],
  //   theme.palette.graphColours[19],
  //   theme.palette.graphColours[19],
  //   theme.palette.graphColours[26],
  //   theme.palette.graphColours[27],
  //   theme.palette.graphColours[0],
  //   theme.palette.graphColours[20],
  //   theme.palette.graphColours[22],
  //   theme.palette.graphColours[3],
  // ];
  useEffect(() => {
    const newTabsList = [];
    createScenarioTabData.forEach((tabOption) => {
      newTabsList.push({ ...getTabProps(tabOption) });
    });
    setTabsList(newTabsList);
  }, [props?.screenConfig]);

  // useEffect(() => {
  //   setUpdateTrigger((prev) => prev + 1);
  // }, [props.deepDiveViewTableData, props.scenarioViewTableData]);

  const renderOrderTypeCell = (groupTypeColumn) => {
    groupTypeColumn.cellRenderer = (params) => {
      let key = params.data[OMS_ORDER_TYPE_CHIP_KEY].toLowerCase()
        .split(" ")
        .join("_");
      return (
        <StyledChip
          label={params.data[OMS_ORDER_TYPE_CHIP_KEY]}
          color={ORDER_TYPE_GROUPING_BGCOLOR_MAPPER[key]}
        />
      );
    };
    return groupTypeColumn;
  };

  const renderOrderStatusCell = (groupTypeColumn) => {
    groupTypeColumn.cellRenderer = (params) => {
      let key = params.data[OMS_ORDER_STATUS_CHIP_KEY].toLowerCase();
      return (
        <StyledChip
          label={params.data[OMS_ORDER_STATUS_CHIP_KEY]}
          color={ORDER_STATUS_GROUPING_BGCOLOR_MAPPER[key]}
        />
      );
    };
    return groupTypeColumn;
  };

  const {
    simulatedTableData,
    deepDiveTableColumns: propDeepDiveTableColumns,
    scenarioViewTableColumns: propScenarioViewTableColumns,
    setDeepDiveTableConfigLoader,
    getOmsSkuSummaryCreateScenarioApplyTableConfigurationStore,
  } = props;

  useEffect(() => {
    const fetchColumnData = async () => {
      setDeepDiveTableConfigLoader(true);
      let columns = (await getOmsSkuSummaryCreateScenarioApplyTableConfigurationStore?.()) || {
        data: { data: [] },
      };
      let formattedColumns = formattingDeepDiveColumns(
        columns?.data?.data,
        isSwitchedChecked
      );

      let cols = formattedColumns.map((col) => {
        switch (col.accessor) {
          case OMS_ORDER_TYPE_CHIP_KEY:
            col = renderOrderTypeCell(col);
            break;
          case OMS_ORDER_STATUS_CHIP_KEY:
            col = renderOrderStatusCell(col);
            break;
          default:
            return col;
        }
        return col;
      });
      setTableColumns(cols);
      setDeepDiveTableColumns(propDeepDiveTableColumns);
      setScenarioViewTableColumns(propScenarioViewTableColumns);
      setStoreTableData(simulatedTableData);
      setDeepDiveTableConfigLoader(false);
    };
    fetchColumnData();
  }, [
    simulatedTableData,
    propDeepDiveTableColumns,
    propScenarioViewTableColumns,
    isSwitchedChecked,
    setDeepDiveTableConfigLoader,
    getOmsSkuSummaryCreateScenarioApplyTableConfigurationStore,
  ]);

  useEffect(() => {
    let isELTEnabled = isSwitchedChecked;
    // Initialize responseDataObject dynamically
    let responseDataObject = {
      fiscal_year_week_data: [],
    };

    // Helper function to get the actual value considering QC variants
    const getValueWithQCFallback = (data, key, isScenario = false) => {
      // Key mappings from original data to response object
      const keyMappings = {
        Order_Cycle: "roq_receipts",
      };

      // Handle scenario variants
      if (isScenario && key.includes("scenario")) {
        let scenarioKey = key.replace("_scenario", "");
        scenarioKey = scenarioKey.replace("_without_qc", "");
        const mappedScenarioKey = keyMappings[scenarioKey] || scenarioKey;
        return data[key] !== undefined ? data[key] : data[mappedScenarioKey];
      }

      // Handle QC with scenario
      if (!isScenario && !key.includes("_scenario")) {
        const qcKey = key.replace("_without_qc", "");
        const mappedQcKey = keyMappings[qcKey] || qcKey;
        return data[key] !== undefined ? data[key] : data[mappedQcKey];
      }

      // Default case
      return undefined;
    };

    // Helper function to process data and add to response object
    const processData = (data, isScenario = false) => {
      data.forEach((val) => {
        // Handle week data
        if (!isScenario && val?.[CHARTS_X_AXIS_KEY]) {
          responseDataObject.fiscal_year_week_data.push(
            moment(val?.[CHARTS_X_AXIS_KEY]).format("MMM DD")
          );
        }

        // Process data based on chart configuration
        CHARTS_CONFIG.forEach((config) => {
          const keys = isELTEnabled
            ? [config.effectiveLeadTime?.key, config.leadTime?.key]
            : [config.leadTime?.key];

          keys.forEach((key) => {
            if (!key) return;
            const value = !isELTEnabled
              ? getValueWithQCFallback(val, key, isScenario)
              : val[key];
            if (value !== undefined && value !== null) {
              const targetKey = key;
              if (!responseDataObject[targetKey]) {
                responseDataObject[targetKey] = [];
              }
              responseDataObject[targetKey].push(Math.round(value));
            }
          });
        });
      });
    };

    // Process both deep dive and scenario data
    if (props?.deepDiveViewTableData) {
      processData(props.deepDiveViewTableData);
    }

    if (props?.scenarioViewTableData) {
      processData(props.scenarioViewTableData, true);
    }

    if (responseDataObject.fiscal_year_week_data.length > 0) {
      setDeepDiveChartData(responseDataObject);
      setFiscalYearWeek([...responseDataObject.fiscal_year_week_data]);
    }
  }, [props.deepDiveViewTableData, props.scenarioViewTableData]);

  useEffect(() => {
    if (!isEmpty(deepDiveChartData)) {
      createGraphSeries();
    } else {
      setSeriesGraphData([]);
    }
  }, [deepDiveChartData]);

  const displaySnackMessages = (
    message,
    variance,
    hideAllSnackMessages = true
  ) => {
    if (hideAllSnackMessages) props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    if (tableGridInstance.current?.api) {
      tableGridInstance.current.api.forEachNode((node) => {
        node.selected && selectedRows.push({ ...node.data });
      });
    }
    setSelectedStore(selectedRows);
  };

  const handleSimulateButton = () => {
    console.log("Simulate button clicked, selectedStore:", selectedStore);

    if (selectedStore.length === 0) {
      displaySnackMessages(
        "Please select stores to simulate scenario",
        "warning"
      );
      return;
    }

    try {
      // Call simulate function if available
      if (
        props.simulateCreateScenario &&
        typeof props.simulateCreateScenario === "function"
      ) {
        console.log("Calling simulateCreateScenario with data:", selectedStore);
        displaySnackMessages(
          "Simulating scenario for selected stores...",
          "info"
        );
        props.simulateCreateScenario(selectedStore, true, []);
      } else {
        console.warn("simulateCreateScenario function not available in props");
        displaySnackMessages(
          "Simulation functionality not available",
          "warning"
        );
      }
    } catch (error) {
      console.error("Simulate error:", error);
      displaySnackMessages(
        "Error during simulation: " + error.message,
        "error"
      );
    }
  };

  const handleApplyButton = async () => {
    try {
      console.log("Apply button clicked, selectedStore:", selectedStore);

      if (selectedStore.length === 0) {
        displaySnackMessages(
          "Please select stores to apply scenario",
          "warning"
        );
        return;
      }

      props.setIsScenarioApplied(true);

      let body = {
        action: "recommended",
        comment: "",
        order_gen_type: "scenario",
        new_orders: [...selectedStore],
      };

      displaySnackMessages("Applying scenario for selected stores...", "info");

      let response = await props.setOmsCreateNewOrderApproveRequestData(body);

      if (response?.data?.status) {
        if (response.data.data?.failed?.length === 0) {
          displaySnackMessages(SUCCESS_ALL_TEXT, "success");
        } else if (response.data.data?.success?.length === 0) {
          displaySnackMessages(FAILED_ALL_TEXT, "error");
        } else {
          if (response.data.data?.failed?.length > 0) {
            let orders = [];
            response.data.data?.failed.forEach((order) => {
              orders.push(order.store_code || order.id);
            });
            let errorText = FAILED_TEXT + orders.join(" , ");
            displaySnackMessages(errorText, "error", false);
          }
          if (response.data.data?.success?.length > 0) {
            let orders = [];
            response.data.data?.success.forEach((order) => {
              orders.push(order.store_code || order.id);
            });
            let successText = SUCCESS_TEXT + orders.join(" , ");
            displaySnackMessages(successText, "success", false);
          }
        }

        tableGridInstance.current.api.deselectAll();
        props.setRedirectFromDeepDive(true);

        // Navigate to Order Details after successful operation
        setTimeout(() => {
          navigate(ORDER_MANAGEMENT_ORDER_DETAILS);
        }, 2000);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");

        // Navigate to Order Details after failed operation
        setTimeout(() => {
          navigate(ORDER_MANAGEMENT_ORDER_DETAILS);
        }, 2000);
      }
    } catch (error) {
      console.error("Apply button error:", error);
      displaySnackMessages(
        "Error applying scenario: " + error.message,
        "error"
      );

      // Navigate to Order Details after error
      setTimeout(() => {
        navigate(ORDER_MANAGEMENT_ORDER_DETAILS);
      }, 2000);
    }
  };

  useEffect(() => {
    // Find the create scenario access configuration from userAccess
    const createScenarioAccess = props.userAccess?.find(
      (item) => item.screen === OMS_CREATE_SCENARIO_SCREENNAME_KEY
    );

    const canApply = createScenarioAccess?.isCreateScenarioApplyButton || false;
    const canDownloadOriginal =
      createScenarioAccess?.isOriginalDownloadButton || false;
    const canDownloadScenario =
      createScenarioAccess?.isScenarioDownloadButton || false;

    if (!isEmpty(props.userAccess)) {
      // If userAccess exists, use the new access control
      setIsUserHasApplyAccess(canApply);
      setIsUserHasOriginalDownloadAccess(canDownloadOriginal);
      setIsUserHasScenarioDownloadAccess(canDownloadScenario);

      // Also update the existing isCreateScenarioButton state for backward compatibility
      if (canApply) {
        setIsCreateScenarioButton({ label: "Apply", isVisible: true });
      } else {
        setIsCreateScenarioButton({ label: "Apply", isVisible: false });
      }
    } else {
      // Fallback to old access control using orderingAccessControl
      if (
        props.orderingAccessControl?.hasOwnProperty("isCreateScenarioButton")
      ) {
        setIsCreateScenarioButton(
          props.orderingAccessControl.isCreateScenarioButton
        );
      } else {
        setIsCreateScenarioButton({ label: "Apply", isVisible: true });
      }

      // Set default values for download access when using old access control
      setIsUserHasApplyAccess(true);
      setIsUserHasOriginalDownloadAccess(true);
      setIsUserHasScenarioDownloadAccess(true);
    }
  }, [props.userAccess, props.orderingAccessControl]);

  const onWeekRangeChange = (dates) => {
    setSelectedDate(dates);
  };

  const handleResetFilters = () => {
    setDeepDiveFiltersData(
      filterAndExtract(
        props?.selectedSafetyStockSkuData,
        {},
        CHART_FILTERS.map((item) => item.column_name)
      )
    );
    setDeepDiveFiltersPayload({});
    setSelectedDate(undefined);
    // setWeekRange({});
    setSelectedOptions({});
    //trigger simulate scenario api call with empty filters
    props.simulateCreateScenario(
      props?.selectedSafetyStockSkuData || [],
      true,
      []
    );
  };

  //For Order Placement Date
  const isOutsideRange = (date) => {
    let weekLimit = ORDER_PLACEMENT_WEEKS_LIMIT * 7 - 1;
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().endOf("week").day(weekLimit);
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const createDatePayload = (selectedDate) => {
    try {
      // const currentDate = moment().format(DATE_FORMAT);
      const endDate = moment(
        selectedDate?.fiscalInfoEndDate?.calendar_week_start_date
      )
        .utc()
        .endOf("week")
        .format(DATE_FORMAT);
      const startDate = moment(
        selectedDate?.fiscalInfoStartDate?.calendar_week_start_date
      )
        .utc()
        .startOf("week")
        .format(DATE_FORMAT);
      let dateParams = {
        attribute_name: "deep_dive_dates",
        start_date: startDate,
        end_date: endDate,
      };
      return dateParams;
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const onFilterApply = () => {
    try {
      let weekRangePayload = {};
      if (
        selectedDate === undefined ||
        (selectedDate?.fiscalInfoStartDate === null &&
          selectedDate?.fiscalInfoEndDate === null)
      ) {
        weekRangePayload = {};
      }
      if (
        selectedDate?.fiscalInfoStartDate ||
        selectedDate?.fiscalInfoEndDate
      ) {
        weekRangePayload = createDatePayload(selectedDate);
      }
      setWeekRangeDate(weekRangePayload);
      console.log("filteredStoreData", filteredStoreData);
      props.simulateCreateScenario(
        filteredStoreData,
        true,
        !isEmpty(weekRangePayload) ? [weekRangePayload] : []
      );
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  //To extract the unique values for the dropdowns based on the filters applied
  const filterAndExtract = (data, selectedFilters = {}, columns) => {
    // Step 1: Filter the data, ignoring empty array filters
    const filteredData = Object.keys(selectedFilters).length
      ? data.filter((row) =>
          Object.entries(selectedFilters).every(([key, values]) =>
            Array.isArray(values)
              ? values.length === 0 || values.includes(row[key]) // Ignore empty arrays
              : row[key] === values
          )
        )
      : data; // If no filters, use all data

    //Step 2: Save filtered data to state
    setFilteredStoreData(cloneDeep(filteredData));

    // Step 3: Extract unique values for specified columns
    const result = {};
    columns.forEach((col) => {
      result[col] = [...new Set(filteredData.map((row) => row[col]))];
    });

    return result;
  };

  //To set the values for the dropdowns
  useEffect(() => {
    if (deepDiveFiltersData) {
      try {
        const data = cloneDeep(deepDiveFiltersData);
        const dropdownData = Object.keys(data).reduce((filterData, filter) => {
          filterData[filter] = data[filter].map((value) => ({
            label: replaceSpecialCharacter(value),
            value: value,
          }));
          return filterData;
        }, {});
        setCurrentSelectOptions(dropdownData);
        if (props?.isDefaultSelectionNeeded) {
          setSelectedOptions(dropdownData[0]);
        }
      } catch (error) {
        props?.addSnack({
          message: ERROR_MESSAGE,
          options: {
            variant: "error",
          },
        });
      }
    }
  }, [deepDiveFiltersData]);

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
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();
    setDeepDiveFiltersData(
      filterAndExtract(
        props?.selectedSafetyStockSkuData,
        [],
        CHART_FILTERS.map((item) => item.column_name)
      )
    );
  }, []);

  const createGraphSeries = (displayType) => {
    let isELTEnabled = isSwitchedChecked;
    if (displayType !== undefined) isELTEnabled = displayType;
    let series = CHARTS_CONFIG.map((config, index) => {
      let graphSeries = {
        ...config.series,
        name: isELTEnabled
          ? config.effectiveLeadTime.label
          : config.leadTime.label,
        data: isELTEnabled
          ? deepDiveChartData[config.effectiveLeadTime?.key]
          : deepDiveChartData[config.leadTime?.key],
      };

      if (config.show_as_negative && graphSeries.data) {
        graphSeries.data = graphSeries.data.map((val) => -val);
      }

      return graphSeries;
    });
    setSeriesGraphData([...series]);

    let deepDiveCols = formattingDeepDiveColumns(
      deepDiveTableColumns,
      isELTEnabled
    );
    setDeepDiveTableColumns(deepDiveCols);
    let scenarioCols = formattingDeepDiveColumns(
      scenarioViewTableColumns,
      isELTEnabled
    );
    setScenarioViewTableColumns(scenarioCols);
  };

  const formattingDeepDiveColumns = (columns, isEltEnabled) => {
    const updatedColumns = columns?.map((val) => {
      const newVal = { ...val };

      if (CREATE_SCENARIO_ELT_TABLE_COLUMNS.includes(newVal?.column_name)) {
        newVal.is_hidden = !isEltEnabled;
      }
      if (CREATE_SCENARIO_TABLE_COLUMNS.includes(newVal?.column_name)) {
        newVal.is_hidden = isEltEnabled;
      }

      return newVal;
    });

    let formattedColumns = agGridColumnFormatter(
      updatedColumns,
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );
    return formattedColumns;
  };

  // const onSwitchChange = (event) => {
  //   let displayType = event.target.checked;
  //   createGraphSeries(displayType);
  //   setIsSwitchedChecked(displayType);
  // };

  const graphOptions = {
    chartType: "barLineChart",
    chartTitle: null,
    axisLegends: {
      xaxis: {
        categories: fiscalYearWeek,
      },
      yaxis: {
        primaryAxisTitle: "Units",
      },
    },
    series: seriesGraphData,
  };

  const handleChartFilterChange = (columnName, options, params) => {
    let selectedOptions = options.map((option) => option.value);
    let appliedFilters = cloneDeep(deepDiveFiltersPayload || {});
    appliedFilters[columnName] = [...selectedOptions];

    setDeepDiveFiltersData(
      filterAndExtract(
        props?.selectedSafetyStockSkuData,
        appliedFilters,
        CHART_FILTERS.map((item) => item.column_name)
      )
    );
    console.log("appliedFilters", appliedFilters);
    setDeepDiveFiltersPayload(appliedFilters);
  };

  const getTopRightOptions = () => {
    const options = [];
    // Add Apply button
    if (!isEmpty(isCreateScenarioButton)) {
      const isApplyDisabled = !isEmpty(props.userAccess)
        ? !isUserHasApplyAccess ||
          props.isScenarioApplied ||
          selectedStore.length === 0
        : props.isScenarioApplied ||
          selectedStore.length === 0 ||
          !isCreateScenarioButton?.isVisible;

      options.push(
        <Button
          key="apply-scenario"
          variant="contained"
          color="primary"
          id="scenarioStoreApplyBtn"
          disabled={isApplyDisabled}
          onClick={() => handleApplyButton()}
        >
          {isCreateScenarioButton?.label || "Apply"}
        </Button>
      );
    }

    return options;
  };

  const getTopLeftOptions = () => {
    const options = [];
    options.push(<CreateScenarioStoreAggregatedChips key="aggregated-chips" />);
    return options;
  };

  const getBottomLeftOptions = () => {
    let options = [];
    options.push(displayCreateScenarioFootNote());
    return options;
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const renderTabComponents = () => {
    const TabListMapper = {
      original: (
        <OriginalDeepDiveStoreTableView
          columns={props?.deepDiveTableColumns || []}
          weekRange={weekRangeDate || {}}
          chartFilterData={props.chartFilterData || []}
          userAccess={props.userAccess}
          isUserHasOriginalDownloadAccess={isUserHasOriginalDownloadAccess}
        />
      ),
      scenario: (
        <ScenarioStoreTableView
          columns={props?.scenarioViewTableColumns || []}
          weekRange={weekRangeDate || {}}
          simulateDownloadData={props.simulateDownloadData}
          userAccess={props.userAccess}
          isUserHasScenarioDownloadAccess={isUserHasScenarioDownloadAccess}
        />
      ),
    };

    let tablePanel = tabsList.map((thisTab) => {
      let tabValue = thisTab?.value;
      return <div key={tabValue}>{TabListMapper[tabValue]}</div>;
    });
    return tablePanel;
  };

  // Complete UI structure
  return (
    <div style={{ marginBottom: "4rem" }}>
      {/* Create Scenario Filters */}
      <Grid
        item
        md={12}
        lg={10}
        display={"flex"}
        alignItems={"flex-end"}
        justifyContent={"flex-end"}
      >
        {SHOW_WEEK_RANGE && (
          <div style={{ marginRight: "1rem" }}>
            <NormalCalendarFiscalMapping
              fiscalCalendarData={fiscalCalendarDetails}
              disablePastWeeks={true}
              showDefaultLabel={false}
              selectedDate={selectedDate}
              onDateChange={onWeekRangeChange}
              resetOptions={true}
              isOutsideRange={isOutsideRange}
              label="Week Range"
              displayFormat={DATE_FORMAT}
            />
          </div>
        )}
        <div
          className={`${globalClasses.flexRow}`}
          style={{ columnGap: "1rem", marginRight: "1rem" }}
        >
          {CHART_FILTERS.filter((item) => item?.is_visible || true).map(
            (item, index) => {
              return (
                <ChartFilters
                  label={item?.label}
                  key={index}
                  columnName={item?.column_name}
                  filterProps={item}
                  isDefaultSelectionNeeded={false}
                  currentSelectOptions={currentSelectOptions[item?.column_name]}
                  setCurrentSelectOptions={setCurrentSelectOptions}
                  selectedOptions={selectedOptions}
                  setSelectedOptions={setSelectedOptions}
                  reset={resetFilters}
                  setResetFilters={setResetFilters}
                  customFilterChangeFunc={handleChartFilterChange}
                />
              );
            }
          )}
        </div>
        {!isEmpty(deepDiveFiltersData) && (
          <Grid
            item
            xs={2}
            style={{
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <Button
              id="resetBtn"
              onClick={handleResetFilters}
              color="primary"
              variant="secondary"
            >
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={onFilterApply}
              id="applyBtn"
              color="primary"
            >
              Apply
            </Button>
          </Grid>
        )}
      </Grid>

      {/* Create Scenario Graph */}
      <div className={classes.chartContainer}>
        <div className={classes.leftContainer}>
          <Typography className={classes.graphTitle}>
            Create Scenario Graph
          </Typography>
        </div>
        {/* <div className={classNames(globalClasses.centerAlign)}>
            {seriesGraphData.length > 0 && (
              <FormControl>
                 <Switch
                  checked={isSwitchedChecked}
                  onChange={onSwitchChange}
                  disabled={false}
                  rightLabel="Effective lead time"
                  leftLabel="Lead time"
                /> 
              </FormControl>
            )}
          </div> */}
        <LoadingOverlay
          loader={props.deepDiveTableLoader || props.deepDiveTableConfigLoader}
          minHeight={"260px"}
        >
          <Box sx={{ pb: 1 }}>
            {seriesGraphData.length ? (
              <>
                <Typography variant="p" className={classes.chartXAxisLabel}>
                  Lead Time
                </Typography>
                <Charts options={graphOptions} mapView={true} />
              </>
            ) : (
              <div className={globalClasses.centerAlign}>
                <EmptyStateWrapper />
              </div>
            )}
          </Box>
        </LoadingOverlay>
      </div>

      {/* Tabs for Original and Scenario Views */}
      <div className={globalClasses.marginVertical1rem}>
        {tabsList && tabsList.length > 0 ? (
          <Tabs
            value={tabValue}
            onChange={handleChangeTabValue}
            aria-label="oms-create-store-scenario-tabs"
            tabNames={[...tabsList]}
            tabPanels={renderTabComponents()}
          />
        ) : (
          <Typography>Loading tabs...</Typography>
        )}
      </div>

      {/* Main Store Table */}
      <div>
        <Loader loader={props.deepDiveTableConfigLoader} minHeight={"260px"}>
          <div style={{ minHeight: "150px" }}>
            <AgGridComponent
              pagination={false}
              columns={tableColumns || []}
              rowdata={storeTableData || []}
              selectAllHeaderComponent={true}
              hideSelectAllRecords={false}
              onSelectionChanged={onSelectionChanged}
              loadTableInstance={loadTableInstance}
              uniqueRowId={"id"}
              tableHeader={getTopLeftOptions()}
              topRightOptions={getTopRightOptions()}
              bottomLeftOptions={getBottomLeftOptions()}
              rowSelection="multiple"
            />
          </div>
        </Loader>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_store,
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    deepDiveTableConfigLoader:
      store.omsReducer.orderManagementVendorToStoreService
        .deepDiveTableConfigLoader,
    deepDiveTableLoader:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveTableLoader,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    deepDiveViewTableData:
      store.omsReducer.orderManagementVendorToStoreService.deepDiveTableData,
    scenarioViewTableData:
      store.omsReducer.orderManagementService.createScenarioViewTableData,
    createScenarioAggregatedDataStore:
      store.omsReducer.orderManagementService.createScenarioAggregatedData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getScenarioViewTableConfigurationStore: (payload) =>
    dispatch(getScenarioViewTableConfigurationStore(payload)),
  getSafetyStockGraphVendorStore: (payload) =>
    dispatch(getSafetyStockGraphVendorStore(payload)),
  setDeepDiveTableConfigLoader: (payload) =>
    dispatch(setDeepDiveTableConfigLoader(payload)),
  setDeepDiveTableLoader: (payload) =>
    dispatch(setDeepDiveTableLoader(payload)),
  getOmsSkuSummaryCreateScenarioApplyTableConfigurationStore: (payload) =>
    dispatch(
      getOmsSkuSummaryCreateScenarioApplyTableConfigurationStore(payload)
    ),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setOmsCreateNewOrderApproveRequestData: (payload) =>
    dispatch(setOmsCreateNewOrderApproveRequestDataStore(payload)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderScenarioStoreApplyTable);

import { Divider, Typography } from "@mui/material";
import { Panel } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { connect, useDispatch } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "modules/oms/utils-oms/oms-utility";
import {
  getOmsDeepDiveFilters,
  resetApprovalFlowState,
  setIsApprovalFiltersValid,
  setOrderManagementProductDetailsFilters,
  setSelectedApprovalFilters,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { fetchApprovalPaneCrossFilter } from "../api/approvalPane.api.js";
import {
  buildApprovalPaneCrossFilterPayload,
  buildFiscalDateRangeApprovalFilter,
  buildOrderPlacementDateParams,
  resolveOrderPlacementDateFromFiscalValues,
} from "../utils/buildApprovalPanePayload.util.js";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { cloneDeep, isEmpty } from "lodash";
import { useEffect, useRef, useState } from "react";
import {
  setFilterConfiguration,
  setSelectedFilters,
} from "core/actions/filterAction";
import {
  OMS_APPROVAL_FLOW_CUSTOM_FILTER_DIMENSION,
  ERROR_MESSAGE,
  OMS_PLACEMENT_DATE_MULTI_WEEK,
} from "modules/oms/constants-oms/stringConstants";
import moment from "moment";
import globalStyles from "core/Styles/globalStyles";
import MatrixSummaryApprovalFlowTable from "./MatrixSummaryApprovalFlowTable";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import Loader from "core/Utils/Loader/loader";
import { createTableHeader } from "modules/oms/pages-oms/Order-Management/components/Product-Details-Screen/Style-Order-Summary/utils";
import {
  formatSelectedFiltersData,
} from "core/commonComponents/coreComponentScreen/utils";
import { findFiscalWeek } from "modules/oms/pages-oms/Order-Management/components/Approval-Flow-Dialog/utils";
import {
  resolveAppliedOmsFiltersForApproval,
} from "modules/oms/pages-oms/Order-Management/components/Approval-Flow-Dialog/resolveAppliedOmsFiltersForApproval";

export const NextCycleHelperLabel = () => (
  <Typography
    variant="body2"
    sx={{ color: "text.secondary", mb: 1, fontStyle: "italic" }}
  >
    Showing each product&apos;s next order cycle
  </Typography>
);

const useStyles = makeStyles((theme) => ({
  flatFilterContainer: {
    width: "100%",
    "& .ia_modalBody": {
      paddingTop: "8px",
    },
    "& .main-container": {
      margin: "0",
    },
    "& .flat-filter-container": {
      padding: 0,
    },
  },
}));

const MatrixSummaryApprovalFlowDialog = ({
  setShowApprovalModal,
  viewByTitle,
  viewByValue,
  screenName,
  targetTable,
  fiscalCalendarDetails,
  isExpeditePosRawROQAlert,
  onApprovalSuccess,
  showNextCycleHelper = true,
  ...props
}) => {
  const dispatch = useDispatch();
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const classes = useStyles();
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [orderPlacementDate, setOrderPlacementDate] = useState({});
  const orderPlacementDateRef = useRef(null);
  const [selectedRowsFilter, setSelectedRowsFilter] = useState([]);
  const [filterDependency, setFilterDependency] = useState({});

  const hasOrderPlacementDate =
    Boolean(orderPlacementDate?.start_date) &&
    Boolean(orderPlacementDate?.end_date);
  const showNextCycleHelperLabel =
     !hasOrderPlacementDate;

  const ORDER_PLACEMENT_WEEKS_LIMIT =
    props?.orderingScreensConfig?.oms_dashboard?.approval_flow
      ?.order_placement_weeks_limit || 26;
  const enableCommentDialogWithOptions =
    props?.orderingScreensConfig?.oms_dashboard?.approval_flow
      ?.enableCommentDialogWithOptions || false;

  const onCancel = () => {
    props.reloadComponent(false);
    props.resetApprovalFlowState();
    setShowApprovalModal(false);
    props.reloadComponent(true);

    localStorage.removeItem("approvalFlowFilters");

    props.resetSelectedFilters({
      "oms-approval-flow-filters-custom-0": [],
      "oms-approval-flow-filters-product-0": [],
    });
    props.setFilterConfiguration({
      omsApprovalFlowDialogFilterConfiguration: undefined,
    });
  };

  const displaySnackMessages = (message, variance, autoHideDuration = 5000) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        autoHideDuration: autoHideDuration,
      },
    });
  };

  useEffect(() => {
    const buildFilter = (productDetailsFilters) => {
      const config = [];
      if (productDetailsFilters?.length > 0 && props?.selectedRows) {
        const payload = cloneDeep(productDetailsFilters[0]);
        const columnName = payload?.column_name;
        payload["values"] = props.selectedRows.map((row) =>
          row?.row ? row?.row : row[columnName]
        );
        config.push(payload);
      }
      setSelectedRowsFilter(config);
    };

    const existing = props?.orderManagementProductDetailsFilters;
    if (existing?.length > 0) {
      buildFilter(existing);
      return;
    }

    const fetchAndBuild = async () => {
      try {
        const response = await dispatch(getOmsDeepDiveFilters());
        if (!isMountedRef.current) return;
        const fetched =
          response?.data?.data?.length > 0 ? [response.data.data[0]] : [];
        dispatch(setOrderManagementProductDetailsFilters(fetched));
        buildFilter(fetched);
      } catch (error) {
        console.error(
          "MatrixSummaryApprovalFlowDialog: failed to fetch product details filters",
          error
        );
        if (isMountedRef.current) setSelectedRowsFilter([]);
      }
    };
    fetchAndBuild();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetchFilterConfig(
          "InventorySmart OMS Approval screen"
        );
        setFilters(response);
      } catch (error) {
        console.log("Error in fetching Filters", error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions();
  }, [filters, fiscalCalendarDetails, props?.styleOrderSummaryPayload, props?.approvalPaneContext]);

  //For Order Placement Date
  const isOutsideRange = (date) => {
    let weekLimit = ORDER_PLACEMENT_WEEKS_LIMIT * 7 - 1;
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().endOf("week").day(weekLimit);
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      const selectedFilters = cloneDeep(props.selectedFilters || []);

      //Selected Products preselected to the filter
      const productFilter =
        props?.orderManagementProductDetailsFilters?.length > 0
          ? cloneDeep(props?.orderManagementProductDetailsFilters[0])
          : {};
      const filterExist = filters.filter(
        (filter) => filter.column_name === productFilter.column_name
      );
      if (!isEmpty(productFilter) && filterExist?.length) {
        productFilter.initialData = selectedRowsFilter[0].values;
        productFilter.values = selectedRowsFilter[0].values;
      }

      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      if (filterExist?.length)
        requiredFilterObjParams.customDependency = [productFilter];
      const filterConfigurations = await fetchFilterOptions(
        requiredFilterObjParams
      );
      const response = filterConfigurations.filter(
        (filter) => filter.dimension !== "custom"
      );

      //OMS Dashboard Filters — same resolution as filter-approval-orders (ApprovalFlowTable)
      const appliedOmsFilters = resolveAppliedOmsFiltersForApproval({
        omsFilterConfiguration: props?.omsFilterConfiguration,
        selectedFilters: props?.selectedFilters,
        decisionDashboardDependencyData: props?.decisionDashboardDependencyData,
      });

      let appliedOmsProductFilters =
        appliedOmsFilters?.filter(
          (filter) => filter.display_type !== "fiscalCalendar"
        ) || [];

      // Apply pre-fill values to the matching filter in the response array
      if (!isEmpty(productFilter) && filterExist?.length) {
        const matchingFilter = response.find(
          (filter) => filter.column_name === productFilter.column_name
        );
        if (matchingFilter) {
          matchingFilter.initialData = selectedRowsFilter[0].values;
          matchingFilter.values = selectedRowsFilter[0].values;
        }
      }

      // Apply OMS dashboard filter pre-fill values to matching filters
      appliedOmsProductFilters.forEach((omsFilter) => {
        const matchingFilter = response.find(
          (filter) => filter.column_name === omsFilter.attribute_name
        );
        if (matchingFilter && omsFilter.values?.length > 0) {
          matchingFilter.initialData = omsFilter.values;
          matchingFilter.values = omsFilter.values;
        }
      });

      const customFilterConfigs = filterConfigurations.filter(
        (filter) => filter.dimension === "custom"
      );

      //Order Type Custom Filter
      let orderType = [];
      const customFilters = [];
      customFilterConfigs.map((customFilterConfig) => {
        const orderTypeFilter = {
          attribute_name: customFilterConfig?.column_name,
          dimension: customFilterConfig?.dimension,
          filter_type: customFilterConfig?.type,
          operator: "in",
          values: [],
        };
        orderType.push(orderTypeFilter);
      });

      const approvalPaneContext = props.approvalPaneContext || {};
      const crossFilterPayload = buildApprovalPaneCrossFilterPayload({
        screenId: approvalPaneContext.screenId,
        drilldownSelection: approvalPaneContext.drilldownSelection,
        availableHierarchies: approvalPaneContext.availableHierarchies,
        globalFilters: approvalPaneContext.globalFilters,
        orderIdentifiers: approvalPaneContext.orderIdentifiers,
      });

      const customFilterData = await fetchApprovalPaneCrossFilter(
        crossFilterPayload
      );

      if (!isEmpty(customFilterData?.data?.data)) {
        const filterDataResponse = cloneDeep(customFilterData?.data?.data);
        const customFilterDropdownData = [];
        Object.keys(filterDataResponse).map((key) => {
          const customValues = filterDataResponse[key];
          customValues.map((value) => {
            let updatedFilterResponse = {
              label: replaceSpecialCharacter(value),
              value: value,
              filter_key: key,
            };
            customFilterDropdownData.push(updatedFilterResponse);
          });
        });

        if (customFilterConfigs?.length) {
          customFilterConfigs.map((customFilterConfig) => {
            const dropDownValues = customFilterDropdownData?.filter(
              (filter) => filter.filter_key === customFilterConfig?.column_name
            );

            let customFilter = {};
            customFilter = JSON.parse(JSON.stringify(customFilterConfig));
            customFilter.fc_code = customFilterConfig?.fc_code;
            customFilter.order = 2;
            customFilter.dimension = OMS_APPROVAL_FLOW_CUSTOM_FILTER_DIMENSION;
            customFilter.type = "non-cascaded";
            customFilter.initialData = [...dropDownValues];
            customFilters.push(customFilter);
          });
        }
      }

      //For Order Placement Date
      const recommReceiptCalendarConfig = JSON.parse(
        JSON.stringify(OMS_PLACEMENT_DATE_MULTI_WEEK)
      );
      recommReceiptCalendarConfig.fc_code = response[0]?.fc_code;
      recommReceiptCalendarConfig.initialData = fiscalCalendarDetails;
      recommReceiptCalendarConfig.showDefaultLabel = false;
      recommReceiptCalendarConfig.isMandatory =
        props?.orderingScreensConfig?.oms_dashboard?.approval_flow
          ?.order_placement_date_range?.isMandatory || false;
      recommReceiptCalendarConfig.isOutsideRange = isOutsideRange;
      recommReceiptCalendarConfig.label = "Order Placement Date";
      recommReceiptCalendarConfig.order = 2;
      recommReceiptCalendarConfig.dimension = OMS_APPROVAL_FLOW_CUSTOM_FILTER_DIMENSION;

      // Pre-select Order Placement Date when opened from Style Order Summary or Expedite alert
      const recommendedDateRange =
        props?.styleOrderSummaryPayload?.recommendedOrderPlacementDateRange;
      if (recommendedDateRange) {
        const [startFiscal, endFiscal] = [
          findFiscalWeek(recommendedDateRange.start_date, fiscalCalendarDetails),
          findFiscalWeek(recommendedDateRange.end_date, fiscalCalendarDetails),
        ];

        if (startFiscal && endFiscal) {
          recommReceiptCalendarConfig.values = {
            fiscalInfoStartDate: startFiscal,
            fiscalInfoEndDate: endFiscal,
          };
          const preselectedPlacementDate = buildOrderPlacementDateParams({
            startDate: moment(startFiscal?.fiscal_week_begin_date)
              .utc()
              .startOf("week"),
            endDate: moment(endFiscal?.fiscal_week_end_date)
              .utc()
              .endOf("week"),
          });
          if (preselectedPlacementDate) {
            orderPlacementDateRef.current = preselectedPlacementDate;
            setOrderPlacementDate(preselectedPlacementDate);
          }
        }
      }

      const responseWithFiscalCalendarConfig = [...response];
      if (customFilters?.length) {
        customFilters.map((customFilter) => {
          responseWithFiscalCalendarConfig.push(customFilter);
        });
      }
      responseWithFiscalCalendarConfig.push(recommReceiptCalendarConfig);

      const apiFilterValues = customFilterData?.data?.data;
      if (!isEmpty(apiFilterValues)) {
        responseWithFiscalCalendarConfig.forEach((row) => {
          if (
            !row ||
            row.display_type !== "dropdown" ||
            !row.column_name ||
            !apiFilterValues.hasOwnProperty(row.column_name)
          ) {
            return;
          }
          const apiValuesForColumn = apiFilterValues[row.column_name];
          if (!Array.isArray(apiValuesForColumn) || !apiValuesForColumn.length) {
            return;
          }
          const existingExtraData = Array.isArray(row?.extra?.filterData)
            ? row.extra.filterData
            : [];
          const existingValues = new Set(existingExtraData);
          const merged = [...existingExtraData];
          apiValuesForColumn.forEach((val) => {
            if (!existingValues.has(val)) {
              merged.push(val);
              existingValues.add(val);
            }
          });
          row.extra = {
            ...(row.extra || {}),
            filterData: merged,
          };
        });
      }

      let expectedFilterAccordionExpansions = { product: false };
      expectedFilterAccordionExpansions[
        OMS_APPROVAL_FLOW_CUSTOM_FILTER_DIMENSION
      ] = false;

      const filterConfigData = [
        {
          filterDashboardData: responseWithFiscalCalendarConfig,
          expectedFilterDimensions: getFilterDimensions(
            responseWithFiscalCalendarConfig
          ),
          isCrossDimensionFilter: true,
          screen_name: screenName,
          expectedFilterAccordionExpansions: expectedFilterAccordionExpansions,
        },
      ];

      const filterConfig = formattedFilterConfiguration(
        "omsApprovalFlowDialogFilterConfiguration",
        filterConfigData,
        "OMS Approval Flow filters",
        selectedFilters
      );

      let newFiltersForApproval = [];
      if (response?.length !== props?.selectedFilters?.length) {
        const commonFilters = new Set(
          props?.selectedFilters.map((item) => item.attribute_name)
        );

        // Create new array with filters present only in Approval Flow Pane
        newFiltersForApproval = response
          .filter((obj) => !commonFilters.has(obj.column_name))
          .map((obj) => ({
            filter_type: "cascaded",
            attribute_name: obj.column_name,
            operator: "in",
            dimension: obj.dimension,
            values: [],
          }));
      }

      const allFilterConfigs = [
        ...props?.selectedFilters,
        ...newFiltersForApproval,
        ...orderType,
      ];

      const filtersSource = [...allFilterConfigs];

      const preFilledFilters = filtersSource.map((filter) => {
        if (
          filter.attribute_name &&
          customFilterData?.data?.data &&
          customFilterData.data.data.hasOwnProperty(filter.attribute_name)
        ) {
          return {
            ...filter,
            values: customFilterData.data.data[filter.attribute_name],
          };
        }
        return filter;
      });

      // Add fiscal_date_range to preFilledFilters if values exist
      if (recommReceiptCalendarConfig.values) {
        preFilledFilters.push({
          attribute_name: recommReceiptCalendarConfig.filter_keyword,
          filter_id: recommReceiptCalendarConfig.filter_keyword,
          filter_name: recommReceiptCalendarConfig.label,
          filter_type: recommReceiptCalendarConfig.type,
          display_type: recommReceiptCalendarConfig.display_type,
          dimension: recommReceiptCalendarConfig.dimension,
          values: recommReceiptCalendarConfig.values,
        });
      }

      prepareFilterDependency(
        filterConfigData,
        "OMS Approval Flow filters",
        preFilledFilters,
        responseWithFiscalCalendarConfig
      );

      props.setFilterConfiguration(filterConfig);
      setFilterData(responseWithFiscalCalendarConfig);
    } catch (error) {
      console.log("Error in fetching Filters Options", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
    }
  };

  const applyFilters = (
    filterElements,
    filterDependency,
    filterRecommDates
  ) => {
    try {
      const dateParams = resolveOrderPlacementDateFromFiscalValues(
        filterRecommDates?.values
      );

      if (dateParams) {
        orderPlacementDateRef.current = dateParams;
        setOrderPlacementDate(dateParams);
      } else {
        orderPlacementDateRef.current = null;
        setOrderPlacementDate({});
      }

      const payload = filtersPayload(filterElements, filterDependency, true);
      const reqBody = [...payload.reqBody];
      const fiscalDateRangeFilter =
        buildFiscalDateRangeApprovalFilter(filterRecommDates);

      if (fiscalDateRangeFilter) {
        if (dateParams?.start_date && dateParams?.end_date) {
          fiscalDateRangeFilter.values = [
            dateParams.start_date,
            dateParams.end_date,
          ];
        }
        reqBody.push(fiscalDateRangeFilter);
      }

      props.setSelectedFilters(reqBody);
      props.setIsFiltersValid(payload.isValid);
    } catch (err) {
      console.log("error", err);
    }
  };

  const findFiscalDateRangeFilter = (dependencyData = []) =>
    dependencyData?.find(
      (dataItem) =>
        dataItem?.attribute_name === "fiscal_date_range" ||
        dataItem?.filter_id === "fiscal_date_range"
    );

  const onFilterDashboardClick = (dependencyData, filterData) => {
    const fiscal_date_range = findFiscalDateRangeFilter(dependencyData);
    filterData = filterData.filter(
      (item) => item.column_name !== "fiscal_date_range"
    );
    applyFilters(filterData, dependencyData, fiscal_date_range);
  };

  const getPreselectedFilters = () => {
    try {
      const appliedOmsFilters = resolveAppliedOmsFiltersForApproval({
        omsFilterConfiguration: props?.omsFilterConfiguration,
        selectedFilters: props?.selectedFilters,
        decisionDashboardDependencyData: props?.decisionDashboardDependencyData,
        preferRedirectionBeforeSelected: true,
      });
      const appliedOmsProductFilters = appliedOmsFilters?.filter(
        (filter) => filter.display_type !== "fiscalCalendar"
      );
      return appliedOmsProductFilters;
    } catch (error) {
      console.log("Error in fetching Preselected Filters", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  //Selected Products preselected to the filter
  const getCustomDependencyFilter = async (dependency) => {
    const filterDependency = cloneDeep(dependency);
    const productFilter =
      props?.orderManagementProductDetailsFilters?.length > 0
        ? cloneDeep(props?.orderManagementProductDetailsFilters[0])
        : {};
    const filterExist = filters.filter(
      (filter) => filter.column_name === productFilter.column_name
    );
    if (filterExist?.length) {
      let productFilterFound = false;
      filterDependency.map((filter) => {
        if (filter.attribute_name === productFilter.attribute_name) {
          productFilterFound = true;
          if (filter?.values?.length === 0) {
            filter.values = selectedRowsFilter[0].values;
          }
        }
      });
      if (!productFilterFound) {
        productFilter.initialData = selectedRowsFilter[0].values;
        productFilter.values = selectedRowsFilter[0].values;
        filterDependency.push(productFilter);
      }
    }

    const preselectedFilters = getPreselectedFilters();
    if (preselectedFilters?.length) {
      filterDependency.push(...preselectedFilters);
    }
    return filterDependency;
  };

  const getApprovaFlowTitle = () => {
    const selectedState = props?.highLevelSummaryState;
    return (
      <div style={{ display: "flex", gap: "1rem" }}>
        <Typography h6 style={{ fontWeight: 800, fontSize: "16px" }}>
          Approve orders
        </Typography>
        <Divider orientation="vertical" flexItem />
        {props?.highLevelSummaryState?.level_of_hierarchy_label &&
          createTableHeader(
            selectedState?.level_of_hierarchy_label,
            selectedState?.level_of_hierarchy_value
          )}
      </div>
    );
  };

  const prepareFilterDependency = (
    redirectedFilterDependency,
    filterConfigData,
    response,
    filterData
  ) => {
    const redirectedFilters = response
      ?.map((item) => {
        let filter = {
          ...item,
          filter_id: item.attribute_name,
          filter_type: item.filter_type || "cascaded",
          display_type: item.display_type || "dropdown",
        };

        if (!filter.filter_name) {
          let labeledFilter = response.find(
            (data) => data.column_name === filter.attribute_name
          );
          if (labeledFilter) filter.filter_name = labeledFilter.label;
          else filter.filter_name = item.dimension;
        }

        if (filter?.values?.length || Object.keys(filter?.values)?.length > 0) {
          return filter;
        }
        return undefined;
      })
      .filter(Boolean);

    const formattedSelectedFilters = formatSelectedFiltersData(
      redirectedFilterDependency,
      "OMS Approval Flow filters",
      redirectedFilters
    );

    setFilterDependency(formattedSelectedFilters);
    onFilterDashboardClick(redirectedFilters, filterData, true);
  };

  return (
    <Panel
      title={getApprovaFlowTitle()}
      size="large"
      anchor="bottom"
      className={classes.flatFilterContainer}
      aria-labelledby="approval-dialog-title"
      open={true}
      onClose={() => onCancel()}
    >
      <div>
        {filterData?.length === 0 ? (
          <Loader loader={true} minHeight="600px"></Loader>
        ) : (
          <>
            <CoreComponentScreen
              autoHideFilterButton={true}
              showPageRoute={false}
              showPageHeader={false}
              showFilterDashboard={true}
              disableFilterModal={true}
              hideFilterActions={false}
              hideNoDataFound={true}
              hideSaveFilterSection={true}
              hideSaveFilter={true}
              // preventFilterPreselection={true}
              filterConfigKey={"omsApprovalFlowDialogFilterConfiguration"}
              onApplyFilter={onFilterDashboardClick}
              customDependencyValue={getCustomDependencyFilter}
              filterDependency={filterDependency}
            />
            <Divider sx={{ margin: "1.5rem 0px" }} />

            {showNextCycleHelperLabel && <NextCycleHelperLabel />}

            {selectedRowsFilter.length > 0 && (
              <MatrixSummaryApprovalFlowTable
                orderPlacementDate={orderPlacementDate}
                orderPlacementDateRef={orderPlacementDateRef}
                displaySnackMessages={displaySnackMessages}
                selectedRowsFilter={selectedRowsFilter}
                targetTable={targetTable}
                approvalPaneContext={props.approvalPaneContext}
                enableCommentDialogWithOptions={enableCommentDialogWithOptions}
                onApprovalSuccess={onApprovalSuccess}
              />
            )}
          </>
        )}
      </div>
    </Panel>
  );
};

const mapStateToProps = (store) => {
  return {
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "omsApprovalFlowDialogFilterConfiguration"
      ],
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    isFiltersValid:
      store.omsReducer.orderManagementService.isApprovalFiltersValid,
    selectedApprovalFilters:
      store.omsReducer.orderManagementService.selectedApprovalFilters,
    omsFilterConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ],
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
    orderManagementProductDetailsFilters:
      store.omsReducer.orderManagementService
        .orderManagementProductDetailsFilters,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    rolesBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
    decisionDashboardDependencyData:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ]?.appliedFilterData?.dependencyData,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setSelectedFilters: (payload) =>
    dispatch(setSelectedApprovalFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsApprovalFiltersValid(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  resetApprovalFlowState: (payload) =>
    dispatch(resetApprovalFlowState(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  resetSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MatrixSummaryApprovalFlowDialog);

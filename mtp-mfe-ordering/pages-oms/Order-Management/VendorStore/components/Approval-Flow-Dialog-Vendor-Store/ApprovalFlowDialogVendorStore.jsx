import { Divider, Typography } from "@mui/material";
import { Panel } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "modules/oms/utils-oms/oms-utility";
import {
  resetApprovalFlowState,
  setIsApprovalFiltersValid,
  setSelectedApprovalFilters,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { cloneDeep, isEmpty } from "lodash";
import React, { useEffect, useState } from "react";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  OMS_APPROVAL_FLOW_CUSTOM_FILTER_DIMENSION,
  ERROR_MESSAGE,
  OMS_PLACEMENT_DATE_MULTI_WEEK,
  TENANT_DATE_FORMAT,
} from "modules/oms/constants-oms/stringConstants";
import moment from "moment";
import globalStyles from "core/Styles/globalStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import Loader from "core/Utils/Loader/loader";
import { createTableHeader } from "../../../components/Product-Details-Screen/Style-Order-Summary/utils";
import {
  getTenantTimeZoneDetails,
  formatSelectedFiltersData,
} from "core/commonComponents/coreComponentScreen/utils";
import ApprovalFlowTableVendorStore from "./ApprovalFlowTableVendorStore";
import { getCustomFiltersForApprovalFlowInVendorStore } from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";

const useStyles = makeStyles((theme) => ({
  flatFilterContainer: {
    width: "1000px",
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
const ApprovalFlowDialogVendorStore = ({
  setShowApprovalModal,
  viewByTitle,
  viewByValue,
  screenName,
  targetTable,
  fiscalCalendarDetails,
  ...props
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [orderPlacementDate, setOrderPlacementDate] = useState({});
  const [selectedRowsFilter, setSelectedRowsFilter] = useState([]);
  const [filterDependency, setFilterDependency] = useState({});

  const ORDER_PLACEMENT_WEEKS_LIMIT =
    props?.vendorToStoreScreenConfig?.order_placement_weeks_limit || 26;

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const onCancel = () => {
    props.reloadComponent(false);
    props.resetApprovalFlowState();
    setShowApprovalModal(false);
    props.reloadComponent(true);

    localStorage.removeItem("approvalFlowFilters");

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
    const selectedRowsFilterConfig = [];

    if (props?.productDetailsFilters?.length > 0 && props?.selectedRows) {
      let selectedRowsFilterConfigPayload = cloneDeep(
        props?.productDetailsFilters[0]
      );

      const columnName = selectedRowsFilterConfigPayload?.column_name;
      const selectedIdsFromMatrix = [];
      props?.selectedRows.forEach((row) =>
        selectedIdsFromMatrix.push(row?.row ? row?.row : row[columnName])
      );

      selectedRowsFilterConfigPayload["values"] = selectedIdsFromMatrix;
      selectedRowsFilterConfig.push(selectedRowsFilterConfigPayload);
    }
    setSelectedRowsFilter(selectedRowsFilterConfig);
  }, []);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetchFilterConfig(
          "InventorySmart OMS Approval Vendor Store screen"
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
    if (!isEmpty(fiscalCalendarDetails)) getFiltersOptions();
  }, [filters, fiscalCalendarDetails]);

  //For Order Placement Date
  const isOutsideRange = (date) => {
    let weekLimit = ORDER_PLACEMENT_WEEKS_LIMIT * 7 - 1;
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().endOf("week").day(weekLimit);
    return !moment(date).isBetween(weekStartDay, weekEndDay, undefined, "[]");
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      const selectedFilters = cloneDeep(
        props.filterDashboardConfiguration?.appliedFilterData?.dependencyData ||
          []
      );

      //Selected Products preselected to the filter
      const productFilter =
        props?.productDetailsFilters?.length > 0
          ? cloneDeep(props?.productDetailsFilters[0])
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

      const customFilterConfigs = filterConfigurations.filter(
        (filter) => filter.dimension === "custom"
      );

      //OMS Dashboard Filters
      const appliedOmsFilters =
        props?.omsFilterVendorStoreConfiguration?.appliedFilterData
          ?.dependencyData;
      const appliedOmsProductFilters = appliedOmsFilters?.filter(
        (filter) => filter.display_type !== "fiscalCalendar"
      );

      //Order Type Custom Filter
      let orderType = [];
      const customFilters = [];
      const customFilterAttributes = [];
      customFilterConfigs.map((customFilterConfig) => {
        const customFilter = {
          attribute_name: customFilterConfig?.column_name,
          dimension: customFilterConfig?.dimension,
          filter_type: customFilterConfig?.type,
        };
        customFilterAttributes.push(customFilter);
        const orderTypeFilter = {
          attribute_name: customFilterConfig?.column_name,
          dimension: customFilterConfig?.dimension,
          filter_type: customFilterConfig?.type,
          operator: "in",
          values: [],
        };
        orderType.push(orderTypeFilter);
      });

      const payload = {
        attributes: customFilterAttributes,
        filter_type: customFilterConfigs[0]?.type || "cascaded",
        filters: selectedRowsFilter,
        is_urm_filter: props.tenantFilterUamConfig,
        screen_name: screenName,
      };

      const customFilterData = await props?.getCustomFiltersForApprovalFlow(
        payload
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
        props?.vendorToStoreScreenConfig?.order_placement_date_range
          ?.isMandatory || false;
      recommReceiptCalendarConfig.isOutsideRange = isOutsideRange;
      recommReceiptCalendarConfig.label = "Order Placement Date";
      recommReceiptCalendarConfig.order = 2;
      recommReceiptCalendarConfig.dimension = OMS_APPROVAL_FLOW_CUSTOM_FILTER_DIMENSION;

      const responseWithFiscalCalendarConfig = [...response];
      if (customFilters?.length) {
        customFilters.map((customFilter) => {
          responseWithFiscalCalendarConfig.push(customFilter);
        });
      }
      responseWithFiscalCalendarConfig.push(recommReceiptCalendarConfig);

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

      prepareFilterDependency(
        filterConfigData,
        "OMS Approval Flow filters",
        preFilledFilters,
        response
      );

      props.setFilterConfiguration(filterConfig);

      let filterElements = cloneDeep(response);
      setFilterData(response);
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
      if (filterRecommDates?.values) {
        const endDate = moment(
          filterRecommDates?.values?.fiscalInfoEndDate?.calendar_week_start_date
        )
          .utc()
          .endOf("week")
          .format(DATE_FORMAT);
        const startDate = moment(
          filterRecommDates?.values?.fiscalInfoStartDate
            ?.calendar_week_start_date
        )
          .utc()
          .startOf("week")
          .format(DATE_FORMAT);

        let dateParams = {
          attribute_name: "order_placement_date",
          start_date: startDate,
          end_date: endDate,
        };
        setOrderPlacementDate(dateParams);
      } else {
        let dateParams = {
          attribute_name: "order_placement_date",
          start_date: null,
          end_date: null,
        };
        setOrderPlacementDate(dateParams);
      }

      const payload = filtersPayload(filterElements, filterDependency, true);
      props.setSelectedFilters(payload.reqBody);
      props.setIsFiltersValid(payload.isValid);
    } catch (err) {
      console.log("error", err);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    const fiscal_date_range = dependencyData?.find(
      (dataItem) => dataItem.attribute_name === "fiscal_date_range"
    );
    filterData = filterData.filter(
      (item) => item.column_name !== "fiscal_date_range"
    );
    applyFilters(filterData, dependencyData, fiscal_date_range);
  };

  const getPreselectedFilters = () => {
    try {
      // Fetching the filters from local storage when navigating from Dashboard to Approval Flow Pane
      const redirectionApprovalFilters = JSON.parse(
        localStorage.getItem("approvalFlowFilters")
      );

      // Fetching the filters from local storage when navigating from Dashboard to Product Details page / Matrix Summary
      const redirectionDetails = JSON.parse(
        localStorage.getItem("omsRedirectionDetails")
      );
      const redirectionFilters = redirectionDetails?.isRedirection
        ? redirectionDetails?.selectedFilters
        : [];

      const appliedOmsFilters =
        props?.omsFilterVendorStoreConfiguration?.appliedFilterData
          ?.dependencyData ||
        redirectionApprovalFilters ||
        redirectionFilters ||
        props?.selectedFilters ||
        [];
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
      props?.productDetailsFilters?.length > 0
        ? cloneDeep(props?.productDetailsFilters[0])
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
          filter_type: "cascaded",
          display_type: "dropdown",
        };

        if (!filter.filter_name) {
          let labeledFilter = response.find(
            (data) => data.column_name === filter.attribute_name
          );
          if (labeledFilter) filter.filter_name = labeledFilter.label;
          else filter.filter_name = item.dimension;
        }

        if (filter?.values?.length) {
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
      anchor="right"
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

            <Divider sx={{ margin: " 1.5rem -16px" }} />

            {selectedRowsFilter.length > 0 && (
              <ApprovalFlowTableVendorStore
                orderPlacementDate={orderPlacementDate}
                displaySnackMessages={displaySnackMessages}
                selectedRowsFilter={selectedRowsFilter}
                targetTable={targetTable}
                selectedRows={props?.selectedRows}
                styleOrderSummaryPayload={props?.styleOrderSummaryPayload}
                getCheckConfigurationForStyleOrderSummary={
                  props?.getCheckConfigurationForStyleOrderSummary
                }
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
    screenConfig: store.omsReducer.orderingCommonService.orderingScreensConfig,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    isFiltersValid:
      store.omsReducer.orderManagementService.isApprovalFiltersValid,
    selectedApprovalFilters:
      store.omsReducer.orderManagementService.selectedApprovalFilters,
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
    highLevelSummaryState:
      store.omsReducer.orderManagementService.highLevelSummaryState,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    omsFilterVendorStoreConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementVendorStoreFilterConfiguration"
      ]?.appliedFilterData?.dependencyData,
    productDetailsFilters:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.oms_dashboard?.deep_dive?.selected_product_filter,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.oms_dashboard?.approval_flow,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
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
  getCustomFiltersForApprovalFlow: (payload) =>
    dispatch(getCustomFiltersForApprovalFlowInVendorStore(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ApprovalFlowDialogVendorStore);

import { useHistory } from "react-router";
import { ORDER_BATCHING } from "../../constants-inventorysmart/routesConstants";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../inventorysmart-utility";
import {
  CREATE_ALLOCATION_FORM,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import { cloneDeep, isEmpty } from "lodash";
import ViewCurrentAllocationsTables from "./components/ViewCurrentAllocationsTables";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import Form from "core/Utils/form";

import {
  setInventorysmartOrderBatchingFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setInventorysmartOrderBatchingFilterElements,
  setInventorysmartOrderBatchingFilterDependency,
  resetOrderBatchingStoreState,
  getOrderBatchingMetrics,
  setInventorysmartOrderBatchingMetricsLoader,
  setInventorysmartOrderBatchingMetrics,
  setInventorysmartOrderBatchingFilterConfig,
} from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";
import OrderBatchingMetrics from "./components/OrderBatchingMetrics";
import { generateIcon } from "core/Utils/icon-color-generator";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import OrderBatchingSummaryTable from "./components/OrderBatchingSummaryTable";
import { setAllocationName } from "modules/inventorysmart/services-inventorysmart/Order-Batching/order-batching-services";

const OrderBatching = (props) => {
  const history = useHistory();
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [allocationForm, setAllocationForm] = useState({ allocationName: "" });

  const applyFilters = (filterElements, filterDependency) => {
    const payload = filtersPayload(filterElements, filterDependency, true);

    props.setIsFiltersValid(payload.isValid);
    props.setSelectedFilters(payload.reqBody);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const fetchOrderBatchingMetrics = async () => {
    try {
      props.setInventorysmartOrderBatchingMetricsLoader(true);
      let body = {
        filters: props.selectedFilters,
      };
      let response = await props.getOrderBatchingMetrics(body);
      if (response.data.status) {
        const metricsWithIcon = response.data.data.map((item) => {
          let icon = generateIcon();
          return { ...item, icon };
        });
        props.setInventorysmartOrderBatchingMetrics(metricsWithIcon);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      return [];
    } finally {
      props.setInventorysmartOrderBatchingMetricsLoader(false);
    }
  };

  const resetOrderBatching = () => {
    props.resetOrderBatchingStoreState();
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("Inventorysmart Order Triaging");
        if (isEmpty(props.filterDashboardConfiguration)) {
          props.setInventorysmartOrderBatchingFilterConfig(response);
        }
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    getInitialFilterConfiguration();
    return () => {
      resetOrderBatching();
    };
  }, []);

  useEffect(() => {
    if (
      !isEmpty(props.inventorysmartOrderBatchingFilterConfig) &&
      !isEmpty(props.inventorysmartScreenConfig)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          props.setInventorysmartOrderBatchingFilterLoader(true);
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.inventorysmartOrderBatchingFilterConfig) || [],
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          //Adding custom filter for the screen from tenant_attribute_master
          const orderBatchingCustomFilter =
            props.inventorysmartScreenConfig?.order_triage?.drillDown?.customFilters?.map(
              (customFilter) => {
                const filter = {
                  ...customFilter,
                  fc_code: response[0]?.fc_code,
                };
                return filter;
              }
            ) || [];

          const responseWithCustomFilterConfig = [
            ...orderBatchingCustomFilter,
            ...response,
          ];

          const filterConfigData = [
            {
              filterDashboardData: responseWithCustomFilterConfig,
              expectedFilterDimensions: getFilterDimensions(
                responseWithCustomFilterConfig
              ),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];

          const filterConfig = formattedFilterConfiguration(
            "orderBatchingFilterConfiguration",
            filterConfigData,
            "Order Batching"
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setInventorysmartOrderBatchingFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [props.inventorysmartOrderBatchingFilterConfig]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && fetchOrderBatchingMetrics();
  }, [props.selectedFilters]);

  useEffect(() => {
    props.inventorysmartReloadOrderBatchingData && fetchOrderBatchingMetrics();
  }, [props.inventorysmartReloadOrderBatchingData]);

  useEffect(() => {
    if (props.isNameMandatory) {
      CREATE_ALLOCATION_FORM.find(
        (formElement) => formElement.accessor === "allocationName"
      ).required = true;
    }
  }, [props.isNameMandatory]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const routeOptions = [
    {
      label: "View Current Allocations",
      id: 1,
      action: () => {
        history.push(ORDER_BATCHING);
      },
    },
  ];

  const handleOnBlur = (event) => {
    props.setAllocationName(event.target.value);
  };

  const handlePlanNameChange = (updatedFormData) => {
    setAllocationForm(updatedFormData);
  };

  return (
    <>
      <CoreComponentScreen
        showPageRoute={props.hideBreadCrumbs ? false : true}
        showPageHeader={true}
        routeOptions={routeOptions}
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"orderBatchingFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
      >
        {props.inventorysmartScreenConfig?.order_triage?.drillDown?.hidden?.indexOf(
          "order_batching_plan_name"
        ) === -1 && (
          <div>
            <CustomAccordion label="Allocation Name" defaultExpanded={true}>
              <div className={classes.inputLabel}>
                <Form
                  layout={"vertical"}
                  maxFieldsInRow={1}
                  handleChange={handlePlanNameChange}
                  handleOnBlur={handleOnBlur}
                  fields={CREATE_ALLOCATION_FORM}
                  updateDefaultValue={false}
                  defaultValues={allocationForm}
                ></Form>
              </div>
            </CustomAccordion>
          </div>
        )}
        {props.isFiltersValid &&
          props.inventorysmartScreenConfig?.order_triage?.drillDown?.hidden?.indexOf(
            "order_batching_metrics"
          ) === -1 && (
            <div className={classNames(globalClasses.marginVertical1rem)}>
              <CustomAccordion label="KPIs">
                <OrderBatchingMetrics />
              </CustomAccordion>
            </div>
          )}

        {props.isFiltersValid &&
          props.inventorysmartScreenConfig?.order_triage?.drillDown?.hidden?.indexOf(
            "order_batching_summary"
          ) === -1 && (
            <div>
              <CustomAccordion label="Current Allocations Summary">
                <OrderBatchingSummaryTable />
              </CustomAccordion>
            </div>
          )}

        {props.isFiltersValid &&
          props.inventorysmartScreenConfig?.order_triage?.drillDown?.hidden?.indexOf(
            "order_batching_details"
          ) === -1 && (
            <div>
              <CustomAccordion label="Current Allocations">
                <ViewCurrentAllocationsTables />
              </CustomAccordion>
            </div>
          )}
      </CoreComponentScreen>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .selectedFilters,
    inventorysmartOrderBatchingFilterLoader:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingFilterLoader,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .isFiltersValid,
    inventorysmartOrderBatchingFilterElements:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingFilterElements,
    inventorysmartOrderBatchingFilterDependency:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingFilterDependency,
    inventorysmartOrderBatchingFilterConfig:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartOrderBatchingFilterConfig,
    inventorysmartReloadOrderBatchingData:
      store.inventorysmartReducer.inventorySmartOrderBatchingService
        .inventorysmartReloadOrderBatchingData,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderBatchingFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    isNameMandatory:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_create_allocation
        ?.isNameMandatory,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartOrderBatchingFilterLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setAllocationName: (payload) => dispatch(setAllocationName(payload)),
  setInventorysmartOrderBatchingFilterElements: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterElements(payload)),
  setInventorysmartOrderBatchingFilterDependency: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterDependency(payload)),
  setInventorysmartOrderBatchingFilterConfig: (payload) =>
    dispatch(setInventorysmartOrderBatchingFilterConfig(payload)),
  setInventorysmartOrderBatchingMetricsLoader: (payload) =>
    dispatch(setInventorysmartOrderBatchingMetricsLoader(payload)),
  setInventorysmartOrderBatchingMetrics: (payload) =>
    dispatch(setInventorysmartOrderBatchingMetrics(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  getOrderBatchingMetrics: (payload) =>
    dispatch(getOrderBatchingMetrics(payload)),
  resetOrderBatchingStoreState: (payload) =>
    dispatch(resetOrderBatchingStoreState(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderBatching);

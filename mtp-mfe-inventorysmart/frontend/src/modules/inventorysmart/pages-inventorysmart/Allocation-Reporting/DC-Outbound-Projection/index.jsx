import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty, isNull } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { useTranslation } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import { setFilterConfiguration } from "core/actions/filterAction";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  setDcOutboundProjectionFilterConfiguration,
  clearDcOutboundProjectionStates,
  setDcOutboundProjectionTableLoader,
} from "../../../services-inventorysmart/Allocation-Reports/dc-outbound-projection-service";
import {
  ERROR_MESSAGE,
  EXCESS_INV_FISCAL_CALENDAR_FILTER_MULTI_WEEK,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import DcOutboundProjectionTableComponent from "./dc-outbound-projection-table-view";
import moment from "moment";
import DcOutboundProjectionGraph from "./dc-outbound-projection-graph";
import { DC_OUTBOUND_PROJECTION_SCREEN_NAME } from "../CustomHooks/moduleConstants";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { useReportingStyles } from "../reportingStyles";

const DCOutboundProjection = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const reportingClasses = useReportingStyles();
  const [showTable, setShowTable] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState(null);

  useEffect(() => {
    setFiscalCalendarDetails(props?.fiscalCalendarData);
    moment.updateLocale("en", {
      week: {
        dow: props?.fiscalCalendarData?.week_start_day || 0,
      },
    });
  }, [props?.fiscalCalendarData]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("DC Outbound Projection Report");
        props.setDcOutboundProjectionFilterConfiguration(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      props.setDcOutboundProjectionFilterConfiguration(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      );
      return;
    }
    getInitialFilterConfiguration();
    return () => props.clearDcOutboundProjectionStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.dcOutboundProjectionFilterConfiguration)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters:
              cloneDeep(props.dcOutboundProjectionFilterConfiguration) || [],
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: DC_OUTBOUND_PROJECTION_SCREEN_NAME,
            customDependency: [],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          const fiscalCalendarConfig = cloneDeep(
            EXCESS_INV_FISCAL_CALENDAR_FILTER_MULTI_WEEK
          );
          fiscalCalendarConfig.fc_code = response[0]?.fc_code;
          fiscalCalendarConfig.initialData = fiscalCalendarDetails?.data || [];
          fiscalCalendarConfig.disableFutureWeeks = true;

          let filterDataWithCustomFilter = [fiscalCalendarConfig, ...response];

          const filterConfigData = [
            {
              filterDashboardData: filterDataWithCustomFilter,
              expectedFilterDimensions: getFilterDimensions(
                filterDataWithCustomFilter
              ),
              isCrossDimensionFilter: true,
              screen_name: DC_OUTBOUND_PROJECTION_SCREEN_NAME,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "dcOutboundProjectionFilterConfiguration",
            filterConfigData,
            "DC Outbound Projection Screen"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          handleErrorMessage(err);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.dcOutboundProjectionFilterConfiguration,
    props.savedFilterSelection,
  ]);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = async (_filterElements, dependency) => {
    let filterDatePicker = dependency.filter(
      (item) => item.attribute_name === "fiscal_date_range"
    );
    if (isNull(filterDatePicker[0]?.values?.fiscalInfoEndDate)) {
      displaySnackMessages(t("inventorysmart.selectDateRange"), "error");
      return;
    }
    setFilterDependency(dependency);
    setShowGraph(true);
    setShowTable(true);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setShowTable(false);
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"dcOutboundProjectionFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        customDependencyValue={getCustomDependencyFilter}
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        customClassName={reportingClasses.filterSectionSpacing}
      >
        <Loader loader={props.dcOutboundProjectionGraphLoader }>
          {showGraph && (
            <div className={globalClasses.marginBottom24}>
              <DcOutboundProjectionGraph filterDependency={filterDependency} displaySnackMessages={displaySnackMessages} />
            </div>
          )}
        </Loader>

        <Loader loader={props.dcOutboundProjectionTableLoader }>
          {showTable && (
            <div className={globalClasses.marginHorizontal}>
              <DcOutboundProjectionTableComponent
                displaySnackMessages={displaySnackMessages}
                setDcOutboundProjectionTableLoader={
                  props.setDcOutboundProjectionTableLoader
                }
                filterDependency={filterDependency}
              />
            </div>
          )}
        </Loader>
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    fiscalCalendarData:
      inventorysmartReducer?.inventorySmartCommonService?.fiscalCalendarData,
    dcOutboundProjectionTableLoader:
      inventorysmartReducer.inventorySmartDcOutboundProjectionService
        .dcOutboundProjectionTableLoader,
    dcOutboundProjectionGraphLoader:
      inventorysmartReducer.inventorySmartDcOutboundProjectionService
        .dcOutboundProjectionGraphLoader,
    dcOutboundProjectionFilterConfiguration:
      inventorysmartReducer.inventorySmartDcOutboundProjectionService
        .dcOutboundProjectionFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "dcOutboundProjectionFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    allocationReportsConfiguration:
      inventorysmartReducer?.allocationReportsCommonService
        ?.allocationReportsConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setDcOutboundProjectionFilterConfiguration: (body) =>
      dispatch(setDcOutboundProjectionFilterConfiguration(body)),
    clearDcOutboundProjectionStates: () =>
      dispatch(clearDcOutboundProjectionStates()),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setDcOutboundProjectionTableLoader: (body) =>
      dispatch(setDcOutboundProjectionTableLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(DCOutboundProjection);
